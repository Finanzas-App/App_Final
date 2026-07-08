"""Motor financiero - Compra Inteligente con método francés vencido ordinario."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal


GraceType = Literal["none", "total", "partial"]
RateType = Literal["TEA", "TNA"]
BalloonBase = Literal["vehicle", "financed"]


@dataclass
class ScheduleRow:
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


@dataclass
class SimulationResult:
    amount_financed: float
    tea: float
    tem: float
    balloon_amount: float
    monthly_payment: float
    total_interest: float
    van: float
    tir_monthly: float
    tcea: float
    schedule: list[ScheduleRow]


def round_money(value: float) -> float:
    return round(value, 2)


def round_rate(value: float, decimals: int = 6) -> float:
    return round(value, decimals)


def tna_to_tea(tna: float, capitalization: int) -> float:
    """TEA = (1 + TNA/m)^m - 1"""
    return round_rate((1 + tna / capitalization) ** capitalization - 1)


def tea_to_tem(tea: float) -> float:
    """TEM = (1 + TEA)^(1/12) - 1"""
    return round_rate((1 + tea) ** (1 / 12) - 1)


def french_payment_with_balloon(principal: float, rate: float, n: int, balloon: float) -> float:
    """C = (P - B/(1+i)^n) * i / (1 - (1+i)^(-n))"""
    if n <= 0:
        return 0.0
    if rate == 0:
        return round_money((principal - balloon) / n)
    pv_balloon = balloon / ((1 + rate) ** n)
    adjusted_principal = principal - pv_balloon
    factor = rate / (1 - (1 + rate) ** (-n))
    return round_money(adjusted_principal * factor)


def calculate_balloon_amount(
    vehicle_price: float,
    amount_financed: float,
    balloon_percent: float,
    balloon_base: BalloonBase = "vehicle",
) -> float:
    base = vehicle_price if balloon_base == "vehicle" else amount_financed
    return round_money(base * balloon_percent)


def calculate_irr(cash_flows: list[float], guess: float = 0.01, max_iter: int = 1000, tol: float = 1e-8) -> float:
    """TIR mensual por método de Newton-Raphson."""
    rate = guess
    for _ in range(max_iter):
        npv = sum(cf / (1 + rate) ** t for t, cf in enumerate(cash_flows))
        d_npv = sum(-t * cf / (1 + rate) ** (t + 1) for t, cf in enumerate(cash_flows) if t > 0)
        if abs(d_npv) < 1e-12:
            break
        new_rate = rate - npv / d_npv
        if abs(new_rate - rate) < tol:
            return round_rate(new_rate)
        rate = new_rate
    return round_rate(rate)


def calculate_npv(cash_flows: list[float], rate: float) -> float:
    return round_money(sum(cf / (1 + rate) ** t for t, cf in enumerate(cash_flows)))


def validate_simulation_inputs(
    vehicle_price: float,
    down_payment: float,
    rate_value: float,
    term_months: int,
    grace_months: int,
    balloon_percent: float,
    balloon_base: BalloonBase = "vehicle",
) -> None:
    if down_payment >= vehicle_price:
        raise ValueError("La cuota inicial debe ser menor al precio del vehículo")
    if term_months <= grace_months:
        raise ValueError("El plazo debe ser mayor a los meses de gracia")
    if rate_value <= 0:
        raise ValueError("La tasa debe ser mayor a cero")
    amount_financed = vehicle_price - down_payment
    balloon_amount = calculate_balloon_amount(vehicle_price, amount_financed, balloon_percent, balloon_base)
    if balloon_amount >= vehicle_price:
        raise ValueError("La cuota balón debe ser menor al precio del vehículo")
    if balloon_amount > amount_financed:
        raise ValueError("La cuota balón no puede ser mayor al monto financiado")
    if amount_financed <= 0:
        raise ValueError("El monto financiado debe ser mayor a cero")


def run_simulation(
    vehicle_price: float,
    down_payment: float,
    rate_type: RateType,
    rate_value: float,
    term_months: int,
    grace_type: GraceType = "none",
    grace_months: int = 0,
    balloon_percent: float = 0.25,
    balloon_base: BalloonBase = "vehicle",
    capitalization: int | None = None,
    insurance_vehicle: float = 0.0,
    insurance_life: float = 0.0,
    include_insurance_vehicle: bool = True,
    include_insurance_life: bool = True,
    portes: float = 0.0,
    commission: float = 0.0,
    cok_annual: float = 0.10,
    start_date: datetime | None = None,
) -> SimulationResult:
    validate_simulation_inputs(
        vehicle_price, down_payment, rate_value, term_months, grace_months, balloon_percent, balloon_base
    )

    amount_financed = round_money(vehicle_price - down_payment)
    balloon_amount = calculate_balloon_amount(vehicle_price, amount_financed, balloon_percent, balloon_base)

    ins_v = insurance_vehicle if include_insurance_vehicle else 0.0
    ins_l = insurance_life if include_insurance_life else 0.0

    if rate_type == "TNA":
        if not capitalization or capitalization <= 0:
            raise ValueError("Debe indicar capitalizaciones por año para tasa nominal")
        tea = tna_to_tea(rate_value, capitalization)
    else:
        tea = round_rate(rate_value)

    tem = tea_to_tem(tea)
    start = start_date or datetime.now()

    balance = amount_financed
    schedule: list[ScheduleRow] = []
    total_interest = 0.0
    debtor_flows: list[float] = [amount_financed]

    for g in range(1, grace_months + 1):
        interest = round_money(balance * tem)
        total_interest += interest
        if grace_type == "total":
            amortization = 0.0
            payment = 0.0
            balance = round_money(balance * (1 + tem))
        elif grace_type == "partial":
            amortization = 0.0
            payment = round_money(interest + ins_v + ins_l + portes)
        else:
            amortization = 0.0
            payment = 0.0

        debtor_flows.append(-(payment + commission if g == 1 else payment))

        schedule.append(
            ScheduleRow(
                period=g,
                due_date=start + timedelta(days=30 * g),
                opening_balance=round_money(balance if grace_type != "total" else balance / (1 + tem)),
                interest=interest,
                amortization=amortization,
                insurance_vehicle=ins_v,
                insurance_life=ins_l,
                portes=portes,
                payment=payment,
                balloon_payment=0.0,
                closing_balance=balance if grace_type == "total" else round_money(balance),
                is_grace_period=True,
            )
        )
        if grace_type == "total":
            schedule[-1].opening_balance = round_money(balance / (1 + tem))
            schedule[-1].closing_balance = balance

    remaining_months = term_months - grace_months
    monthly_payment = french_payment_with_balloon(balance, tem, remaining_months, balloon_amount)

    for k in range(grace_months + 1, term_months + 1):
        opening = balance
        interest = round_money(opening * tem)
        is_last = k == term_months
        amortization = round_money(monthly_payment - interest) if not is_last else round_money(opening)
        if is_last:
            balloon_pay = balloon_amount
            payment = round_money(interest + amortization + ins_v + ins_l + portes + balloon_pay)
            closing = 0.0
        else:
            balloon_pay = 0.0
            payment = round_money(monthly_payment + ins_v + ins_l + portes)
            closing = round_money(opening - amortization)

        total_interest += interest
        balance = closing
        debtor_flows.append(-payment)

        schedule.append(
            ScheduleRow(
                period=k,
                due_date=start + timedelta(days=30 * k),
                opening_balance=opening,
                interest=interest,
                amortization=amortization,
                insurance_vehicle=ins_v,
                insurance_life=ins_l,
                portes=portes,
                payment=payment,
                balloon_payment=balloon_pay,
                closing_balance=closing,
                is_grace_period=False,
            )
        )

    tir_monthly = calculate_irr(debtor_flows)
    tcea = round_rate((1 + tir_monthly) ** 12 - 1, 4)
    cok_monthly = (1 + cok_annual) ** (1 / 12) - 1
    van = calculate_npv(debtor_flows, cok_monthly)

    return SimulationResult(
        amount_financed=amount_financed,
        tea=tea,
        tem=tem,
        balloon_amount=balloon_amount,
        monthly_payment=monthly_payment,
        total_interest=round_money(total_interest),
        van=van,
        tir_monthly=tir_monthly,
        tcea=tcea,
        schedule=schedule,
    )
