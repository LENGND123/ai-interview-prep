import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { httpError } from "../httpError.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) throw httpError(401, "Login required");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) throw httpError(401, "Login required");
    req.user = user;
    next();
  } catch (error) {
    if (error.status) return next(error);
    next(httpError(401, "Login required"));
  }
}
