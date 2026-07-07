"""Seed data for AutoFinance Pro demo - aligned with PDF test cases and extended scenarios."""

from datetime import datetime, timedelta, timezone

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import (
    Application,
    Customer,
    DemoAccessToken,
    FinancialSettings,
    Financiera,
    PaymentSchedule,
    PaymentStatus,
    Simulation,
    User,
    Vehicle,
)
from app.services.financial_engine import run_simulation

DEMO_TOKEN_DAYS = 365
PAYMENT_STATUS_PENDING = 1

SCHEDULE_FIELDS = [
    "period", "due_date", "opening_balance", "interest", "amortization",
    "insurance_vehicle", "insurance_life", "portes", "payment", "balloon_payment",
    "closing_balance", "is_grace_period",
]

DEMO_USER_EMAILS = (
    "admin@autofinance.pro",
    "vendedor@autofinance.pro",
    "soporte@autofinance.pro",
)


def _add_schedule(db, sim_id: int, result) -> None:
    for row in result.schedule:
        db.add(
            PaymentSchedule(
                simulation_id=sim_id,
                **{k: getattr(row, k) for k in SCHEDULE_FIELDS},
                payment_status_id=PAYMENT_STATUS_PENDING,
            )
        )


def _persist_simulation(
    db,
    *,
    code: str,
    customer_id: int,
    vehicle_id: int,
    financiera_id: int,
    created_by: int,
    vehicle_price: float,
    down_payment: float,
    currency: str,
    start: datetime,
    engine_kwargs: dict,
) -> Simulation:
    result = run_simulation(vehicle_price=vehicle_price, down_payment=down_payment, start_date=start, **engine_kwargs)
    sim = Simulation(
        code=code,
        customer_id=customer_id,
        vehicle_id=vehicle_id,
        financiera_id=financiera_id,
        created_by=created_by,
        vehicle_price=vehicle_price,
        down_payment=down_payment,
        amount_financed=result.amount_financed,
        currency=currency,
        rate_type=engine_kwargs["rate_type"],
        rate_value=engine_kwargs["rate_value"],
        capitalization=engine_kwargs.get("capitalization"),
        tea=result.tea,
        tem=result.tem,
        grace_type=engine_kwargs.get("grace_type", "none"),
        grace_months=engine_kwargs.get("grace_months", 0),
        term_months=engine_kwargs["term_months"],
        balloon_percent=engine_kwargs.get("balloon_percent", 0.25),
        balloon_base=engine_kwargs.get("balloon_base", "vehicle"),
        balloon_amount=result.balloon_amount,
        monthly_payment=result.monthly_payment,
        include_insurance_vehicle=engine_kwargs.get("include_insurance_vehicle", True),
        include_insurance_life=engine_kwargs.get("include_insurance_life", True),
        insurance_vehicle=engine_kwargs.get("insurance_vehicle", 0.0),
        insurance_life=engine_kwargs.get("insurance_life", 0.0),
        portes=engine_kwargs.get("portes", 0.0),
        disbursement_date=start,
        van=result.van,
        tir_monthly=result.tir_monthly,
        tcea=result.tcea,
        total_interest=result.total_interest,
    )
    db.add(sim)
    db.flush()
    _add_schedule(db, sim.id, result)
    return sim


