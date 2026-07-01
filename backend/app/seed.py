"""Seed data for AutoFinance Pro demo."""

from datetime import datetime

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import Application, Customer, FinancialSettings, PaymentSchedule, Simulation, User, Vehicle
from app.services.financial_engine import run_simulation


def seed():
    db = SessionLocal()
    try:
        if db.query(User).first():
            print("Seed already applied, skipping.")
            return

        admin = User(
            name="Admin Demo",
            email="admin@autofinance.pro",
            password_hash=get_password_hash("admin123"),
            role="Admin",
        )
        analyst = User(
            name="Ana Analyst",
            email="analyst@autofinance.pro",
            password_hash=get_password_hash("analyst123"),
            role="Analyst",
        )
        executive = User(
            name="Carlos Executive",
            email="executive@autofinance.pro",
            password_hash=get_password_hash("exec123"),
            role="Executive",
        )
        db.add_all([admin, analyst, executive])
        db.flush()

        settings = FinancialSettings(
            default_currency="PEN",
            exchange_rate=3.75,
            cok_annual=0.10,
            default_balloon_percent=0.25,
            default_capitalization=12,
            insurance_vehicle_monthly=45.0,
            insurance_life_monthly=180.0,
            commission_rate=0.0,
        )
        db.add(settings)

        customers = [
            Customer(nombres="María", apellidos="García López", dni="45678901", edad=32, ingreso_mensual=8500, email="maria.garcia@email.com", telefono="987654321", created_by=executive.id),
            Customer(nombres="Juan", apellidos="Pérez Ruiz", dni="12345678", edad=28, ingreso_mensual=6200, email="juan.perez@email.com", telefono="912345678", created_by=executive.id),
            Customer(nombres="Lucía", apellidos="Torres Vega", dni="87654321", edad=35, ingreso_mensual=12000, email="lucia.torres@email.com", telefono="998877665", created_by=executive.id),
        ]
        db.add_all(customers)
        db.flush()

        vehicles = [
            Vehicle(brand="Toyota", model="Corolla Cross", year=2026, category="SUV", color="Blanco", price=95000, currency="PEN", status="available"),
            Vehicle(brand="Kia", model="Sportage", year=2026, category="SUV", color="Gris", price=32000, currency="USD", status="available"),
            Vehicle(brand="Hyundai", model="Tucson", year=2025, category="SUV", color="Negro", price=88000, currency="PEN", status="available"),
            Vehicle(brand="Mazda", model="CX-5", year=2025, category="SUV", color="Rojo", price=105000, currency="PEN", status="available"),
        ]
        db.add_all(vehicles)
        db.flush()

        # Caso 1 - Soles sin gracia
        r1 = run_simulation(
            vehicle_price=95000,
            down_payment=20000,
            rate_type="TEA",
            rate_value=0.12,
            term_months=48,
            grace_type="none",
            grace_months=0,
            balloon_percent=0.25,
            insurance_vehicle=45,
            insurance_life=180,
            cok_annual=0.10,
            start_date=datetime(2026, 1, 1),
        )
        sim1 = Simulation(
            code="SIM-2026-0001",
            customer_id=customers[0].id,
            vehicle_id=vehicles[0].id,
            created_by=executive.id,
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
            balloon_amount=r1.balloon_amount,
            monthly_payment=r1.monthly_payment,
            insurance_vehicle=45,
            insurance_life=180,
            van=r1.van,
            tir_monthly=r1.tir_monthly,
            tcea=r1.tcea,
            total_interest=r1.total_interest,
        )
        db.add(sim1)
        db.flush()
        for row in r1.schedule:
            db.add(PaymentSchedule(simulation_id=sim1.id, **{k: getattr(row, k) for k in ["period", "due_date", "opening_balance", "interest", "amortization", "insurance_vehicle", "insurance_life", "payment", "balloon_payment", "closing_balance", "is_grace_period"]}))

        # Caso 2 - Dólares con gracia parcial
        r2 = run_simulation(
            vehicle_price=32000,
            down_payment=7000,
            rate_type="TNA",
            rate_value=0.10,
            capitalization=12,
            term_months=60,
            grace_type="partial",
            grace_months=3,
            balloon_percent=0.25,
            insurance_vehicle=15,
            insurance_life=50,
            cok_annual=0.10,
            start_date=datetime(2026, 1, 1),
        )
        sim2 = Simulation(
            code="SIM-2026-0002",
            customer_id=customers[1].id,
            vehicle_id=vehicles[1].id,
            created_by=executive.id,
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
            balloon_percent=0.25,
            balloon_amount=r2.balloon_amount,
            monthly_payment=r2.monthly_payment,
            insurance_vehicle=15,
            insurance_life=50,
            van=r2.van,
            tir_monthly=r2.tir_monthly,
            tcea=r2.tcea,
            total_interest=r2.total_interest,
        )
        db.add(sim2)
        db.flush()
        for row in r2.schedule:
            db.add(PaymentSchedule(simulation_id=sim2.id, **{k: getattr(row, k) for k in ["period", "due_date", "opening_balance", "interest", "amortization", "insurance_vehicle", "insurance_life", "payment", "balloon_payment", "closing_balance", "is_grace_period"]}))

        db.add(Application(simulation_id=sim1.id, status="Approved", analyst_id=analyst.id, approved_amount=75000))
        db.add(Application(simulation_id=sim2.id, status="Pending"))

        db.commit()
        print("Seed data applied successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
