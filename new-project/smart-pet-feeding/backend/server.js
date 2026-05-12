import http from "node:http";
import app from "./app.js";
import { env } from "./config/env.js";
import { User } from "./models/index.js";
import { syncDatabase } from "./models/index.js";
import { initializeMqttClient } from "./mqtt/client.js";
import { dispatchDispenseCommand } from "./services/commandService.js";
import { startScheduleRunner } from "./services/scheduleService.js";
import { initializeSystemStatus } from "./services/systemStateService.js";
import { initializeSocketServer } from "./sockets/index.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  await syncDatabase();
  await initializeSystemStatus();

  const server = http.createServer(app);
  initializeSocketServer(server);
  await initializeMqttClient();

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      logger.error(
        `Port ${env.port} is already in use. Stop the existing server or change PORT in .env, then try again.`,
      );
      process.exit(1);
    }

    logger.error("HTTP server failed to start.", error);
    process.exit(1);
  });

  await startScheduleRunner(async (schedule) => {
    const user = schedule.user ?? (await User.findByPk(schedule.userId));

    await dispatchDispenseCommand({
      userId: schedule.userId,
      petName: user?.petName ?? "Unknown",
      feedingType: "automatic",
      scheduleId: schedule.id,
    });
  });

  server.listen(env.port, () => {
    logger.info(`Smart Pet Feeder backend listening on port ${env.port}.`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start Smart Pet Feeder backend.", error);
  process.exit(1);
});
