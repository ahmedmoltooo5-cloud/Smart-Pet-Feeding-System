import { emitToUser } from "../sockets/index.js";
import { broadcastScheduleToHardware } from "../services/commandService.js";
import {
  createScheduleForUser,
  deleteScheduleForUser,
  listSchedulesForUser,
  updateScheduleForUser,
} from "../services/scheduleService.js";
import { ApiError } from "../utils/apiError.js";

export async function getSchedules(req, res) {
  const schedules = await listSchedulesForUser(req.auth.userId);
  res.json({
    items: schedules,
  });
}

export async function createSchedule(req, res) {
  const schedule = await createScheduleForUser(req.auth.userId, req.body);

  await broadcastScheduleToHardware({
    action: "create",
    schedule,
  });

  emitToUser(req.auth.userId, "schedule:updated", schedule);

  res.status(201).json({
    schedule,
  });
}

export async function updateSchedule(req, res) {
  const schedule = await updateScheduleForUser(
    req.auth.userId,
    Number(req.params.id),
    req.body,
  );

  if (!schedule) {
    throw new ApiError(404, "Schedule was not found.");
  }

  await broadcastScheduleToHardware({
    action: "update",
    schedule,
  });

  emitToUser(req.auth.userId, "schedule:updated", schedule);

  res.json({
    schedule,
  });
}

export async function deleteSchedule(req, res) {
  const scheduleId = Number(req.params.id);
  const deleted = await deleteScheduleForUser(req.auth.userId, scheduleId);

  if (!deleted) {
    throw new ApiError(404, "Schedule was not found.");
  }

  await broadcastScheduleToHardware({
    action: "delete",
    scheduleId,
  });

  emitToUser(req.auth.userId, "schedule:deleted", {
    id: scheduleId,
  });

  res.json({
    message: "Schedule deleted successfully.",
  });
}
