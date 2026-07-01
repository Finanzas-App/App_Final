import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../layout/AppLayout";
import { applicationsApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-50 text-yellow-700",
  Approved: "bg-green-50 text-green-700",
  Observed: "bg-orange-50 text-orange-700",
  Rejected: "bg-red-50 text-red-700",
};

export default function ApplicationsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [statusForm, setStatusForm] = useState({ status: "Pending", decision_reason: "", approved_amount: 0 });

  const { data: applications = [] } = useQuery({ queryKey: ["applications"], queryFn: () => applicationsApi.list().then((r) => r.data) });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => applicationsApi.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); setSelected(null); },
  });

  const selectedApp = applications.find((a: { id: number }) => a.id === selected);

  return (
    <AppLayout title="Applications" subtitle="Solicitudes de financiamiento">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>{["ID", "Simulación", "Estado", "Monto Aprobado", "Fecha", ""].map((h) => <th key={h} className="text-left px-6 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody>
              {applications.map((a: { id: number; simulation_id: number; status: string; approved_amount: number | null; created_at: string }) => (
                <tr key={a.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(a.id)}>
                  <td className="px-6 py-4">#{a.id}</td>
                  <td className="px-6 py-4">SIM-{a.simulation_id}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-lg text-xs ${STATUS_COLORS[a.status] || ""}`}>{a.status}</span></td>
                  <td className="px-6 py-4">{a.approved_amount ? formatCurrency(a.approved_amount) : "-"}</td>
                  <td className="px-6 py-4">{new Date(a.created_at).toLocaleDateString("es-PE")}</td>
                  <td className="px-6 py-4 text-blue-600 text-xs">Evaluar →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedApp && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Evaluar Solicitud #{selectedApp.id}</h3>
            <div className="space-y-3">
              <div><label className="text-sm text-gray-600">Estado</label>
                <select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl">
                  {["Pending", "Approved", "Observed", "Rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select></div>
              <div><label className="text-sm text-gray-600">Motivo {statusForm.status === "Rejected" && <span className="text-red-500">*</span>}</label>
                <textarea value={statusForm.decision_reason} onChange={(e) => setStatusForm({ ...statusForm, decision_reason: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" rows={3} /></div>
              <div><label className="text-sm text-gray-600">Monto Aprobado</label>
                <input type="number" value={statusForm.approved_amount} onChange={(e) => setStatusForm({ ...statusForm, approved_amount: +e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl" /></div>
              <button onClick={() => updateMutation.mutate({ id: selectedApp.id, data: statusForm })} className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm">Actualizar Estado</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
