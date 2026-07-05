from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.db.session import get_db
from app.models import Application, AuditLog, Simulation, User
from app.schemas import ApplicationActivityResponse, ApplicationCreate, ApplicationResponse, ApplicationStatusUpdate
from app.services.applications import create_application_for_simulation, sync_missing_applications
from app.services.audit import log_audit
from app.services.audit_messages import format_application_activity

router = APIRouter(prefix="/applications", tags=["Applications"])


def _to_response(
    app: Application,
    simulation_code: str | None = None,
    amount_financed: float | None = None,
    currency: str | None = None,
) -> ApplicationResponse:
    code = simulation_code or (app.simulation.code if app.simulation else None)
    financed = amount_financed if amount_financed is not None else (app.simulation.amount_financed if app.simulation else None)
    curr = currency or (app.simulation.currency if app.simulation else None)
    return ApplicationResponse(
        id=app.id,
        simulation_id=app.simulation_id,
        simulation_code=code,
        amount_financed=financed,
        currency=curr,
        status=app.status,
        decision_reason=app.decision_reason,
        analyst_id=app.analyst_id,
        approved_amount=app.approved_amount,
        created_at=app.created_at,
        updated_at=app.updated_at,
    )


def _fetch_application_row(db: Session, application_id: int):
    return (
        db.query(Application, Simulation.code, Simulation.amount_financed, Simulation.currency)
        .join(Simulation, Application.simulation_id == Simulation.id)
        .filter(Application.id == application_id)
        .first()
    )


@router.get("", response_model=list[ApplicationResponse])
def list_applications(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("applications:read")),
):
    sync_missing_applications(db, current_user.id, request)
    rows = (
        db.query(Application, Simulation.code, Simulation.amount_financed, Simulation.currency)
        .join(Simulation, Application.simulation_id == Simulation.id)
        .order_by(Application.id.desc())
        .all()
    )
    return [_to_response(app, code, amount, currency) for app, code, amount, currency in rows]


@router.get("/activity", response_model=list[ApplicationActivityResponse])
def list_application_activity(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("applications:evaluate")),
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

    existing = db.query(Application).filter(Application.simulation_id == data.simulation_id).first()
    if existing:
        return _to_response(existing, sim.code, sim.amount_financed, sim.currency)

    app = create_application_for_simulation(db, data.simulation_id, current_user.id, request)
    db.commit()
    db.refresh(app)
    return _to_response(app, sim.code, sim.amount_financed, sim.currency)


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(application_id: int, db: Session = Depends(get_db), _: User = Depends(require_permission("applications:read"))):
    row = _fetch_application_row(db, application_id)
    if not row:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    app, code, amount, currency = row
    return _to_response(app, code, amount, currency)


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
    row = _fetch_application_row(db, application_id)
    if not row:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    app, code, amount, currency = row
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
    return _to_response(app, code, amount, currency)
