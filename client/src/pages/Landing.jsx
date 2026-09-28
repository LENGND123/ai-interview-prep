import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Mock interviews, scored</p>
          <h1>Practice the interview before it counts.</h1>
          <p className="lede">
            DryRun writes questions for the role you want, scores what you actually said, and keeps every session so you can see the weak spots before a recruiter does.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn">Start a dry run</Link>
            <Link to="/login" className="btn btn-ghost">I already have an account</Link>
          </div>
        </div>
        <article className="sample-card" aria-hidden="true">
          <header>
            <span>Backend engineer · junior</span>
            <strong className="score-pill strong">8/10</strong>
          </header>
          <p className="sample-q">When would you add an index, and when would you leave the column alone?</p>
          <p className="sample-a">
            You named the read speedup and skipped the write cost. A stronger answer says which query the index serves, and what gets slower on every insert.
          </p>
          <footer>Saved to your history</footer>
        </article>
      </section>

      <section className="steps">
        <article>
          <span>01</span>
          <h2>Set the room</h2>
          <p>Role, level, and whether you want technical questions, behavioral ones, or a mix.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Answer in writing</h2>
          <p>Gemini writes the questions. You answer one at a time, the way you would talk it through.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Read the score</h2>
          <p>Each answer comes back with a score, what landed, what to fix, and a stronger version.</p>
        </article>
      </section>
      <p className="disclaimer">Questions are generated for practice. They are not from a real employer.</p>
    </div>
  );
}
