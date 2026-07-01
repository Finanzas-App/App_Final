import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../features/auth/AuthContext";

export function MainLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex">
      <Sidebar />
      <Outlet />
    </div>
  );
}
