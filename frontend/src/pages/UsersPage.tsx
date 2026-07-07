import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { PageLoader } from "../components/ui/PageLoader";
import { authApi } from "../lib/api";
import { type Role } from "../lib/permissions";
import { FormAlert, FieldError, inputClass } from "../components/ui/FormFeedback";
import { useToast } from "../components/ui/Toast";
import { mergeFieldErrors, parseApiError, type FieldErrors } from "../lib/errors";
import { validateUser, hasErrors } from "../lib/validation";

const ROLE_COLORS: Record<Role, string> = {
  Administrador: "badge-purple",
  Soporte: "badge-amber",
  Vendedor: "badge-blue",
};

export default function UsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Vendedor" as Role });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => authApi.listUsers().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "Vendedor" });
      setFieldErrors({});
      setFormError("");
      toast.success("Usuario creado correctamente");
    },
    onError: (err) => {
      const { message, fieldErrors: apiFields } = parseApiError(err);
      setFormError(message);
      setFieldErrors((prev) => mergeFieldErrors(prev, apiFields));
      toast.error(message);
    },
  });

  const handleCreate = () => {
    const errors = validateUser(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFormError("Complete todos los campos obligatorios");
      toast.warning("Revise el formulario de usuario");
      return;
    }
    setFormError("");
    createMutation.mutate();
  };

  return (
    <AppLayout
      title={t("users.title")}
      subtitle={t("users.subtitle")}
      actions={
        <button onClick={() => { setShowForm(true); setFieldErrors({}); setFormError(""); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      }
    >
      {showForm && (
        <div className="card p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Usuario</h3>
          <FormAlert message={formError} type="error" />
          <div className="form-grid">
            <div>
              <label className="label-field label-required">Nombre</label>
              <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((p) => ({ ...p, name: "" })); }} className={inputClass(!!fieldErrors.name)} />
              <FieldError message={fieldErrors.name} />
            </div>
            <div>
              <label className="label-field label-required">Email</label>
              <input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((p) => ({ ...p, email: "" })); }} className={inputClass(!!fieldErrors.email)} />
              <FieldError message={fieldErrors.email} />
            </div>
            <div>
              <label className="label-field label-required">Contraseña</label>
              <input type="password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors((p) => ({ ...p, password: "" })); }} className={inputClass(!!fieldErrors.password)} />
              <FieldError message={fieldErrors.password} />
            </div>
            <div>
              <label className="label-field">Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="input-field">
                <option value="Vendedor">Vendedor</option>
                <option value="Soporte">Soporte</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? "Creando..." : "Crear"}
            </button>
            <button onClick={() => { setShowForm(false); setFieldErrors({}); setFormError(""); }} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        {isLoading ? <PageLoader /> : (
          <div className="table-scroll">
          <table>
            <thead>
              <tr>{["Nombre", "Email", "Rol", "Estado", "Registro"].map((h) => (
                <th key={h}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {users.map((u: { id: number; name: string; email: string; role: Role; is_active: boolean; created_at: string }) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={ROLE_COLORS[u.role]}>{t(`roles.${u.role as Role}.label`)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={u.is_active ? "badge-green" : "badge-red"}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString("es-PE")}</td>
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
