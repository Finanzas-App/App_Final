# AutoFinance Pro

Plataforma fintech B2B para concesionarias vehiculares — **Vehicle Financing**.

## Inicio rápido

```bash
docker compose up --build
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Swagger:** http://localhost:8000/docs

## Autenticación 2FA por email

Tras ingresar email y contraseña, se envía un código OTP de **6 caracteres** al correo del usuario. Expira en **5 minutos**.

**Excepción — usuarios demo:** los usuarios base del seed (`admin@`, `analyst@`, `executive@autofinance.pro`) tienen un token de acceso demo en BD (`demo_access_tokens`) válido por **365 días** y **no requieren 2FA** (correos ficticios).

Usuarios creados manualmente sí requieren 2FA.

### Configuración SMTP

Variables de entorno (backend):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASSWORD=contraseña-de-aplicacion
SMTP_FROM=noreply@autofinance.pro
SMTP_USE_TLS=true
```

**Desarrollo sin SMTP:** si `SMTP_HOST` está vacío, el código OTP se imprime en los logs del contenedor backend:

```bash
docker compose logs backend
```

### Credenciales demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@autofinance.pro | admin123 |
| Analyst | analyst@autofinance.pro | analyst123 |
| Executive | executive@autofinance.pro | exec123 |

## Pruebas

```bash
cd backend && pytest app/tests/ -v
```
