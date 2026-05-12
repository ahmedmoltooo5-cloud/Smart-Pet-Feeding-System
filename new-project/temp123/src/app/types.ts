export interface ApiUser {
  id: number;
  petName: string;
  petDetails: string;
  ownerPhone: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PetProfile {
  id: number;
  name: string;
  details: string;
  ownerPhone: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StoredAuthSession {
  token: string;
  user: ApiUser;
}

export interface FeedingHistoryRecord {
  id: number;
  petName: string;
  type: "manual" | "automatic";
  date: string;
  dispenseAmount: number;
  foodLevel: number | null;
  status: string;
  correlationId: string | null;
}

export interface ScheduleItem {
  id: number;
  feedingTime: string;
  enabled: boolean;
  repeatMode: "daily" | "once" | "weekdays" | "weekends";
  lastTriggeredAt: string | null;
}

export interface SystemStatusSnapshot {
  id: number;
  systemEnabled: boolean;
  lowFoodAlert: boolean;
  lastDispense: string | null;
  foodLevel: number;
  petDetected: boolean;
  mqttConnected: boolean;
  statusMessage: string;
}

export interface SensorLogItem {
  id: number;
  foodLevel: number;
  petDetected: boolean;
  systemStatus: string;
  createdAt: string;
}
