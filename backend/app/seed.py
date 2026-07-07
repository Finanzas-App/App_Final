"""Seed data for AutoFinance Pro demo - aligned with PDF test cases."""

from datetime import datetime

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import (
    Application,
    Customer,
    FinancialSettings,
    Financiera,
    PaymentSchedule,
    PaymentStatus,
    Simulation,
    User,
    Vehicle,
)
from app.services.financial_engine import run_simulation

PAYMENT_STATUS_PENDING = 1

SCHEDULE_FIELDS = [
    "period", "due_date", "opening_balance", "interest", "amortization",
    "insurance_vehicle", "insurance_life", "portes", "payment", "balloon_payment",
    "closing_balance", "is_grace_period",
]


def _add_schedule(db, sim_id: int, result) -> None:
    for row in result.schedule:
        db.add(
            PaymentSchedule(
                simulation_id=sim_id,
                **{k: getattr(row, k) for k in SCHEDULE_FIELDS},
                payment_status_id=PAYMENT_STATUS_PENDING,
            )
        )


def seed():
    db = SessionLocal()
    try:
        if db.query(User).first():
            print("Seed already applied, skipping.")
            return

        admin = User(
            name="Roberto Administrador",
            email="admin@autofinance.pro",
            password_hash=get_password_hash("admin123"),
            role="Administrador",
        )
        soporte = User(
            name="Ana Soporte",
            email="soporte@autofinance.pro",
            password_hash=get_password_hash("soporte123"),
            role="Soporte",
        )
        vendedor = User(
            name="Carlos Vendedor",
            email="vendedor@autofinance.pro",
            password_hash=get_password_hash("vend123"),
            role="Vendedor",
        )
        db.add_all([admin, soporte, vendedor])
        db.flush()

        settings = FinancialSettings(
            dealership_name="AutoFinance Pro Concesionaria",
            dealership_ruc="20123456789",
            dealership_email="contacto@autofinance.pro",
            default_currency="PEN",
            exchange_rate=3.75,
            cok_annual=0.10,
            default_balloon_percent=0.25,
            default_capitalization=12,
            insurance_vehicle_monthly=180.0,
            insurance_life_monthly=45.0,
            portes_monthly=10.0,
            commission_rate=0.0,
        )
        db.add(settings)

        bcp = db.query(Financiera).filter(Financiera.name == "BCP").first()
        financiera_id = bcp.id if bcp else 1

        customers = [
            Customer(
                nombres="Juan", apellidos="Pérez García", dni="74859632", edad=32,
                ingreso_mensual=8500, email="juanperez@gmail.com", telefono="987654321",
                direccion="Av. Javier Prado 1234, Lima", esta_trabajando=True, es_dependiente=True,
                created_by=vendedor.id,
            ),
            Customer(
                nombres="María", apellidos="Fernández Rojas", dni="71589632", edad=35,
                ingreso_mensual=12000, email="mariafernandez@gmail.com", telefono="956321478",
                direccion="Calle Los Olivos 456, Miraflores", esta_trabajando=True, es_dependiente=True,
                created_by=vendedor.id,
            ),
            Customer(
                nombres="Lucía", apellidos="Torres Vega", dni="87654321", edad=28,
                ingreso_mensual=6200, email="lucia.torres@email.com", telefono="998877665",
                direccion="Jr. Ucayali 789, Surco", esta_trabajando=True, es_dependiente=False,
                created_by=vendedor.id,
            ),
        ]
        db.add_all(customers)
        db.flush()

        vehicles = [
            Vehicle(brand="Toyota", model="Corolla Cross", year=2026, category="SUV", color="Blanco", price=95000, currency="PEN", status="nuevo"),
            Vehicle(brand="Kia", model="Sportage", year=2026, category="SUV", color="Gris", price=32000, currency="USD", status="nuevo"),
            Vehicle(brand="Hyundai", model="Tucson", year=2025, category="SUV", color="Negro", price=88000, currency="PEN", status="nuevo"),
            Vehicle(brand="Mazda", model="CX-5", year=2025, category="SUV", color="Rojo", price=105000, currency="PEN", status="usado"),
        ]
        db.add_all(vehicles)
        db.flush()

        start = datetime(2026, 1, 1)

        # Caso 1 PDF - Soles sin gracia
        r1 = run_simulation(
            vehicle_price=95000,
            down_payment=20000,
            rate_type="TEA",
            rate_value=0.12,
            term_months=48,
            grace_type="none",
            grace_months=0,
            balloon_percent=0.25,
            balloon_base="vehicle",
            insurance_vehicle=180,
            insurance_life=45,
            portes=10,
            cok_annual=0.10,
            start_date=start,
        )
        sim1 = Simulation(
            code="SIM-2026-0001",
            customer_id=customers[0].id,
            vehicle_id=vehicles[0].id,
            financiera_id=financiera_id,
            created_by=vendedor.id,
            vehicle_price=95000,
            down_payment=20000,
            amount_financed=r1.amount_financed,
            currency="PEN",
            rate_type="TEA",
            rate_value=0.12,
            tea=r1.tea,
            tem=r1.tem,
            grace_type="none",
            grace_months=0,
            term_months=48,
            balloon_percent=0.25,
            balloon_base="vehicle",
            balloon_amount=r1.balloon_amount,
            monthly_payment=r1.monthly_payment,
            include_insurance_vehicle=True,
            include_insurance_life=True,
            insurance_vehicle=180,
            insurance_life=45,
            portes=10,
            disbursement_date=start,
            van=r1.van,
            tir_monthly=r1.tir_monthly,
            tcea=r1.tcea,
            total_interest=r1.total_interest,
        )
        db.add(sim1)
        db.flush()
        _add_schedule(db, sim1.id, r1)

        # Caso 2 PDF - Dólares con gracia parcial, balón 30% del monto financiado
        r2 = run_simulation(
            vehicle_price=32000,
            down_payment=7000,
            rate_type="TNA",
            rate_value=0.10,
            capitalization=12,
            term_months=60,
            grace_type="partial",
            grace_months=3,
            balloon_percent=0.30,
            balloon_base="financed",
            insurance_vehicle=65,
            insurance_life=18,
            portes=5,
            cok_annual=0.10,
            start_date=start,
        )
        sim2 = Simulation(
            code="SIM-2026-0002",
            customer_id=customers[1].id,
            vehicle_id=vehicles[1].id,
            financiera_id=financiera_id,
            created_by=vendedor.id,
            vehicle_price=32000,
            down_payment=7000,
            amount_financed=r2.amount_financed,
            currency="USD",
            rate_type="TNA",
            rate_value=0.10,
            capitalization=12,
            tea=r2.tea,
            tem=r2.tem,
            grace_type="partial",
            grace_months=3,
            term_months=60,
            balloon_percent=0.30,
            balloon_base="financed",
            balloon_amount=r2.balloon_amount,
            monthly_payment=r2.monthly_payment,
            include_insurance_vehicle=True,
            include_insurance_life=True,
            insurance_vehicle=65,
            insurance_life=18,
            portes=5,
            disbursement_date=start,
            van=r2.van,
            tir_monthly=r2.tir_monthly,
            tcea=r2.tcea,
            total_interest=r2.total_interest,
        )
        db.add(sim2)
        db.flush()
        _add_schedule(db, sim2.id, r2)

        db.add(Application(simulation_id=sim1.id, status="Approved", analyst_id=soporte.id, approved_amount=75000))
        db.add(Application(simulation_id=sim2.id, status="Pending"))

        db.commit()
        print("Seed data applied successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
