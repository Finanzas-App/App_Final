import json
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog


def log_audit(
    db: Session,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    previous_value: Any = None,
    new_value: Any = None,
    request: Request | None = None,
) -> None:
    ip = request.client.host if request and request.client else None
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            previous_value=json.dumps(previous_value, default=str) if previous_value is not None else None,
            new_value=json.dumps(new_value, default=str) if new_value is not None else None,
            ip_address=ip,
        )
    )
    db.commit()
