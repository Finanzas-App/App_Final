import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_password_hash
from app.db.session import Base, get_db
from app.main import app
from app.models import AuditLog, Customer, FinancialSettings, Financiera, User, Vehicle

SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _make_users(db):
    users = [
        User(name="Administrador", email="admin@test.com", password_hash=get_password_hash("test123"), role="Administrador"),
        User(name="Soporte", email="soporte@test.com", password_hash=get_password_hash("test123"), role="Soporte"),
        User(name="Vendedor", email="vendedor@test.com", password_hash=get_password_hash("test123"), role="Vendedor"),
    ]
    db.add_all(users)
    db.commit()
    return users


def _seed_simulation_prereqs(db):
    fin = Financiera(name="Banco Test", is_active=True)
    customer = Customer(
        nombres="Ana",
        apellidos="López",
        dni="87654321",
        edad=28,
        ingreso_mensual=6000,
        email="ana@test.com",
        telefono="912345678",
        direccion="Lima",
        esta_trabajando=True,
        es_dependiente=False,
        created_by=3,
    )
    vehicle = Vehicle(
        brand="Toyota",
        model="Corolla",
        year=2026,
        category="Sedán",
        color="Blanco",
        price=85000,
        currency="PEN",
        status="nuevo",
    )
    settings = FinancialSettings(
        dealership_name="Test Motors",
        dealership_ruc="20123456789",
        dealership_email="info@test.com",
        default_currency="PEN",
        exchange_rate=3.75,
        cok_annual=0.10,
        default_balloon_percent=0.25,
        default_capitalization=12,
        insurance_vehicle_monthly=180,
        insurance_life_monthly=45,
        portes_monthly=10,
        commission_rate=0,
    )
    db.add_all([fin, customer, vehicle, settings])
    db.commit()
    db.refresh(fin)
    db.refresh(customer)
    db.refresh(vehicle)
    return fin, customer, vehicle


def _add_audit_log(db, **kwargs):
    log = AuditLog(
        user_id=kwargs.get("user_id", 2),
        action=kwargs.get("action", "STATUS_CHANGE"),
        entity_type="application",
        entity_id=kwargs.get("entity_id", 1),
        previous_value=kwargs.get("previous_value"),
        new_value=kwargs.get("new_value"),
    )
    db.add(log)
    db.commit()
    return log


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    _make_users(db)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


_sent_codes: list[str] = []


def _capture_otp(_to: str, _name: str, code: str) -> None:
    _sent_codes.append(code)


def _token(client, email="admin@test.com"):
    _sent_codes.clear()
    with patch("app.services.otp.send_otp_email", side_effect=_capture_otp):
        r = client.post("/api/v1/auth/login", json={"email": email, "password": "test123"})
    assert r.status_code == 200
    data = r.json()
    assert data.get("requires_2fa") is True
    code = _sent_codes[-1]
    r2 = client.post("/api/v1/auth/verify-2fa", json={"challenge_id": data["challenge_id"], "code": code})
    assert r2.status_code == 200
    return r2.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_and_protected_route(client):
    token = _token(client)
    r = client.get("/api/v1/customers", headers=_auth(token))
    assert r.status_code == 200


def test_vendedor_cannot_update_settings(client):
    token = _token(client, "vendedor@test.com")
    r = client.put(
        "/api/v1/settings/financial",
        headers=_auth(token),
        json={"cok_annual": 0.15},
    )
    assert r.status_code == 403


def test_soporte_cannot_create_customer(client):
    token = _token(client, "soporte@test.com")
    r = client.post(
        "/api/v1/customers",
        headers=_auth(token),
        json={
            "nombres": "Test",
            "apellidos": "User",
            "dni": "99999999",
            "edad": 30,
            "ingreso_mensual": 5000,
            "email": "t@test.com",
            "telefono": "900000000",
            "direccion": "Lima",
            "esta_trabajando": True,
            "es_dependiente": True,
        },
    )
    assert r.status_code == 403


def test_soporte_can_list_applications(client):
    token = _token(client, "soporte@test.com")
    r = client.get("/api/v1/applications", headers=_auth(token))
    assert r.status_code == 200


