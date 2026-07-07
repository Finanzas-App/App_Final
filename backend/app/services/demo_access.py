"""Demo access token helpers — skip 2FA for seeded base users."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DemoAccessToken


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_active_demo_token(db: Session, user_id: int) -> DemoAccessToken | None:
    token = (
        db.query(DemoAccessToken)
        .filter(
            DemoAccessToken.user_id == user_id,
            DemoAccessToken.is_active == True,  # noqa: E712
        )
        .order_by(DemoAccessToken.expires_at.desc())
        .first()
    )
    if not token:
        return None
    expires = token.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires <= _utcnow():
        return None
    return token


def create_demo_token(db: Session, user_id: int) -> DemoAccessToken:
    from datetime import timedelta

    token = DemoAccessToken(
        user_id=user_id,
        expires_at=_utcnow() + timedelta(days=settings.DEMO_ACCESS_TOKEN_DAYS),
        is_active=True,
    )
    db.add(token)
    return token
