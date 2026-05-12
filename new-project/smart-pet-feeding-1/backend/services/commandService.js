import crypto from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { emitGlobal, emitToUser } from "../sockets/index.js";
import { publishDispenseCommand, publishScheduleCommand, publishSystemCommand } from "../mqtt/client.js";
import { createHistoryEntry } from "./historyService.js";
import { getSystemStatus, updateSystemStatus } from "./systemStateService.js";

export async function dispatchDispenseCommand({
  userId,
  petName,
  feedingType = "manual",
  dispenseAmount = env.defaultDispenseAmount,
  scheduleId = null,
}) {
  const systemStatus = await getSystemStatus();

  if (!systemStatus.systemEnabled) {
    throw new ApiError(409, "The feeder system is currently stopped.");
  }

  if (!systemStatus.mqttConnected) {
    throw new ApiError(503, "MQTT broker is disconnected. Please reconnect the feeder.");
  }

  const correlationId = crypto.randomUUID();

  const historyEntry = await createHistoryEntry({
    userId,
    petName,
    feedingType,
    dispenseAmount,
    foodLevel: systemStatus.foodLevel,
    correlationId,
    status: "requested",
  });

  await publishDispenseCommand({
    command: "dispense",
    correlationId,
    userId,
    petName,
    feedingType,
    dispenseAmount,
    scheduleId,
    requestedAt: new Date().toISOString(),
  });

  emitToUser(userId, "feeding:created", historyEntry);

  return historyEntry;
}

export async function setSystemEnabled(enabled, requestedByUserId = null) {
  const status = await updateSystemStatus({
    systemEnabled: enabled,
    statusMessage: enabled ? "running" : "stopped",
  });

  await publishSystemCommand({
    command: enabled ? "start" : "stop",
    requestedByUserId,
    requestedAt: new Date().toISOString(),
  });

  emitGlobal("system:status", status);

  return status;
}

export async function broadcastScheduleToHardware(payload) {
  await publishScheduleCommand(payload);
}
