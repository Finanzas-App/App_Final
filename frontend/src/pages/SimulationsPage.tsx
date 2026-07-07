import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Eye, Copy } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { HelpTooltip } from "../components/HelpTooltip";
import { simulationsApi, customersApi, vehiclesApi, settingsApi } from "../lib/api";
import { formatCurrency, formatPercent } from "../lib/formatters";
import { useAuth } from "../features/auth/AuthContext";
import { hasPermission } from "../lib/permissions";
import { FormAlert, FieldError, inputClass } from "../components/ui/FormFeedback";
import { useToast } from "../components/ui/Toast";
import { parseApiError, type FieldErrors } from "../lib/errors";
import { validateSimulationStep1, validateSimulationStep2, hasErrors } from "../lib/validation";

const defaultForm = {
  customer_id: 0, vehicle_id: 0, financiera_id: 1, down_payment: 0,
  rate_type: "TEA" as "TEA" | "TNA", rate_value: 0.12, capitalization: 12,
  grace_type: "none" as "none" | "total" | "partial", grace_months: 0, term_months: 48,
  balloon_percent: 0.25, balloon_base: "vehicle" as "vehicle" | "financed",
  include_insurance_vehicle: true, include_insurance_life: true,
  portes: 10, disbursement_date: new Date().toISOString().slice(0, 10),
};

