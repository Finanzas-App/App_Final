from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.db.session import get_db
from app.models import Application, AuditLog, Simulation, User
from app.schemas import ApplicationActivityResponse, ApplicationCreate, ApplicationResponse, ApplicationStatusUpdate
from app.services.audit import log_audit
from app.services.audit_messages import format_application_activity

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("", response_model=list[ApplicationResponse])
def list_applications(db: Session = Depends(get_db), _: User = Depends(require_permission("applications:read"))):
    return db.query(Application).order_by(Application.id.desc()).all()


@router.get("/activity", response_model=list[ApplicationActivityResponse])
def list_application_activity(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("applications:read")),
    limit: int = Query(default=50, ge=1, le=100),
):
    rows = (
        db.query(AuditLog, User.name)
        .outerjoin(User, AuditLog.user_id == User.id)
        .filter(AuditLog.entity_type == "application")
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    result: list[ApplicationActivityResponse] = []
    for log, user_name in rows:
        message, activity_type = format_application_activity(log)
        result.append(
            ApplicationActivityResponse(
                id=log.id,
                application_id=log.entity_id,
                action=log.action,
                message=message,
                activity_type=activity_type,
                user_name=user_name,
                created_at=log.created_at,
            )
        )
    return result


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    data: ApplicationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("applications:create")),
):
    sim = db.query(Simulation).filter(Simulation.id == data.simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulación no encontrada")
    app = Application(simulation_id=data.simulation_id, status="Pending")
    db.add(app)
    db.commit()
    db.refresh(app)
    log_audit(db, current_user.id, "CREATE", "application", app.id, None, {"simulation_id": data.simulation_id}, request)
    return app


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(application_id: int, db: Session = Depends(get_db), _: User = Depends(require_permission("applications:read"))):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return app


@router.post("/{application_id}/view", status_code=status.HTTP_204_NO_CONTENT)
def log_application_view(
    application_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("applications:evaluate")),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    log_audit(
        db,
        current_user.id,
        "OPEN_EVALUATION",
        "application",
        app.id,
        None,
        {"simulation_id": app.simulation_id},
        request,
    )


@router.put("/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("applications:evaluate")),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    prev = {
        "status": app.status,
        "decision_reason": app.decision_reason,
        "approved_amount": app.approved_amount,
    }
    app.status = data.status
    app.decision_reason = data.decision_reason
    app.analyst_id = current_user.id
    if data.approved_amount is not None:
        app.approved_amount = data.approved_amount
    db.commit()
    db.refresh(app)
    log_audit(db, current_user.id, "STATUS_CHANGE", "application", app.id, prev, data.model_dump(), request)
    return app
