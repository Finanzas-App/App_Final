"""
Prueba manual de envío SMTP (OTP HTML).

Uso (desde backend/):
  python scripts/test_smtp_send.py

Variables de entorno (mismas que docker-compose.yml):
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_USE_TLS
  TEST_EMAIL_TO — destinatario (default: sergioiglesias7pe@gmail.com)
"""

import os
import sys

# Permitir importar app.* desde backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services.email import send_otp_email
from app.services.otp import generate_code

TEST_TO = os.getenv("TEST_EMAIL_TO", "sergioiglesias7pe@gmail.com")


def main() -> None:
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        print("ERROR: Configura SMTP_HOST y SMTP_USER (env vars o .env)")
        sys.exit(1)

    code = generate_code()
    print(f"Enviando OTP de prueba a {TEST_TO}...")
    print(f"SMTP: {settings.SMTP_USER} @ {settings.SMTP_HOST}:{settings.SMTP_PORT}")
    print(f"Código generado: {code}")

    send_otp_email(TEST_TO, "Sergio (prueba)", code)
    print("Correo enviado correctamente.")


if __name__ == "__main__":
    main()