export default function SimulationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canWrite = hasPermission(user?.role, "simulations:write");
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  const dateLocale = i18n.language.startsWith("en") ? "en-US" : "es-PE";

  const { data: simulations = [] } = useQuery({ queryKey: ["simulations"], queryFn: () => simulationsApi.list().then((r) => r.data) });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => customersApi.list().then((r) => r.data) });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => vehiclesApi.list().then((r) => r.data) });
  const { data: financieras = [] } = useQuery({ queryKey: ["financieras"], queryFn: () => settingsApi.listFinancieras().then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: () => simulationsApi.create({
      ...form,
      disbursement_date: form.disbursement_date ? new Date(form.disbursement_date).toISOString() : undefined,
    }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["simulations"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      setShowWizard(false);
      toast.success(t("simulations.generated"));
      navigate(`/simulations/${r.data.id}`);
    },
    onError: (err) => {
      const { message, fieldErrors: apiFields } = parseApiError(err);
      setFormError(message);
      setFieldErrors(apiFields);
      toast.error(message);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: number) => simulationsApi.clone(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["simulations"] }); toast.success(t("simulations.cloned")); },
    onError: (err) => toast.errorFrom(err),
  });

  const goStep2 = () => {
    const errors = validateSimulationStep1(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFormError(t("simulations.selectCustomerVehicle"));
      toast.warning(t("simulations.completeStep1"));
      return;
    }
    setFormError("");
    setStep(2);
  };

  const goStep3 = () => {
    const errors = validateSimulationStep2(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFormError(t("simulations.reviewFinancial"));
      toast.warning(t("simulations.invalidStep2"));
      return;
    }
    if (selectedVehicle && form.down_payment >= selectedVehicle.price) {
      setFieldErrors({ down_payment: t("simulations.downPaymentMustBeLess") });
      setFormError(t("simulations.downPaymentTooHigh"));
      toast.warning(t("simulations.invalidDownPayment"));
      return;
    }
    setFormError("");
    setStep(3);
  };

  const handleCreate = () => {
    const step2Errors = validateSimulationStep2(form);
    if (hasErrors(step2Errors)) {
      setFieldErrors(step2Errors);
      setFormError(t("simulations.reviewFinancial"));
      setStep(2);
      return;
    }
    createMutation.mutate();
  };

  const openWizard = () => {
    setShowWizard(true);
    setStep(1);
    setForm(defaultForm);
    setFieldErrors({});
    setFormError("");
  };

  const selectedVehicle = vehicles.find((v: { id: number }) => v.id === form.vehicle_id);

  const tableCols = [
    t("simulations.cols.code"),
    t("simulations.cols.amountFinanced"),
    t("simulations.cols.monthlyPayment"),
    t("simulations.cols.tcea"),
    t("simulations.cols.status"),
    t("simulations.cols.date"),
    "",
  ];

  return (
    <AppLayout title={t("simulations.title")} subtitle={t("simulations.subtitle")}
      actions={canWrite ? (
        <button onClick={openWizard} className="btn-primary">
          <Plus className="w-4 h-4" /> {t("simulations.newSimulation")}
        </button>
      ) : undefined}>
      {showWizard && canWrite && (
        <div className="card p-4 sm:p-6 lg:p-8 mb-6">
          <div className="flex gap-2 mb-6">{[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${step >= s ? "bg-brand-600" : "bg-slate-200"}`} />
          ))}</div>
          <FormAlert message={formError} type="error" />
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t("simulations.step1Title")}</h3>
              <div>
                <label className="label-field label-required">{t("simulations.customer")}</label>
                <select value={form.customer_id} onChange={(e) => { setForm({ ...form, customer_id: +e.target.value }); setFieldErrors((p) => ({ ...p, customer_id: "" })); setFormError(""); }} className={inputClass(!!fieldErrors.customer_id)}>
                  <option value={0}>{t("simulations.selectPlaceholder")}</option>
                  {customers.map((c: { id: number; nombres: string; apellidos: string }) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
                </select>
                <FieldError message={fieldErrors.customer_id} />
              </div>
              <div>
                <label className="label-field label-required">{t("simulations.vehicle")}</label>
                <select value={form.vehicle_id} onChange={(e) => { setForm({ ...form, vehicle_id: +e.target.value }); setFieldErrors((p) => ({ ...p, vehicle_id: "" })); setFormError(""); }} className={inputClass(!!fieldErrors.vehicle_id)}>
                  <option value={0}>{t("simulations.selectPlaceholder")}</option>
                  {vehicles.map((v: { id: number; brand: string; model: string; price: number; currency: string }) => <option key={v.id} value={v.id}>{v.brand} {v.model} - {formatCurrency(v.price, v.currency)}</option>)}
                </select>
                <FieldError message={fieldErrors.vehicle_id} />
              </div>
              <div>
                <label className="label-field">{t("simulations.financiera")} <HelpTooltip field="financiera" /></label>
                <select value={form.financiera_id} onChange={(e) => setForm({ ...form, financiera_id: +e.target.value })} className="input-field">
                  {financieras.map((f: { id: number; name: string }) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">{t("simulations.disbursementDate")} <HelpTooltip field="disbursement_date" /></label>
                <input type="date" value={form.disbursement_date} onChange={(e) => setForm({ ...form, disbursement_date: e.target.value })} className="input-field" />
              </div>
              <button type="button" onClick={goStep2} className="btn-primary">{t("common.next")}</button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t("simulations.step2Title")}</h3>
              <div className="form-grid">
                <div>
                  <label className="label-field">{t("simulations.downPayment")} <HelpTooltip field="down_payment" /></label>
                  <input type="number" value={form.down_payment} onChange={(e) => { setForm({ ...form, down_payment: +e.target.value }); setFieldErrors((p) => ({ ...p, down_payment: "" })); }} className={inputClass(!!fieldErrors.down_payment)} />
                  <FieldError message={fieldErrors.down_payment} />
                </div>
                <div>
                  <label className="label-field label-required">{t("simulations.termMonths")} <HelpTooltip field="term_months" /></label>
                  <input type="number" value={form.term_months} onChange={(e) => { setForm({ ...form, term_months: +e.target.value }); setFieldErrors((p) => ({ ...p, term_months: "" })); }} className={inputClass(!!fieldErrors.term_months)} />
                  <FieldError message={fieldErrors.term_months} />
                </div>
                <div>
                  <label className="label-field">{t("simulations.rateType")} <HelpTooltip field="rate_type" /></label>
                  <select value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value as "TEA" | "TNA" })} className="input-field">
                    <option value="TEA">TEA</option><option value="TNA">TNA</option>
                  </select>
                </div>
                <div>
                  <label className="label-field label-required">{t("simulations.rateValue")} <HelpTooltip field="rate_value" /></label>
                  <input type="number" step="0.01" value={form.rate_value} onChange={(e) => { setForm({ ...form, rate_value: +e.target.value }); setFieldErrors((p) => ({ ...p, rate_value: "" })); }} className={inputClass(!!fieldErrors.rate_value)} />
                  <FieldError message={fieldErrors.rate_value} />
                </div>
                {form.rate_type === "TNA" && (
                  <div>
                    <label className="label-field">{t("simulations.capitalization")} <HelpTooltip field="capitalization" /></label>
                    <input type="number" value={form.capitalization} onChange={(e) => setForm({ ...form, capitalization: +e.target.value })} className="input-field" />
                  </div>
                )}
                <div>
                  <label className="label-field">{t("simulations.balloonPercent")} <HelpTooltip field="balloon_percent" /></label>
                  <input type="number" step="0.01" value={form.balloon_percent} onChange={(e) => { setForm({ ...form, balloon_percent: +e.target.value }); setFieldErrors((p) => ({ ...p, balloon_percent: "" })); }} className={inputClass(!!fieldErrors.balloon_percent)} />
                  <FieldError message={fieldErrors.balloon_percent} />
                </div>
                <div>
                  <label className="label-field">{t("simulations.balloonBase")} <HelpTooltip field="balloon_base" /></label>
                  <select value={form.balloon_base} onChange={(e) => setForm({ ...form, balloon_base: e.target.value as "vehicle" | "financed" })} className="input-field">
                    <option value="vehicle">{t("simulations.balloonBaseVehicle")}</option>
                    <option value="financed">{t("simulations.balloonBaseFinanced")}</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">{t("simulations.monthlyFees")} <HelpTooltip field="portes" /></label>
                  <input type="number" value={form.portes} onChange={(e) => setForm({ ...form, portes: +e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">{t("common.previous")}</button>
                <button type="button" onClick={goStep3} className="btn-primary">{t("common.next")}</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t("simulations.step3Title")}</h3>
              <div className="form-grid">
                <div>
                  <label className="label-field">{t("simulations.graceType")} <HelpTooltip field="grace_type" /></label>
                  <select value={form.grace_type} onChange={(e) => setForm({ ...form, grace_type: e.target.value as typeof form.grace_type })} className="input-field">
                    <option value="none">{t("simulations.noGrace")}</option>
                    <option value="total">{t("simulations.totalGrace")}</option>
                    <option value="partial">{t("simulations.partialGrace")}</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">{t("simulations.graceMonths")} <HelpTooltip field="grace_months" /></label>
                  <input type="number" value={form.grace_months} onChange={(e) => setForm({ ...form, grace_months: +e.target.value })} className="input-field" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={form.include_insurance_vehicle} onChange={(e) => setForm({ ...form, include_insurance_vehicle: e.target.checked })} id="ins_v" />
                  <label htmlFor="ins_v" className="text-sm text-gray-600">{t("simulations.includeVehicleInsurance")} <HelpTooltip field="include_insurance_vehicle" /></label>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={form.include_insurance_life} onChange={(e) => setForm({ ...form, include_insurance_life: e.target.checked })} id="ins_l" />
                  <label htmlFor="ins_l" className="text-sm text-gray-600">{t("simulations.includeLifeInsurance")} <HelpTooltip field="include_insurance_life" /></label>
                </div>
              </div>
              {selectedVehicle && (
                <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl text-sm">
                  <p><strong>{t("simulations.vehicleLabel")}:</strong> {selectedVehicle.brand} {selectedVehicle.model}</p>
                  <p><strong>{t("simulations.priceLabel")}:</strong> {formatCurrency(selectedVehicle.price, selectedVehicle.currency)}</p>
                  <p><strong>{t("simulations.financedAmountLabel")}:</strong> {formatCurrency(selectedVehicle.price - form.down_payment, selectedVehicle.currency)}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary">{t("common.previous")}</button>
                <button type="button" onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? t("simulations.calculating") : t("simulations.generateSimulation")}
                </button>
                <button type="button" onClick={() => { setShowWizard(false); setFieldErrors({}); setFormError(""); }} className="btn-secondary">{t("common.cancel")}</button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead><tr>{tableCols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {simulations.map((s: { id: number; code: string; amount_financed: number; currency: string; monthly_payment: number; tcea: number; status: string; created_at: string }) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 font-semibold text-brand-700">{s.code}</td>
                  <td className="px-6 py-4">{formatCurrency(s.amount_financed, s.currency)}</td>
                  <td className="px-6 py-4">{formatCurrency(s.monthly_payment, s.currency)}</td>
                  <td className="px-6 py-4">{s.tcea ? formatPercent(s.tcea) : "-"}</td>
                  <td className="px-6 py-4"><span className="badge-blue">{s.status}</span></td>
                  <td className="px-6 py-4">{new Date(s.created_at).toLocaleDateString(dateLocale)}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <Link to={`/simulations/${s.id}`} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></Link>
                    {canWrite && (
                      <button onClick={() => cloneMutation.mutate(s.id)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"><Copy className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

