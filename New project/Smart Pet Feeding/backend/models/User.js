import { DataTypes } from "sequelize";

export function defineUserModel(sequelize) {
  return sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      petName: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      petDetails: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
      },
      ownerPhone: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      tableName: "Users",
    },
  );
}
