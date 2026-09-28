export function averageScore(questions) {
  const scores = [];
  for (const question of questions) {
    const score = question.evaluation?.score;
    if (typeof score === "number" && Number.isFinite(score)) scores.push(score);
  }
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
}

export function verdictFor(score) {
  if (score >= 8) return "strong";
  if (score >= 5) return "adequate";
  return "weak";
}

export function presentUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
  };
}

export function presentInterview(doc) {
  const interview = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(interview._id),
    role: interview.role,
    company: interview.company || "",
    experienceLevel: interview.experienceLevel,
    interviewType: interview.interviewType,
    focusAreas: interview.focusAreas || [],
    status: interview.status,
    overallScore: interview.overallScore ?? null,
    summary: interview.summary || "",
    nextSteps: interview.nextSteps || [],
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
    questions: (interview.questions || []).map((question) => ({
      id: String(question._id),
      order: question.order,
      prompt: question.prompt,
      category: question.category,
      difficulty: question.difficulty,
      answer: question.answer || "",
      answered: Boolean(question.evaluation),
      evaluation: question.evaluation
        ? {
            score: question.evaluation.score,
            verdict: question.evaluation.verdict,
            feedback: question.evaluation.feedback,
            strengths: question.evaluation.strengths || [],
            improvements: question.evaluation.improvements || [],
            modelAnswer: question.evaluation.modelAnswer || "",
          }
        : null,
    })),
  };
}

export function presentInterviewSummary(doc) {
  const interview = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const questions = interview.questions || [];
  return {
    id: String(interview._id),
    role: interview.role,
    company: interview.company || "",
    experienceLevel: interview.experienceLevel,
    interviewType: interview.interviewType,
    focusAreas: interview.focusAreas || [],
    status: interview.status,
    overallScore: interview.overallScore ?? null,
    questionCount: questions.length,
    answeredCount: questions.filter((question) => question.evaluation).length,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  };
}
