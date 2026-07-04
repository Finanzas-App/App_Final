export type FieldErrors = Record<string, string>;

interface HttpErrorLike {
  response?: {
    status: number;
    data?: { detail?: unknown };
  };
}

interface ValidationDetailItem {
  loc?: (string | number)[];
  msg?: string;
}

const FIELD_LABELS: Record<string, string> = {
  email: "Correo electrónico",
  password: "Contraseña",
  name: "Nombre",
  nombres: "Nombres",
  apellidos: "Apellidos",
  dni: "DNI",
  edad: "Edad",
  ingreso_mensual: "Ingreso mensual",
  telefono: "Teléfono",
  direccion: "Dirección",
  brand: "Marca",
  model: "Modelo",
  year: "Año",
  color: "Color",
  price: "Precio",
  customer_id: "Cliente",
  vehicle_id: "Vehículo",
  financiera_id: "Financiera",
  down_payment: "Cuota inicial",
  rate_value: "Valor de tasa",
  term_months: "Plazo",
  balloon_percent: "Cuota balón",
  grace_months: "Meses de gracia",
  decision_reason: "Motivo",
  approved_amount: "Monto aprobado",
  dealership_name: "Nombre de concesionaria",
  dealership_ruc: "RUC",
  dealership_email: "Correo empresarial",
};

function cleanMessage(msg: string): string {
  return msg
    .replace(/^Value error,?\s*/i, "")
    .replace(/^String should match pattern.*$/i, "Formato inválido")
    .trim();
}

function isValidationItem(value: unknown): value is ValidationDetailItem {
  return typeof value === "object" && value !== null && ("loc" in value || "msg" in value);
}

export function parseApiError(error: unknown): { message: string; fieldErrors: FieldErrors } {
  if (!error || typeof error !== "object") {
    return { message: "Ocurrió un error inesperado. Intente nuevamente.", fieldErrors: {} };
  }

  const httpError = error as HttpErrorLike;

  if (!httpError.response) {
    return {
      message: "No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo.",
      fieldErrors: {},
    };
  }

  const { status, data } = httpError.response;
  const detail = data?.detail;

  if (Array.isArray(detail)) {
    const fieldErrors: FieldErrors = {};
    const messages: string[] = [];
    for (const entry of detail) {
      if (!isValidationItem(entry)) continue;
      const locKey = entry.loc?.[entry.loc.length - 1];
      const loc = String(locKey ?? "form");
      const raw = cleanMessage(String(entry.msg ?? "Valor inválido"));
      const label = FIELD_LABELS[loc] ?? loc;
      const text = raw.toLowerCase().includes(label.toLowerCase()) ? raw : `${label}: ${raw}`;
      fieldErrors[loc] = text;
      messages.push(text);
    }
    return {
      message: messages.length > 1
        ? `Revise ${messages.length} campos con errores`
        : messages[0] ?? "Complete los campos requeridos",
      fieldErrors,
    };
  }

  if (typeof detail === "string") {
    return { message: detail, fieldErrors: {} };
  }

  const fallback: Record<number, string> = {
    400: "Datos inválidos. Revise el formulario.",
    401: "Credenciales incorrectas. Verifique su correo y contraseña.",
    403: "No tiene permiso para realizar esta acción.",
    404: "El recurso solicitado no fue encontrado.",
    422: "Complete correctamente todos los campos requeridos.",
    500: "Error interno del servidor. Intente más tarde.",
  };

  return { message: fallback[status] ?? "Ocurrió un error. Intente nuevamente.", fieldErrors: {} };
}

export function mergeFieldErrors(...sources: FieldErrors[]): FieldErrors {
  return Object.assign({}, ...sources);
}
