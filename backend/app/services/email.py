"""Email delivery for OTP and other notifications."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from string import Template

from app.core.config import settings

logger = logging.getLogger(__name__)

_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "otp_email.html"


def render_otp_email(user_name: str, otp_code: str) -> str:
    template = Template(_TEMPLATE_PATH.read_text(encoding="utf-8"))
    return template.substitute(
        user_name=user_name,
        otp_code=otp_code,
        expire_minutes=settings.OTP_EXPIRE_MINUTES,
    )


def send_otp_email(to_email: str, user_name: str, otp_code: str) -> None:
    html_body = render_otp_email(user_name, otp_code)
    subject = f"Tu código de verificación — AutoFinance Pro"

    if not settings.SMTP_HOST:
        logger.warning(
            "[DEV] SMTP no configurado — código OTP para %s: %s (expira en %s min)",
            to_email,
            otp_code,
            settings.OTP_EXPIRE_MINUTES,
        )
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(f"Tu código de verificación es: {otp_code}. Expira en {settings.OTP_EXPIRE_MINUTES} minutos.", "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())
    except Exception as exc:
        logger.exception("Error enviando email OTP a %s", to_email)
        raise RuntimeError("No se pudo enviar el correo de verificación") from exc
