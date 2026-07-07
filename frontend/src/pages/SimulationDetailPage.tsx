import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, FileText, ArrowLeft } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { HelpTooltip } from "../components/HelpTooltip";
import { KpiCard } from "../components/KpiCard";
import { PageLoader } from "../components/ui/PageLoader";
import { simulationsApi, applicationsApi } from "../lib/api";
import { formatCurrency, formatPercent, formatDate } from "../lib/formatters";
import { useAuth } from "../features/auth/AuthContext";
import { hasPermission } from "../lib/permissions";
import { useToast } from "../components/ui/Toast";

export default function SimulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();
  const canCreateApp = hasPermission(user?.role, "applications:create");

  const { data: sim, isLoading } = useQuery({
    queryKey: ["simulation", id],
    queryFn: () => simulationsApi.get(Number(id)).then((r) => r.data),
    enabled: !!id,
  });

  const appMutation = useMutation({
    mutationFn: () => applicationsApi.create({ simulation_id: Number(id) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); toast.success(t("simulationDetail.applicationCreated")); },
    onError: (err) => toast.errorFrom(err),
  });

  const handleExport = async () => {
    try {
      const { data } = await simulationsApi.export(Number(id));
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `cronograma_${sim?.code}.csv`;
      a.click();
      toast.success(t("simulationDetail.scheduleExported"));
    } catch (err) {
      toast.errorFrom(err, t("simulationDetail.exportFailed"));
    }
  };

  if (isLoading) return <AppLayout title={t("simulationDetail.title")}><PageLoader /></AppLayout>;
  if (!sim) return <AppLayout title={t("simulationDetail.title")}><p className="text-slate-500">{t("simulationDetail.notFound")}</p></AppLayout>;

  const scheduleCols = [
    t("simulationDetail.scheduleCols.period"),
    t("simulationDetail.scheduleCols.date"),
    t("simulationDetail.scheduleCols.openingBalance"),
    t("simulationDetail.scheduleCols.interest"),
    t("simulationDetail.scheduleCols.amortization"),
    t("simulationDetail.scheduleCols.vehicleInsurance"),
    t("simulationDetail.scheduleCols.lifeInsurance"),
    t("simulationDetail.scheduleCols.fees"),
    t("simulationDetail.scheduleCols.payment"),
    t("simulationDetail.scheduleCols.balloon"),
    t("simulationDetail.scheduleCols.closingBalance"),
    t("simulationDetail.scheduleCols.status"),
  ];

  return (
    <AppLayout title={`${t("simulationDetail.title")} ${sim.code}`} subtitle={t("simulationDetail.subtitle")}
      actions={<>
        <Link to="/simulations" className="btn-secondary"><ArrowLeft className="w-4 h-4" /> {t("simulationDetail.back")}</Link>
        <button onClick={handleExport} className="btn-secondary"><Download className="w-4 h-4" /> {t("simulationDetail.exportCsv")}</button>
        {canCreateApp && (
          <button onClick={() => appMutation.mutate()} className="btn-primary"><FileText className="w-4 h-4" /> {t("simulationDetail.createApplication")}</button>
        )}
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
        <KpiCard title={t("simulationDetail.amountFinanced")} value={formatCurrency(sim.amount_financed, sim.currency)} variant="blue" />
        <KpiCard title={t("simulationDetail.monthlyPayment")} value={formatCurrency(sim.monthly_payment, sim.currency)} variant="green" />
        <KpiCard title={t("simulationDetail.balloonPayment")} value={formatCurrency(sim.balloon_amount, sim.currency)} variant="amber" />
        <KpiCard title={t("simulationDetail.totalInterest")} value={formatCurrency(sim.total_interest, sim.currency)} variant="purple" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="card p-4 sm:p-6">
          <p className="text-sm text-slate-500 font-medium">{t("simulationDetail.van")} <HelpTooltip field="van" /></p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(sim.van || 0, sim.currency)}</p>
        </div>
        <div className="card p-4 sm:p-6">
          <p className="text-sm text-slate-500 font-medium">{t("simulationDetail.tirMonthly")} <HelpTooltip field="tir" /></p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{sim.tir_monthly ? formatPercent(sim.tir_monthly) : "-"}</p>
        </div>
        <div className="card p-4 sm:p-6">
          <p className="text-sm text-slate-500 font-medium">{t("simulationDetail.tcea")} <HelpTooltip field="tcea" /></p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{sim.tcea ? formatPercent(sim.tcea) : "-"}</p>
        </div>
      </div>
      <div className="card p-4 sm:p-6 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">{t("simulationDetail.financialSummary")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 text-sm">
          <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block text-xs mb-1">TEA</span><span className="font-semibold">{formatPercent(sim.tea)}</span></div>
          <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block text-xs mb-1">TEM</span><span className="font-semibold">{formatPercent(sim.tem)}</span></div>
          <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block text-xs mb-1">{t("simulationDetail.term")}</span><span className="font-semibold">{sim.term_months} {t("simulationDetail.months")}</span></div>
          <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block text-xs mb-1">{t("simulationDetail.grace")}</span><span className="font-semibold capitalize">{sim.grace_type} ({sim.grace_months})</span></div>
          <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block text-xs mb-1">{t("simulationDetail.downPayment")}</span><span className="font-semibold">{formatCurrency(sim.down_payment, sim.currency)}</span></div>
          <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block text-xs mb-1">{t("simulationDetail.vehiclePrice")}</span><span className="font-semibold">{formatCurrency(sim.vehicle_price, sim.currency)}</span></div>
        </div>
      </div>
      <div className="table-wrap">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800">{t("simulationDetail.paymentSchedule")}</h3>
        </div>
        <div className="table-scroll">
          <table className="text-xs min-w-[900px]">
            <thead><tr>
              {scheduleCols.map((h) => (
                <th key={h} className="whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(sim.schedule || []).sort((a: { period: number }, b: { period: number }) => a.period - b.period).map((row: {
                period: number; due_date: string; opening_balance: number; interest: number; amortization: number;
                insurance_vehicle: number; insurance_life: number; portes: number; payment: number; balloon_payment: number;
                closing_balance: number; is_grace_period: boolean; payment_status?: string;
              }) => (
                <tr key={row.period} className={row.is_grace_period ? "bg-amber-50/60" : ""}>
                  <td className="px-3 py-2.5">{row.period}</td>
                  <td className="px-3 py-2.5">{formatDate(row.due_date)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(row.opening_balance, sim.currency)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(row.interest, sim.currency)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(row.amortization, sim.currency)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(row.insurance_vehicle, sim.currency)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(row.insurance_life, sim.currency)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(row.portes || 0, sim.currency)}</td>
                  <td className="px-3 py-2.5 font-semibold text-brand-700">{formatCurrency(row.payment, sim.currency)}</td>
                  <td className="px-3 py-2.5">{row.balloon_payment > 0 ? formatCurrency(row.balloon_payment, sim.currency) : "-"}</td>
                  <td className="px-3 py-2.5">{formatCurrency(row.closing_balance, sim.currency)}</td>
                  <td className="px-3 py-2.5"><span className="badge-gray capitalize">{row.payment_status || "pending"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
