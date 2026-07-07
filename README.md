# AutoFinance Pro

Plataforma fintech B2B para **financiamiento vehicular** bajo la modalidad **Compra Inteligente**, con método francés vencido ordinario, cálculo de VAN, TIR y TCEA.

## Requisitos

- Docker y Docker Compose
- Puertos libres: `5173` (frontend), `8000` (backend), `5432` (PostgreSQL)

## Inicio rápido

```bash
docker compose up --build
```

| Servicio   | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:5173        |
| Backend    | http://localhost:8000        |
| Swagger    | http://localhost:8000/docs   |

Al levantar el backend se ejecutan automáticamente las migraciones Alembic y el seed de datos demo.

## Usuarios demo

| Rol            | Correo                    | Contraseña   |
|----------------|---------------------------|--------------|
| Administrador  | admin@autofinance.pro     | admin123     |
| Vendedor       | vendedor@autofinance.pro  | vend123      |
| Soporte        | soporte@autofinance.pro   | soporte123   |

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
cd backend && pytest

# Frontend
cd frontend && npm test
```

## Casos de prueba financieros (seed)

1. **Soles sin gracia** — Toyota Corolla Cross, S/ 95,000, TEA 12%, 48 meses
2. **Dólares gracia parcial** — Kia Sportage, US$ 32,000, TNA 10%, 60 meses

## Estructura

```
App_Final/
  backend/     FastAPI + SQLAlchemy + Alembic
  frontend/    React + TypeScript + Vite + Tailwind
  docker-compose.yml
```
