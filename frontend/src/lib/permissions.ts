export type Role = "Administrador" | "Vendedor" | "Soporte";

export const ROLES: Role[] = ["Administrador", "Vendedor", "Soporte"];

const PERMISSIONS: Record<string, Role[]> = {
  "dashboard:read": ROLES,
  "analytics:read": ROLES,
  "customers:read": ROLES,
  "customers:write": ["Administrador", "Vendedor"],
  "vehicles:read": ROLES,
  "vehicles:write": ["Administrador"],
  "simulations:read": ROLES,
  "simulations:write": ["Administrador", "Vendedor"],
  "applications:read": ROLES,
  "applications:create": ["Administrador", "Vendedor"],
  "applications:evaluate": ["Administrador", "Soporte"],
  "settings:read": ["Administrador"],
  "settings:write": ["Administrador"],
  "users:manage": ["Administrador"],
  "audit:read": ["Administrador", "Soporte"],
};

/** Rutas en orden de prioridad para redirección cuando no hay permiso */
export const ROUTE_PERMISSIONS: { path: string; permission: string }[] = [
  { path: "/", permission: "dashboard:read" },
  { path: "/applications", permission: "applications:read" },
  { path: "/simulations", permission: "simulations:read" },
  { path: "/customers", permission: "customers:read" },
  { path: "/vehicles", permission: "vehicles:read" },
  { path: "/analytics", permission: "analytics:read" },
  { path: "/audit", permission: "audit:read" },
  { path: "/settings", permission: "settings:read" },
  { path: "/users", permission: "users:manage" },
];

export function hasPermission(role: string | undefined, permission: string): boolean {
  if (!role) return false;
  return PERMISSIONS[permission]?.includes(role as Role) ?? false;
}

export function getHomeRoute(role: string | undefined): string {
  switch (role) {
    case "Soporte":
      return "/applications";
    case "Vendedor":
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
  Administrador: "Administrador",
  Vendedor: "Vendedor",
  Soporte: "Soporte",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Administrador: "Configura parámetros, vehículos y usuarios. Acceso total.",
  Vendedor: "Registra clientes, crea simulaciones y solicitudes de financiamiento.",
  Soporte: "Evalúa solicitudes, asiste operaciones y revisa la auditoría del sistema.",
};
