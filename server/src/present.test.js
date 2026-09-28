import assert from "node:assert/strict";
import test from "node:test";
import { averageScore, presentInterview, verdictFor } from "./present.js";

test("presentInterview never includes the hidden rubric", () => {
  const presented = presentInterview({
    _id: "abc",
    role: "Backend engineer",
    company: "",
    experienceLevel: "junior",
    interviewType: "technical",
    focusAreas: ["SQL"],
    status: "in_progress",
    overallScore: null,
    summary: "",
    nextSteps: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    questions: [
      {
        _id: "q1",
        order: 1,
        prompt: "What is an index?",
        category: "technical",
        difficulty: "easy",
        rubric: ["secret point the candidate must not see"],
        answer: "",
        evaluation: null,
      },
    ],
  });

  assert.equal(JSON.stringify(presented).includes("secret point"), false);
  assert.equal(presented.questions[0].answered, false);
  assert.equal(presented.questions[0].id, "q1");
});

test("averageScore ignores unanswered questions", () => {
  assert.equal(
    averageScore([{ evaluation: { score: 8 } }, { evaluation: null }, { evaluation: { score: 6 } }]),
    7
  );
  assert.equal(averageScore([{ evaluation: null }]), null);
});

test("verdict bands", () => {
  assert.equal(verdictFor(8), "strong");
  assert.equal(verdictFor(5), "adequate");
  assert.equal(verdictFor(4), "weak");
});
