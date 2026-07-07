"""Control de acceso basado en roles (RBAC)."""

from typing import Literal

Role = Literal["Administrador", "Vendedor", "Soporte"]

ALL_ROLES: tuple[Role, ...] = ("Administrador", "Vendedor", "Soporte")

PERMISSIONS: dict[str, tuple[Role, ...]] = {
    "dashboard:read": ALL_ROLES,
    "analytics:read": ALL_ROLES,
    "customers:read": ALL_ROLES,
    "customers:write": ("Administrador", "Vendedor"),
    "vehicles:read": ALL_ROLES,
    "vehicles:write": ("Administrador",),
    "simulations:read": ALL_ROLES,
    "simulations:write": ("Administrador", "Vendedor"),
    "applications:read": ALL_ROLES,
    "applications:create": ("Administrador", "Vendedor"),
    "applications:evaluate": ("Administrador", "Soporte"),
    "settings:read": ("Administrador",),
    "settings:write": ("Administrador",),
    "users:manage": ("Administrador",),
    "audit:read": ("Administrador", "Soporte"),
}


def has_permission(role: str, permission: str) -> bool:
    allowed = PERMISSIONS.get(permission)
    if allowed is None:
        return False
    return role in allowed
