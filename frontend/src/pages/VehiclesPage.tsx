import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { vehiclesApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  category: string;
  color: string;
  price: number;
  currency: string;
  status: string;
}

const empty = { brand: "", model: "", year: 2026, category: "SUV", color: "", price: 0, currency: "PEN", status: "available" };

export default function VehiclesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(empty);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof empty) => editing ? vehiclesApi.update(editing.id, data) : vehiclesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); setShowForm(false); setEditing(null); setForm(empty); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vehiclesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  return (
    <AppLayout title="Vehicles" subtitle="Vehículos ofertados por la concesionaria"
      actions={<button onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> Nuevo Vehículo</button>}>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editing ? "Editar" : "Nuevo"} Vehículo</h3>
          <div className="grid grid-cols-3 gap-4">
            {(["brand", "model", "color", "category"] as const).map((f) => (
              <div key={f}><label className="text-sm text-gray-600 capitalize">{f}</label>
                <input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" /></div>
            ))}
            <div><label className="text-sm text-gray-600">Año</label>
              <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="text-sm text-gray-600">Precio</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="text-sm text-gray-600">Moneda</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl outline-none">
                <option value="PEN">PEN</option><option value="USD">USD</option></select></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => saveMutation.mutate(form)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm">Cancelar</button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? <p className="p-6">Cargando...</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>{["Marca", "Modelo", "Año", "Categoría", "Color", "Precio", "Estado", ""].map((h) => <th key={h} className="text-left px-6 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody>
              {vehicles.map((v: Vehicle) => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{v.brand}</td><td className="px-6 py-4">{v.model}</td><td className="px-6 py-4">{v.year}</td>
                  <td className="px-6 py-4">{v.category}</td><td className="px-6 py-4">{v.color}</td>
                  <td className="px-6 py-4">{formatCurrency(v.price, v.currency)}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs">{v.status}</span></td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => { setEditing(v); setForm(v); setShowForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteMutation.mutate(v.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
