import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./features/auth/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { MainLayout } from "./layout/MainLayout";
import { RoleGuard } from "./components/RoleGuard";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import VehiclesPage from "./pages/VehiclesPage";
import SimulationsPage from "./pages/SimulationsPage";
import SimulationDetailPage from "./pages/SimulationDetailPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<RoleGuard permission="dashboard:read"><DashboardPage /></RoleGuard>} />
              <Route path="/customers" element={<RoleGuard permission="customers:read"><CustomersPage /></RoleGuard>} />
              <Route path="/vehicles" element={<RoleGuard permission="vehicles:read"><VehiclesPage /></RoleGuard>} />
              <Route path="/simulations" element={<RoleGuard permission="simulations:read"><SimulationsPage /></RoleGuard>} />
              <Route path="/simulations/:id" element={<RoleGuard permission="simulations:read"><SimulationDetailPage /></RoleGuard>} />
              <Route path="/applications" element={<RoleGuard permission="applications:read"><ApplicationsPage /></RoleGuard>} />
              <Route path="/analytics" element={<RoleGuard permission="analytics:read"><AnalyticsPage /></RoleGuard>} />
              <Route path="/settings" element={<RoleGuard permission="settings:read"><SettingsPage /></RoleGuard>} />
              <Route path="/users" element={<RoleGuard permission="users:manage"><UsersPage /></RoleGuard>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
