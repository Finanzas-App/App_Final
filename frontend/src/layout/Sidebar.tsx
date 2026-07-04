import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  TrendingUp, LayoutDashboard, Car, Calculator, FileText,
  Users, BarChart3, Settings, LogOut, Shield, X,
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { hasPermission, type Role } from "../lib/permissions";
import { useSidebar } from "./SidebarContext";

const NAV = [
  { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard", permission: "dashboard:read" },
  { to: "/vehicles", icon: Car, labelKey: "nav.vehicles", permission: "vehicles:read" },
  { to: "/simulations", icon: Calculator, labelKey: "nav.simulations", permission: "simulations:read" },
  { to: "/applications", icon: FileText, labelKey: "nav.applications", permission: "applications:read" },
  { to: "/customers", icon: Users, labelKey: "nav.customers", permission: "customers:read" },
  { to: "/analytics", icon: BarChart3, labelKey: "nav.analytics", permission: "analytics:read" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings", permission: "settings:read" },
  { to: "/users", icon: Shield, labelKey: "nav.users", permission: "users:manage" },
];

const ROLE_COLORS: Record<Role, string> = {
  Admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Analyst: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Executive: "bg-brand-500/20 text-brand-300 border-brand-500/30",
};

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isOpen, close } = useSidebar();

  useEffect(() => {
    close();
  }, [location.pathname, close]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const visibleNav = NAV.filter((item) => hasPermission(user?.role, item.permission));

  const isActive = (to: string) =>
    location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 max-w-[85vw] bg-surface-sidebar flex flex-col h-screen fixed left-0 top-0 shadow-sidebar z-50 lg:z-30
          transform transition-transform duration-300 ease-in-out
          -translate-x-full lg:translate-x-0
          ${isOpen ? "translate-x-0" : ""}`}
      >
        <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-700 rounded-xl flex items-center justify-center shadow-glow shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-sm tracking-tight truncate">{t("common.appName")}</h1>
              <p className="text-[11px] text-slate-400 font-medium">{t("common.vehicleFinancing")}</p>
            </div>
          </div>
          <button
            onClick={close}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label={t("common.closeMenu")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {t("common.mainMenu")}
          </p>
          {visibleNav.map(({ to, icon: Icon, labelKey }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={close}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-brand-600/15 text-brand-300 shadow-[inset_3px_0_0_0_#1a7ff5]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 sm:p-4 border-t border-white/5">
          <div className="px-3 py-3 mb-2 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                {user?.role && (
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${ROLE_COLORS[user.role as Role] || "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
                    {t(`roles.${user.role as Role}.label`)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-danger-ghost">
            <LogOut className="w-4 h-4" />
            {t("common.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
