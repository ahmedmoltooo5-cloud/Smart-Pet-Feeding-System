import { dispatchDispenseCommand, setSystemEnabled } from "../services/commandService.js";
import { getSensorLogs, getSystemStatus } from "../services/systemStateService.js";
import { User } from "../models/index.js";

export async function manualDispense(req, res) {
  const user = await User.findByPk(req.auth.userId);

  const historyEntry = await dispatchDispenseCommand({
    userId: req.auth.userId,
    petName: user?.petName ?? req.auth.petName ?? "Unknown",
    feedingType: "manual",
    dispenseAmount: req.body.amount,
  });

  res.status(202).json({
    history: historyEntry,
  });
}

export async function stopSystem(req, res) {
  const status = await setSystemEnabled(false, req.auth.userId);

  res.json({
    status,
  });
}

export async function startSystem(req, res) {
  const status = await setSystemEnabled(true, req.auth.userId);

  res.json({
    status,
  });
}

export async function getStatus(req, res) {
  const status = await getSystemStatus();

  res.json({
    status,
  });
}

export async function getSensors(req, res) {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const logs = await getSensorLogs(limit);

  res.json({
    items: logs,
  });
}
