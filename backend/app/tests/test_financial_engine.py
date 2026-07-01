import pytest

from app.services.financial_engine import (
    french_payment_with_balloon,
    run_simulation,
    tea_to_tem,
    tna_to_tea,
    validate_simulation_inputs,
)


class TestConversions:
    def test_tna_to_tea_monthly(self):
        tea = tna_to_tea(0.10, 12)
        assert round(tea, 4) == 0.1047

    def test_tea_to_tem(self):
        tem = tea_to_tem(0.12)
        assert tem > 0
        assert tem < 0.12


class TestFrenchPayment:
    def test_balloon_payment_positive(self):
        c = french_payment_with_balloon(75000, tea_to_tem(0.12), 48, 18750)
        assert c > 0
        assert c < 75000


class TestCase1SolesSinGracia:
    """Caso 1 del informe: Toyota Corolla Cross, S/ 95,000, sin gracia."""

    def test_case1(self):
        result = run_simulation(
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
        )
        assert result.amount_financed == 75000
        assert result.balloon_amount == 23750  # 25% of vehicle price per spec
        assert len(result.schedule) == 48
        assert result.schedule[-1].balloon_payment == result.balloon_amount
        assert result.schedule[-1].closing_balance == 0
        assert result.tcea is not None
        assert result.van is not None
        assert result.tir_monthly is not None


class TestCase2DolaresGraciaParcial:
    """Caso 2: Kia Sportage, USD, TNA 10% mensual, gracia parcial 3 meses."""

    def test_case2(self):
        result = run_simulation(
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
        )
        assert result.amount_financed == 25000
        assert result.balloon_amount == 8000
        assert len(result.schedule) == 60
        for row in result.schedule[:3]:
            assert row.is_grace_period
            assert row.amortization == 0
        assert result.schedule[-1].balloon_payment == result.balloon_amount


class TestValidations:
    def test_down_payment_too_high(self):
        with pytest.raises(ValueError, match="cuota inicial"):
            validate_simulation_inputs(95000, 95000, 0.12, 48, 0, 0.25)

    def test_grace_exceeds_term(self):
        with pytest.raises(ValueError, match="plazo"):
            validate_simulation_inputs(95000, 20000, 0.12, 6, 6, 0.25)

    def test_zero_rate(self):
        with pytest.raises(ValueError, match="tasa"):
            validate_simulation_inputs(95000, 20000, 0, 48, 0, 0.25)
