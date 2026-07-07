# AutoFinance Pro

Plataforma fintech B2B para **financiamiento vehicular** bajo la modalidad **Compra Inteligente**, con método francés vencido ordinario, cálculo de VAN, TIR y TCEA.

## Requisitos

- Docker y Docker Compose
- Puertos libres: `5173` (frontend), `8000` (backend), `5432` (PostgreSQL)

## Desarrollo local

```bash
cp .env.example .env
docker compose up --build
```

| Servicio   | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:5173        |
| Backend    | http://localhost:8000        |
| Swagger    | http://localhost:8000/docs   |

El desarrollo local usa `frontend/Dockerfile.dev` (hot reload). Al levantar el backend se ejecutan migraciones Alembic y el seed de datos demo.

## Deploy en Railway

Guía completa: **[DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md)**

Resumen: PostgreSQL + backend FastAPI + frontend React en un proyecto Railway, con variables de entorno y dominios generados automáticamente.

## Autenticación 2FA por email

Tras ingresar email y contraseña, se envía un código OTP de **6 caracteres** al correo del usuario. Expira en **5 minutos**.

**Excepción — usuarios demo:** los usuarios del seed (`admin@`, `vendedor@`, `soporte@autofinance.pro`) tienen un token de acceso demo en BD (`demo_access_tokens`) válido por **365 días** y **no requieren 2FA**.

Usuarios creados manualmente por el Administrador sí requieren 2FA.

### Configuración SMTP

Variables en `.env` (local) o en Railway (producción):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASSWORD=contraseña-de-aplicacion
SMTP_FROM=tu-correo@gmail.com
SMTP_USE_TLS=true
```

**Desarrollo sin SMTP:** si `SMTP_HOST` está vacío, el código OTP se imprime en los logs del backend.

Probar envío: `cd backend && python scripts/test_smtp_send.py`

## Usuarios demo

| Rol            | Correo                    | Contraseña   | 2FA |
|----------------|---------------------------|--------------|-----|
| Administrador  | admin@autofinance.pro     | admin123     | No  |
| Vendedor       | vendedor@autofinance.pro  | vend123      | No  |
| Soporte        | soporte@autofinance.pro   | soporte123   | No  |

### Permisos por rol

| Módulo        | Administrador | Vendedor | Soporte |
|---------------|:-------------:|:--------:|:-------:|
| Dashboard     | ✅            | ✅       | ✅      |
| Clientes      | ✅ escribe    | ✅ escribe | ✅ lee |
| Vehículos     | ✅ escribe    | ✅ lee   | ✅ lee  |
| Simulaciones  | ✅ escribe    | ✅ escribe | ✅ lee |
| Solicitudes   | ✅ evalúa     | ✅ crea  | ✅ evalúa |
| Analítica     | ✅            | ✅       | ✅      |
| Auditoría     | ✅            | —        | ✅      |
| Configuración | ✅            | —        | —       |
| Usuarios      | ✅            | —        | —       |

## Desarrollo local (sin Docker)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Variable de entorno: `VITE_API_URL=http://localhost:8000`

## Pruebas

```bash
# Backend
cd backend && pytest app/tests/ -v

# Frontend
cd frontend && npm test
```

## Datos de prueba (seed)

El seed carga datos alineados al enunciado del curso y escenarios adicionales para dashboard y analítica:

| # | Escenario | Vehículo | Moneda | Condición |
|---|-----------|----------|--------|-----------|
| 1 | Caso PDF | Toyota Corolla Cross 2026 | PEN | TEA 12%, 48 meses, sin gracia |
| 2 | Caso PDF | Kia Sportage 2026 | USD | TNA 10%, 60 meses, gracia parcial |
| 3 | Gracia total | Hyundai Tucson 2025 | PEN | TEA 14%, 36 meses, gracia total 2 meses |
| 4 | Sedán económico | Nissan Versa 2025 | PEN | TEA 11%, 24 meses, sin gracia |
| 5 | Pickup USD | Ford Ranger 2025 | USD | TNA 9%, 48 meses, sin gracia |

Incluye **6 clientes**, **7 vehículos**, **5 simulaciones** y **5 solicitudes** (Aprobada, Pendiente, Observada, Rechazada, Pendiente).

## Estructura

```
App_Final/
  backend/     FastAPI + SQLAlchemy + Alembic
  frontend/    React + TypeScript + Vite + Tailwind
  docker-compose.yml
  DEPLOY-RAILWAY.md
```
