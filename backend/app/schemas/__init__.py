from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["Admin", "Analyst", "Executive"] = "Executive"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CustomerBase(BaseModel):
    nombres: str
    apellidos: str
    dni: str
    edad: int
    ingreso_mensual: float
    email: EmailStr
    telefono: str

    @field_validator("dni")
    @classmethod
    def validate_dni(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 8:
            raise ValueError("El DNI debe tener 8 dígitos numéricos")
        return v

    @field_validator("edad")
    @classmethod
    def validate_edad(cls, v: int) -> int:
        if v < 18:
            raise ValueError("La edad debe ser mayor o igual a 18")
        return v


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class VehicleBase(BaseModel):
    brand: str
    model: str
    year: int
    category: str
    color: str
    price: float = Field(gt=0)
    currency: Literal["PEN", "USD"] = "PEN"
    status: str = "available"


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(VehicleBase):
    pass


class VehicleResponse(VehicleBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class FinancialSettingsResponse(BaseModel):
    id: int
    default_currency: str
    exchange_rate: float | None
    cok_annual: float
    default_balloon_percent: float
    default_capitalization: int
    insurance_vehicle_monthly: float
    insurance_life_monthly: float
    commission_rate: float
    updated_at: datetime

    model_config = {"from_attributes": True}


class FinancialSettingsUpdate(BaseModel):
    default_currency: Literal["PEN", "USD"] | None = None
    exchange_rate: float | None = None
    cok_annual: float | None = None
    default_balloon_percent: float | None = None
    default_capitalization: int | None = None
    insurance_vehicle_monthly: float | None = None
    insurance_life_monthly: float | None = None
    commission_rate: float | None = None


class SimulationCreate(BaseModel):
    customer_id: int
    vehicle_id: int
    down_payment: float
    rate_type: Literal["TEA", "TNA"]
    rate_value: float = Field(gt=0)
    capitalization: int | None = None
    grace_type: Literal["none", "total", "partial"] = "none"
    grace_months: int = Field(ge=0, default=0)
    term_months: int = Field(gt=0)
    balloon_percent: float = Field(gt=0, lt=1, default=0.25)
    insurance_vehicle: float | None = None
    insurance_life: float | None = None
    commission: float | None = None


class ScheduleRowResponse(BaseModel):
    period: int
    due_date: datetime
    opening_balance: float
    interest: float
    amortization: float
    insurance_vehicle: float
    insurance_life: float
    payment: float
    balloon_payment: float
    closing_balance: float
    is_grace_period: bool

    model_config = {"from_attributes": True}


class SimulationResponse(BaseModel):
    id: int
    code: str
    customer_id: int
    vehicle_id: int
    vehicle_price: float
    down_payment: float
    amount_financed: float
    currency: str
    rate_type: str
    rate_value: float
    capitalization: int | None
    tea: float
    tem: float
    grace_type: str
    grace_months: int
    term_months: int
    balloon_percent: float
    balloon_amount: float
    monthly_payment: float
    insurance_vehicle: float
    insurance_life: float
    commission: float
    van: float | None
    tir_monthly: float | None
    tcea: float | None
    total_interest: float
    status: str
    created_at: datetime
    schedule: list[ScheduleRowResponse] = []

    model_config = {"from_attributes": True}


class SimulationListItem(BaseModel):
    id: int
    code: str
    customer_id: int
    vehicle_id: int
    amount_financed: float
    currency: str
    monthly_payment: float
    tcea: float | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplicationCreate(BaseModel):
    simulation_id: int


class ApplicationStatusUpdate(BaseModel):
    status: Literal["Pending", "Approved", "Observed", "Rejected"]
    decision_reason: str | None = None
    approved_amount: float | None = None

    @field_validator("decision_reason")
    @classmethod
    def require_reason_on_reject(cls, v: str | None, info) -> str | None:
        status = info.data.get("status")
        if status == "Rejected" and not v:
            raise ValueError("El motivo es obligatorio al rechazar")
        return v


class ApplicationResponse(BaseModel):
    id: int
    simulation_id: int
    status: str
    decision_reason: str | None
    analyst_id: int | None
    approved_amount: float | None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    total_financed: float
    active_simulations: int
    approval_rate: float
    total_customers: int
    total_vehicles: int
    simulations_by_month: list[dict]
    financing_by_category: list[dict]
    currency_distribution: list[dict]
