import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_password_hash
from app.db.session import Base, get_db
from app.main import app
from app.models import AuditLog, User

SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _make_users(db):
    users = [
        User(name="Admin", email="admin@test.com", password_hash=get_password_hash("test123"), role="Admin"),
        User(name="Analyst", email="analyst@test.com", password_hash=get_password_hash("test123"), role="Analyst"),
        User(name="Executive", email="exec@test.com", password_hash=get_password_hash("test123"), role="Executive"),
    ]
    db.add_all(users)
    db.commit()
    return users


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


def _token(client, email="admin@test.com"):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "test123"})
    assert r.status_code == 200
    return r.json()["access_token"]


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


def test_executive_cannot_update_settings(client):
    token = _token(client, "exec@test.com")
    r = client.put(
        "/api/v1/settings/financial",
        headers=_auth(token),
        json={"cok_annual": 0.15},
    )
    assert r.status_code == 403


def test_analyst_cannot_create_customer(client):
    token = _token(client, "analyst@test.com")
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


def test_analyst_can_list_applications(client):
    token = _token(client, "analyst@test.com")
    r = client.get("/api/v1/applications", headers=_auth(token))
    assert r.status_code == 200


def test_executive_cannot_evaluate_application(client):
    token = _token(client, "exec@test.com")
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


def test_executive_cannot_list_users(client):
    token = _token(client, "exec@test.com")
    r = client.get("/api/v1/auth/users", headers=_auth(token))
    assert r.status_code == 403


def test_executive_cannot_create_vehicle(client):
    token = _token(client, "exec@test.com")
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

    token = _token(client, "analyst@test.com")
    r = client.get("/api/v1/applications/activity", headers=_auth(token))
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["action"] == "STATUS_CHANGE"
    assert "Solicitud #1" in data[0]["message"]
    assert data[0]["user_name"] == "Analyst"


def test_log_application_view_not_found(client):
    token = _token(client, "analyst@test.com")
    r = client.post("/api/v1/applications/999/view", headers=_auth(token))
    assert r.status_code == 404
