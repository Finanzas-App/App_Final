import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { hasPermission } from "../lib/permissions";
import { PageLoader } from "./ui/PageLoader";

interface RoleGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: string;
}

export function RoleGuard({ permission, children, fallback = "/" }: RoleGuardProps) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface-muted bg-mesh"><PageLoader /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user.role, permission)) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
