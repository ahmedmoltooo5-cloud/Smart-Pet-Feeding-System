import { User } from "../models/index.js";
import { env } from "../config/env.js";
import { emitGlobal, emitToUser } from "../sockets/index.js";
import {
  createHistoryEntry,
  updateHistoryEntryStatus,
} from "../services/historyService.js";
import {
  recordSensorSnapshot,
  updateSystemStatus,
} from "../services/systemStateService.js";

function safeJsonParse(payload) {
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function coerceBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "on", "detected", "present"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function coerceNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function resolveUserId(payload) {
  if (payload?.userId) {
    return payload.userId;
  }

  if (payload?.petName) {
    const user = await User.findOne({
      where: {
        petName: payload.petName,
      },
    });

    return user?.id ?? null;
  }

  return null;
}

async function handlePresencePayload(payload) {
  const petDetected = coerceBoolean(payload?.petDetected ?? payload?.present ?? payload);
  const result = await recordSensorSnapshot({
    petDetected,
    systemStatus: petDetected ? "pet-detected" : "idle",
    mqttConnected: true,
  });

  emitGlobal("sensor:log", result.sensorLog);
  emitGlobal("system:status", result.systemStatus);
}

async function handleFoodLevelPayload(payload) {
  const foodLevel = coerceNumber(payload?.foodLevel ?? payload?.percentage ?? payload);
  const result = await recordSensorSnapshot({
    foodLevel,
    systemStatus: foodLevel <= 0 ? "empty" : "running",
    mqttConnected: true,
  });

  emitGlobal("sensor:log", result.sensorLog);
  emitGlobal("system:status", result.systemStatus);
}

async function handleSystemPayload(payload) {
  const nextStatus = await updateSystemStatus({
    mqttConnected: true,
    systemEnabled:
      payload?.systemEnabled !== undefined
        ? coerceBoolean(payload.systemEnabled)
        : undefined,
    petDetected:
      payload?.petDetected !== undefined ? coerceBoolean(payload.petDetected) : undefined,
    foodLevel:
      payload?.foodLevel !== undefined ? coerceNumber(payload.foodLevel) : undefined,
    lastDispense: payload?.lastDispense ? new Date(payload.lastDispense) : undefined,
    statusMessage: payload?.status ?? payload?.message ?? "running",
  });

  emitGlobal("system:status", nextStatus);
}

async function handleHistoryPayload(payload) {
  const userId = await resolveUserId(payload);
  const feedingTime = payload?.feedingTime ? new Date(payload.feedingTime) : new Date();
  const status = payload?.status ?? "dispensed";
  const foodLevel =
    payload?.foodLevel !== undefined ? coerceNumber(payload.foodLevel) : null;
  const dispenseAmount =
    payload?.dispenseAmount !== undefined ? coerceNumber(payload.dispenseAmount, 1) : 1;

  let historyEntry = null;

  if (payload?.correlationId) {
    historyEntry = await updateHistoryEntryStatus({
      correlationId: payload.correlationId,
      status,
      feedingTime,
      foodLevel,
      dispenseAmount,
    });
  }

  if (!historyEntry) {
    historyEntry = await createHistoryEntry({
      userId,
      petName: payload?.petName ?? "Unknown",
      feedingType: payload?.feedingType === "automatic" ? "automatic" : "manual",
      feedingTime,
      dispenseAmount,
      foodLevel,
      status,
      correlationId: payload?.correlationId ?? null,
    });
  }

  const systemStatus = await updateSystemStatus({
    lastDispense: feedingTime,
    foodLevel: foodLevel ?? undefined,
    statusMessage: status,
    mqttConnected: true,
  });

  emitGlobal("system:status", systemStatus);

  if (historyEntry.userId) {
    emitToUser(historyEntry.userId, "feeding:updated", historyEntry);
  } else {
    emitGlobal("feeding:updated", historyEntry);
  }
}

export async function handleMqttMessage(topic, rawPayload) {
  const payload = safeJsonParse(rawPayload);

  if (topic === env.mqtt.topics.presence) {
    await handlePresencePayload(payload);
    return;
  }

  if (topic === env.mqtt.topics.foodLevel) {
    await handleFoodLevelPayload(payload);
    return;
  }

  if (topic === env.mqtt.topics.system) {
    await handleSystemPayload(payload);
    return;
  }

  if (topic === env.mqtt.topics.history) {
    await handleHistoryPayload(payload);
  }
}