def test_vendedor_cannot_evaluate_application(client):
    token = _token(client, "vendedor@test.com")
    r = client.put(
        "/api/v1/applications/1/status",
        headers=_auth(token),
        json={"status": "Approved", "decision_reason": "OK", "approved_amount": 50000},
    )
    assert r.status_code in (403, 404)


def test_admin_can_list_users(client):
    token = _token(client, "admin@test.com")
    r = client.get("/api/v1/auth/users", headers=_auth(token))
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_vendedor_cannot_list_users(client):
    token = _token(client, "vendedor@test.com")
    r = client.get("/api/v1/auth/users", headers=_auth(token))
    assert r.status_code == 403


def test_vendedor_cannot_create_vehicle(client):
    token = _token(client, "vendedor@test.com")
    r = client.post(
        "/api/v1/vehicles",
        headers=_auth(token),
        json={
            "brand": "Test",
            "model": "X",
            "year": 2026,
            "category": "SUV",
            "color": "Negro",
            "price": 50000,
            "currency": "PEN",
            "status": "nuevo",
        },
    )
    assert r.status_code == 403


def test_application_activity_from_audit_logs(client):
    db = TestingSessionLocal()
    _add_audit_log(
        db,
        previous_value=json.dumps({"status": "Pending", "decision_reason": None, "approved_amount": None}),
        new_value=json.dumps({"status": "Approved", "decision_reason": "OK", "approved_amount": 100000}),
    )

    token = _token(client, "soporte@test.com")
    r = client.get("/api/v1/applications/activity", headers=_auth(token))
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["action"] == "STATUS_CHANGE"
    assert "Solicitud #1" in data[0]["message"]
    assert data[0]["user_name"] == "Soporte"


def test_admin_can_list_audit_logs(client):
    db = TestingSessionLocal()
    _add_audit_log(db, action="LOGIN", entity_type="user")
    token = _token(client, "admin@test.com")
    r = client.get("/api/v1/audit/logs", headers=_auth(token))
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_soporte_can_list_audit_logs(client):
    token = _token(client, "soporte@test.com")
    r = client.get("/api/v1/audit/logs", headers=_auth(token))
    assert r.status_code == 200


def test_vendedor_cannot_list_audit_logs(client):
    token = _token(client, "vendedor@test.com")
    r = client.get("/api/v1/audit/logs", headers=_auth(token))
    assert r.status_code == 403


def test_log_application_view_not_found(client):
    token = _token(client, "soporte@test.com")
    r = client.post("/api/v1/applications/999/view", headers=_auth(token))
    assert r.status_code == 404


def test_vendedor_can_create_simulation(client):
    db = TestingSessionLocal()
    fin, customer, vehicle = _seed_simulation_prereqs(db)
    token = _token(client, "vendedor@test.com")
    r = client.post(
        "/api/v1/simulations",
        headers=_auth(token),
        json={
            "customer_id": customer.id,
            "vehicle_id": vehicle.id,
            "financiera_id": fin.id,
            "down_payment": 15000,
            "rate_type": "TEA",
            "rate_value": 0.12,
            "capitalization": 12,
            "grace_type": "none",
            "grace_months": 0,
            "term_months": 48,
            "balloon_percent": 0.25,
            "balloon_base": "vehicle",
            "include_insurance_vehicle": True,
            "include_insurance_life": True,
            "portes": 10,
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["amount_financed"] > 0
    assert data["monthly_payment"] > 0
    assert len(data["schedule"]) == 48


def test_admin_can_deactivate_user(client):
    db = TestingSessionLocal()
    extra = User(name="Extra", email="extra@test.com", password_hash=get_password_hash("test123"), role="Vendedor")
    db.add(extra)
    db.commit()
    db.refresh(extra)
    token = _token(client, "admin@test.com")
    r = client.patch(f"/api/v1/auth/users/{extra.id}/deactivate", headers=_auth(token))
    assert r.status_code == 200
    assert r.json()["is_active"] is False


def test_admin_cannot_deactivate_self(client):
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.email == "admin@test.com").first()
    token = _token(client, "admin@test.com")
    r = client.patch(f"/api/v1/auth/users/{admin.id}/deactivate", headers=_auth(token))
    assert r.status_code == 400
