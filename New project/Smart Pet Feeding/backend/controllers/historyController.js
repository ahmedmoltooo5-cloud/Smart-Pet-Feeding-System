import { deleteHistoryEntry, listHistoryEntries } from "../services/historyService.js";
import { ApiError } from "../utils/apiError.js";

export async function getHistory(req, res) {
  const entries = await listHistoryEntries({
    userId: req.auth.userId,
    search: req.query.search,
    feedingType: req.query.feedingType,
    sort: req.query.sort,
  });

  res.json({
    items: entries,
  });
}

export async function removeHistory(req, res) {
  const deleted = await deleteHistoryEntry({
    id: Number(req.params.id),
    userId: req.auth.userId,
  });

  if (!deleted) {
    throw new ApiError(404, "Feeding history entry was not found.");
  }

  res.json({
    message: "Feeding history entry deleted successfully.",
  });
}
