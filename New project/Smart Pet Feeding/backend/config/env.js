import dotenv from "dotenv";

dotenv.config();

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

export const env = {
  port: parseNumber(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  defaultDispenseAmount: parseNumber(process.env.DEFAULT_DISPENSE_AMOUNT, 1),
  lowFoodThreshold: parseNumber(process.env.SYSTEM_LOW_FOOD_THRESHOLD, 20),
  schedulePollIntervalMs: parseNumber(process.env.SCHEDULE_POLL_INTERVAL_MS, 30000),
  timeZone: process.env.APP_TIMEZONE ?? "UTC",
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: parseNumber(process.env.DB_PORT, 1433),
    name: process.env.DB_NAME ?? "SmartPetFeeder",
    user: process.env.DB_USER ?? "sa",
    password: process.env.DB_PASSWORD ?? "YourStrong!Passw0rd",
    encrypt: parseBoolean(process.env.DB_ENCRYPT, false),
    trustServerCertificate: parseBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
  },
  mqtt: {
    url: process.env.MQTT_URL ?? "",
    host: process.env.MQTT_HOST ?? "",
    port: parseNumber(process.env.MQTT_PORT, 8883),
    username: process.env.MQTT_USERNAME ?? "",
    password: process.env.MQTT_PASSWORD ?? "",
    clientId: process.env.MQTT_CLIENT_ID ?? "smart-pet-feeder-backend",
    rejectUnauthorized: parseBoolean(process.env.MQTT_REJECT_UNAUTHORIZED, true),
    reconnectPeriodMs: parseNumber(process.env.MQTT_RECONNECT_PERIOD_MS, 5000),
    connectTimeoutMs: parseNumber(process.env.MQTT_CONNECT_TIMEOUT_MS, 30000),
    topics: {
      presence: process.env.MQTT_TOPIC_PRESENCE ?? "petfeeder/presence",
      foodLevel: process.env.MQTT_TOPIC_FOOD_LEVEL ?? "petfeeder/foodlevel",
      dispense: process.env.MQTT_TOPIC_DISPENSE ?? "petfeeder/dispense",
      system: process.env.MQTT_TOPIC_SYSTEM ?? "petfeeder/system",
      history: process.env.MQTT_TOPIC_HISTORY ?? "petfeeder/history",
      schedule: process.env.MQTT_TOPIC_SCHEDULE ?? "petfeeder/schedule",
    },
  },
};
