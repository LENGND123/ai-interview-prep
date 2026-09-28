import { httpError } from "../httpError.js";

const CATEGORIES = new Set(["technical", "behavioral", "system-design", "role-specific"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

export function normalizeQuestions(raw, count) {
  const list = Array.isArray(raw?.questions) ? raw.questions : [];
  const questions = list
    .map((item) => ({
      prompt: clip(item?.prompt, 1200),
      category: CATEGORIES.has(item?.category) ? item.category : "role-specific",
      difficulty: DIFFICULTIES.has(item?.difficulty) ? item.difficulty : "medium",
      rubric: listOf(item?.rubric, 5, 180),
    }))
    .filter((question) => question.prompt.length >= 12 && question.rubric.length >= 2);

  if (questions.length < count) {
    throw httpError(502, "Gemini returned too few usable questions. Try again.");
  }
  return questions.slice(0, count);
}

export function normalizeEvaluation(raw) {
  const feedback = clip(raw?.feedback, 2000);
  const modelAnswer = clip(raw?.modelAnswer, 2500);
  if (!feedback || !modelAnswer) {
    throw httpError(502, "Gemini returned an incomplete evaluation. Try again.");
  }
  return {
    score: clampScore(raw?.score),
    feedback,
    strengths: listOf(raw?.strengths, 3, 180),
    improvements: listOf(raw?.improvements, 4, 180),
    modelAnswer,
  };
}

export function normalizeSummary(raw) {
  const summary = clip(raw?.summary, 2000);
  if (!summary) throw httpError(502, "Gemini returned an empty summary. Try again.");
  return {
    summary,
    nextSteps: listOf(raw?.nextSteps, 3, 200),
  };
}

function clip(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function listOf(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clip(item, maxLen)).filter(Boolean).slice(0, maxItems);
}

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(10, Math.round(score)));
}
