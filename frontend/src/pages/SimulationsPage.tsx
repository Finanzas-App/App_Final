import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Copy } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { HelpTooltip } from "../components/HelpTooltip";
import { simulationsApi, customersApi, vehiclesApi } from "../lib/api";
import { formatCurrency, formatPercent } from "../lib/formatters";

export default function SimulationsPage() {
  const qc = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    customer_id: 0, vehicle_id: 0, down_payment: 0, rate_type: "TEA" as "TEA" | "TNA",
    rate_value: 0.12, capitalization: 12, grace_type: "none" as "none" | "total" | "partial",
    grace_months: 0, term_months: 48, balloon_percent: 0.25,
  });

  const { data: simulations = [] } = useQuery({ queryKey: ["simulations"], queryFn: () => simulationsApi.list().then((r) => r.data) });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => customersApi.list().then((r) => r.data) });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => vehiclesApi.list().then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: () => simulationsApi.create(form),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["simulations"] }); setShowWizard(false); window.location.href = `/simulations/${r.data.id}`; },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: number) => simulationsApi.clone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simulations"] }),
  });

  const selectedVehicle = vehicles.find((v: { id: number }) => v.id === form.vehicle_id);

  return (
    <AppLayout title="Simulations" subtitle="Simulación de Compra Inteligente"
      actions={<button onClick={() => { setShowWizard(true); setStep(1); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> Nueva Simulación</button>}>
      {showWizard && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
          <div className="flex gap-2 mb-6">{[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-2 rounded-full ${step >= s ? "bg-blue-600" : "bg-gray-200"}`} />
          ))}</div>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Paso 1: Cliente y Vehículo</h3>
              <div><label className="text-sm text-gray-600">Cliente</label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl">
                  <option value={0}>Seleccionar...</option>
                  {customers.map((c: { id: number; nombres: string; apellidos: string }) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
                </select></div>
              <div><label className="text-sm text-gray-600">Vehículo</label>
                <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl">
                  <option value={0}>Seleccionar...</option>
                  {vehicles.map((v: { id: number; brand: string; model: string; price: number; currency: string }) => <option key={v.id} value={v.id}>{v.brand} {v.model} - {formatCurrency(v.price, v.currency)}</option>)}
                </select></div>
              <button onClick={() => setStep(2)} disabled={!form.customer_id || !form.vehicle_id} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-50">Siguiente</button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Paso 2: Condiciones Financieras</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-600">Cuota Inicial <HelpTooltip field="down_payment" /></label>
                  <input type="number" value={form.down_payment} onChange={(e) => setForm({ ...form, down_payment: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
                <div><label className="text-sm text-gray-600">Plazo (meses)</label>
                  <input type="number" value={form.term_months} onChange={(e) => setForm({ ...form, term_months: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
                <div><label className="text-sm text-gray-600">Tipo de Tasa</label>
                  <select value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value as "TEA" | "TNA" })} className="w-full mt-1 px-3 py-2 border rounded-xl">
                    <option value="TEA">TEA - Efectiva Anual</option><option value="TNA">TNA - Nominal Anual</option></select></div>
                <div><label className="text-sm text-gray-600">Valor Tasa (decimal) <HelpTooltip field="rate_value" /></label>
                  <input type="number" step="0.01" value={form.rate_value} onChange={(e) => setForm({ ...form, rate_value: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
                {form.rate_type === "TNA" && (
                  <div><label className="text-sm text-gray-600">Capitalización <HelpTooltip field="capitalization" /></label>
                    <input type="number" value={form.capitalization} onChange={(e) => setForm({ ...form, capitalization: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
                )}
                <div><label className="text-sm text-gray-600">Cuota Balón % <HelpTooltip field="balloon_percent" /></label>
                  <input type="number" step="0.01" value={form.balloon_percent} onChange={(e) => setForm({ ...form, balloon_percent: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
              </div>
              <div className="flex gap-3"><button onClick={() => setStep(1)} className="px-4 py-2 border rounded-xl text-sm">Anterior</button>
                <button onClick={() => setStep(3)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Siguiente</button></div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Paso 3: Gracia y Confirmación</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-600">Tipo de Gracia <HelpTooltip field="grace_type" /></label>
                  <select value={form.grace_type} onChange={(e) => setForm({ ...form, grace_type: e.target.value as typeof form.grace_type })} className="w-full mt-1 px-3 py-2 border rounded-xl">
                    <option value="none">Sin gracia</option><option value="total">Gracia total</option><option value="partial">Gracia parcial</option></select></div>
                <div><label className="text-sm text-gray-600">Meses de Gracia <HelpTooltip field="grace_months" /></label>
                  <input type="number" value={form.grace_months} onChange={(e) => setForm({ ...form, grace_months: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
              </div>
              {selectedVehicle && (
                <div className="p-4 bg-blue-50 rounded-xl text-sm">
                  <p><strong>Vehículo:</strong> {selectedVehicle.brand} {selectedVehicle.model}</p>
                  <p><strong>Precio:</strong> {formatCurrency(selectedVehicle.price, selectedVehicle.currency)}</p>
                  <p><strong>Monto Financiado:</strong> {formatCurrency(selectedVehicle.price - form.down_payment, selectedVehicle.currency)}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-xl text-sm">Anterior</button>
                <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm">
                  {createMutation.isPending ? "Calculando..." : "Generar Simulación"}</button>
                <button onClick={() => setShowWizard(false)} className="px-4 py-2 border rounded-xl text-sm">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>{["Código", "Monto Financiado", "Cuota Mensual", "TCEA", "Estado", "Fecha", ""].map((h) => <th key={h} className="text-left px-6 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {simulations.map((s: { id: number; code: string; amount_financed: number; currency: string; monthly_payment: number; tcea: number; status: string; created_at: string }) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{s.code}</td>
                <td className="px-6 py-4">{formatCurrency(s.amount_financed, s.currency)}</td>
                <td className="px-6 py-4">{formatCurrency(s.monthly_payment, s.currency)}</td>
                <td className="px-6 py-4">{s.tcea ? formatPercent(s.tcea) : "-"}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">{s.status}</span></td>
                <td className="px-6 py-4">{new Date(s.created_at).toLocaleDateString("es-PE")}</td>
                <td className="px-6 py-4 flex gap-2">
                  <Link to={`/simulations/${s.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></Link>
                  <button onClick={() => cloneMutation.mutate(s.id)} className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg"><Copy className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
