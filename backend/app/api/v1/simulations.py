import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Application, Customer, FinancialSettings, PaymentSchedule, Simulation, User, Vehicle
from app.schemas import SimulationCreate, SimulationListItem, SimulationResponse
from app.services.audit import log_audit
from app.services.financial_engine import run_simulation

router = APIRouter(prefix="/simulations", tags=["Simulations"])


def _generate_code(db: Session) -> str:
    count = db.query(Simulation).count() + 1
    return f"SIM-{datetime.now().strftime('%Y%m')}-{count:04d}"


def _build_simulation(db: Session, data: SimulationCreate, current_user: User) -> Simulation:
    customer = db.query(Customer).filter(Customer.id == data.customer_id, Customer.is_active == True).first()
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id, Vehicle.is_active == True).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    settings = db.query(FinancialSettings).first()
    cok = settings.cok_annual if settings else 0.10
    ins_v = data.insurance_vehicle if data.insurance_vehicle is not None else (settings.insurance_vehicle_monthly if settings else 45.0)
    ins_l = data.insurance_life if data.insurance_life is not None else (settings.insurance_life_monthly if settings else 180.0)
    commission = data.commission if data.commission is not None else (vehicle.price * (settings.commission_rate if settings else 0.0))

    try:
        result = run_simulation(
            vehicle_price=vehicle.price,
            down_payment=data.down_payment,
            rate_type=data.rate_type,
            rate_value=data.rate_value,
            term_months=data.term_months,
            grace_type=data.grace_type,
            grace_months=data.grace_months,
            balloon_percent=data.balloon_percent,
            capitalization=data.capitalization,
            insurance_vehicle=ins_v,
            insurance_life=ins_l,
            commission=commission,
            cok_annual=cok,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    sim = Simulation(
        code=_generate_code(db),
        customer_id=data.customer_id,
        vehicle_id=data.vehicle_id,
        created_by=current_user.id,
        vehicle_price=vehicle.price,
        down_payment=data.down_payment,
        amount_financed=result.amount_financed,
        currency=vehicle.currency,
        rate_type=data.rate_type,
        rate_value=data.rate_value,
        capitalization=data.capitalization,
        tea=result.tea,
        tem=result.tem,
        grace_type=data.grace_type,
        grace_months=data.grace_months,
        term_months=data.term_months,
        balloon_percent=data.balloon_percent,
        balloon_amount=result.balloon_amount,
        monthly_payment=result.monthly_payment,
        insurance_vehicle=ins_v,
        insurance_life=ins_l,
        commission=commission,
        van=result.van,
        tir_monthly=result.tir_monthly,
        tcea=result.tcea,
        total_interest=result.total_interest,
    )
    db.add(sim)
    db.flush()

    for row in result.schedule:
        db.add(
            PaymentSchedule(
                simulation_id=sim.id,
                period=row.period,
                due_date=row.due_date,
                opening_balance=row.opening_balance,
                interest=row.interest,
                amortization=row.amortization,
                insurance_vehicle=row.insurance_vehicle,
                insurance_life=row.insurance_life,
                payment=row.payment,
                balloon_payment=row.balloon_payment,
                closing_balance=row.closing_balance,
                is_grace_period=row.is_grace_period,
            )
        )
    return sim


@router.get("", response_model=list[SimulationListItem])
def list_simulations(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Simulation).order_by(Simulation.id.desc()).all()


@router.post("", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
def create_simulation(
    data: SimulationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sim = _build_simulation(db, data, current_user)
    db.commit()
    db.refresh(sim)
    log_audit(db, current_user.id, "CREATE", "simulation", sim.id, None, {"code": sim.code}, request)
    return db.query(Simulation).options(joinedload(Simulation.schedule)).filter(Simulation.id == sim.id).first()


@router.get("/{simulation_id}", response_model=SimulationResponse)
def get_simulation(simulation_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    sim = db.query(Simulation).options(joinedload(Simulation.schedule)).filter(Simulation.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulación no encontrada")
    return sim


@router.post("/{simulation_id}/clone", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
def clone_simulation(
    simulation_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Simulación no encontrada")
    data = SimulationCreate(
        customer_id=original.customer_id,
        vehicle_id=original.vehicle_id,
        down_payment=original.down_payment,
        rate_type=original.rate_type,
        rate_value=original.rate_value,
        capitalization=original.capitalization,
        grace_type=original.grace_type,
        grace_months=original.grace_months,
        term_months=original.term_months,
        balloon_percent=original.balloon_percent,
        insurance_vehicle=original.insurance_vehicle,
        insurance_life=original.insurance_life,
        commission=original.commission,
    )
    sim = _build_simulation(db, data, current_user)
    db.commit()
    db.refresh(sim)
    log_audit(db, current_user.id, "CLONE", "simulation", sim.id, {"from": simulation_id}, {"code": sim.code}, request)
    return db.query(Simulation).options(joinedload(Simulation.schedule)).filter(Simulation.id == sim.id).first()


@router.get("/{simulation_id}/export")
def export_simulation(simulation_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    sim = db.query(Simulation).options(joinedload(Simulation.schedule)).filter(Simulation.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulación no encontrada")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Periodo", "Fecha", "Saldo Inicial", "Interés", "Amortización", "Seg. Vehículo", "Seg. Vida", "Cuota", "Balón", "Saldo Final"])
    for row in sorted(sim.schedule, key=lambda r: r.period):
        writer.writerow([
            row.period,
            row.due_date.strftime("%Y-%m-%d"),
            row.opening_balance,
            row.interest,
            row.amortization,
            row.insurance_vehicle,
            row.insurance_life,
            row.payment,
            row.balloon_payment,
            row.closing_balance,
        ])
    output.seek(0)
    filename = f"cronograma_{sim.code}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
