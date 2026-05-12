import cors from "cors";
import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/system", systemRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
