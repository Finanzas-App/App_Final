import { Info } from "lucide-react";

const HELP_TEXT: Record<string, string> = {
  rate_value: "Ingrese la tasa en decimal (ej: 0.12 para 12% TEA) o como porcentaje según el tipo seleccionado.",
  tea: "Tasa Efectiva Anual: refleja el costo real del crédito incluyendo capitalización.",
  tna: "Tasa Nominal Anual: requiere indicar el número de capitalizaciones por año.",
  capitalization: "Número de veces que se capitalizan los intereses al año (ej: 12 = mensual).",
  grace_type: "Gracia total: no paga cuota y capitaliza intereses. Gracia parcial: paga solo intereses.",
  grace_months: "Meses iniciales sin amortización de capital.",
  balloon_percent: "Porcentaje del precio del vehículo pagado como cuota final (Compra Inteligente).",
  down_payment: "Cuota inicial que reduce el monto financiado (MF = Precio - Inicial).",
  cok: "Costo de Oportunidad del Capital para calcular el VAN desde la perspectiva del deudor.",
  van: "Valor Actual Neto: indica el costo financiero del préstamo usando el COK.",
  tir: "Tasa Interna de Retorno mensual que iguala flujos de entrada y salida.",
  tcea: "Tasa de Costo Efectiva Anual: incluye cuotas, seguros y cuota balón.",
};

interface Props {
  field: string;
  className?: string;
}

export function HelpTooltip({ field, className = "" }: Props) {
  const text = HELP_TEXT[field];
  if (!text) return null;
  return (
    <span className={`group relative inline-flex ml-1 ${className}`}>
      <Info className="w-4 h-4 text-gray-400 cursor-help" />
      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs text-white bg-gray-800 rounded-lg shadow-lg">
        {text}
      </span>
    </span>
  );
}
