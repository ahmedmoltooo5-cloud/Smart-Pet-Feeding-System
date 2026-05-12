import { DataTypes } from "sequelize";

export function defineScheduleModel(sequelize) {
  return sequelize.define(
    "Schedule",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      feedingTime: {
        type: DataTypes.STRING(5),
        allowNull: false,
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      repeatMode: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "daily",
      },
      lastTriggeredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "Schedules",
    },
  );
}
