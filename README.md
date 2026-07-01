# AutoFinance Pro

Plataforma fintech B2B para concesionarias vehiculares — **Vehicle Financing**.

Simula créditos vehiculares bajo la modalidad **Compra Inteligente** con método francés vencido ordinario (meses de 30 días), calculando VAN, TIR y TCEA desde la perspectiva del deudor.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Python + FastAPI + SQLAlchemy 2.x |
| Base de datos | PostgreSQL |
| Auth | JWT Bearer + bcrypt |
| Contenedores | Docker Compose |

## Inicio rápido

```bash
docker compose up --build
```

Servicios:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Swagger:** http://localhost:8000/docs

## Credenciales demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@autofinance.pro | admin123 |
| Analyst | analyst@autofinance.pro | analyst123 |
| Executive | executive@autofinance.pro | exec123 |

## Desarrollo local (sin Docker)

### Backend

```bash
cd backend
pip install -r requirements.txt
# Requiere PostgreSQL en localhost:5432
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Pruebas

```bash
# Backend
cd backend && pytest app/tests/ -v

# Frontend
cd frontend && npm test
```

## Casos de prueba financieros

### Caso 1 — Soles sin gracia
- Toyota Corolla Cross 2026, S/ 95,000, inicial S/ 20,000, TEA 12%, 48 meses, balón 25%

### Caso 2 — Dólares con gracia parcial
- Kia Sportage 2026, US$ 32,000, inicial US$ 7,000, TNA 10% (cap. mensual), 60 meses, gracia parcial 3 meses

## Módulos

- Dashboard — KPIs y gráficos
- Customers — CRUD de clientes
- Vehicles — CRUD de vehículos
- Simulations — Wizard y cronograma
- Applications — Solicitudes y evaluación
- Analytics — Gráficos de tendencias
- Settings — Parámetros financieros globales

## Estructura

```
autofinance-pro/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   ├── services/financial_engine.py
│   │   ├── models/
│   │   └── tests/
│   └── alembic/
└── frontend/
    └── src/
        ├── pages/
        ├── layout/
        └── components/
```
