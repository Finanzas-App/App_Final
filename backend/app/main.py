from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import applications, audit, auth, customers, dashboard, settings, simulations, vehicles
from app.core.config import settings as app_settings

app = FastAPI(
    title="AutoFinance Pro API",
    description="Plataforma fintech B2B para financiamiento vehicular - Compra Inteligente",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(customers.router, prefix=API_PREFIX)
app.include_router(vehicles.router, prefix=API_PREFIX)
app.include_router(simulations.router, prefix=API_PREFIX)
app.include_router(applications.router, prefix=API_PREFIX)
app.include_router(settings.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(audit.router, prefix=API_PREFIX)


@app.get("/health")
def health():
    return {"status": "ok", "app": "AutoFinance Pro"}
