import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const EMBEDDED_PORT = 27018;

export async function connectDb() {
  mongoose.set("strictQuery", true);

  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    return;
  }

  const dbPath = path.resolve("data/mongo");
  fs.mkdirSync(dbPath, { recursive: true });

  try {
    const mongod = await MongoMemoryServer.create({
      instance: {
        port: EMBEDDED_PORT,
        dbPath,
        storageEngine: "wiredTiger",
      },
    });
    await mongoose.connect(mongod.getUri("dryrun"));
    console.log(`Connected to embedded MongoDB on port ${EMBEDDED_PORT}.`);
    console.log("Interview history is stored in server/data/mongo.");
    console.log("Set MONGO_URI in server/.env to use Atlas or your own mongod.");
  } catch (error) {
    try {
      await mongoose.connect(`mongodb://127.0.0.1:${EMBEDDED_PORT}/dryrun`);
      console.log(`Reconnected to embedded MongoDB already running on port ${EMBEDDED_PORT}.`);
    } catch {
      throw error;
    }
  }
}
