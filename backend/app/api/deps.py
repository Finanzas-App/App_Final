from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.roles import Role, has_permission
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user


def require_permission(permission: str) -> Callable:
    """Dependency factory: exige autenticación y permiso específico."""

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tiene permiso para: {permission}",
            )
        return current_user

    return _checker


def require_roles(*roles: Role) -> Callable:
    """Dependency factory: exige uno de los roles indicados."""

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso restringido. Roles permitidos: {', '.join(roles)}",
            )
        return current_user

    return _checker
