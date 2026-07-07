import { Info } from "lucide-react";

const HELP_TEXT: Record<string, string> = {
  rate_value: "Ingrese la tasa en decimal (ej: 0.12 para 12%). Verifique si corresponde a TEA o TNA según el tipo seleccionado.",
  rate_type: "TEA: tasa efectiva anual. TNA: tasa nominal anual, requiere indicar capitalizaciones por año.",
  tea: "Tasa Efectiva Anual: refleja el costo real del crédito incluyendo capitalización.",
  tna: "Tasa Nominal Anual: requiere indicar el número de capitalizaciones por año para convertir a TEA.",
  capitalization: "Número de veces que se capitalizan los intereses al año (ej: 12 = mensual).",
  grace_type: "Sin gracia: cuotas desde el inicio. Gracia total: no paga cuota y capitaliza intereses. Gracia parcial: paga solo intereses.",
  grace_months: "Meses iniciales sin amortización de capital. Deben ser menores al plazo total.",
  balloon_percent: "Porcentaje del precio del vehículo o monto financiado pagado como cuota final (Compra Inteligente).",
  balloon_base: "Define si el porcentaje de cuota balón se calcula sobre el precio del vehículo o el monto financiado.",
  down_payment: "Cuota inicial que reduce el monto financiado. Fórmula: MF = Precio - Inicial.",
  term_months: "Plazo total del crédito en meses de 30 días. Debe ser mayor a los meses de gracia.",
  portes: "Gastos administrativos mensuales incluidos en cada cuota del cronograma.",
  insurance_vehicle: "Prima mensual del seguro vehicular agregada a cada cuota.",
  insurance_life: "Prima mensual del seguro de desgravamen agregada a cada cuota.",
  commission: "Comisión porcentual aplicada sobre el monto financiado, si corresponde.",
  cok: "Costo de Oportunidad del Capital para calcular el VAN desde la perspectiva del deudor.",
  van: "Valor Actual Neto: indica el costo financiero del préstamo usando el COK.",
  tir: "Tasa Interna de Retorno mensual que iguala flujos de entrada y salida del deudor.",
  tcea: "Tasa de Costo Efectiva Anual: incluye cuotas, seguros, portes y cuota balón.",
  default_currency: "Moneda predeterminada para nuevas simulaciones (Soles PEN o Dólares USD).",
  exchange_rate: "Tipo de cambio de referencia PEN/USD para reportes y conversiones informativas.",
  financiera: "Entidad financiera que respalda la operación de crédito vehicular.",
  disbursement_date: "Fecha de desembolso del crédito; define las fechas de vencimiento del cronograma.",
};

interface Props {
  field: string;
  className?: string;
}

export function HelpTooltip({ field, className = "" }: Props) {
  const text = HELP_TEXT[field];
  if (!text) return null;
  return (
    <span className={`group relative inline-flex ml-1 align-middle ${className}`}>
      <Info className="w-4 h-4 text-gray-400 cursor-help" aria-label="Ayuda" />
      <span
        role="tooltip"
        className="invisible group-hover:visible group-focus-within:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs text-white bg-gray-800 rounded-lg shadow-lg pointer-events-none"
      >
        {text}
      </span>
    </span>
  );
}
