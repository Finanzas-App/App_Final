"""Control de acceso basado en roles (RBAC)."""

from typing import Literal

Role = Literal["Admin", "Analyst", "Executive"]

ALL_ROLES: tuple[Role, ...] = ("Admin", "Analyst", "Executive")

PERMISSIONS: dict[str, tuple[Role, ...]] = {
    "dashboard:read": ALL_ROLES,
    "analytics:read": ALL_ROLES,
    "customers:read": ALL_ROLES,
    "customers:write": ("Admin", "Executive"),
    "vehicles:read": ALL_ROLES,
    "vehicles:write": ("Admin",),
    "simulations:read": ALL_ROLES,
    "simulations:write": ("Admin", "Executive"),
    "applications:read": ALL_ROLES,
    "applications:create": ("Admin", "Executive"),
    "applications:evaluate": ("Admin", "Analyst"),
    "settings:read": ("Admin",),
    "settings:write": ("Admin",),
    "users:manage": ("Admin",),
}


def has_permission(role: str, permission: str) -> bool:
    allowed = PERMISSIONS.get(permission)
    if allowed is None:
        return False
    return role in allowed
