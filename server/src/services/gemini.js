import { GoogleGenAI } from "@google/genai";
import { httpError } from "../httpError.js";
import { normalizeEvaluation, normalizeQuestions, normalizeSummary } from "./shape.js";

const questionsSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          category: {
            type: "string",
            enum: ["technical", "behavioral", "system-design", "role-specific"],
          },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          rubric: { type: "array", items: { type: "string" } },
        },
        required: ["prompt", "category", "difficulty", "rubric"],
      },
    },
  },
  required: ["questions"],
};

const evaluationSchema = {
  type: "object",
  properties: {
    score: { type: "integer" },
    feedback: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    modelAnswer: { type: "string" },
  },
  required: ["score", "feedback", "strengths", "improvements", "modelAnswer"],
};

const summarySchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    nextSteps: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "nextSteps"],
};

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw httpError(503, "Add GEMINI_API_KEY to server/.env to generate and score interviews.");
  }
  return new GoogleGenAI({ apiKey });
}

function readText(response) {
  if (typeof response?.text === "string" && response.text.trim()) return response.text;
  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("");
}

function parseJson(text) {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    throw httpError(502, "The model returned an unreadable response. Try again.");
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(httpError(504, `${label} took too long. Try again.`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function generate(contents, schema, temperature) {
  try {
    const response = await withTimeout(
      client().models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
        contents,
        config: {
          temperature,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      }),
      50000,
      "Gemini"
    );
    const text = readText(response);
    if (!text.trim()) throw httpError(502, "Gemini returned an empty response. Try again.");
    return parseJson(text);
  } catch (error) {
    if (error.status) throw error;
    const key = process.env.GEMINI_API_KEY || "";
    const message = String(error?.message || error).replaceAll(key, "[redacted]");
    console.error("Gemini request failed:", message.slice(0, 500));
    if (/API key|API_KEY|401|403|permission/i.test(message)) {
      throw httpError(502, "Gemini rejected the API key. Check GEMINI_API_KEY in server/.env.");
    }
    throw httpError(502, "Gemini could not complete that request. Try again in a moment.");
  }
}

export async function generateQuestions(input) {
  const focus = input.focusAreas?.length ? input.focusAreas.join(", ") : "the core skills for this role";
  const company = input.company || "unspecified";
  const raw = await generate(
    `You are preparing a mock job interview.

Role: ${input.role}
Company: ${company}
Experience level: ${input.experienceLevel}
Interview style: ${input.interviewType}
Focus areas: ${focus}
Write exactly ${input.questionCount} questions.

Requirements:
- Make each question specific to this role and level. Avoid trivia that only asks for a definition.
- Technical questions should force a tradeoff, a debugging approach, or a short concrete example.
- Behavioral questions should ask for a real situation the candidate handled.
- System-design questions should be scoped so a strong answer fits in a few minutes.
- Difficulty should match the level: intern and junior lean easy or medium; mid mixes medium and hard; senior leans medium or hard.
- category must be technical, behavioral, system-design, or role-specific, and should fit the interview style. A mixed interview includes at least two categories. A system-design interview is mostly system-design. A behavioral interview is mostly behavioral. A technical interview is mostly technical.
- rubric is 3 to 5 short points a strong answer would cover. The candidate will not see it.
- Do not number the prompts. Do not repeat questions.`,
    questionsSchema,
    0.8
  );
  return normalizeQuestions(raw, input.questionCount);
}

export async function evaluateAnswer(input) {
  const rubric = input.rubric?.length ? input.rubric.map((point) => `- ${point}`).join("\n") : "- Cover the question directly";
  const raw = await generate(
    `You are a fair, specific interview coach. Score one answer.

Role: ${input.role}
Company: ${input.company || "unspecified"}
Experience level: ${input.experienceLevel}
Category: ${input.category}
Question: ${input.question}
Rubric the candidate cannot see:
${rubric}

Candidate answer:
${input.answer}

Scoring guide, integer 0 through 10:
- 0-2: missing, off-topic, or empty of substance
- 3-4: touches the topic but has major gaps or factual errors
- 5-6: partial, with some correct points and thin depth or example
- 7-8: a solid answer an interviewer would advance
- 9-10: precise, structured, and at the right depth for this level

feedback: 2 to 4 sentences, second person, naming what landed and what was missing.
strengths: 0 to 3 short bullets. Use an empty array when there is nothing real to praise.
improvements: 2 to 4 short bullets the candidate can practice.
modelAnswer: a strong answer at this experience level, about 120 to 180 words. Do not copy the candidate.

Do not mention the rubric. Do not inflate the score.`,
    evaluationSchema,
    0.3
  );
  return normalizeEvaluation(raw);
}

export async function summarizeInterview(input) {
  const lines = input.questions
    .map((question, index) => `${index + 1}. (${question.score}/10) ${question.prompt}\nFeedback: ${question.feedback}`)
    .join("\n");
  const raw = await generate(
    `Write a coaching close for a finished mock interview.

Role: ${input.role}
Company: ${input.company || "unspecified"}
Level: ${input.experienceLevel}
Style: ${input.interviewType}
Overall score, already calculated: ${input.overallScore} out of 10

Questions and scores:
${lines}

summary: 3 to 5 sentences, second person, specific to these answers. Mention the overall score once.
nextSteps: exactly 3 short practice tasks for the next session.`,
    summarySchema,
    0.4
  );
  return normalizeSummary(raw);
}

export const geminiApi = {
  generateQuestions,
  evaluateAnswer,
  summarizeInterview,
};
