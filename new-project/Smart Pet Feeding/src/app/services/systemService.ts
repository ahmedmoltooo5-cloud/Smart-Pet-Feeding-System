import type { FeedingHistoryRecord, SensorLogItem, SystemStatusSnapshot } from "../types";
import { request } from "./api";
import { mapHistoryRecord, mapSensorLog, mapSystemStatus } from "./mappers";

export async function fetchSystemStatus() {
  const response = await request<{ status: any }>("/system/status");
  return mapSystemStatus(response.status) as SystemStatusSnapshot;
}

export async function fetchSensorLogs(limit = 50) {
  const response = await request<{ items: any[] }>(`/system/sensors?limit=${limit}`);
  return response.items.map((item) => mapSensorLog(item)) as SensorLogItem[];
}

export async function dispenseFood(amount = 1) {
  const response = await request<{ history: any }>("/system/dispense", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

  return mapHistoryRecord(response.history) as FeedingHistoryRecord;
}

export async function stopFeederSystem() {
  const response = await request<{ status: any }>("/system/stop", {
    method: "POST",
  });

  return mapSystemStatus(response.status) as SystemStatusSnapshot;
}

export async function startFeederSystem() {
  const response = await request<{ status: any }>("/system/start", {
    method: "POST",
  });

  return mapSystemStatus(response.status) as SystemStatusSnapshot;
}
