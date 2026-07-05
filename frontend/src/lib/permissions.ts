export type Role = "Admin" | "Analyst" | "Executive";

export const ROLES: Role[] = ["Admin", "Analyst", "Executive"];

const PERMISSIONS: Record<string, Role[]> = {
  "dashboard:read": ROLES,
  "analytics:read": ROLES,
  "customers:read": ROLES,
  "customers:write": ["Admin", "Executive"],
  "vehicles:read": ROLES,
  "vehicles:write": ["Admin"],
  "simulations:read": ROLES,
  "simulations:write": ["Admin", "Executive"],
  "applications:read": ROLES,
  "applications:create": ["Admin", "Executive"],
  "applications:evaluate": ["Admin", "Analyst"],
  "settings:read": ["Admin"],
  "settings:write": ["Admin"],
  "users:manage": ["Admin"],
};

/** Rutas en orden de prioridad para redirección cuando no hay permiso */
export const ROUTE_PERMISSIONS: { path: string; permission: string }[] = [
  { path: "/", permission: "dashboard:read" },
  { path: "/applications", permission: "applications:read" },
  { path: "/simulations", permission: "simulations:read" },
  { path: "/customers", permission: "customers:read" },
  { path: "/vehicles", permission: "vehicles:read" },
  { path: "/analytics", permission: "analytics:read" },
  { path: "/settings", permission: "settings:read" },
  { path: "/users", permission: "users:manage" },
];

export function hasPermission(role: string | undefined, permission: string): boolean {
  if (!role) return false;
  return PERMISSIONS[permission]?.includes(role as Role) ?? false;
}

export function getHomeRoute(role: string | undefined): string {
  switch (role) {
    case "Analyst":
      return "/applications";
    case "Executive":
      return "/simulations";
    default:
      return "/";
  }
}

export function getFirstAllowedRoute(role: string | undefined): string {
  for (const { path, permission } of ROUTE_PERMISSIONS) {
    if (hasPermission(role, permission)) return path;
  }
  return "/login";
}

export const ROLE_LABELS: Record<Role, string> = {
  Admin: "Administrador",
  Analyst: "Analista de crédito",
  Executive: "Ejecutivo comercial",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Admin: "Configura parámetros, vehículos y usuarios. Acceso total.",
  Analyst: "Evalúa y aprueba/rechaza solicitudes de financiamiento.",
  Executive: "Registra clientes, crea simulaciones y solicitudes.",
};
