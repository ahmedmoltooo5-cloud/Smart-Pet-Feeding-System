import { Router } from "express";
import { z } from "zod";
import { getHistory, removeHistory } from "../controllers/historyController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const historyQuerySchema = z.object({
  search: z.string().trim().optional(),
  feedingType: z.enum(["manual", "automatic"]).optional(),
  sort: z.enum(["asc", "desc"]).optional(),
});

router.get(
  "/",
  requireAuth,
  validate(historyQuerySchema, "query"),
  asyncHandler(getHistory),
);
router.delete("/:id", requireAuth, asyncHandler(removeHistory));

export default router;
