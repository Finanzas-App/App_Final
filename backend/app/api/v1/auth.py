import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permission
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models import LoginChallenge, User
from app.schemas import (
    LoginRequest,
    LoginResponse,
    Resend2FARequest,
    Token,
    UserCreate,
    UserResponse,
    Verify2FARequest,
)
from app.services.audit import log_audit
from app.services import demo_access
from app.services import otp as otp_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage")),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    user = User(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit(db, current_user.id, "CREATE", "user", user.id, None, {"email": user.email, "role": user.role}, request)
    return user


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        log_audit(db, user.id if user else None, "LOGIN_FAILED", "user", None, None, {"email": data.email}, request)
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    demo_token = demo_access.get_active_demo_token(db, user.id)
    if demo_token:
        expires = demo_token.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        remaining = expires - datetime.now(timezone.utc)
        token = create_access_token(
            {"sub": str(user.id), "role": user.role},
            expires_delta=remaining,
        )
        log_audit(db, user.id, "LOGIN", "user", user.id, None, {"demo_bypass": True}, request)
        return LoginResponse(requires_2fa=False, access_token=token)

    try:
        challenge, _ = otp_service.create_challenge(db, user)
    except RuntimeError:
        log_audit(db, user.id, "LOGIN_2FA_FAILED", "user", user.id, None, {"reason": "email_send_failed"}, request)
        raise HTTPException(status_code=503, detail="No se pudo enviar el correo de verificación")

    log_audit(db, user.id, "LOGIN_2FA_SENT", "user", user.id, None, {"challenge_id": str(challenge.id)}, request)
    return LoginResponse(
        challenge_id=str(challenge.id),
        expires_in=settings.OTP_EXPIRE_MINUTES * 60,
    )


@router.post("/verify-2fa", response_model=Token)
def verify_2fa(data: Verify2FARequest, request: Request, db: Session = Depends(get_db)):
    try:
        challenge_uuid = uuid.UUID(data.challenge_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Desafío de verificación inválido")

    try:
        user = otp_service.verify_challenge(db, challenge_uuid, data.code)
    except HTTPException as exc:
        log_audit(
            db,
            None,
            "LOGIN_2FA_FAILED",
            "user",
            None,
            None,
            {"challenge_id": data.challenge_id, "detail": exc.detail},
            request,
        )
        raise

    token = create_access_token({"sub": str(user.id), "role": user.role})
    log_audit(db, user.id, "LOGIN_2FA_VERIFIED", "user", user.id, None, None, request)
    log_audit(db, user.id, "LOGIN", "user", user.id, None, None, request)
    return Token(access_token=token)


@router.post("/resend-2fa", response_model=LoginResponse)
def resend_2fa(data: Resend2FARequest, request: Request, db: Session = Depends(get_db)):
    try:
        challenge_uuid = uuid.UUID(data.challenge_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Desafío de verificación inválido")

    challenge = db.query(LoginChallenge).filter(LoginChallenge.id == challenge_uuid).first()
    user_id = challenge.user_id if challenge else None

    try:
        challenge = otp_service.resend_challenge(db, challenge_uuid)
    except RuntimeError:
        raise HTTPException(status_code=503, detail="No se pudo enviar el correo de verificación")

    log_audit(
        db,
        user_id,
        "LOGIN_2FA_SENT",
        "user",
        user_id,
        None,
        {"challenge_id": str(challenge.id), "resent": True},
        request,
    )
    return LoginResponse(
        challenge_id=str(challenge.id),
        expires_in=settings.OTP_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users:manage")),
):
    return db.query(User).order_by(User.is_active.desc(), User.id).all()


@router.patch("/users/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:manage")),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puede desactivarse a sí mismo")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="El usuario ya está inactivo")
    previous = {"is_active": user.is_active}
    user.is_active = False
    db.commit()
    db.refresh(user)
    log_audit(db, current_user.id, "DEACTIVATE", "user", user.id, previous, {"is_active": False}, request)
    return user
