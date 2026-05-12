import type { FeedingHistoryRecord } from "../types";
import { request } from "./api";
import { mapHistoryRecord } from "./mappers";

interface HistoryQuery {
  search?: string;
  feedingType?: "manual" | "automatic";
  sort?: "asc" | "desc";
}

function buildQueryString(query: HistoryQuery) {
  const params = new URLSearchParams();

  if (query.search) {
    params.set("search", query.search);
  }

  if (query.feedingType) {
    params.set("feedingType", query.feedingType);
  }

  if (query.sort) {
    params.set("sort", query.sort);
  }

  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function fetchFeedingHistory(query: HistoryQuery = {}) {
  const response = await request<{ items: any[] }>(`/history${buildQueryString(query)}`);

  return response.items.map((item) => mapHistoryRecord(item)) as FeedingHistoryRecord[];
}

export function deleteFeedingHistoryEntry(id: number) {
  return request<{ message: string }>(`/history/${id}`, {
    method: "DELETE",
  });
}
