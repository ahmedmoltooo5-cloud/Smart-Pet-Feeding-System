import tedious from "tedious";
import { Sequelize } from "sequelize";
import { env } from "./env.js";

function createSequelize(databaseName) {
  return new Sequelize(databaseName, env.db.user, env.db.password, {
    dialect: "postgres",
    host: env.db.host,
    port: env.db.port,
    logging: false,
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
},    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

const databaseNamePattern = /^[A-Za-z0-9_]+$/;

export const sequelize = createSequelize(env.db.name);

export async function ensureDatabaseExists() {
  if (!databaseNamePattern.test(env.db.name)) {
    throw new Error("DB_NAME may only contain letters, numbers, and underscores.");
  }

  const adminSequelize = createSequelize("master");
  const escapedName = env.db.name.replaceAll("]", "]]");

  try {
    await adminSequelize.authenticate();
    await adminSequelize.query(
      `IF DB_ID(N'${escapedName}') IS NULL CREATE DATABASE [${escapedName}]`,
    );
  } finally {
    await adminSequelize.close();
  }
}
