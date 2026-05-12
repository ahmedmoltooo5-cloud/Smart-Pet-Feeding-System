import type { ScheduleItem } from "../types";
import { request } from "./api";
import { mapScheduleItem } from "./mappers";

interface SchedulePayload {
  feedingTime: string;
  enabled: boolean;
  repeatMode: "daily" | "once" | "weekdays" | "weekends";
}

export async function fetchSchedules() {
  const response = await request<{ items: any[] }>("/schedules");
  return response.items.map((item) => mapScheduleItem(item)) as ScheduleItem[];
}

export async function createSchedule(payload: SchedulePayload) {
  const response = await request<{ schedule: any }>("/schedules", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return mapScheduleItem(response.schedule);
}

export async function updateSchedule(id: number, payload: Partial<SchedulePayload>) {
  const response = await request<{ schedule: any }>(`/schedules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return mapScheduleItem(response.schedule);
}

export function deleteSchedule(id: number) {
  return request<{ message: string }>(`/schedules/${id}`, {
    method: "DELETE",
  });
}
