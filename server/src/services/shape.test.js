import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEvaluation, normalizeQuestions, normalizeSummary } from "./shape.js";

const usable = (prompt) => ({
  prompt,
  category: "technical",
  difficulty: "medium",
  rubric: ["names the tradeoff", "gives a concrete case"],
});

test("normalizeQuestions drops weak items and slices to the requested count", () => {
  const result = normalizeQuestions(
    {
      questions: [
        usable("Explain when a database index helps and when it hurts."),
        { prompt: "too short", category: "technical", difficulty: "easy", rubric: ["only one"] },
        {
          prompt: "Tell me about a time you missed a deadline and what changed after.",
          category: "behavioral",
          difficulty: "easy",
          rubric: ["owns the situation", "names what changed"],
        },
        usable("How would you design a rate limiter for a public API?"),
        { prompt: "Unknown category still survives if the prompt is real.", category: "trivia", difficulty: "wild", rubric: ["point one", "point two"] },
      ],
    },
    3
  );

  assert.equal(result.length, 3);
  assert.equal(result[0].category, "technical");
  assert.equal(result[1].category, "behavioral");
  assert.match(result[2].prompt, /rate limiter/);

  const withFallback = normalizeQuestions(
    {
      questions: [
        {
          prompt: "Unknown category still survives if the prompt is real.",
          category: "trivia",
          difficulty: "wild",
          rubric: ["point one", "point two"],
        },
        usable("How would you design a rate limiter for a public API?"),
        usable("Explain when a database index helps and when it hurts."),
      ],
    },
    3
  );
  assert.equal(withFallback[0].category, "role-specific");
  assert.equal(withFallback[0].difficulty, "medium");
});

test("normalizeQuestions rejects a short list", () => {
  assert.throws(() => normalizeQuestions({ questions: [] }, 3));
});

test("normalizeEvaluation clamps an inflated score", () => {
  const evaluation = normalizeEvaluation({
    score: 42,
    feedback: "You named the index but skipped write amplification.",
    strengths: ["Named B-trees", ""],
    improvements: ["Mention write cost"],
    modelAnswer: "A strong answer defines when an index helps reads and when it hurts writes.",
  });
  assert.equal(evaluation.score, 10);
  assert.deepEqual(evaluation.strengths, ["Named B-trees"]);
});

test("normalizeSummary requires prose", () => {
  assert.throws(() => normalizeSummary({ summary: "   ", nextSteps: [] }));
  const summary = normalizeSummary({
    summary: "You scored 7 out of 10, with a clear API answer and a thin behavioral story.",
    nextSteps: ["Retell one project with a metric"],
  });
  assert.equal(summary.nextSteps.length, 1);
});
