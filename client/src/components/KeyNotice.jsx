import { useEffect, useState } from "react";

export default function KeyNotice() {
  const [ready, setReady] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setReady(Boolean(data.gemini));
      })
      .catch(() => {
        if (!cancelled) setReady(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (ready !== false) return null;

  return (
    <p className="banner error" role="status">
      Add GEMINI_API_KEY to server/.env and restart the API. DryRun cannot write or score questions until that key is set.
    </p>
  );
}
