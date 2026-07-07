import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, UserX } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { PageLoader } from "../components/ui/PageLoader";
import { authApi } from "../lib/api";
import { type Role } from "../lib/permissions";
import { useAuth } from "../features/auth/AuthContext";
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
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Vendedor" as Role });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  const dateLocale = i18n.language.startsWith("en") ? "en-US" : "es-PE";

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
      toast.success(t("users.created"));
    },
    onError: (err) => {
      const { message, fieldErrors: apiFields } = parseApiError(err);
      setFormError(message);
      setFieldErrors((prev) => mergeFieldErrors(prev, apiFields));
      toast.error(message);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => authApi.deactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.deactivated"));
    },
    onError: (err) => toast.errorFrom(err),
  });

  const handleCreate = () => {
    const errors = validateUser(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFormError(t("users.formError"));
      toast.warning(t("users.reviewForm"));
      return;
    }
    setFormError("");
    createMutation.mutate();
  };

  const handleDeactivate = (id: number, name: string) => {
    if (id === currentUser?.id) {
      toast.warning(t("users.cannotDeactivateSelf"));
      return;
    }
    if (!window.confirm(t("users.confirmDeactivate", { name }))) return;
    deactivateMutation.mutate(id);
  };

  const tableCols = [
    t("users.name"),
    t("auth.email"),
    t("users.role"),
    t("users.status"),
    t("users.registered"),
    "",
  ];

  return (
    <AppLayout
      title={t("users.title")}
      subtitle={t("users.subtitle")}
      actions={
        <button onClick={() => { setShowForm(true); setFieldErrors({}); setFormError(""); }} className="btn-primary">
          <Plus className="w-4 h-4" /> {t("users.newUser")}
        </button>
      }
    >
      {showForm && (
        <div className="card p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">{t("users.newUser")}</h3>
          <FormAlert message={formError} type="error" />
          <div className="form-grid">
            <div>
              <label className="label-field label-required">{t("users.name")}</label>
              <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((p) => ({ ...p, name: "" })); }} className={inputClass(!!fieldErrors.name)} />
              <FieldError message={fieldErrors.name} />
            </div>
            <div>
              <label className="label-field label-required">{t("auth.email")}</label>
              <input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((p) => ({ ...p, email: "" })); }} className={inputClass(!!fieldErrors.email)} />
              <FieldError message={fieldErrors.email} />
            </div>
            <div>
              <label className="label-field label-required">{t("auth.password")}</label>
              <input type="password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors((p) => ({ ...p, password: "" })); }} className={inputClass(!!fieldErrors.password)} />
              <FieldError message={fieldErrors.password} />
            </div>
            <div>
              <label className="label-field">{t("users.role")}</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="input-field">
                <option value="Vendedor">{t("roles.Vendedor.label")}</option>
                <option value="Soporte">{t("roles.Soporte.label")}</option>
                <option value="Administrador">{t("roles.Administrador.label")}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t("users.creating") : t("common.create")}
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
              <tr>{tableCols.map((h) => (
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
                      {u.is_active ? t("users.active") : t("users.inactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString(dateLocale)}</td>
                  <td className="px-6 py-4">
                    {u.is_active && u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeactivate(u.id, u.name)}
                        disabled={deactivateMutation.isPending}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={t("users.deactivate")}
                      >
                        <UserX className="w-4 h-4" />
                      </button>
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
