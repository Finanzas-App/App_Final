import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { customersApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";

interface Customer {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  edad: number;
  ingreso_mensual: number;
  email: string;
  telefono: string;
}

const empty = { nombres: "", apellidos: "", dni: "", edad: 18, ingreso_mensual: 0, email: "", telefono: "" };

export default function CustomersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.list().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof empty) =>
      editing ? customersApi.update(editing.id, data) : customersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); setShowForm(false); setEditing(null); setForm(empty); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  const openEdit = (c: Customer) => { setEditing(c); setForm(c); setShowForm(true); };
  const openNew = () => { setEditing(null); setForm(empty); setShowForm(true); };

  return (
    <AppLayout title="Customers" subtitle="Gestión de clientes potenciales"
      actions={<button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> Nuevo Cliente</button>}>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editing ? "Editar" : "Nuevo"} Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            {(["nombres", "apellidos", "dni", "email", "telefono"] as const).map((f) => (
              <div key={f}>
                <label className="text-sm text-gray-600 capitalize">{f}</label>
                <input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            ))}
            <div>
              <label className="text-sm text-gray-600">Edad</label>
              <input type="number" value={form.edad} onChange={(e) => setForm({ ...form, edad: +e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Ingreso Mensual</label>
              <input type="number" value={form.ingreso_mensual} onChange={(e) => setForm({ ...form, ingreso_mensual: +e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
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
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Nombre", "DNI", "Edad", "Ingreso", "Email", "Teléfono", ""].map((h) => (
                  <th key={h} className="text-left px-6 py-3 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c: Customer) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">{c.nombres} {c.apellidos}</td>
                  <td className="px-6 py-4">{c.dni}</td>
                  <td className="px-6 py-4">{c.edad}</td>
                  <td className="px-6 py-4">{formatCurrency(c.ingreso_mensual)}</td>
                  <td className="px-6 py-4">{c.email}</td>
                  <td className="px-6 py-4">{c.telefono}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteMutation.mutate(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
