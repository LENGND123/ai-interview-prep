import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { asyncHandler } from "../asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { loginSchema, parseBody, registerSchema } from "../validators.js";
import { presentUser } from "../present.js";
import { httpError } from "../httpError.js";

export const authRouter = express.Router();

function sign(user) {
  return jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password } = parseBody(registerSchema, req.body);
    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) throw httpError(409, "An account with that email already exists");

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await User.create({ name, email: normalizedEmail, passwordHash });
    } catch (error) {
      if (error.code === 11000) throw httpError(409, "An account with that email already exists");
      throw error;
    }

    res.status(201).json({ token: sign(user), user: presentUser(user) });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = parseBody(loginSchema, req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw httpError(401, "Invalid email or password");
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) throw httpError(401, "Invalid email or password");
    res.json({ token: sign(user), user: presentUser(user) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: presentUser(req.user) });
  })
);
