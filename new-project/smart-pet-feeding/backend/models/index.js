import { sequelize } from "../config/database.js";
import { defineFeedingHistoryModel } from "./FeedingHistory.js";
import { defineScheduleModel } from "./Schedule.js";
import { defineSensorLogModel } from "./SensorLog.js";
import { defineSystemStatusModel } from "./SystemStatus.js";
import { defineUserModel } from "./User.js";

export const User = defineUserModel(sequelize);
export const FeedingHistory = defineFeedingHistoryModel(sequelize);
export const SensorLog = defineSensorLogModel(sequelize);
export const Schedule = defineScheduleModel(sequelize);
export const SystemStatus = defineSystemStatusModel(sequelize);

User.hasMany(FeedingHistory, {
  foreignKey: "userId",
  as: "feedingHistory",
});

FeedingHistory.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

User.hasMany(Schedule, {
  foreignKey: "userId",
  as: "schedules",
});

Schedule.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

export async function syncDatabase() {
  await sequelize.sync();
}
