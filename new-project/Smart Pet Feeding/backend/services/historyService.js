import { Op } from "sequelize";
import { FeedingHistory } from "../models/index.js";
import { env } from "../config/env.js";

export function serializeHistoryEntry(entry) {
  const source = typeof entry.toJSON === "function" ? entry.toJSON() : entry;

  return {
    id: source.id,
    userId: source.userId ?? null,
    petName: source.petName,
    feedingType: source.feedingType,
    feedingTime: source.feedingTime,
    dispenseAmount: source.dispenseAmount,
    foodLevel: source.foodLevel,
    status: source.status,
    correlationId: source.correlationId ?? null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export async function createHistoryEntry({
  userId,
  petName,
  feedingType,
  feedingTime = new Date(),
  dispenseAmount = env.defaultDispenseAmount,
  foodLevel = null,
  status = "requested",
  correlationId = null,
}) {
  const entry = await FeedingHistory.create({
    userId,
    petName,
    feedingType,
    feedingTime,
    dispenseAmount,
    foodLevel,
    status,
    correlationId,
  });

  return serializeHistoryEntry(entry);
}

export async function findHistoryEntryByCorrelationId(correlationId) {
  if (!correlationId) {
    return null;
  }

  const entry = await FeedingHistory.findOne({
    where: {
      correlationId,
    },
  });

  return entry ? serializeHistoryEntry(entry) : null;
}

export async function updateHistoryEntryStatus({
  correlationId,
  status,
  feedingTime = null,
  foodLevel = null,
  dispenseAmount = null,
}) {
  const entry = await FeedingHistory.findOne({
    where: {
      correlationId,
    },
  });

  if (!entry) {
    return null;
  }

  entry.status = status;

  if (feedingTime) {
    entry.feedingTime = feedingTime;
  }

  if (foodLevel !== null && foodLevel !== undefined) {
    entry.foodLevel = foodLevel;
  }

  if (dispenseAmount !== null && dispenseAmount !== undefined) {
    entry.dispenseAmount = dispenseAmount;
  }

  await entry.save();
  return serializeHistoryEntry(entry);
}

export async function listHistoryEntries({
  userId,
  search,
  feedingType,
  sort = "desc",
}) {
  const where = {};

  if (userId) {
    where.userId = userId;
  }

  if (search) {
    where.petName = {
      [Op.like]: `%${search}%`,
    };
  }

  if (feedingType) {
    where.feedingType = feedingType;
  }

  const entries = await FeedingHistory.findAll({
    where,
    order: [["feedingTime", sort.toLowerCase() === "asc" ? "ASC" : "DESC"]],
  });

  return entries.map(serializeHistoryEntry);
}

export async function deleteHistoryEntry({ id, userId }) {
  const deleted = await FeedingHistory.destroy({
    where: {
      id,
      userId,
    },
  });

  return deleted > 0;
}
