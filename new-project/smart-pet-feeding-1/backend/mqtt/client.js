import mqtt from "mqtt";
import { env } from "../config/env.js";
import { updateSystemStatus } from "../services/systemStateService.js";
import { emitGlobal } from "../sockets/index.js";
import { logger } from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import { handleMqttMessage } from "./handlers.js";

let mqttClient = null;

function hasPlaceholderMqttConfig() {
  const valuesToCheck = [
    env.mqtt.url,
    env.mqtt.host,
    env.mqtt.username,
    env.mqtt.password,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return valuesToCheck.some((value) => {
    return (
      value.includes("your-cluster") ||
      value.includes("your-hivemq-username") ||
      value.includes("your-hivemq-password")
    );
  });
}

function buildBrokerUrl() {
  if (env.mqtt.url) {
    if (String(env.mqtt.url).includes("://")) {
      return env.mqtt.url;
    }

    return `mqtts://${env.mqtt.url}`;
  }

  if (!env.mqtt.host) {
    return "";
  }

  return `mqtts://${env.mqtt.host}:${env.mqtt.port}`;
}

async function broadcastConnectionState(connected, statusMessage) {
  const status = await updateSystemStatus({
    mqttConnected: connected,
    statusMessage,
  });

  emitGlobal("system:status", status);
  emitGlobal("mqtt:status", {
    connected,
  });
}

export async function initializeMqttClient() {
  const brokerUrl = buildBrokerUrl();

  if (!brokerUrl) {
    logger.warn("MQTT broker configuration is missing. Skipping MQTT client startup.");
    await broadcastConnectionState(false, "mqtt-config-missing");
    return null;
  }

  if (hasPlaceholderMqttConfig()) {
    logger.warn(
      "MQTT is using placeholder HiveMQ values. Update MQTT_URL/MQTT_HOST/MQTT_USERNAME/MQTT_PASSWORD in .env before expecting a broker connection.",
    );
    await broadcastConnectionState(false, "mqtt-config-placeholder");
    return null;
  }

  mqttClient = mqtt.connect(brokerUrl, {
    clientId: env.mqtt.clientId,
    username: env.mqtt.username,
    password: env.mqtt.password,
    reconnectPeriod: env.mqtt.reconnectPeriodMs,
    connectTimeout: env.mqtt.connectTimeoutMs,
    rejectUnauthorized: env.mqtt.rejectUnauthorized,
    clean: true,
  });

  mqttClient.on("connect", async () => {
    logger.info("Connected to HiveMQ Cloud.");

    mqttClient.subscribe([
      env.mqtt.topics.presence,
      env.mqtt.topics.foodLevel,
      env.mqtt.topics.system,
      env.mqtt.topics.history,
      env.mqtt.topics.schedule,
    ]);

    await broadcastConnectionState(true, "mqtt-connected");
  });

  mqttClient.on("reconnect", async () => {
    logger.info("Reconnecting to HiveMQ Cloud.");
    await broadcastConnectionState(false, "mqtt-reconnecting");
  });

  mqttClient.on("offline", async () => {
    logger.warn("MQTT client is offline.");
    await broadcastConnectionState(false, "mqtt-offline");
  });

  mqttClient.on("close", async () => {
    logger.warn("MQTT connection closed.");
    await broadcastConnectionState(false, "mqtt-disconnected");
  });

  mqttClient.on("error", async (error) => {
    logger.error("MQTT error.", error.message);
    await broadcastConnectionState(false, "mqtt-error");
  });

  mqttClient.on("message", async (topic, payloadBuffer) => {
    await handleMqttMessage(topic, payloadBuffer.toString("utf8"));
  });

  return mqttClient;
}

function requireConnectedClient() {
  if (!mqttClient || !mqttClient.connected) {
    throw new ApiError(503, "MQTT broker is not connected.");
  }

  return mqttClient;
}

export async function publishMessage(topic, payload) {
  const client = requireConnectedClient();
  const serializedPayload = JSON.stringify(payload);

  await new Promise((resolve, reject) => {
    client.publish(topic, serializedPayload, { qos: 1 }, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function publishDispenseCommand(payload) {
  await publishMessage(env.mqtt.topics.dispense, payload);
}

export async function publishSystemCommand(payload) {
  await publishMessage(env.mqtt.topics.system, payload);
}

export async function publishScheduleCommand(payload) {
  await publishMessage(env.mqtt.topics.schedule, payload);
}
