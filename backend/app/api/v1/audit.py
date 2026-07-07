from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_permission
from app.db.session import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/logs", response_model=list[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    entity_type: str | None = None,
    action: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("audit:read")),
):
    query = db.query(AuditLog).options(joinedload(AuditLog.user)).order_by(AuditLog.created_at.desc())
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if action:
        query = query.filter(AuditLog.action == action)
    logs = query.offset(offset).limit(limit).all()
    return [
        AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_name=log.user.name if log.user else None,
            user_role=log.user.role if log.user else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            previous_value=log.previous_value,
            new_value=log.new_value,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]
