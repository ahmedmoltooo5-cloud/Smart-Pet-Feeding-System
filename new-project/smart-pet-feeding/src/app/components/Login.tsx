import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { PawPrint, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const [petName, setPetName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!petName || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    const result = await login(petName, password);

    setIsSubmitting(false);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error ?? "Invalid pet name or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="w-full max-w-md px-6">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-purple-400 to-pink-400 p-4 rounded-full">
              <PawPrint className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-center mb-2">Smart Pet Feeder</h1>
          <p className="text-center text-gray-500 mb-8">Welcome back! Please login to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 mb-2">Pet Name</label>
              <div className="relative">
                <PawPrint className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  placeholder="Enter your pet's name"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-purple-500 hover:text-purple-600 transition-colors">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
