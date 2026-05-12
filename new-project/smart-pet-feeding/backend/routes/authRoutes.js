import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  getProfile,
  login,
  logout,
  signup,
  updateProfile,
} from "../controllers/authController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const signupSchema = z.object({
  petName: z.string().trim().min(1).max(120),
  petDetails: z.string().trim().min(1).max(500),
  ownerPhone: z.string().trim().min(7).max(30),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  petName: z.string().trim().min(1).max(120),
  password: z.string().min(6).max(100),
});

const updateProfileSchema = z
  .object({
    petName: z.string().trim().min(1).max(120).optional(),
    petDetails: z.string().trim().min(1).max(500).optional(),
    ownerPhone: z.string().trim().min(7).max(30).optional(),
    password: z.string().min(6).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

router.post("/signup", validate(signupSchema), asyncHandler(signup));
router.post("/login", validate(loginSchema), asyncHandler(login));
router.post("/logout", requireAuth, asyncHandler(logout));
router.get("/profile", requireAuth, asyncHandler(getProfile));
router.put(
  "/profile",
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(updateProfile),
);

export default router;
