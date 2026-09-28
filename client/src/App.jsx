import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Shell from "./components/Shell";
import Landing from "./pages/Landing";
import AuthForm from "./pages/AuthForm";
import Dashboard from "./pages/Dashboard";
import NewInterview from "./pages/NewInterview";
import Session from "./pages/Session";

function Loading() {
  return <p className="center-msg">Loading…</p>;
}

function Gate({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Guest({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Guest><Landing /></Guest>} />
        <Route path="/login" element={<Guest><AuthForm mode="login" /></Guest>} />
        <Route path="/register" element={<Guest><AuthForm mode="register" /></Guest>} />
        <Route path="/app" element={<Gate><Dashboard /></Gate>} />
        <Route path="/app/new" element={<Gate><NewInterview /></Gate>} />
        <Route path="/app/interviews/:id" element={<Gate><Session /></Gate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
