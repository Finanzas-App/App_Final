import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DollarSign, Calculator, CheckCircle, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, PieLabelRenderProps } from "recharts";
import { AppLayout } from "../layout/AppLayout";
import { KpiCard } from "../components/KpiCard";
import { PageLoader } from "../components/ui/PageLoader";
import { dashboardApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";
import type { DashboardSummary } from "../lib/types";

const COLORS = ["#1a7ff5", "#10b981", "#f59e0b", "#ef4444"];

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 24px -6px rgba(15, 23, 42, 0.1)",
};

function pieLabel({ category }: PieLabelRenderProps & { category?: string }) {
  return category ?? "";
}

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.summary().then((r: { data: DashboardSummary }) => r.data),
  });

  const categoryData = data?.financing_by_category ?? [];

  if (isLoading) {
    return (
      <AppLayout title={t("dashboard.title")} subtitle={t("dashboard.subtitle")}>
        <PageLoader />
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t("dashboard.title")} subtitle={t("dashboard.subtitle")}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KpiCard title={t("dashboard.totalFinanced")} value={formatCurrency(data?.total_financed ?? 0)} icon={<DollarSign className="w-5 h-5" />} variant="blue" />
        <KpiCard title={t("dashboard.activeSimulations")} value={data?.active_simulations ?? 0} icon={<Calculator className="w-5 h-5" />} variant="green" />
        <KpiCard title={t("dashboard.approvalRate")} value={`${data?.approval_rate ?? 0}%`} icon={<CheckCircle className="w-5 h-5" />} variant="amber" />
        <KpiCard title={t("dashboard.totalCustomers")} value={data?.total_customers ?? 0} icon={<Users className="w-5 h-5" />} variant="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4 sm:p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-1">{t("dashboard.simulationsByMonth")}</h3>
          <p className="text-xs text-slate-400 mb-5">{t("dashboard.simulationsByMonthDesc")}</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.simulations_by_month ?? []} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#1a7ff5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4 sm:p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-1">{t("dashboard.financingByCategory")}</h3>
          <p className="text-xs text-slate-400 mb-5">{t("dashboard.financingByCategoryDesc")}</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryData} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={pieLabel}>
                {categoryData.map((_entry: { category: string; amount: number }, i: number) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  );
}
