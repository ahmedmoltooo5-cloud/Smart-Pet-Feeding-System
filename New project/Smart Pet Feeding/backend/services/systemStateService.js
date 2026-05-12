import { SensorLog, SystemStatus } from "../models/index.js";
import { env } from "../config/env.js";

const defaultState = {
  systemEnabled: true,
  lowFoodAlert: false,
  lastDispense: null,
  foodLevel: 100,
  petDetected: false,
  mqttConnected: false,
  statusMessage: "idle",
};

export function serializeSystemStatus(status) {
  const source = typeof status.toJSON === "function" ? status.toJSON() : status;

  return {
    id: source.id,
    systemEnabled: source.systemEnabled,
    lowFoodAlert: source.lowFoodAlert,
    lastDispense: source.lastDispense,
    foodLevel: source.foodLevel,
    petDetected: source.petDetected,
    mqttConnected: source.mqttConnected,
    statusMessage: source.statusMessage,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export function serializeSensorLog(log) {
  const source = typeof log.toJSON === "function" ? log.toJSON() : log;

  return {
    id: source.id,
    foodLevel: source.foodLevel,
    petDetected: source.petDetected,
    systemStatus: source.systemStatus,
    createdAt: source.createdAt,
  };
}

async function getOrCreateSystemStatusRecord() {
  const existing = await SystemStatus.findOne({
    order: [["id", "ASC"]],
  });

  if (existing) {
    return existing;
  }

  return SystemStatus.create(defaultState);
}

export async function initializeSystemStatus() {
  const status = await getOrCreateSystemStatusRecord();
  return serializeSystemStatus(status);
}

export async function getSystemStatus() {
  const status = await getOrCreateSystemStatusRecord();
  return serializeSystemStatus(status);
}

export async function updateSystemStatus(partialState) {
  const status = await getOrCreateSystemStatusRecord();

  const nextFoodLevel =
    partialState.foodLevel !== undefined ? partialState.foodLevel : status.foodLevel;

  status.systemEnabled = partialState.systemEnabled ?? status.systemEnabled;
  status.foodLevel = nextFoodLevel;
  status.petDetected = partialState.petDetected ?? status.petDetected;
  status.mqttConnected = partialState.mqttConnected ?? status.mqttConnected;
  status.statusMessage = partialState.statusMessage ?? status.statusMessage;
  status.lastDispense = partialState.lastDispense ?? status.lastDispense;
  status.lowFoodAlert = partialState.lowFoodAlert ?? nextFoodLevel <= env.lowFoodThreshold;

  await status.save();
  return serializeSystemStatus(status);
}

export async function recordSensorSnapshot({
  foodLevel,
  petDetected,
  systemStatus,
  mqttConnected,
}) {
  const currentStatus = await getOrCreateSystemStatusRecord();

  const nextFoodLevel = foodLevel ?? currentStatus.foodLevel;
  const nextPetDetected = petDetected ?? currentStatus.petDetected;
  const nextStatusMessage = systemStatus ?? currentStatus.statusMessage;

  const sensorLog = await SensorLog.create({
    foodLevel: nextFoodLevel,
    petDetected: nextPetDetected,
    systemStatus: nextStatusMessage,
  });

  currentStatus.foodLevel = nextFoodLevel;
  currentStatus.petDetected = nextPetDetected;
  currentStatus.statusMessage = nextStatusMessage;
  currentStatus.mqttConnected = mqttConnected ?? currentStatus.mqttConnected;
  currentStatus.lowFoodAlert = nextFoodLevel <= env.lowFoodThreshold;

  await currentStatus.save();

  return {
    sensorLog: serializeSensorLog(sensorLog),
    systemStatus: serializeSystemStatus(currentStatus),
  };
}

export async function getSensorLogs(limit = 50) {
  const logs = await SensorLog.findAll({
    order: [["createdAt", "DESC"]],
    limit,
  });

  return logs.map(serializeSensorLog);
}
