import { Link } from "react-router-dom";
import { useAuth } from "../auth";

export default function Shell({ children }) {
  const { user, ready, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <Link to={user ? "/app" : "/"} className="brand">
          <span className="brand-mark" aria-hidden="true" />
          DryRun
        </Link>
        <nav>
          {ready && user && (
            <>
              <Link to="/app">History</Link>
              <Link to="/app/new" className="btn btn-small">New interview</Link>
              <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
                Log out
              </button>
            </>
          )}
          {ready && !user && (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn btn-small">Create account</Link>
            </>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
