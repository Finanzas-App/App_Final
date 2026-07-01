import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../layout/AppLayout";
import { HelpTooltip } from "../components/HelpTooltip";
import { settingsApi } from "../lib/api";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => settingsApi.getFinancial().then((r) => r.data) });
  const [form, setForm] = useState({
    default_currency: "PEN", exchange_rate: 3.75, cok_annual: 0.10, default_balloon_percent: 0.25,
    default_capitalization: 12, insurance_vehicle_monthly: 45, insurance_life_monthly: 180, commission_rate: 0,
  });

  useEffect(() => {
    if (data) setForm({
      default_currency: data.default_currency,
      exchange_rate: data.exchange_rate || 3.75,
      cok_annual: data.cok_annual,
      default_balloon_percent: data.default_balloon_percent,
      default_capitalization: data.default_capitalization,
      insurance_vehicle_monthly: data.insurance_vehicle_monthly,
      insurance_life_monthly: data.insurance_life_monthly,
      commission_rate: data.commission_rate,
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.updateFinancial(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); alert("Configuración guardada"); },
  });

  return (
    <AppLayout title="Settings" subtitle="Parámetros financieros globales">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-2xl">
        <div className="grid grid-cols-2 gap-6">
          <div><label className="text-sm text-gray-600">Moneda por Defecto</label>
            <select value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl">
              <option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></div>
          <div><label className="text-sm text-gray-600">Tipo de Cambio</label>
            <input type="number" step="0.01" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
          <div><label className="text-sm text-gray-600">COK Anual <HelpTooltip field="cok" /></label>
            <input type="number" step="0.01" value={form.cok_annual} onChange={(e) => setForm({ ...form, cok_annual: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
          <div><label className="text-sm text-gray-600">Cuota Balón % <HelpTooltip field="balloon_percent" /></label>
            <input type="number" step="0.01" value={form.default_balloon_percent} onChange={(e) => setForm({ ...form, default_balloon_percent: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
          <div><label className="text-sm text-gray-600">Capitalización <HelpTooltip field="capitalization" /></label>
            <input type="number" value={form.default_capitalization} onChange={(e) => setForm({ ...form, default_capitalization: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
          <div><label className="text-sm text-gray-600">Seguro Vehículo Mensual</label>
            <input type="number" value={form.insurance_vehicle_monthly} onChange={(e) => setForm({ ...form, insurance_vehicle_monthly: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
          <div><label className="text-sm text-gray-600">Seguro de Vida Mensual</label>
            <input type="number" value={form.insurance_life_monthly} onChange={(e) => setForm({ ...form, insurance_life_monthly: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
          <div><label className="text-sm text-gray-600">Comisión (%)</label>
            <input type="number" step="0.01" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
        </div>
        <button onClick={() => saveMutation.mutate()} className="mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium">Guardar Configuración</button>
      </div>
    </AppLayout>
  );
}
