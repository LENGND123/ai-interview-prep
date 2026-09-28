import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

export default function Session() {
  const { id } = useParams();
  const [interview, setInterview] = useState(null);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setInterview(null);
    setError("");
    api(`/api/interviews/${id}`)
      .then((data) => {
        if (cancelled) return;
        setInterview(data.interview);
        const firstOpen = data.interview.questions.findIndex((question) => !question.answered);
        setIndex(firstOpen === -1 ? 0 : firstOpen);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error && !interview) return <p className="banner error">{error}</p>;
  if (!interview) return <p className="center-msg">Loading interview…</p>;

  const questions = interview.questions;
  const current = questions[index];
  const answeredCount = questions.filter((question) => question.answered).length;
  const finished = interview.status === "completed";

  async function submit(event) {
    event.preventDefault();
    setBusy("score");
    setError("");
    try {
      const data = await api(`/api/interviews/${id}/answers`, {
        method: "POST",
        body: { questionId: current.id, answer },
      });
      setInterview(data.interview);
      setAnswer("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function finishEarly() {
    if (answeredCount < questions.length && !window.confirm("End now? Unanswered questions will not be scored.")) return;
    setBusy("finish");
    setError("");
    try {
      const data = await api(`/api/interviews/${id}/finish`, { method: "POST" });
      setInterview(data.interview);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="session">
      <header className="session-head">
        <Link to="/app" className="back">All interviews</Link>
        <h1>{interview.role}</h1>
        <p>
          {labelType(interview.interviewType)} · {interview.experienceLevel}
          {interview.company ? ` · ${interview.company}` : ""}
          {" · "}
          {answeredCount} of {questions.length} answered
        </p>
      </header>

      {interview.summary && (
        <article className="summary-card">
          <p className="eyebrow">Session score {interview.overallScore == null ? "" : `· ${interview.overallScore}/10`}</p>
          <p>{interview.summary}</p>
          {interview.nextSteps?.length > 0 && (
            <ul>
              {interview.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}
        </article>
      )}

      <ol className="dots">
        {questions.map((question, dotIndex) => (
          <li key={question.id}>
            <button
              type="button"
              className={dotIndex === index ? "dot active" : question.answered ? "dot done" : "dot"}
              onClick={() => setIndex(dotIndex)}
              aria-label={`Question ${dotIndex + 1}`}
              aria-current={dotIndex === index ? "true" : undefined}
            >
              {dotIndex + 1}
            </button>
          </li>
        ))}
      </ol>

      {current && (
        <article className="q-card">
          <div className="q-meta">
            <span>{labelType(current.category)}</span>
            <span>{current.difficulty}</span>
          </div>
          <h2>{current.prompt}</h2>

          {current.answered ? (
            <Evaluation evaluation={current.evaluation} answer={current.answer} />
          ) : finished ? (
            <p className="hint">This question was left unanswered.</p>
          ) : (
            <form onSubmit={submit}>
              <label>
                Your answer
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={8}
                  required
                  minLength={10}
                  maxLength={8000}
                  placeholder="Talk it through. A few sentences is enough to score."
                />
              </label>
              <button className="btn" type="submit" disabled={Boolean(busy)}>
                {busy === "score" ? "Scoring your answer…" : "Submit answer"}
              </button>
            </form>
          )}
        </article>
      )}

      {error && <p className="banner error" role="alert">{error}</p>}

      <div className="session-nav">
        <button type="button" className="btn btn-ghost" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0 || Boolean(busy)}>
          Previous
        </button>
        {index < questions.length - 1 ? (
          <button type="button" className="btn btn-ghost" onClick={() => setIndex((value) => value + 1)} disabled={Boolean(busy)}>
            Next
          </button>
        ) : (
          <span />
        )}
        {!finished && (
          <button type="button" className="btn btn-pine" onClick={finishEarly} disabled={Boolean(busy)}>
            {busy === "finish" ? "Wrapping up…" : "End session"}
          </button>
        )}
      </div>
    </section>
  );
}

function Evaluation({ evaluation, answer }) {
  return (
    <div className="eval">
      <p className="your-answer"><span>You wrote</span>{answer}</p>
      <div className={`verdict ${evaluation.verdict}`}>
        <strong>{evaluation.score}<span>/10</span></strong>
        <em>{evaluation.verdict}</em>
      </div>
      <p>{evaluation.feedback}</p>
      <div className="split">
        <div>
          <h3>What landed</h3>
          {evaluation.strengths.length === 0 ? <p className="hint">Nothing specific to keep yet.</p> : (
            <ul>{evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
          )}
        </div>
        <div>
          <h3>Practice next</h3>
          <ul>{evaluation.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      {evaluation.modelAnswer && (
        <details className="model">
          <summary>A stronger answer</summary>
          <p>{evaluation.modelAnswer}</p>
        </details>
      )}
    </div>
  );
}

function labelType(type) {
  if (type === "system-design") return "System design";
  if (type === "role-specific") return "Role";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
