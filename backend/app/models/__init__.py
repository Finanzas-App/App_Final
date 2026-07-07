from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="Vendedor")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CurrencyType(Base):
    __tablename__ = "currency_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(3), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    symbol: Mapped[str] = mapped_column(String(5), nullable=False)


class InterestRateType(Base):
    __tablename__ = "interest_rate_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)


class GracePeriodType(Base):
    __tablename__ = "grace_period_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)


class PaymentStatus(Base):
    __tablename__ = "payment_statuses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)


class Financiera(Base):
    __tablename__ = "financieras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombres: Mapped[str] = mapped_column(String(120), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(120), nullable=False)
    dni: Mapped[str] = mapped_column(String(8), unique=True, index=True, nullable=False)
    edad: Mapped[int] = mapped_column(Integer, nullable=False)
    ingreso_mensual: Mapped[float] = mapped_column(Float, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    telefono: Mapped[str] = mapped_column(String(9), nullable=False)
    direccion: Mapped[str] = mapped_column(String(255), default="")
    esta_trabajando: Mapped[bool] = mapped_column(Boolean, default=True)
    es_dependiente: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    simulations = relationship("Simulation", back_populates="customer")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    brand: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(40), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="PEN")
    status: Mapped[str] = mapped_column(String(20), default="nuevo")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    simulations = relationship("Simulation", back_populates="vehicle")


class FinancialSettings(Base):
    __tablename__ = "financial_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dealership_name: Mapped[str] = mapped_column(String(200), default="AutoFinance Pro Concesionaria")
    dealership_ruc: Mapped[str] = mapped_column(String(11), default="20123456789")
    dealership_email: Mapped[str] = mapped_column(String(255), default="contacto@autofinance.pro")
    default_currency: Mapped[str] = mapped_column(String(3), default="PEN")
    exchange_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    cok_annual: Mapped[float] = mapped_column(Float, default=0.10)
    default_balloon_percent: Mapped[float] = mapped_column(Float, default=0.25)
    default_capitalization: Mapped[int] = mapped_column(Integer, default=12)
    insurance_vehicle_monthly: Mapped[float] = mapped_column(Float, default=180.0)
    insurance_life_monthly: Mapped[float] = mapped_column(Float, default=45.0)
    portes_monthly: Mapped[float] = mapped_column(Float, default=10.0)
    commission_rate: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Simulation(Base):
    __tablename__ = "simulations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False)
    financiera_id: Mapped[int | None] = mapped_column(ForeignKey("financieras.id"), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    vehicle_price: Mapped[float] = mapped_column(Float, nullable=False)
    down_payment: Mapped[float] = mapped_column(Float, nullable=False)
    amount_financed: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="PEN")
    rate_type: Mapped[str] = mapped_column(String(20), nullable=False)
    rate_value: Mapped[float] = mapped_column(Float, nullable=False)
    capitalization: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tea: Mapped[float] = mapped_column(Float, nullable=False)
    tem: Mapped[float] = mapped_column(Float, nullable=False)
    grace_type: Mapped[str] = mapped_column(String(20), default="none")
    grace_months: Mapped[int] = mapped_column(Integer, default=0)
    term_months: Mapped[int] = mapped_column(Integer, nullable=False)
    balloon_percent: Mapped[float] = mapped_column(Float, default=0.25)
    balloon_base: Mapped[str] = mapped_column(String(20), default="vehicle")
    balloon_amount: Mapped[float] = mapped_column(Float, nullable=False)
    monthly_payment: Mapped[float] = mapped_column(Float, nullable=False)
    include_insurance_vehicle: Mapped[bool] = mapped_column(Boolean, default=True)
    include_insurance_life: Mapped[bool] = mapped_column(Boolean, default=True)
    insurance_vehicle: Mapped[float] = mapped_column(Float, default=0.0)
    insurance_life: Mapped[float] = mapped_column(Float, default=0.0)
    portes: Mapped[float] = mapped_column(Float, default=0.0)
    commission: Mapped[float] = mapped_column(Float, default=0.0)
    disbursement_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    van: Mapped[float | None] = mapped_column(Float, nullable=True)
    tir_monthly: Mapped[float | None] = mapped_column(Float, nullable=True)
    tcea: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_interest: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="simulations")
    vehicle = relationship("Vehicle", back_populates="simulations")
    financiera = relationship("Financiera")
    schedule = relationship("PaymentSchedule", back_populates="simulation", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="simulation")


class PaymentSchedule(Base):
    __tablename__ = "payment_schedule"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(ForeignKey("simulations.id"), nullable=False)
    period: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    opening_balance: Mapped[float] = mapped_column(Float, nullable=False)
    interest: Mapped[float] = mapped_column(Float, nullable=False)
    amortization: Mapped[float] = mapped_column(Float, nullable=False)
    insurance_vehicle: Mapped[float] = mapped_column(Float, default=0.0)
    insurance_life: Mapped[float] = mapped_column(Float, default=0.0)
    portes: Mapped[float] = mapped_column(Float, default=0.0)
    payment: Mapped[float] = mapped_column(Float, nullable=False)
    balloon_payment: Mapped[float] = mapped_column(Float, default=0.0)
    closing_balance: Mapped[float] = mapped_column(Float, nullable=False)
    is_grace_period: Mapped[bool] = mapped_column(Boolean, default=False)
    payment_status_id: Mapped[int] = mapped_column(ForeignKey("payment_statuses.id"), default=1)

    simulation = relationship("Simulation", back_populates="schedule")
    payment_status = relationship("PaymentStatus")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(ForeignKey("simulations.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    analyst_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    simulation = relationship("Simulation", back_populates="applications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    user = relationship("User")
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    previous_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
