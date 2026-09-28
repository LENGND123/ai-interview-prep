import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api("/api/interviews")
      .then((data) => {
        if (!cancelled) setInterviews(data.interviews);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id) {
    if (!window.confirm("Delete this interview? This cannot be undone.")) return;
    try {
      await api(`/api/interviews/${id}`, { method: "DELETE" });
      setInterviews((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !interviews) return <p className="banner error">{error}</p>;
  if (!interviews) return <p className="center-msg">Loading your history…</p>;

  const completed = interviews.filter((item) => item.status === "completed" && item.overallScore != null);
  const average = completed.length
    ? Math.round((completed.reduce((sum, item) => sum + item.overallScore, 0) / completed.length) * 10) / 10
    : null;
  const active = interviews.find((item) => item.status === "in_progress");
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <section className="dashboard">
      <header className="page-head">
        <div>
          <p className="eyebrow">History</p>
          <h1>Hello, {firstName}.</h1>
        </div>
        <Link to="/app/new" className="btn">New interview</Link>
      </header>

      <div className="stats">
        <article>
          <span>Sessions</span>
          <strong>{interviews.length}</strong>
        </article>
        <article>
          <span>Finished</span>
          <strong>{interviews.filter((item) => item.status === "completed").length}</strong>
        </article>
        <article>
          <span>Average score</span>
          <strong>{average == null ? "—" : average}</strong>
        </article>
      </div>

      {active && (
        <Link className="continue" to={`/app/interviews/${active.id}`}>
          <span>In progress</span>
          <strong>Continue your {active.role} interview</strong>
          <em>{active.answeredCount} of {active.questionCount} answered</em>
        </Link>
      )}

      {error && <p className="banner error" role="alert">{error}</p>}

      {interviews.length === 0 ? (
        <div className="empty">
          <h2>No interviews yet.</h2>
          <p>Set a role and DryRun will write the questions. Scores stay in this list.</p>
          <Link to="/app/new" className="btn">Set up the first one</Link>
        </div>
      ) : (
        <ul className="history">
          {interviews.map((item) => (
            <li key={item.id} className="row">
              <Link to={`/app/interviews/${item.id}`} className="row-main">
                <div>
                  <strong>{item.role}</strong>
                  <span>
                    {labelType(item.interviewType)} · {item.experienceLevel}
                    {item.company ? ` · ${item.company}` : ""}
                  </span>
                </div>
                <div className="row-meta">
                  <span className={item.status === "completed" ? "pill done" : "pill"}>{item.status === "completed" ? "Finished" : "In progress"}</span>
                  <span className="when">{formatWhen(item.createdAt)}</span>
                  <b>{item.overallScore == null ? "—" : `${item.overallScore}`}</b>
                </div>
              </Link>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => remove(item.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function labelType(type) {
  if (type === "system-design") return "System design";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
