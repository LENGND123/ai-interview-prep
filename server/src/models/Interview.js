import mongoose from "mongoose";

const evaluationSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true },
    verdict: { type: String, required: true },
    feedback: { type: String, required: true },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    modelAnswer: { type: String, default: "" },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  prompt: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, required: true },
  rubric: { type: [String], default: [] },
  answer: { type: String, default: "" },
  evaluation: { type: evaluationSchema, default: null },
  answeredAt: { type: Date, default: null },
});

const interviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, required: true },
    company: { type: String, default: "" },
    experienceLevel: { type: String, required: true },
    interviewType: { type: String, required: true },
    focusAreas: { type: [String], default: [] },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    questions: { type: [questionSchema], default: [] },
    overallScore: { type: Number, default: null },
    summary: { type: String, default: "" },
    nextSteps: { type: [String], default: [] },
  },
  { timestamps: true }
);

interviewSchema.index({ user: 1, createdAt: -1 });

export const Interview = mongoose.model("Interview", interviewSchema);
