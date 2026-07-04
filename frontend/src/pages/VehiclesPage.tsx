import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { PageLoader } from "../components/ui/PageLoader";
import { vehiclesApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";
import { useAuth } from "../features/auth/AuthContext";
import { hasPermission } from "../lib/permissions";
import { FormAlert, FieldError, inputClass } from "../components/ui/FormFeedback";
import { useToast } from "../components/ui/Toast";
import { mergeFieldErrors, parseApiError, type FieldErrors } from "../lib/errors";
import { validateVehicle, hasErrors } from "../lib/validation";

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

const empty = { brand: "", model: "", year: 2026, category: "SUV", color: "", price: 0, currency: "PEN", status: "nuevo" };
const CATEGORIES = ["Sedán", "SUV", "Hatchback", "Pickup", "Van"];

export default function VehiclesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canWrite = hasPermission(user?.role, "vehicles:write");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(empty);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof empty) => editing ? vehiclesApi.update(editing.id, data) : vehiclesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      setShowForm(false); setEditing(null); setForm(empty); setFieldErrors({}); setFormError("");
      toast.success(editing ? "Vehículo actualizado" : "Vehículo registrado");
    },
    onError: (err) => {
      const { message, fieldErrors: apiFields } = parseApiError(err);
      setFormError(message);
      setFieldErrors((prev) => mergeFieldErrors(prev, apiFields));
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vehiclesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Vehículo eliminado"); },
    onError: (err) => toast.errorFrom(err),
  });

  const handleSave = () => {
    const errors = validateVehicle(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFormError("Complete los campos obligatorios marcados con *");
      toast.warning("Revise los campos del formulario");
      return;
    }
    setFormError("");
    saveMutation.mutate(form);
  };

  const updateField = (field: keyof typeof empty, value: string | number) => {
    setForm({ ...form, [field]: value });
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setFormError("");
  };

  return (
    <AppLayout title={t("vehicles.title")} subtitle={t("vehicles.subtitle")}
      actions={canWrite ? <button onClick={() => { setEditing(null); setForm(empty); setFieldErrors({}); setFormError(""); setShowForm(true); }} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo Vehículo</button> : undefined}>
      {showForm && canWrite && (
        <div className="card p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editing ? "Editar" : "Nuevo"} Vehículo</h3>
          <FormAlert message={formError} type="error" />
          <div className="form-grid-3">
            <div><label className="label-field label-required">Marca</label>
              <input value={form.brand} onChange={(e) => updateField("brand", e.target.value)} className={inputClass(!!fieldErrors.brand)} />
              <FieldError message={fieldErrors.brand} /></div>
            <div><label className="label-field label-required">Modelo</label>
              <input value={form.model} onChange={(e) => updateField("model", e.target.value)} className={inputClass(!!fieldErrors.model)} />
              <FieldError message={fieldErrors.model} /></div>
            <div><label className="label-field label-required">Color</label>
              <input value={form.color} onChange={(e) => updateField("color", e.target.value)} className={inputClass(!!fieldErrors.color)} />
              <FieldError message={fieldErrors.color} /></div>
            <div><label className="label-field label-required">Año (≥ 2020)</label>
              <input type="number" min={2020} value={form.year} onChange={(e) => updateField("year", +e.target.value)} className={inputClass(!!fieldErrors.year)} />
              <FieldError message={fieldErrors.year} /></div>
            <div><label className="label-field">Tipo</label>
              <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className="input-field">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="label-field label-required">Precio</label>
              <input type="number" min={0.01} value={form.price} onChange={(e) => updateField("price", +e.target.value)} className={inputClass(!!fieldErrors.price)} />
              <FieldError message={fieldErrors.price} /></div>
            <div><label className="label-field">Moneda</label>
              <select value={form.currency} onChange={(e) => updateField("currency", e.target.value)} className="input-field">
                <option value="PEN">PEN</option><option value="USD">USD</option></select></div>
            <div><label className="label-field">Estado</label>
              <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="input-field">
                <option value="nuevo">Nuevo</option><option value="usado">Usado</option></select></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => { setShowForm(false); setFieldErrors({}); setFormError(""); }} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        {isLoading ? <PageLoader /> : (
          <div className="table-scroll">
          <table>
            <thead><tr>{["Marca", "Modelo", "Año", "Categoría", "Color", "Precio", "Estado", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {vehicles.map((v: Vehicle) => (
                <tr key={v.id}>
                  <td className="px-6 py-4 font-medium">{v.brand}</td><td className="px-6 py-4">{v.model}</td><td className="px-6 py-4">{v.year}</td>
                  <td className="px-6 py-4">{v.category}</td><td className="px-6 py-4">{v.color}</td>
                  <td className="px-6 py-4">{formatCurrency(v.price, v.currency)}</td>
                  <td className="px-6 py-4"><span className="badge-green capitalize">{v.status}</span></td>
                  <td className="px-6 py-4 flex gap-2">
                    {canWrite && (
                      <>
                        <button onClick={() => { setEditing(v); setForm(v); setFieldErrors({}); setFormError(""); setShowForm(true); }} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteMutation.mutate(v.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
