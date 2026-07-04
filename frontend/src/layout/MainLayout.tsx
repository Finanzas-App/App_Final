import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { SidebarProvider } from "./SidebarContext";
import { useAuth } from "../features/auth/AuthContext";
import { PageLoader } from "../components/ui/PageLoader";

export function MainLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted bg-mesh">
        <PageLoader message="Iniciando sesión..." />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <Outlet />
      </div>
    </SidebarProvider>
  );
}
