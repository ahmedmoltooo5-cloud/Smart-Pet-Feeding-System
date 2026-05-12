import { Router } from "express";
import { z } from "zod";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  updateSchedule,
} from "../controllers/scheduleController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const scheduleSchema = z.object({
  feedingTime: z.string().regex(/^\d{2}:\d{2}$/),
  enabled: z.boolean(),
  repeatMode: z.enum(["daily", "once", "weekdays", "weekends"]),
});

const partialScheduleSchema = scheduleSchema.partial().refine((value) => {
  return Object.keys(value).length > 0;
}, "At least one schedule field must be provided.");

router.get("/", requireAuth, asyncHandler(getSchedules));
router.post("/", requireAuth, validate(scheduleSchema), asyncHandler(createSchedule));
router.put(
  "/:id",
  requireAuth,
  validate(partialScheduleSchema),
  asyncHandler(updateSchedule),
);
router.delete("/:id", requireAuth, asyncHandler(deleteSchedule));

export default router;
