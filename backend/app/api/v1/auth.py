from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permission
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas import LoginRequest, Token, UserCreate, UserResponse
from app.services.audit import log_audit

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


@router.post("/login", response_model=Token)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        log_audit(db, user.id if user else None, "LOGIN_FAILED", "user", None, None, {"email": data.email}, request)
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    log_audit(db, user.id, "LOGIN", "user", user.id, None, None, request)
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users:manage")),
):
    return db.query(User).filter(User.is_active == True).order_by(User.id).all()
