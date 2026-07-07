"""Tests for email-based 2FA login flow."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import get_password_hash
from app.db.session import Base, get_db
from app.main import app
from app.models import LoginChallenge, User, DemoAccessToken
from app.services.otp import hash_code

SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_sent_codes: list[str] = []


def _capture_otp(_to: str, _name: str, code: str) -> None:
    _sent_codes.append(code)


@pytest.fixture()
def client():
    _sent_codes.clear()
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    db.add(User(name="Administrador", email="admin@test.com", password_hash=get_password_hash("test123"), role="Administrador"))
    db.commit()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c, db
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _login_step1(client: TestClient, email="admin@test.com"):
    with patch("app.services.otp.send_otp_email", side_effect=_capture_otp):
        r = client.post("/api/v1/auth/login", json={"email": email, "password": "test123"})
    assert r.status_code == 200
    data = r.json()
    assert data["requires_2fa"] is True
    assert not data.get("access_token")
    assert data["expires_in"] == 300
    return data["challenge_id"]


def test_login_returns_2fa_challenge_not_jwt(client):
    c, _ = client
    challenge_id = _login_step1(c)
    assert challenge_id
    assert len(_sent_codes) == 1
    assert len(_sent_codes[0]) == 6


def test_demo_user_skips_2fa(client):
    c, db = client
    from datetime import timedelta

    user = db.query(User).filter(User.email == "admin@test.com").first()
    db.add(
        DemoAccessToken(
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=365),
            is_active=True,
        )
    )
    db.commit()

    with patch("app.services.otp.send_otp_email", side_effect=_capture_otp):
        r = c.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "test123"})
    assert r.status_code == 200
    data = r.json()
    assert data["requires_2fa"] is False
    assert "access_token" in data
    assert len(_sent_codes) == 0


def test_verify_correct_code_returns_jwt(client):
    c, _ = client
    challenge_id = _login_step1(c)
    code = _sent_codes[-1]
    r = c.post("/api/v1/auth/verify-2fa", json={"challenge_id": challenge_id, "code": code})
    assert r.status_code == 200
    assert "access_token" in r.json()

    me = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "admin@test.com"


def test_verify_wrong_code_increments_attempts(client):
    c, db = client
    challenge_id = _login_step1(c)
    r = c.post("/api/v1/auth/verify-2fa", json={"challenge_id": challenge_id, "code": "XXXXXX"})
    assert r.status_code == 400
    assert "incorrecto" in r.json()["detail"].lower()

    challenge = db.query(LoginChallenge).filter(LoginChallenge.id == uuid.UUID(challenge_id)).first()
    assert challenge.attempts == 1


def test_verify_expired_challenge_rejected(client):
    c, db = client
    challenge_id = _login_step1(c)
    challenge = db.query(LoginChallenge).filter(LoginChallenge.id == uuid.UUID(challenge_id)).first()
    challenge.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()

    r = c.post("/api/v1/auth/verify-2fa", json={"challenge_id": challenge_id, "code": _sent_codes[-1]})
    assert r.status_code == 400
    assert "expirado" in r.json()["detail"].lower()


def test_resend_regenerates_code(client):
    c, db = client
    challenge_id = _login_step1(c)
    old_code = _sent_codes[-1]

    challenge = db.query(LoginChallenge).filter(LoginChallenge.id == uuid.UUID(challenge_id)).first()
    challenge.last_sent_at = datetime.now(timezone.utc) - timedelta(seconds=61)
    db.commit()

    with patch("app.services.otp.send_otp_email", side_effect=_capture_otp):
        r = c.post("/api/v1/auth/resend-2fa", json={"challenge_id": challenge_id})
    assert r.status_code == 200
    assert _sent_codes[-1] != old_code

    r2 = c.post("/api/v1/auth/verify-2fa", json={"challenge_id": challenge_id, "code": _sent_codes[-1]})
    assert r2.status_code == 200


def test_resend_rate_limited(client):
    c, db = client
    challenge_id = _login_step1(c)
    challenge = db.query(LoginChallenge).filter(LoginChallenge.id == uuid.UUID(challenge_id)).first()
    challenge.last_sent_at = datetime.now(timezone.utc)
    db.commit()

    with patch("app.services.otp.send_otp_email", side_effect=_capture_otp):
        r = c.post("/api/v1/auth/resend-2fa", json={"challenge_id": challenge_id})
    assert r.status_code == 429


def test_used_code_cannot_be_reused(client):
    c, _ = client
    challenge_id = _login_step1(c)
    code = _sent_codes[-1]
    r1 = c.post("/api/v1/auth/verify-2fa", json={"challenge_id": challenge_id, "code": code})
    assert r1.status_code == 200

    r2 = c.post("/api/v1/auth/verify-2fa", json={"challenge_id": challenge_id, "code": code})
    assert r2.status_code == 400


def test_hash_code_normalizes_case():
    assert hash_code("abc123") == hash_code("ABC123")