def ensure_demo_access_tokens(db) -> None:
    """Create long-lived bypass tokens for base demo users (idempotent)."""
    expires = datetime.now(timezone.utc) + timedelta(days=DEMO_TOKEN_DAYS)
    created = 0
    for email in DEMO_USER_EMAILS:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            continue
        active = (
            db.query(DemoAccessToken)
            .filter(
                DemoAccessToken.user_id == user.id,
                DemoAccessToken.is_active == True,  # noqa: E712
                DemoAccessToken.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )
        if not active:
            db.add(DemoAccessToken(user_id=user.id, expires_at=expires, is_active=True))
            created += 1
    if created:
        db.commit()
        print(f"Demo access tokens ensured ({created} created).")


def seed():
    db = SessionLocal()
    try:
        if db.query(User).first():
            ensure_demo_access_tokens(db)
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

        demo_expires = datetime.now(timezone.utc) + timedelta(days=DEMO_TOKEN_DAYS)
        for demo_user in (admin, soporte, vendedor):
            db.add(DemoAccessToken(user_id=demo_user.id, expires_at=demo_expires, is_active=True))

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
            Customer(
                nombres="Pedro", apellidos="Ramos Díaz", dni="45678912", edad=41,
                ingreso_mensual=15000, email="pedro.ramos@email.com", telefono="912345678",
                direccion="Av. Arequipa 2200, Lince", esta_trabajando=True, es_dependiente=True,
                created_by=vendedor.id,
            ),
            Customer(
                nombres="Sofía", apellidos="Mendoza López", dni="52369874", edad=29,
                ingreso_mensual=7800, email="sofia.mendoza@email.com", telefono="934567890",
                direccion="Calle Las Begonias 120, San Isidro", esta_trabajando=True, es_dependiente=False,
                created_by=vendedor.id,
            ),
            Customer(
                nombres="Diego", apellidos="Castillo Vargas", dni="69874523", edad=38,
                ingreso_mensual=10500, email="diego.castillo@email.com", telefono="945678901",
                direccion="Av. La Marina 3456, San Miguel", esta_trabajando=True, es_dependiente=True,
                created_by=soporte.id,
            ),
        ]
        db.add_all(customers)
        db.flush()

        vehicles = [
            Vehicle(brand="Toyota", model="Corolla Cross", year=2026, category="SUV", color="Blanco", price=95000, currency="PEN", status="nuevo"),
            Vehicle(brand="Kia", model="Sportage", year=2026, category="SUV", color="Gris", price=32000, currency="USD", status="nuevo"),
            Vehicle(brand="Hyundai", model="Tucson", year=2025, category="SUV", color="Negro", price=88000, currency="PEN", status="nuevo"),
            Vehicle(brand="Mazda", model="CX-5", year=2025, category="SUV", color="Rojo", price=105000, currency="PEN", status="usado"),
            Vehicle(brand="Nissan", model="Versa", year=2025, category="Sedán", color="Plata", price=62000, currency="PEN", status="nuevo"),
            Vehicle(brand="Ford", model="Ranger", year=2025, category="Pickup", color="Azul", price=38500, currency="USD", status="nuevo"),
            Vehicle(brand="Chevrolet", model="Onix", year=2024, category="Hatchback", color="Blanco", price=48000, currency="PEN", status="usado"),
        ]
        db.add_all(vehicles)
        db.flush()

        start = datetime(2026, 1, 1)
        common_ins_pen = {"insurance_vehicle": 180, "insurance_life": 45, "portes": 10, "cok_annual": 0.10}
        common_ins_usd = {"insurance_vehicle": 65, "insurance_life": 18, "portes": 5, "cok_annual": 0.10}

        sim1 = _persist_simulation(
            db, code="SIM-2026-0001", customer_id=customers[0].id, vehicle_id=vehicles[0].id,
            financiera_id=financiera_id, created_by=vendedor.id, vehicle_price=95000, down_payment=20000,
            currency="PEN", start=start,
            engine_kwargs={
                "rate_type": "TEA", "rate_value": 0.12, "term_months": 48,
                "grace_type": "none", "grace_months": 0, "balloon_percent": 0.25, "balloon_base": "vehicle",
                **common_ins_pen,
            },
        )

        sim2 = _persist_simulation(
            db, code="SIM-2026-0002", customer_id=customers[1].id, vehicle_id=vehicles[1].id,
            financiera_id=financiera_id, created_by=vendedor.id, vehicle_price=32000, down_payment=7000,
            currency="USD", start=start,
            engine_kwargs={
                "rate_type": "TNA", "rate_value": 0.10, "capitalization": 12, "term_months": 60,
                "grace_type": "partial", "grace_months": 3, "balloon_percent": 0.30, "balloon_base": "financed",
                **common_ins_usd,
            },
        )

        sim3 = _persist_simulation(
            db, code="SIM-2026-0003", customer_id=customers[2].id, vehicle_id=vehicles[2].id,
            financiera_id=financiera_id, created_by=vendedor.id, vehicle_price=88000, down_payment=18000,
            currency="PEN", start=start,
            engine_kwargs={
                "rate_type": "TEA", "rate_value": 0.14, "term_months": 36,
                "grace_type": "total", "grace_months": 2, "balloon_percent": 0.20, "balloon_base": "vehicle",
                **common_ins_pen,
            },
        )

        sim4 = _persist_simulation(
            db, code="SIM-2026-0004", customer_id=customers[3].id, vehicle_id=vehicles[4].id,
            financiera_id=financiera_id, created_by=vendedor.id, vehicle_price=62000, down_payment=12000,
            currency="PEN", start=start,
            engine_kwargs={
                "rate_type": "TEA", "rate_value": 0.11, "term_months": 24,
                "grace_type": "none", "grace_months": 0, "balloon_percent": 0.25, "balloon_base": "vehicle",
                "insurance_vehicle": 120, "insurance_life": 35, "portes": 8, "cok_annual": 0.10,
            },
        )

        sim5 = _persist_simulation(
            db, code="SIM-2026-0005", customer_id=customers[4].id, vehicle_id=vehicles[5].id,
            financiera_id=financiera_id, created_by=vendedor.id, vehicle_price=38500, down_payment=8500,
            currency="USD", start=start,
            engine_kwargs={
                "rate_type": "TNA", "rate_value": 0.09, "capitalization": 12, "term_months": 48,
                "grace_type": "none", "grace_months": 0, "balloon_percent": 0.25, "balloon_base": "vehicle",
                **common_ins_usd,
            },
        )

        db.add_all([
            Application(simulation_id=sim1.id, status="Approved", analyst_id=soporte.id, approved_amount=75000),
            Application(simulation_id=sim2.id, status="Pending"),
            Application(
                simulation_id=sim3.id, status="Observed", analyst_id=soporte.id,
                decision_reason="Ingreso mensual en límite para el monto solicitado",
            ),
            Application(
                simulation_id=sim4.id, status="Rejected", analyst_id=soporte.id,
                decision_reason="Historial crediticio no cumple política de la financiera",
            ),
            Application(simulation_id=sim5.id, status="Pending"),
        ])

        db.commit()
        print("Seed data applied successfully (6 clientes, 7 vehículos, 5 simulaciones, 5 solicitudes).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
