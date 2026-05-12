import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  PawPrint,
  LogOut,
  User,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  StopCircle,
  Calendar,
  PlayCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../services/api";
import { fetchSchedules, createSchedule, updateSchedule } from "../services/scheduleService";
import { getSocket } from "../services/socket";
import {
  dispenseFood,
  fetchSystemStatus,
  startFeederSystem,
  stopFeederSystem,
} from "../services/systemService";
import type { ScheduleItem, SystemStatusSnapshot } from "../types";

export function Dashboard() {
  const { currentPet, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [petPresent, setPetPresent] = useState(false);
  const [foodLevel, setFoodLevel] = useState(100);
  const [lowFoodAlert, setLowFoodAlert] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const [showFeedingTimeModal, setShowFeedingTimeModal] = useState(false);
  const [feedingTime, setFeedingTime] = useState("08:00");
  const [primaryScheduleId, setPrimaryScheduleId] = useState<number | null>(null);

  const applySystemStatus = (status: SystemStatusSnapshot) => {
    setPetPresent(status.petDetected);
    setFoodLevel(status.foodLevel);
    setLowFoodAlert(status.lowFoodAlert);
    setSystemEnabled(status.systemEnabled);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [status, schedules] = await Promise.all([
          fetchSystemStatus(),
          fetchSchedules(),
        ]);

        if (!isMounted) {
          return;
        }

        applySystemStatus(status);

        if (schedules.length > 0) {
          const primarySchedule = schedules[0];
          setPrimaryScheduleId(primarySchedule.id);
          setFeedingTime(primarySchedule.feedingTime);
        }
      } catch (error) {
        window.alert(extractErrorMessage(error, "Unable to load dashboard data."));
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    const handleSystemStatus = (status: SystemStatusSnapshot) => {
      applySystemStatus(status);
    };

    const handleScheduleUpdated = (schedule: ScheduleItem) => {
      setPrimaryScheduleId(schedule.id);
      setFeedingTime(schedule.feedingTime);
    };

    const handleScheduleDeleted = ({ id }: { id: number }) => {
      setPrimaryScheduleId((currentValue) => (currentValue === id ? null : currentValue));
    };

    socket.on("system:status", handleSystemStatus);
    socket.on("schedule:updated", handleScheduleUpdated);
    socket.on("schedule:deleted", handleScheduleDeleted);

    return () => {
      socket.off("system:status", handleSystemStatus);
      socket.off("schedule:updated", handleScheduleUpdated);
      socket.off("schedule:deleted", handleScheduleDeleted);
    };
  }, []);

  const handleDispenseFood = async () => {
    setDispensing(true);

    try {
      const historyEntry = await dispenseFood();

      if (historyEntry.foodLevel !== null) {
        setFoodLevel(historyEntry.foodLevel);
      }
    } catch (error) {
      window.alert(extractErrorMessage(error, "Unable to dispense food right now."));
    } finally {
      setDispensing(false);
    }
  };

  const handleToggleSystem = async () => {
    try {
      const nextStatus = systemEnabled
        ? await stopFeederSystem()
        : await startFeederSystem();

      applySystemStatus(nextStatus);
      window.alert(systemEnabled ? "System stopped successfully" : "System started successfully");
    } catch (error) {
      window.alert(extractErrorMessage(error, "Unable to update the feeder system."));
    }
  };

  const handleSetFeedingTime = () => {
    setShowFeedingTimeModal(true);
  };

  const handleSaveFeedingTime = async () => {
    try {
      const schedulePayload = {
        feedingTime,
        enabled: true,
        repeatMode: "daily" as const,
      };

      const schedule = primaryScheduleId
        ? await updateSchedule(primaryScheduleId, schedulePayload)
        : await createSchedule(schedulePayload);

      setPrimaryScheduleId(schedule.id);
      setFeedingTime(schedule.feedingTime);
      setShowFeedingTimeModal(false);
      window.alert(`Feeding time set to ${schedule.feedingTime}`);
    } catch (error) {
      window.alert(extractErrorMessage(error, "Unable to save the feeding schedule."));
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const systemButtonLabel = systemEnabled ? "Stop System" : "Start System";
  const systemButtonIcon = systemEnabled ? (
    <StopCircle className="w-8 h-8 text-red-500" />
  ) : (
    <PlayCircle className="w-8 h-8 text-green-500" />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-400 to-pink-400 p-3 rounded-2xl">
              <PawPrint className="w-8 h-8 text-white" />
            </div>
          </div>

          <div>
            <h1 className="text-center">{currentPet?.name}</h1>
            <p className="text-center text-gray-500">{currentPet?.details}</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all"
            >
              <User className="w-5 h-5 text-gray-600" />
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl py-2 z-10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <LogOut className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-12">
          <div className={`bg-white rounded-3xl shadow-lg p-6 border-2 ${petPresent ? "border-green-400" : "border-gray-200"}`}>
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${petPresent ? "bg-green-100" : "bg-gray-100"}`}>
                <CheckCircle2 className={`w-8 h-8 ${petPresent ? "text-green-500" : "text-gray-400"}`} />
              </div>
              <div>
                <h3 className="text-gray-500 mb-1">Pet Status</h3>
                <p className={petPresent ? "text-green-600" : "text-gray-500"}>
                  {petPresent ? "Pet Detected" : "No Pet Detected"}
                </p>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-3xl shadow-lg p-6 border-2 ${lowFoodAlert ? "border-red-400" : "border-gray-200"}`}>
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${lowFoodAlert ? "bg-red-100" : "bg-blue-100"}`}>
                <AlertTriangle className={`w-8 h-8 ${lowFoodAlert ? "text-red-500" : "text-blue-500"}`} />
              </div>
              <div>
                <h3 className="text-gray-500 mb-1">Food Level</h3>
                <p className={lowFoodAlert ? "text-red-600" : "text-blue-600"}>
                  {foodLevel}% {lowFoodAlert && "- Refill Needed"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center mb-12">
          <button
            onClick={handleDispenseFood}
            disabled={dispensing}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-16 py-8 rounded-3xl shadow-2xl hover:shadow-3xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <div className="flex flex-col items-center gap-3">
              <PawPrint className="w-16 h-16" />
              <span className="text-2xl">{dispensing ? "Dispensing..." : "Dispense Food"}</span>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <button
            onClick={handleToggleSystem}
            className={`bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all group ${
              systemEnabled ? "hover:border-2 hover:border-red-400" : "hover:border-2 hover:border-green-400"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`p-4 rounded-2xl transition-colors ${systemEnabled ? "bg-red-50 group-hover:bg-red-100" : "bg-green-50 group-hover:bg-green-100"}`}>
                {systemButtonIcon}
              </div>
              <span className="text-gray-700">{systemButtonLabel}</span>
            </div>
          </button>

          <button
            onClick={handleSetFeedingTime}
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:border-2 hover:border-blue-400 group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-blue-100 transition-colors">
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
              <span className="text-gray-700">Set Feeding Time</span>
            </div>
          </button>

          <button
            onClick={() => navigate("/history")}
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:border-2 hover:border-purple-400 group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="bg-purple-50 p-4 rounded-2xl group-hover:bg-purple-100 transition-colors">
                <History className="w-8 h-8 text-purple-500" />
              </div>
              <span className="text-gray-700">View History</span>
            </div>
          </button>
        </div>
      </div>

      {showFeedingTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-3 rounded-2xl">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <h2>Set Feeding Time</h2>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Select Time</label>
              <input
                type="time"
                value={feedingTime}
                onChange={(e) => setFeedingTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFeedingTimeModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFeedingTime}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
