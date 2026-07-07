"""OTP generation, storage and verification for 2FA login."""

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import LoginChallenge, User
from app.services.email import send_otp_email

# A-Z and 2-9 — excludes 0/O, 1/I for readability
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_code(length: int | None = None) -> str:
    n = length or settings.OTP_LENGTH
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(n))


def hash_code(code: str) -> str:
    normalized = code.strip().upper()
    return hmac.new(
        settings.SECRET_KEY.encode(),
        normalized.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_code(code: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_code(code), stored_hash)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _invalidate_pending(db: Session, user_id: int) -> None:
    db.query(LoginChallenge).filter(
        LoginChallenge.user_id == user_id,
        LoginChallenge.used == False,  # noqa: E712
    ).update({"used": True})
    db.flush()


def create_challenge(db: Session, user: User) -> tuple[LoginChallenge, str]:
    _invalidate_pending(db, user.id)
    code = generate_code()
    now = _utcnow()
    challenge = LoginChallenge(
        id=uuid.uuid4(),
        user_id=user.id,
        code_hash=hash_code(code),
        expires_at=now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        attempts=0,
        used=False,
        last_sent_at=now,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    send_otp_email(user.email, user.name, code)
    return challenge, code


def resend_challenge(db: Session, challenge_id: uuid.UUID) -> LoginChallenge:
    challenge = db.query(LoginChallenge).filter(LoginChallenge.id == challenge_id).first()
    if not challenge or challenge.used:
        raise HTTPException(status_code=400, detail="Desafío de verificación inválido")
    expires = challenge.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < _utcnow():
        raise HTTPException(status_code=400, detail="El código ha expirado. Inicia sesión nuevamente.")

    now = _utcnow()
    last_sent = challenge.last_sent_at
    if last_sent.tzinfo is None:
        last_sent = last_sent.replace(tzinfo=timezone.utc)
    if (now - last_sent).total_seconds() < 60:
        raise HTTPException(status_code=429, detail="Espera 60 segundos antes de reenviar el código")

    user = db.query(User).filter(User.id == challenge.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")

    code = generate_code()
    challenge.code_hash = hash_code(code)
    challenge.attempts = 0
    challenge.last_sent_at = now
    db.commit()
    send_otp_email(user.email, user.name, code)
    return challenge


def verify_challenge(db: Session, challenge_id: uuid.UUID, code: str) -> User:
    challenge = db.query(LoginChallenge).filter(LoginChallenge.id == challenge_id).first()
    if not challenge or challenge.used:
        raise HTTPException(status_code=400, detail="Desafío de verificación inválido")

    expires = challenge.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < _utcnow():
        raise HTTPException(status_code=400, detail="El código ha expirado. Inicia sesión nuevamente.")

    if challenge.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Demasiados intentos. Inicia sesión nuevamente.")

    if not verify_code(code, challenge.code_hash):
        challenge.attempts += 1
        db.commit()
        remaining = settings.OTP_MAX_ATTEMPTS - challenge.attempts
        if remaining <= 0:
            raise HTTPException(status_code=400, detail="Demasiados intentos. Inicia sesión nuevamente.")
        raise HTTPException(
            status_code=400,
            detail=f"Código incorrecto. Te quedan {remaining} intento(s).",
        )

    user = db.query(User).filter(User.id == challenge.user_id, User.is_active == True).first()  # noqa: E712
    if not user:
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    challenge.used = True
    db.commit()
    return user
