import type {
  ApiUser,
  FeedingHistoryRecord,
  PetProfile,
  ScheduleItem,
  SensorLogItem,
  SystemStatusSnapshot,
} from "../types";

export function mapApiUserToPetProfile(user: ApiUser): PetProfile {
  return {
    id: user.id,
    name: user.petName,
    details: user.petDetails,
    ownerPhone: user.ownerPhone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function mapHistoryRecord(record: any): FeedingHistoryRecord {
  return {
    id: record.id,
    petName: record.petName,
    type: record.feedingType,
    date: record.feedingTime ?? record.createdAt,
    dispenseAmount: record.dispenseAmount,
    foodLevel: record.foodLevel ?? null,
    status: record.status ?? "requested",
    correlationId: record.correlationId ?? null,
  };
}

export function mapScheduleItem(schedule: any): ScheduleItem {
  return {
    id: schedule.id,
    feedingTime: schedule.feedingTime,
    enabled: schedule.enabled,
    repeatMode: schedule.repeatMode,
    lastTriggeredAt: schedule.lastTriggeredAt ?? null,
  };
}

export function mapSystemStatus(status: any): SystemStatusSnapshot {
  return {
    id: status.id,
    systemEnabled: status.systemEnabled,
    lowFoodAlert: status.lowFoodAlert,
    lastDispense: status.lastDispense ?? null,
    foodLevel: status.foodLevel,
    petDetected: status.petDetected,
    mqttConnected: status.mqttConnected,
    statusMessage: status.statusMessage,
  };
}

export function mapSensorLog(log: any): SensorLogItem {
  return {
    id: log.id,
    foodLevel: log.foodLevel,
    petDetected: log.petDetected,
    systemStatus: log.systemStatus,
    createdAt: log.createdAt,
  };
}
