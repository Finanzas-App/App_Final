import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, ArrowLeft } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { HelpTooltip } from "../components/HelpTooltip";
import { KpiCard } from "../components/KpiCard";
import { simulationsApi, applicationsApi } from "../lib/api";
import { formatCurrency, formatPercent, formatDate } from "../lib/formatters";

export default function SimulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: sim, isLoading } = useQuery({
    queryKey: ["simulation", id],
    queryFn: () => simulationsApi.get(Number(id)).then((r) => r.data),
    enabled: !!id,
  });

  const appMutation = useMutation({
    mutationFn: () => applicationsApi.create({ simulation_id: Number(id) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); alert("Solicitud creada exitosamente"); },
  });

  const handleExport = async () => {
    const { data } = await simulationsApi.export(Number(id));
    const url = window.URL.createObjectURL(new Blob([data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cronograma_${sim?.code}.csv`;
    a.click();
  };

  if (isLoading) return <AppLayout title="Simulación"><p>Cargando...</p></AppLayout>;
  if (!sim) return <AppLayout title="Simulación"><p>No encontrada</p></AppLayout>;

  return (
    <AppLayout title={`Simulación ${sim.code}`} subtitle="Detalle y cronograma de pagos"
      actions={<>
        <Link to="/simulations" className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm"><ArrowLeft className="w-4 h-4" /> Volver</Link>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm"><Download className="w-4 h-4" /> Exportar CSV</button>
        <button onClick={() => appMutation.mutate()} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm"><FileText className="w-4 h-4" /> Crear Solicitud</button>
      </>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Monto Financiado" value={formatCurrency(sim.amount_financed, sim.currency)} />
        <KpiCard title="Cuota Mensual" value={formatCurrency(sim.monthly_payment, sim.currency)} />
        <KpiCard title="Cuota Balón" value={formatCurrency(sim.balloon_amount, sim.currency)} />
        <KpiCard title="Interés Total" value={formatCurrency(sim.total_interest, sim.currency)} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">VAN <HelpTooltip field="van" /></p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(sim.van || 0, sim.currency)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">TIR Mensual <HelpTooltip field="tir" /></p>
          <p className="text-2xl font-bold text-gray-900">{sim.tir_monthly ? formatPercent(sim.tir_monthly) : "-"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">TCEA <HelpTooltip field="tcea" /></p>
          <p className="text-2xl font-bold text-gray-900">{sim.tcea ? formatPercent(sim.tcea) : "-"}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold mb-3">Resumen Financiero</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">TEA:</span> {formatPercent(sim.tea)}</div>
          <div><span className="text-gray-500">TEM:</span> {formatPercent(sim.tem)}</div>
          <div><span className="text-gray-500">Plazo:</span> {sim.term_months} meses</div>
          <div><span className="text-gray-500">Gracia:</span> {sim.grace_type} ({sim.grace_months} meses)</div>
          <div><span className="text-gray-500">Cuota Inicial:</span> {formatCurrency(sim.down_payment, sim.currency)}</div>
          <div><span className="text-gray-500">Precio Vehículo:</span> {formatCurrency(sim.vehicle_price, sim.currency)}</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <h3 className="font-semibold p-6 pb-0">Cronograma de Pagos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs mt-4">
            <thead className="bg-gray-50 border-y"><tr>
              {["Periodo", "Fecha", "Saldo Inicial", "Interés", "Amortización", "Seg. Veh.", "Seg. Vida", "Cuota", "Balón", "Saldo Final"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(sim.schedule || []).sort((a: { period: number }, b: { period: number }) => a.period - b.period).map((row: {
                period: number; due_date: string; opening_balance: number; interest: number; amortization: number;
                insurance_vehicle: number; insurance_life: number; payment: number; balloon_payment: number; closing_balance: number; is_grace_period: boolean;
              }) => (
                <tr key={row.period} className={`border-b ${row.is_grace_period ? "bg-yellow-50" : ""}`}>
                  <td className="px-3 py-2">{row.period}</td>
                  <td className="px-3 py-2">{formatDate(row.due_date)}</td>
                  <td className="px-3 py-2">{formatCurrency(row.opening_balance, sim.currency)}</td>
                  <td className="px-3 py-2">{formatCurrency(row.interest, sim.currency)}</td>
                  <td className="px-3 py-2">{formatCurrency(row.amortization, sim.currency)}</td>
                  <td className="px-3 py-2">{formatCurrency(row.insurance_vehicle, sim.currency)}</td>
                  <td className="px-3 py-2">{formatCurrency(row.insurance_life, sim.currency)}</td>
                  <td className="px-3 py-2 font-medium">{formatCurrency(row.payment, sim.currency)}</td>
                  <td className="px-3 py-2">{row.balloon_payment > 0 ? formatCurrency(row.balloon_payment, sim.currency) : "-"}</td>
                  <td className="px-3 py-2">{formatCurrency(row.closing_balance, sim.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
