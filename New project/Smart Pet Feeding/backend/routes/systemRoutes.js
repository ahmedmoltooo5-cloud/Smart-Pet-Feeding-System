import { Router } from "express";
import { z } from "zod";
import {
  getSensors,
  getStatus,
  manualDispense,
  startSystem,
  stopSystem,
} from "../controllers/systemController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const dispenseSchema = z.object({
  amount: z.number().int().positive().max(10).optional().default(1),
});

const sensorQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
});

router.get("/status", requireAuth, asyncHandler(getStatus));
router.get("/sensors", requireAuth, validate(sensorQuerySchema, "query"), asyncHandler(getSensors));
router.post("/dispense", requireAuth, validate(dispenseSchema), asyncHandler(manualDispense));
router.post("/start", requireAuth, asyncHandler(startSystem));
router.post("/stop", requireAuth, asyncHandler(stopSystem));

export default router;
