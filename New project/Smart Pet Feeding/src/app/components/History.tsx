import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Search, Calendar, Zap, Hand, TrendingDown } from "lucide-react";
import type { FeedingHistoryRecord } from "../types";
import { extractErrorMessage } from "../services/api";
import { fetchFeedingHistory } from "../services/historyService";
import { getSocket } from "../services/socket";
import { mapHistoryRecord } from "../services/mappers";

export function History() {
  const navigate = useNavigate();
  const [feedingHistory, setFeedingHistory] = useState<FeedingHistoryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "automatic" | "manual">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setIsLoading(true);
      setError("");

      try {
        const history = await fetchFeedingHistory({
          search: deferredSearchTerm || undefined,
          feedingType: filterType === "all" ? undefined : filterType,
          sort: "desc",
        });

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setFeedingHistory(history);
        });
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(extractErrorMessage(requestError, "Unable to load feeding history."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [deferredSearchTerm, filterType]);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    const syncHistoryEntry = (entry: any) => {
      const mappedEntry = mapHistoryRecord(entry);

      if (
        filterType !== "all" &&
        mappedEntry.type !== filterType
      ) {
        return;
      }

      if (
        deferredSearchTerm &&
        !mappedEntry.petName.toLowerCase().includes(deferredSearchTerm.toLowerCase())
      ) {
        return;
      }

      setFeedingHistory((currentHistory) => {
        const existingIndex = currentHistory.findIndex((item) => item.id === mappedEntry.id);

        if (existingIndex === -1) {
          return [mappedEntry, ...currentHistory];
        }

        const nextHistory = [...currentHistory];
        nextHistory[existingIndex] = mappedEntry;

        return nextHistory;
      });
    };

    socket.on("feeding:created", syncHistoryEntry);
    socket.on("feeding:updated", syncHistoryEntry);

    return () => {
      socket.off("feeding:created", syncHistoryEntry);
      socket.off("feeding:updated", syncHistoryEntry);
    };
  }, [deferredSearchTerm, filterType]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-white p-3 rounded-2xl shadow-md hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1>Feeding History</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by pet name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterType("all")}
                className={`px-6 py-3 rounded-xl transition-all ${
                  filterType === "all"
                    ? "bg-purple-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("automatic")}
                className={`px-6 py-3 rounded-xl transition-all ${
                  filterType === "automatic"
                    ? "bg-green-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Automatic
              </button>
              <button
                onClick={() => setFilterType("manual")}
                className={`px-6 py-3 rounded-xl transition-all ${
                  filterType === "manual"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Manual
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {error ? (
            <div className="p-12 text-center">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-red-500 mb-2">Unable to load feeding records</h3>
              <p className="text-gray-400">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="p-12 text-center">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-gray-500 mb-2">Loading feeding records...</h3>
              <p className="text-gray-400">Fetching the latest feeder activity</p>
            </div>
          ) : feedingHistory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-gray-500 mb-2">No feeding records found</h3>
              <p className="text-gray-400">Start dispensing food to see history here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-gray-600">Date & Time</th>
                    <th className="px-6 py-4 text-left text-gray-600">Pet Name</th>
                    <th className="px-6 py-4 text-left text-gray-600">Type</th>
                    <th className="px-6 py-4 text-left text-gray-600">Food Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {feedingHistory.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-xl">
                            <Calendar className="w-5 h-5 text-purple-500" />
                          </div>
                          <div>
                            <div className="text-gray-700">{formatDate(record.date)}</div>
                            <div className="text-gray-500">{formatTime(record.date)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700">{record.petName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${
                            record.type === "automatic"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {record.type === "automatic" ? (
                            <Zap className="w-4 h-4" />
                          ) : (
                            <Hand className="w-4 h-4" />
                          )}
                          <span className="capitalize">{record.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-4 py-2 rounded-xl ${
                              (record.foodLevel ?? 0) < 20
                                ? "bg-red-100 text-red-700"
                                : (record.foodLevel ?? 0) < 50
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4" />
                              <span>{record.foodLevel ?? "--"}%</span>
                            </div>
                            <div className="text-xs mt-1 capitalize opacity-80">
                              {record.status.replaceAll("-", " ")}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
