import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

/**
 * Schützt eine Route vor nicht angemeldeten Benutzern.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="page-loader">Diario wird geladen...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
