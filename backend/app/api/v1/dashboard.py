from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Application, Customer, Simulation, User, Vehicle
from app.schemas import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total_financed = db.query(func.coalesce(func.sum(Simulation.amount_financed), 0)).scalar() or 0
    active_simulations = db.query(Simulation).filter(Simulation.status == "active").count()
    total_customers = db.query(Customer).filter(Customer.is_active == True).count()
    total_vehicles = db.query(Vehicle).filter(Vehicle.is_active == True).count()

    apps = db.query(Application).all()
    approved = sum(1 for a in apps if a.status == "Approved")
    approval_rate = (approved / len(apps) * 100) if apps else 0.0

    sims = db.query(Simulation).all()
    by_month: dict[str, int] = defaultdict(int)
    by_currency: dict[str, float] = defaultdict(float)
    for s in sims:
        month_key = s.created_at.strftime("%Y-%m")
        by_month[month_key] += 1
        by_currency[s.currency] += s.amount_financed

    vehicles = {v.id: v for v in db.query(Vehicle).all()}
    by_category: dict[str, float] = defaultdict(float)
    for s in sims:
        v = vehicles.get(s.vehicle_id)
        if v:
            by_category[v.category] += s.amount_financed

    return DashboardSummary(
        total_financed=float(total_financed),
        active_simulations=active_simulations,
        approval_rate=round(approval_rate, 2),
        total_customers=total_customers,
        total_vehicles=total_vehicles,
        simulations_by_month=[{"month": k, "count": v} for k, v in sorted(by_month.items())],
        financing_by_category=[{"category": k, "amount": v} for k, v in by_category.items()],
        currency_distribution=[{"currency": k, "amount": v} for k, v in by_currency.items()],
    )
