import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const ROLES = ["Frontend engineer", "Backend engineer", "Full stack engineer", "Data analyst", "Product manager", "DevOps engineer"];
const FOCUS = ["Data structures", "System design", "React", "APIs", "SQL", "Behavioral stories", "Testing", "Cloud"];
const LEVELS = [
  ["intern", "Intern"],
  ["junior", "Junior"],
  ["mid", "Mid"],
  ["senior", "Senior"],
];
const TYPES = [
  ["mixed", "Mixed"],
  ["technical", "Technical"],
  ["behavioral", "Behavioral"],
  ["system-design", "System design"],
];

export default function NewInterview() {
  const navigate = useNavigate();
  const [role, setRole] = useState("Backend engineer");
  const [company, setCompany] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("junior");
  const [interviewType, setInterviewType] = useState("mixed");
  const [questionCount, setQuestionCount] = useState(5);
  const [focus, setFocus] = useState(["APIs", "SQL"]);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleFocus(tag) {
    setFocus((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (current.length >= 6) return current;
      return [...current, tag];
    });
  }

  function addCustom() {
    const tag = custom.trim().slice(0, 40);
    if (!tag || focus.includes(tag) || focus.length >= 6) return;
    setFocus((current) => [...current, tag]);
    setCustom("");
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/interviews", {
        method: "POST",
        body: {
          role,
          company,
          experienceLevel,
          interviewType,
          focusAreas: focus,
          questionCount: Number(questionCount),
        },
      });
      navigate(`/app/interviews/${data.interview.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="setup">
      <header className="page-head">
        <div>
          <p className="eyebrow">New interview</p>
          <h1>Tell DryRun who you are interviewing as.</h1>
        </div>
      </header>

      <form className="setup-form" onSubmit={onSubmit}>
        <label>
          Role
          <input value={role} onChange={(event) => setRole(event.target.value)} required minLength={2} maxLength={80} />
        </label>
        <div className="chips" role="group" aria-label="Role suggestions">
          {ROLES.map((item) => (
            <button key={item} type="button" className={role === item ? "chip on" : "chip"} onClick={() => setRole(item)}>
              {item}
            </button>
          ))}
        </div>

        <label>
          Company <span className="optional">optional</span>
          <input value={company} onChange={(event) => setCompany(event.target.value)} maxLength={80} placeholder="For example, Stripe" />
        </label>

        <fieldset>
          <legend>Level</legend>
          <div className="segmented">
            {LEVELS.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={experienceLevel === value} onClick={() => setExperienceLevel(value)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Style</legend>
          <div className="segmented">
            {TYPES.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={interviewType === value} onClick={() => setInterviewType(value)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <span className="legend">Focus · {focus.length}/6</span>
          <div className="chips">
            {FOCUS.map((tag) => (
              <button key={tag} type="button" className={focus.includes(tag) ? "chip on" : "chip"} onClick={() => toggleFocus(tag)} aria-pressed={focus.includes(tag)}>
                {tag}
              </button>
            ))}
            {focus.filter((tag) => !FOCUS.includes(tag)).map((tag) => (
              <button key={tag} type="button" className="chip on" onClick={() => toggleFocus(tag)} aria-pressed="true">
                {tag}
              </button>
            ))}
          </div>
          <div className="add-row">
            <input value={custom} onChange={(event) => setCustom(event.target.value)} maxLength={40} placeholder="Add your own focus" aria-label="Custom focus" />
            <button type="button" className="btn btn-ghost" onClick={addCustom}>Add</button>
          </div>
        </div>

        <label>
          Questions · {questionCount}
          <input type="range" min="3" max="8" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} />
        </label>

        {error && <p className="banner error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Writing your questions…" : "Generate interview"}
        </button>
        {busy && <p className="hint">Gemini is writing the set. This usually takes a few seconds.</p>}
      </form>
    </section>
  );
}
