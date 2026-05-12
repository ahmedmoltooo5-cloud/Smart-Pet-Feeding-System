import { DataTypes } from "sequelize";

export function defineSensorLogModel(sequelize) {
  return sequelize.define(
    "SensorLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      foodLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      petDetected: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      systemStatus: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
    },
    {
      tableName: "SensorLogs",
      updatedAt: false,
    },
  );
}
