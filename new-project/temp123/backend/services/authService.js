import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function sanitizeUser(user) {
  const source = typeof user.toJSON === "function" ? user.toJSON() : user;

  return {
    id: source.id,
    petName: source.petName,
    petDetails: source.petDetails,
    ownerPhone: source.ownerPhone,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export function generateAuthToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      petName: user.petName,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    },
  );
}
