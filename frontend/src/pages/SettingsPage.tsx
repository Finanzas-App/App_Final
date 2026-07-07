import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppLayout } from "../layout/AppLayout";
import { HelpTooltip } from "../components/HelpTooltip";
import { settingsApi } from "../lib/api";
import { FormAlert, FieldError, inputClass } from "../components/ui/FormFeedback";
import { useToast } from "../components/ui/Toast";
import { mergeFieldErrors, parseApiError, type FieldErrors } from "../lib/errors";
import { validateSettings, hasErrors } from "../lib/validation";

export default function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => settingsApi.getFinancial().then((r) => r.data) });
  const [form, setForm] = useState({
    dealership_name: "", dealership_ruc: "", dealership_email: "",
    default_currency: "PEN", exchange_rate: 3.75, cok_annual: 0.10, default_balloon_percent: 0.25,
    default_capitalization: 12, insurance_vehicle_monthly: 180, insurance_life_monthly: 45,
    portes_monthly: 10, commission_rate: 0,
  });

  useEffect(() => {
    if (data) setForm({
      dealership_name: data.dealership_name,
      dealership_ruc: data.dealership_ruc,
      dealership_email: data.dealership_email,
      default_currency: data.default_currency,
      exchange_rate: data.exchange_rate || 3.75,
      cok_annual: data.cok_annual,
      default_balloon_percent: data.default_balloon_percent,
      default_capitalization: data.default_capitalization,
      insurance_vehicle_monthly: data.insurance_vehicle_monthly,
      insurance_life_monthly: data.insurance_life_monthly,
      portes_monthly: data.portes_monthly,
      commission_rate: data.commission_rate,
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.updateFinancial(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setFieldErrors({});
      setFormError("");
      toast.success("Configuración guardada correctamente");
    },
    onError: (err) => {
      const { message, fieldErrors: apiFields } = parseApiError(err);
      setFormError(message);
      setFieldErrors((prev) => mergeFieldErrors(prev, apiFields));
      toast.error(message);
    },
  });

  const handleSave = () => {
    const errors = validateSettings(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFormError("Complete correctamente los datos de la concesionaria");
      toast.warning("Revise los campos marcados");
      return;
    }
    setFormError("");
    saveMutation.mutate();
  };

  return (
    <AppLayout title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <div className="card p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6 sm:space-y-8">
        <FormAlert message={formError} type="error" />
        <section>
          <h3 className="font-semibold mb-4 text-slate-800">Datos de la Concesionaria</h3>
          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label-field label-required">Nombre</label>
              <input value={form.dealership_name} onChange={(e) => { setForm({ ...form, dealership_name: e.target.value }); setFieldErrors((p) => ({ ...p, dealership_name: "" })); }} className={inputClass(!!fieldErrors.dealership_name)} />
              <FieldError message={fieldErrors.dealership_name} />
            </div>
            <div>
              <label className="label-field label-required">RUC (11 dígitos)</label>
              <input value={form.dealership_ruc} maxLength={11} onChange={(e) => { setForm({ ...form, dealership_ruc: e.target.value }); setFieldErrors((p) => ({ ...p, dealership_ruc: "" })); }} className={inputClass(!!fieldErrors.dealership_ruc)} />
              <FieldError message={fieldErrors.dealership_ruc} />
            </div>
            <div>
              <label className="label-field label-required">Correo empresarial</label>
              <input type="email" value={form.dealership_email} onChange={(e) => { setForm({ ...form, dealership_email: e.target.value }); setFieldErrors((p) => ({ ...p, dealership_email: "" })); }} className={inputClass(!!fieldErrors.dealership_email)} />
              <FieldError message={fieldErrors.dealership_email} />
            </div>
          </div>
        </section>
        <section>
          <h3 className="font-semibold mb-4 text-slate-800">Parámetros Financieros</h3>
          <div className="form-grid">
            <div>
              <label className="label-field">Moneda por Defecto <HelpTooltip field="default_currency" /></label>
              <select value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })} className="input-field">
                <option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div>
              <label className="label-field">Tipo de Cambio <HelpTooltip field="exchange_rate" /></label>
              <input type="number" step="0.01" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label-field">COK Anual <HelpTooltip field="cok" /></label>
              <input type="number" step="0.01" value={form.cok_annual} onChange={(e) => setForm({ ...form, cok_annual: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label-field">Cuota Balón % <HelpTooltip field="balloon_percent" /></label>
              <input type="number" step="0.01" value={form.default_balloon_percent} onChange={(e) => setForm({ ...form, default_balloon_percent: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label-field">Capitalización <HelpTooltip field="capitalization" /></label>
              <input type="number" value={form.default_capitalization} onChange={(e) => setForm({ ...form, default_capitalization: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label-field">Seguro Vehicular Mensual <HelpTooltip field="insurance_vehicle" /></label>
              <input type="number" value={form.insurance_vehicle_monthly} onChange={(e) => setForm({ ...form, insurance_vehicle_monthly: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label-field">Seguro Desgravamen Mensual <HelpTooltip field="insurance_life" /></label>
              <input type="number" value={form.insurance_life_monthly} onChange={(e) => setForm({ ...form, insurance_life_monthly: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label-field">Portes Mensuales <HelpTooltip field="portes" /></label>
              <input type="number" value={form.portes_monthly} onChange={(e) => setForm({ ...form, portes_monthly: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label-field">Comisión (%) <HelpTooltip field="commission" /></label>
              <input type="number" step="0.01" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: +e.target.value })} className="input-field" />
            </div>
          </div>
        </section>
        <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary">
          {saveMutation.isPending ? "Guardando..." : "Guardar Configuración"}
        </button>
      </div>
    </AppLayout>
  );
}
