import { DataTypes } from "sequelize";

export function defineSystemStatusModel(sequelize) {
  return sequelize.define(
    "SystemStatus",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      systemEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lowFoodAlert: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastDispense: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      foodLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
      },
      petDetected: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      mqttConnected: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      statusMessage: {
        type: DataTypes.STRING(60),
        allowNull: false,
        defaultValue: "idle",
      },
    },
    {
      tableName: "SystemStatus",
    },
  );
}
