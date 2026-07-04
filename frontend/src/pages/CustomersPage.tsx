import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { PageLoader } from "../components/ui/PageLoader";
import { customersApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";
import { useAuth } from "../features/auth/AuthContext";
import { FormAlert, FieldError, inputClass } from "../components/ui/FormFeedback";
import { useToast } from "../components/ui/Toast";
import { mergeFieldErrors, parseApiError, type FieldErrors } from "../lib/errors";
import { validateCustomer, hasErrors } from "../lib/validation";
import { hasPermission } from "../lib/permissions";

interface Customer {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  edad: number;
  ingreso_mensual: number;
  email: string;
  telefono: string;
  direccion: string;
  esta_trabajando: boolean;
  es_dependiente: boolean;
}

const empty = {
  nombres: "", apellidos: "", dni: "", edad: 18, ingreso_mensual: 0,
  email: "", telefono: "", direccion: "", esta_trabajando: true, es_dependiente: false,
};

export default function CustomersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canWrite = hasPermission(user?.role, "customers:write");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.list().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof empty) =>
      editing ? customersApi.update(editing.id, data) : customersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false); setEditing(null); setForm(empty); setFieldErrors({}); setFormError("");
      toast.success(editing ? t("customers.updated") : t("customers.saved"));
    },
    onError: (err) => {
      const { message, fieldErrors: apiFields } = parseApiError(err);
      setFormError(message);
      setFieldErrors((prev) => mergeFieldErrors(prev, apiFields));
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success(t("customers.deleted")); },
    onError: (err) => toast.errorFrom(err),
  });

  const openEdit = (c: Customer) => { setEditing(c); setForm(c); setFieldErrors({}); setFormError(""); setShowForm(true); };
  const openNew = () => { setEditing(null); setForm(empty); setFieldErrors({}); setFormError(""); setShowForm(true); };

  const handleSave = () => {
    const errors = validateCustomer(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFormError("Complete los campos obligatorios marcados con *");
      toast.warning(t("customers.reviewForm"));
      return;
    }
    setFormError("");
    saveMutation.mutate(form);
  };

  const updateField = (field: keyof typeof empty, value: string | number | boolean) => {
    setForm({ ...form, [field]: value });
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setFormError("");
  };

  return (
    <AppLayout title={t("customers.title")} subtitle={t("customers.subtitle")}
      actions={canWrite ? <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> {t("customers.newCustomer")}</button> : undefined}>
      {showForm && canWrite && (
        <div className="card p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editing ? t("customers.editCustomer") : t("customers.newCustomer")}</h3>
          <FormAlert message={formError} type="error" />
          <div className="form-grid mb-2">
            {(["nombres", "apellidos", "dni", "email", "telefono", "direccion"] as const).map((f) => (
              <div key={f} className={f === "direccion" ? "sm:col-span-2" : ""}>
                <label className="label-field label-required">{t(`customers.fields.${f}`)}</label>
                <input value={form[f]} onChange={(e) => updateField(f, e.target.value)} className={inputClass(!!fieldErrors[f])} />
                <FieldError message={fieldErrors[f]} />
              </div>
            ))}
            <div>
              <label className="label-field label-required">{t("customers.fields.edad")}</label>
              <input type="number" min={18} value={form.edad} onChange={(e) => updateField("edad", +e.target.value)} className={inputClass(!!fieldErrors.edad)} />
              <FieldError message={fieldErrors.edad} />
            </div>
            <div>
              <label className="label-field label-required">{t("customers.fields.ingreso_mensual")}</label>
              <input type="number" min={0} value={form.ingreso_mensual} onChange={(e) => updateField("ingreso_mensual", +e.target.value)} className={inputClass(!!fieldErrors.ingreso_mensual)} />
              <FieldError message={fieldErrors.ingreso_mensual} />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" checked={form.esta_trabajando} onChange={(e) => setForm({ ...form, esta_trabajando: e.target.checked })} id="trabajando" />
              <label htmlFor="trabajando" className="text-sm text-gray-600">¿Está trabajando?</label>
            </div>
            {form.esta_trabajando && (
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={form.es_dependiente} onChange={(e) => setForm({ ...form, es_dependiente: e.target.checked })} id="dependiente" />
                <label htmlFor="dependiente" className="text-sm text-gray-600">¿Es trabajador dependiente?</label>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? t("common.loading") : t("common.save")}
            </button>
            <button onClick={() => { setShowForm(false); setFieldErrors({}); setFormError(""); }} className="btn-secondary">{t("common.cancel")}</button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        {isLoading ? <PageLoader /> : (
          <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["Nombre", "DNI", "Edad", "Ingreso", "Email", "Teléfono", "Trabaja", ""].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c: Customer) => (
                <tr key={c.id}>
                  <td className="px-6 py-4">{c.nombres} {c.apellidos}</td>
                  <td className="px-6 py-4">{c.dni}</td>
                  <td className="px-6 py-4">{c.edad}</td>
                  <td className="px-6 py-4">{formatCurrency(c.ingreso_mensual)}</td>
                  <td className="px-6 py-4">{c.email}</td>
                  <td className="px-6 py-4">{c.telefono}</td>
                  <td className="px-6 py-4">
                    <span className={c.esta_trabajando ? "badge-green" : "badge-gray"}>{c.esta_trabajando ? t("common.yes") : t("common.no")}</span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    {canWrite && (
                      <>
                        <button onClick={() => openEdit(c)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteMutation.mutate(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
