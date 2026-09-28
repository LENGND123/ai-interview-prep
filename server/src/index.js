import "dotenv/config";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error("Set JWT_SECRET in server/.env to a long random string (16+ characters).");
  process.exit(1);
}

const port = Number(process.env.PORT) || 5000;

await connectDb();
createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
