from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.db.session import get_db
from app.models import FinancialSettings, Financiera, User
from app.schemas import FinancialSettingsResponse, FinancialSettingsUpdate, FinancieraResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/financial", response_model=FinancialSettingsResponse)
def get_financial_settings(db: Session = Depends(get_db), _: User = Depends(require_permission("settings:read"))):
    settings = db.query(FinancialSettings).first()
    if not settings:
        settings = FinancialSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/financial", response_model=FinancialSettingsResponse)
def update_financial_settings(
    data: FinancialSettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings:write")),
):
    settings = db.query(FinancialSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    prev = {k: getattr(settings, k) for k in data.model_dump(exclude_unset=True).keys()}
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    log_audit(db, current_user.id, "UPDATE", "financial_settings", settings.id, prev, data.model_dump(exclude_unset=True), request)
    return settings


@router.get("/financieras", response_model=list[FinancieraResponse])
def list_financieras(db: Session = Depends(get_db), _: User = Depends(require_permission("simulations:read"))):
    return db.query(Financiera).filter(Financiera.is_active == True).order_by(Financiera.name).all()
