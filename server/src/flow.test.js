import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { geminiApi } from "./services/gemini.js";
import { createApp } from "./app.js";

process.env.JWT_SECRET = "flow-test-secret-123456";
process.env.GEMINI_API_KEY = "";

const questions = [
  {
    prompt: "When would you add an index on a Postgres column?",
    category: "technical",
    difficulty: "medium",
    rubric: ["read versus write cost", "name the query"],
  },
  {
    prompt: "Tell me about a time you found a bug close to release.",
    category: "behavioral",
    difficulty: "easy",
    rubric: ["a specific story", "what changed after"],
  },
  {
    prompt: "How would you design a short-link service for one team?",
    category: "system-design",
    difficulty: "medium",
    rubric: ["key generation", "redirect lookup"],
  },
];

geminiApi.generateQuestions = async (input) => questions.slice(0, input.questionCount);
geminiApi.evaluateAnswer = async ({ answer }) => ({
  score: answer.toLowerCase().includes("index") ? 8 : 6,
  feedback: "You covered the main tradeoff and could name the query that benefits.",
  strengths: ["Named the tradeoff"],
  improvements: ["Name the query", "Mention write cost"],
  modelAnswer: "A strong answer names the query the index serves and the write cost on every insert.",
});
geminiApi.summarizeInterview = async ({ overallScore }) => ({
  summary: `You finished at ${overallScore} out of 10. The index answer was the strongest part of the session.`,
  nextSteps: ["Retell the bug story with a metric", "Sketch the short-link write path"],
});

let mongod;
let server;
let base;

async function request(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

test("interview history, scoring, and ownership persist", async (t) => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("dryrun-flow"));
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongod.stop();
  });

  const health = await request("/api/health");
  assert.equal(health.data.ok, true);
  assert.equal(health.data.gemini, false);

  const registered = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Flow Tester", email: "flow@example.com", password: "practice1" },
  });
  assert.equal(registered.status, 201);
  const token = registered.data.token;

  const other = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Other Person", email: "other@example.com", password: "practice1" },
  });
  const otherToken = other.data.token;

  const created = await request("/api/interviews", {
    method: "POST",
    token,
    body: {
      role: "Backend engineer",
      experienceLevel: "junior",
      interviewType: "mixed",
      focusAreas: ["SQL"],
      questionCount: 3,
    },
  });
  assert.equal(created.status, 201);
  const interview = created.data.interview;
  assert.equal(interview.questions.length, 3);
  assert.equal(interview.status, "in_progress");
  assert.equal(JSON.stringify(interview).includes("read versus write cost"), false);

  const hidden = await request(`/api/interviews/${interview.id}`, { token: otherToken });
  assert.equal(hidden.status, 404);

  const first = await request(`/api/interviews/${interview.id}/answers`, {
    method: "POST",
    token,
    body: {
      questionId: interview.questions[0].id,
      answer: "I add an index when one query filters that column often, and I skip it when writes dominate.",
    },
  });
  assert.equal(first.status, 200);
  assert.equal(first.data.interview.questions[0].evaluation.score, 8);
  assert.equal(first.data.interview.questions[0].evaluation.verdict, "strong");
  assert.equal(first.data.interview.status, "in_progress");
  assert.equal(first.data.interview.overallScore, 8);

  const early = await request("/api/interviews", {
    method: "POST",
    token,
    body: {
      role: "Data analyst",
      experienceLevel: "intern",
      interviewType: "behavioral",
      focusAreas: [],
      questionCount: 3,
    },
  });
  const ended = await request(`/api/interviews/${early.data.interview.id}/finish`, {
    method: "POST",
    token,
  });
  assert.equal(ended.status, 200);
  assert.equal(ended.data.interview.status, "completed");
  assert.match(ended.data.interview.summary, /before answering/);

  let current = first.data.interview;
  for (const question of current.questions.slice(1)) {
    const step = await request(`/api/interviews/${current.id}/answers`, {
      method: "POST",
      token,
      body: {
        questionId: question.id,
        answer: "I would walk through the situation, the choice I made, and what I would measure next time.",
      },
    });
    assert.equal(step.status, 200);
    current = step.data.interview;
  }

  assert.equal(current.status, "completed");
  assert.equal(current.overallScore, 6.7);
  assert.match(current.summary, /6\.7 out of 10/);
  assert.equal(current.nextSteps.length, 2);
  assert.equal(current.questions.every((question) => question.answered), true);

  const listed = await request("/api/interviews", { token });
  assert.equal(listed.data.interviews.length, 2);
  const saved = listed.data.interviews.find((item) => item.id === current.id);
  assert.equal(saved.status, "completed");
  assert.equal(saved.overallScore, 6.7);

  const again = await request(`/api/interviews/${current.id}/answers`, {
    method: "POST",
    token,
    body: { questionId: current.questions[0].id, answer: "This should be rejected because the session is finished." },
  });
  assert.equal(again.status, 409);

  const removed = await request(`/api/interviews/${current.id}`, { method: "DELETE", token });
  assert.equal(removed.status, 200);
  const afterDelete = await request("/api/interviews", { token });
  assert.equal(afterDelete.data.interviews.length, 1);
  assert.equal(afterDelete.data.interviews[0].role, "Data analyst");
});
