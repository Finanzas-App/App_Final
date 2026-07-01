from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Application, Simulation, User
from app.schemas import ApplicationCreate, ApplicationResponse, ApplicationStatusUpdate
from app.services.audit import log_audit

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("", response_model=list[ApplicationResponse])
def list_applications(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Application).order_by(Application.id.desc()).all()


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    data: ApplicationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
def get_application(application_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return app


@router.put("/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    prev = {"status": app.status, "decision_reason": app.decision_reason}
    app.status = data.status
    app.decision_reason = data.decision_reason
    app.analyst_id = current_user.id
    if data.approved_amount is not None:
        app.approved_amount = data.approved_amount
    db.commit()
    db.refresh(app)
    log_audit(db, current_user.id, "STATUS_CHANGE", "application", app.id, prev, data.model_dump(), request)
    return app
