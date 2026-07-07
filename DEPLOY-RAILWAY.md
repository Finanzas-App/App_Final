# Deploy en Railway — AutoFinance Pro

Guía paso a paso para publicar la app en [Railway](https://railway.app) con PostgreSQL, backend FastAPI y frontend React.

## Arquitectura

```
Usuario → Frontend (serve + dist) → Backend (FastAPI) → PostgreSQL
                                      ↓
                                   Gmail SMTP (2FA)
```

Tres servicios en un mismo proyecto Railway:

| Servicio | Root Directory | Dockerfile |
|----------|----------------|------------|
| PostgreSQL | Plugin Railway | — |
| Backend | `backend` | `backend/Dockerfile` |
| Frontend | `frontend` | `frontend/Dockerfile` |

---

## Paso 0 — Prerrequisitos

- Cuenta en [railway.app](https://railway.app)
- Repositorio en **GitHub** con este código pusheado
- Credenciales SMTP Gmail (probar localmente con `backend/scripts/test_smtp_send.py`)

---

## Paso 1 — Crear proyecto y PostgreSQL

1. Entra a Railway → **New Project**
2. **Deploy from GitHub repo** → autoriza GitHub y selecciona el repo
3. **Add Service** → **Database** → **PostgreSQL**
4. Anota el nombre del servicio Postgres (ej. `Postgres`) — lo usarás para referencias de variables

---

## Paso 2 — Desplegar Backend

1. **Add Service** → **GitHub Repo** → mismo repositorio
2. Renombra el servicio a algo claro, ej. `backend`
3. **Settings**:
   - **Root Directory**: `backend`
   - **Builder**: Dockerfile (usa `backend/Dockerfile` automáticamente)
4. **Variables** del servicio backend:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `SECRET_KEY` | Genera una clave larga y aleatoria (nueva, no la de dev) |
| `CORS_ORIGINS` | `https://PLACEHOLDER` (actualizar tras Paso 3) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | tu correo Gmail |
| `SMTP_PASSWORD` | contraseña de aplicación Gmail (sin espacios) |
| `SMTP_FROM` | **mismo valor que** `SMTP_USER` |
| `SMTP_USE_TLS` | `true` |

> `${{Postgres.DATABASE_URL}}` es una referencia Railway al plugin Postgres. El backend normaliza automáticamente `postgresql://` → `postgresql+psycopg2://`.

5. **Settings** → **Networking** → **Generate Domain**
6. Copia la URL pública, ej. `https://backend-production-xxxx.up.railway.app`
7. Revisa **Deploy Logs** — debe aparecer:
   - `alembic upgrade head`
   - `Seed already applied` o `Seed data applied`
   - `Uvicorn running`

Prueba: `https://TU-BACKEND/health` → `{"status":"ok"}`

---

## Paso 3 — Desplegar Frontend

1. **Add Service** → **GitHub Repo** → mismo repositorio
2. Renombra a `frontend`
3. **Settings**:
   - **Root Directory**: `frontend`
   - **Builder**: Dockerfile
4. **Variables** — `VITE_API_URL` es de **build time** (obligatorio antes del deploy):

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://TU-URL-DEL-BACKEND` (sin `/api/v1`) |

Referencia Railway (si el servicio backend se llama `backend`):

```
https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

5. **Generate Domain** para el frontend → copia la URL, ej. `https://frontend-production-xxxx.up.railway.app`

6. **Vuelve al servicio backend** y actualiza:

```
CORS_ORIGINS=https://TU-URL-DEL-FRONTEND
```

7. **Redeploy** el backend (necesario para aplicar CORS)

---

## Paso 4 — Verificación

| Prueba | Resultado esperado |
|--------|-------------------|
| Abrir URL frontend | Pantalla de login |
| Login `executive@autofinance.pro` / `exec123` | Entra sin 2FA (usuario demo) |
| Login usuario nuevo (creado por Admin) | Pide código OTP por email |
| `https://BACKEND/docs` | Swagger UI |
| `https://BACKEND/health` | `{"status":"ok"}` |

---

## Paso 5 — Dominio propio (opcional)

1. Railway → servicio → **Settings** → **Custom Domain**
2. Apunta un CNAME al dominio que Railway indique
3. Actualiza en Railway:
   - Frontend: `VITE_API_URL` → redeploy frontend
   - Backend: `CORS_ORIGINS` → redeploy backend

---

## Desarrollo local vs Railway

| | Local (`docker compose`) | Railway |
|--|--------------------------|---------|
| Compose file | `docker-compose.yml` | No se usa |
| Frontend | `Dockerfile.dev` + Vite hot reload | `Dockerfile` + build estático |
| Backend | volumen + `--reload` | `entrypoint.sh` sin reload |
| Secretos | archivo `.env` (copiar de `.env.example`) | Variables Railway |
| Postgres | contenedor Docker | plugin Railway |

### Arranque local

```bash
cp .env.example .env
# Edita .env con tus valores SMTP si quieres probar 2FA
docker compose up --build
```

---

## Solución de problemas

### Frontend llama a `localhost:8000` en producción

`VITE_API_URL` estaba mal o el frontend no se reconstruyó. Corrige la variable y haz **Redeploy** del frontend.

### Error CORS en el navegador

`CORS_ORIGINS` en el backend no incluye la URL exacta del frontend (con `https://`, sin barra final). Actualiza y redeploy backend.

### 2FA no envía correos

- `SMTP_FROM` debe ser igual a `SMTP_USER` (Gmail)
- Revisa logs del backend en Railway
- Prueba credenciales con `python backend/scripts/test_smtp_send.py`

### Backend no arranca — error de base de datos

- Verifica que `DATABASE_URL` referencia `${{Postgres.DATABASE_URL}}`
- Revisa logs de `alembic upgrade head`

### Puerto / health check falla

El backend usa la variable `PORT` que Railway inyecta automáticamente. No la sobrescribas manualmente.

---

## Coste estimado

- Plan Hobby: ~USD 5/mes de crédito incluido
- Postgres + 2 web services consumen crédito según uso
- Para demo/TF suele alcanzar el crédito inicial

---

## Seguridad

- **No** commitees `.env` ni contraseñas en `docker-compose.yml`
- Genera un `SECRET_KEY` nuevo para producción
- Rota la contraseña de aplicación Gmail si estuvo expuesta en git
