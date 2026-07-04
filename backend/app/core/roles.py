"""Control de acceso basado en roles (RBAC)."""

from typing import Literal

Role = Literal["Admin", "Analyst", "Executive"]

ALL_ROLES: tuple[Role, ...] = ("Admin", "Analyst", "Executive")

# Permisos por acción → roles autorizados
PERMISSIONS: dict[str, tuple[Role, ...]] = {
    # Dashboard y analytics (todos pueden ver)
    "dashboard:read": ALL_ROLES,
    "analytics:read": ALL_ROLES,
    # Clientes
    "customers:read": ALL_ROLES,
    "customers:write": ("Admin", "Executive"),
    # Vehículos
    "vehicles:read": ALL_ROLES,
    "vehicles:write": ("Admin",),
    # Simulaciones
    "simulations:read": ALL_ROLES,
    "simulations:write": ("Admin", "Executive"),
    # Solicitudes
    "applications:read": ALL_ROLES,
    "applications:create": ("Admin", "Executive"),
    "applications:evaluate": ("Admin", "Analyst"),
    # Configuración y usuarios
    "settings:read": ALL_ROLES,
    "settings:write": ("Admin",),
    "users:manage": ("Admin",),
}


def has_permission(role: str, permission: str) -> bool:
    allowed = PERMISSIONS.get(permission)
    if allowed is None:
        return False
    return role in allowed
