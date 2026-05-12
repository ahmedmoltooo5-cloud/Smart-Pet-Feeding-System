import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { Login } from "./components/Login";
import { SignUp } from "./components/SignUp";
import { Dashboard } from "./components/Dashboard";
import { History } from "./components/History";
import { AuthProvider, useAuth } from "./context/AuthContext";

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />;
  }

  return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        element: <PublicRoute />,
        children: [
          {
            path: "login",
            Component: Login,
          },
          {
            path: "signup",
            Component: SignUp,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "dashboard",
            Component: Dashboard,
          },
          {
            path: "history",
            Component: History,
          },
        ],
      },
      {
        path: "*",
        element: <Navigate to="/login" replace />,
      },
    ],
  },
]);
