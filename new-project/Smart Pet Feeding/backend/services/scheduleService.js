import { Schedule, User } from "../models/index.js";
import { env } from "../config/env.js";
import { getSystemStatus } from "./systemStateService.js";
import { logger } from "../utils/logger.js";

let scheduleTimer = null;

function pad(value) {
  return String(value).padStart(2, "0");
}

function getLocalParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    weekday: parts.weekday,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function hasAlreadyTriggeredToday(lastTriggeredAt, currentDate, timeZone) {
  if (!lastTriggeredAt) {
    return false;
  }

  const lastParts = getLocalParts(new Date(lastTriggeredAt), timeZone);
  const currentParts = getLocalParts(currentDate, timeZone);

  return (
    lastParts.year === currentParts.year &&
    lastParts.month === currentParts.month &&
    lastParts.day === currentParts.day
  );
}

function repeatModeMatches(repeatMode, weekday) {
  if (repeatMode === "daily" || repeatMode === "once") {
    return true;
  }

  const isWeekend = weekday === "Sat" || weekday === "Sun";

  if (repeatMode === "weekdays") {
    return !isWeekend;
  }

  if (repeatMode === "weekends") {
    return isWeekend;
  }

  return true;
}

export function serializeSchedule(schedule) {
  const source = typeof schedule.toJSON === "function" ? schedule.toJSON() : schedule;

  return {
    id: source.id,
    feedingTime: source.feedingTime,
    enabled: source.enabled,
    repeatMode: source.repeatMode,
    lastTriggeredAt: source.lastTriggeredAt,
    userId: source.userId,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export async function listSchedulesForUser(userId) {
  const schedules = await Schedule.findAll({
    where: {
      userId,
    },
    order: [["feedingTime", "ASC"]],
  });

  return schedules.map(serializeSchedule);
}

export async function createScheduleForUser(userId, payload) {
  const schedule = await Schedule.create({
    userId,
    feedingTime: payload.feedingTime,
    enabled: payload.enabled,
    repeatMode: payload.repeatMode,
  });

  return serializeSchedule(schedule);
}

export async function updateScheduleForUser(userId, scheduleId, payload) {
  const schedule = await Schedule.findOne({
    where: {
      id: scheduleId,
      userId,
    },
  });

  if (!schedule) {
    return null;
  }

  schedule.feedingTime = payload.feedingTime ?? schedule.feedingTime;
  schedule.enabled = payload.enabled ?? schedule.enabled;
  schedule.repeatMode = payload.repeatMode ?? schedule.repeatMode;

  await schedule.save();
  return serializeSchedule(schedule);
}

export async function deleteScheduleForUser(userId, scheduleId) {
  const deleted = await Schedule.destroy({
    where: {
      id: scheduleId,
      userId,
    },
  });

  return deleted > 0;
}

export async function startScheduleRunner(onTrigger) {
  if (scheduleTimer) {
    clearInterval(scheduleTimer);
  }

  const checkSchedules = async () => {
    const systemStatus = await getSystemStatus();

    if (!systemStatus.systemEnabled) {
      return;
    }

    const now = new Date();
    const localNow = getLocalParts(now, env.timeZone);

    const schedules = await Schedule.findAll({
      where: {
        enabled: true,
      },
      include: [
        {
          model: User,
          as: "user",
        },
      ],
      order: [["feedingTime", "ASC"]],
    });

    for (const schedule of schedules) {
      if (!repeatModeMatches(schedule.repeatMode, localNow.weekday)) {
        continue;
      }

      if (schedule.feedingTime !== localNow.time) {
        continue;
      }

      if (hasAlreadyTriggeredToday(schedule.lastTriggeredAt, now, env.timeZone)) {
        continue;
      }

      schedule.lastTriggeredAt = now;

      if (schedule.repeatMode === "once") {
        schedule.enabled = false;
      }

      await schedule.save();
      await onTrigger({
        ...serializeSchedule(schedule),
        user: schedule.user,
      });
    }
  };

  await checkSchedules();
  scheduleTimer = setInterval(() => {
    void checkSchedules().catch((error) => {
      logger.error("Scheduled feeding runner failed.", error);
    });
  }, env.schedulePollIntervalMs);
}

export function stopScheduleRunner() {
  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }
}
