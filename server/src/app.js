import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { interviewRouter } from "./routes/interviews.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());

  const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: "200kb" }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Wait a few minutes and try again." },
  });

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, gemini: Boolean(process.env.GEMINI_API_KEY) });
  });
  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/interviews", interviewRouter);
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  if (process.env.NODE_ENV === "production") {
    const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
    const indexFile = path.join(dist, "index.html");
    if (fs.existsSync(indexFile)) {
      app.use(express.static(dist));
      app.use((req, res, next) => {
        if (req.method !== "GET") return next();
        res.sendFile(indexFile);
      });
    }
  }

  app.use(errorHandler);
  return app;
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  if (!error.status) console.error(error);
  res.status(status).json({
    error: error.status ? error.message : "Something went wrong.",
    ...(error.details ? { details: error.details } : {}),
  });
}
