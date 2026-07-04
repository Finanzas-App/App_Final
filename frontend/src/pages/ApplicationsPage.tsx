import { useRef, useState, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, FileText, X, History } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { FormAlert, FieldError, inputClass } from "../components/ui/FormFeedback";
import { PageLoader } from "../components/ui/PageLoader";
import { useToast } from "../components/ui/Toast";
import { applicationsApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";
import { useAuth } from "../features/auth/AuthContext";
import { hasPermission } from "../lib/permissions";
import { mergeFieldErrors, parseApiError, type FieldErrors } from "../lib/errors";
import { validateApplicationStatus, hasErrors } from "../lib/validation";
import type { Application, ApplicationActivity, ApplicationStatusForm } from "../lib/types";

const STATUS_COLORS: Record<string, string> = {
  Pending: "badge-amber",
  Approved: "badge-green",
  Observed: "badge-amber",
  Rejected: "badge-red",
};

const LOG_TYPE_STYLE: Record<ApplicationActivity["activity_type"], string> = {
  info: "border-l-brand-400 bg-brand-50/50 text-slate-700",
  success: "border-l-emerald-500 bg-emerald-50/80 text-emerald-800",
  warning: "border-l-amber-400 bg-amber-50/80 text-amber-800",
  error: "border-l-red-500 bg-red-50/80 text-red-800",
};

export default function ApplicationsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const canEvaluate = hasPermission(user?.role, "applications:evaluate");
  const [selected, setSelected] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState<ApplicationStatusForm>({ status: "Pending", decision_reason: "", approved_amount: 0 });
  const [baseline, setBaseline] = useState<ApplicationStatusForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [successDetails, setSuccessDetails] = useState<string[]>([]);

  const statusLabel = (s: string) => t(`status.${s}`, { defaultValue: s });

  const buildChangeSummary = (before: ApplicationStatusForm, after: ApplicationStatusForm): string[] => {
    const changes: string[] = [];
    if (before.status !== after.status) {
      changes.push(t("applications.changeStatus", { from: statusLabel(before.status), to: statusLabel(after.status) }));
    }
    if (before.approved_amount !== after.approved_amount) {
      changes.push(t("applications.changeAmount", {
        amount: after.approved_amount > 0 ? formatCurrency(after.approved_amount) : t("common.noAmount"),
      }));
    }
    if (before.decision_reason.trim() !== after.decision_reason.trim()) {
      changes.push(after.decision_reason.trim()
        ? t("applications.changeReason", { reason: after.decision_reason.trim() })
        : t("common.amountRemoved"));
    }
    return changes;
  };

  const formatActivityTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(i18n.language === "en" ? "en-US" : "es-PE", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["applications"],
    queryFn: () => applicationsApi.list().then((r: { data: Application[] }) => r.data),
  });

  const { data: activityLog = [], isLoading: activityLoading, refetch: refetchActivity } = useQuery<ApplicationActivity[]>({
    queryKey: ["applications", "activity"],
    queryFn: () => applicationsApi.activity().then((r: { data: ApplicationActivity[] }) => r.data),
    enabled: activityModalOpen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApplicationStatusForm }) =>
      applicationsApi.updateStatus(id, data),
    onSuccess: (_data: unknown, variables: { id: number; data: ApplicationStatusForm }) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["applications", "activity"] });
      setFieldErrors({});
      setFormError("");
      const before = baseline ?? statusForm;
      const changes = buildChangeSummary(before, variables.data);
      setSuccessDetails(changes.length > 0 ? changes : [t("applications.savedDefault")]);
      setBaseline({ ...variables.data });
      const summary = changes.length > 0 ? changes.join(" · ") : t("applications.savedOk");
      toast.success(t("applications.updated", { id: variables.id, summary }));
    },
    onError: (err: unknown) => {
      setSuccessDetails([]);
      const { message, fieldErrors: apiFields } = parseApiError(err);
      setFormError(message);
      setFieldErrors((prev: FieldErrors) => mergeFieldErrors(prev, apiFields));
      toast.error(message);
    },
  });

  const logViewMutation = useMutation({
    mutationFn: (id: number) => applicationsApi.logView(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications", "activity"] }),
  });

  const selectedApp = applications.find((a: Application) => a.id === selected);
  const pendingChanges = baseline ? buildChangeSummary(baseline, statusForm) : [];

  const openEvaluate = (id: number) => {
    const app = applications.find((a: Application) => a.id === id);
    if (!app) return;
    const initial: ApplicationStatusForm = {
      status: app.status,
      decision_reason: app.decision_reason ?? "",
      approved_amount: app.approved_amount ?? 0,
    };
    setSelected(id);
    setStatusForm(initial);
    setBaseline(initial);
    setFieldErrors({});
    setFormError("");
    setSuccessDetails([]);
    setModalOpen(true);
    logViewMutation.mutate(id);
    toast.info(t("applications.evaluating", { id }));
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
    setSuccessDetails([]);
    setFormError("");
    setFieldErrors({});
  };

  const handleUpdate = () => {
    if (!selectedApp || !baseline) return;
    if (pendingChanges.length === 0) {
      toast.info(t("applications.noChangesToSave"));
      return;
    }
    const errors = validateApplicationStatus(statusForm);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFormError(t("applications.rejectReasonRequired"));
      toast.warning(t("applications.completeRejectReason"));
      return;
    }
    setFormError("");
    setSuccessDetails([]);
    updateMutation.mutate({ id: selectedApp.id, data: statusForm });
  };

  const updateField = (patch: Partial<ApplicationStatusForm>) => {
    setStatusForm((prev: ApplicationStatusForm) => ({ ...prev, ...patch }));
    setFieldErrors({});
    setFormError("");
    setSuccessDetails([]);
  };

  const tableCols = [
    t("applications.cols.id"),
    t("applications.cols.simulation"),
    t("applications.cols.status"),
    t("applications.cols.amount"),
    t("applications.cols.date"),
    "",
  ];

  return (
    <AppLayout
      title={t("applications.title")}
      subtitle={canEvaluate ? t("applications.subtitleEvaluate") : t("applications.subtitleRead")}
      actions={
        <button type="button" onClick={() => { setActivityModalOpen(true); refetchActivity(); }} className="btn-secondary">
          <History className="w-4 h-4" />
          {t("applications.activityLog")}
        </button>
      }
    >
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>{tableCols.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">{t("applications.noApplications")}</td></tr>
              ) : applications.map((a: Application) => (
                <tr
                  key={a.id}
                  className={`transition-colors ${selected === a.id && modalOpen ? "bg-brand-50/60 ring-1 ring-inset ring-brand-200" : "hover:bg-slate-50"}`}
                >
                  <td className="px-6 py-4 font-medium">#{a.id}</td>
                  <td className="px-6 py-4">SIM-{a.simulation_id}</td>
                  <td className="px-6 py-4">
                    <span className={STATUS_COLORS[a.status] || "badge-gray"}>{statusLabel(a.status)}</span>
                  </td>
                  <td className="px-6 py-4">{a.approved_amount ? formatCurrency(a.approved_amount) : "-"}</td>
                  <td className="px-6 py-4">{new Date(a.created_at).toLocaleDateString(i18n.language === "en" ? "en-US" : "es-PE")}</td>
                  <td className="px-6 py-4">
                    {canEvaluate ? (
                      <button type="button" onClick={() => openEvaluate(a.id)} className="btn-primary text-xs py-1.5 px-3">
                        {t("applications.evaluate")} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">{t("common.readOnly")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActivityModalOpen(false)} aria-hidden="true" />
          <div className="relative w-full sm:max-w-lg max-h-[85vh] overflow-hidden bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up flex flex-col" role="dialog" aria-modal="true" aria-labelledby="activity-title">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <History className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 id="activity-title" className="font-bold text-slate-900">{t("applications.activityLog")}</h3>
                  <p className="text-xs text-slate-500">{t("applications.activitySubtitle")}</p>
                </div>
              </div>
              <button type="button" onClick={() => setActivityModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" aria-label={t("common.close")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {activityLoading ? (
                <PageLoader />
              ) : activityLog.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">{t("applications.noActivity")}</p>
              ) : (
                <ul className="space-y-2">
                  {activityLog.map((entry) => (
                    <li key={entry.id} className={`text-sm pl-3 py-2 rounded-r-lg border-l-4 ${LOG_TYPE_STYLE[entry.activity_type]}`}>
                      <span className="text-xs text-slate-400 mr-2">{formatActivityTime(entry.created_at)}</span>
                      {entry.message}
                      {entry.user_name && (
                        <span className="block text-xs text-slate-400 mt-0.5">{t("common.by")}: {entry.user_name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {modalOpen && selectedApp && canEvaluate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
          <div ref={panelRef} className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="eval-title">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 id="eval-title" className="font-bold text-slate-900">{t("applications.evaluateTitle", { id: selectedApp.id })}</h3>
                  <p className="text-xs text-slate-500">SIM-{selectedApp.simulation_id}</p>
                </div>
              </div>
              <button type="button" onClick={closeModal} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" aria-label={t("common.close")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t("applications.currentState")}</p>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t("applications.state")}</span>
                  <span className={STATUS_COLORS[baseline?.status ?? ""] || "badge-gray"}>{statusLabel(baseline?.status ?? "")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t("applications.amount")}</span>
                  <span className="font-semibold">{(baseline?.approved_amount ?? 0) > 0 ? formatCurrency(baseline!.approved_amount) : "-"}</span>
                </div>
              </div>
              {pendingChanges.length > 0 && !updateMutation.isPending && (
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 text-sm animate-pulse-soft">
                  <p className="font-bold text-amber-900 mb-2">{t("applications.pendingChanges")}</p>
                  <ul className="space-y-1 text-amber-800 font-medium">
                    {pendingChanges.map((line) => <li key={line}>• {line}</li>)}
                  </ul>
                </div>
              )}
              {successDetails.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-sm">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {t("applications.savedSuccess")}
                  </div>
                  <ul className="space-y-1 text-emerald-700">
                    {successDetails.map((line) => <li key={line}>✓ {line}</li>)}
                  </ul>
                </div>
              )}
              <FormAlert message={formError} type="error" />
              <div className="space-y-4">
                <div>
                  <label className="label-field">{t("applications.newStatus")}</label>
                  <select value={statusForm.status} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateField({ status: e.target.value })} className={inputClass(!!fieldErrors.status)}>
                    {(["Pending", "Approved", "Observed", "Rejected"] as const).map((s) => (
                      <option key={s} value={s}>{statusLabel(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`label-field ${statusForm.status === "Rejected" ? "label-required" : ""}`}>{t("applications.reason")}</label>
                  <textarea
                    value={statusForm.decision_reason}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateField({ decision_reason: e.target.value })}
                    className={inputClass(!!fieldErrors.decision_reason)}
                    rows={3}
                    placeholder={statusForm.status === "Rejected" ? t("applications.reasonRequired") : t("applications.reasonOptional")}
                  />
                  <FieldError message={fieldErrors.decision_reason} />
                </div>
                <div>
                  <label className="label-field">{t("applications.approvedAmount")}</label>
                  <input type="number" min={0} value={statusForm.approved_amount} onChange={(e: ChangeEvent<HTMLInputElement>) => updateField({ approved_amount: +e.target.value })} className={inputClass(!!fieldErrors.approved_amount)} />
                  <FieldError message={fieldErrors.approved_amount} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="button" onClick={handleUpdate} disabled={updateMutation.isPending || pendingChanges.length === 0} className="btn-primary flex-1 py-3 disabled:opacity-50">
                  {updateMutation.isPending ? t("applications.saving") : pendingChanges.length > 0 ? t("applications.saveChanges") : t("applications.noChanges")}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 py-3">{t("common.close")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
