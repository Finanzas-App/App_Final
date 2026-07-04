from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


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
    direccion: str = ""
    esta_trabajando: bool = True
    es_dependiente: bool = False

    @field_validator("dni")
    @classmethod
    def validate_dni(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 8:
            raise ValueError("El DNI debe tener 8 dígitos numéricos")
        return v

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 9:
            raise ValueError("El teléfono debe tener 9 dígitos numéricos")
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
    year: int = Field(ge=2020)
    category: Literal["Sedán", "SUV", "Hatchback", "Pickup", "Van"] = "SUV"
    color: str
    price: float = Field(gt=0)
    currency: Literal["PEN", "USD"] = "PEN"
    status: Literal["nuevo", "usado"] = "nuevo"


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(VehicleBase):
    pass


class VehicleResponse(VehicleBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class FinancieraResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    model_config = {"from_attributes": True}


class FinancialSettingsResponse(BaseModel):
    id: int
    dealership_name: str
    dealership_ruc: str
    dealership_email: str
    default_currency: str
    exchange_rate: float | None
    cok_annual: float
    default_balloon_percent: float
    default_capitalization: int
    insurance_vehicle_monthly: float
    insurance_life_monthly: float
    portes_monthly: float
    commission_rate: float
    updated_at: datetime

    model_config = {"from_attributes": True}


class FinancialSettingsUpdate(BaseModel):
    dealership_name: str | None = None
    dealership_ruc: str | None = None
    dealership_email: EmailStr | None = None
    default_currency: Literal["PEN", "USD"] | None = None
    exchange_rate: float | None = None
    cok_annual: float | None = None
    default_balloon_percent: float | None = None
    default_capitalization: int | None = None
    insurance_vehicle_monthly: float | None = None
    insurance_life_monthly: float | None = None
    portes_monthly: float | None = None
    commission_rate: float | None = None

    @field_validator("dealership_ruc")
    @classmethod
    def validate_ruc(cls, v: str | None) -> str | None:
        if v is not None and (not v.isdigit() or len(v) != 11):
            raise ValueError("El RUC debe tener 11 dígitos numéricos")
        return v


class SimulationCreate(BaseModel):
    customer_id: int
    vehicle_id: int
    financiera_id: int | None = None
    down_payment: float
    rate_type: Literal["TEA", "TNA"]
    rate_value: float = Field(gt=0)
    capitalization: int | None = None
    grace_type: Literal["none", "total", "partial"] = "none"
    grace_months: int = Field(ge=0, default=0)
    term_months: int = Field(gt=0)
    balloon_percent: float = Field(gt=0, lt=1, default=0.25)
    balloon_base: Literal["vehicle", "financed"] = "vehicle"
    include_insurance_vehicle: bool = True
    include_insurance_life: bool = True
    insurance_vehicle: float | None = None
    insurance_life: float | None = None
    portes: float | None = None
    commission: float | None = None
    disbursement_date: datetime | None = None


class ScheduleRowResponse(BaseModel):
    period: int
    due_date: datetime
    opening_balance: float
    interest: float
    amortization: float
    insurance_vehicle: float
    insurance_life: float
    portes: float
    payment: float
    balloon_payment: float
    closing_balance: float
    is_grace_period: bool
    payment_status: str = "pending"

    model_config = {"from_attributes": True}


class SimulationResponse(BaseModel):
    id: int
    code: str
    customer_id: int
    vehicle_id: int
    financiera_id: int | None
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
    balloon_base: str
    balloon_amount: float
    monthly_payment: float
    include_insurance_vehicle: bool
    include_insurance_life: bool
    insurance_vehicle: float
    insurance_life: float
    portes: float
    commission: float
    disbursement_date: datetime | None
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


class ApplicationActivityResponse(BaseModel):
    id: int
    application_id: int | None
    action: str
    message: str
    activity_type: Literal["info", "success", "warning", "error"]
    user_name: str | None
    created_at: datetime


class DashboardSummary(BaseModel):
    total_financed: float
    active_simulations: int
    approval_rate: float
    total_customers: int
    total_vehicles: int
    simulations_by_month: list[dict]
    financing_by_category: list[dict]
    currency_distribution: list[dict]
