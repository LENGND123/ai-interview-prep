import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { Interview } from "../models/Interview.js";
import { asyncHandler } from "../asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { answerSchema, createInterviewSchema, parseBody } from "../validators.js";
import { averageScore, presentInterview, presentInterviewSummary, verdictFor } from "../present.js";
import { evaluateAnswer, generateQuestions, summarizeInterview } from "../services/gemini.js";
import { httpError } from "../httpError.js";

export const interviewRouter = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Try again in a little while." },
});

interviewRouter.use(requireAuth);

interviewRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const interviews = await Interview.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ interviews: interviews.map(presentInterviewSummary) });
  })
);

interviewRouter.post(
  "/",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const input = parseBody(createInterviewSchema, req.body);
    const generated = await generateQuestions(input);
    const interview = await Interview.create({
      user: req.user._id,
      role: input.role,
      company: input.company || "",
      experienceLevel: input.experienceLevel,
      interviewType: input.interviewType,
      focusAreas: input.focusAreas || [],
      status: "in_progress",
      questions: generated.map((question, index) => ({
        order: index + 1,
        prompt: question.prompt,
        category: question.category,
        difficulty: question.difficulty,
        rubric: question.rubric,
      })),
    });
    res.status(201).json({ interview: presentInterview(interview) });
  })
);

interviewRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const interview = await loadOwned(req);
    res.json({ interview: presentInterview(interview) });
  })
);

interviewRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const interview = await loadOwned(req);
    await interview.deleteOne();
    res.json({ ok: true });
  })
);

interviewRouter.post(
  "/:id/answers",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { questionId, answer } = parseBody(answerSchema, req.body);
    const interview = await loadOwned(req);
    if (interview.status === "completed") throw httpError(409, "This interview is already finished");

    const question = interview.questions.id(questionId);
    if (!question) throw httpError(404, "Question not found");
    if (question.evaluation) throw httpError(409, "That question is already answered");

    const evaluation = await evaluateAnswer({
      role: interview.role,
      company: interview.company,
      experienceLevel: interview.experienceLevel,
      question: question.prompt,
      category: question.category,
      rubric: question.rubric,
      answer,
    });

    question.answer = answer;
    question.evaluation = {
      score: evaluation.score,
      verdict: verdictFor(evaluation.score),
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      modelAnswer: evaluation.modelAnswer,
    };
    question.answeredAt = new Date();
    interview.overallScore = averageScore(interview.questions);

    if (interview.questions.every((item) => item.evaluation)) {
      await closeInterview(interview);
    }

    interview.markModified("questions");
    await interview.save();
    res.json({ interview: presentInterview(interview) });
  })
);

interviewRouter.post(
  "/:id/finish",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const interview = await loadOwned(req);
    if (interview.status !== "completed") {
      const answered = interview.questions.some((question) => question.evaluation);
      if (!answered) {
        interview.summary = "You ended this session before answering. Start another when you want a scored run.";
        interview.nextSteps = [];
        interview.overallScore = null;
      } else {
        await closeInterview(interview);
      }
      interview.status = "completed";
      await interview.save();
    }
    res.json({ interview: presentInterview(interview) });
  })
);

async function loadOwned(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Interview not found");
  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) throw httpError(404, "Interview not found");
  return interview;
}

async function closeInterview(interview) {
  const score = averageScore(interview.questions);
  interview.overallScore = score;
  try {
    const summary = await summarizeInterview({
      role: interview.role,
      company: interview.company,
      experienceLevel: interview.experienceLevel,
      interviewType: interview.interviewType,
      overallScore: score,
      questions: interview.questions
        .filter((question) => question.evaluation)
        .map((question) => ({
          prompt: question.prompt,
          score: question.evaluation.score,
          feedback: question.evaluation.feedback,
        })),
    });
    interview.summary = summary.summary;
    interview.nextSteps = summary.nextSteps;
  } catch (error) {
    console.error(error.message || error);
    interview.summary =
      "Your answers are saved. A written summary could not be generated this time. Your score is the average of the question scores.";
    interview.nextSteps = [];
  }
  interview.status = "completed";
}
