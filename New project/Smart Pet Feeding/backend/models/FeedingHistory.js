import { DataTypes } from "sequelize";

export function defineFeedingHistoryModel(sequelize) {
  return sequelize.define(
    "FeedingHistory",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      petName: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      feedingType: {
        type: DataTypes.ENUM("manual", "automatic"),
        allowNull: false,
      },
      feedingTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      dispenseAmount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      foodLevel: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "requested",
      },
      correlationId: {
        type: DataTypes.STRING(120),
        allowNull: true,
        unique: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "FeedingHistory",
    },
  );
}
