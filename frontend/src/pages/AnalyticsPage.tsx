import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { AppLayout } from "../layout/AppLayout";
import { PageLoader } from "../components/ui/PageLoader";
import { dashboardApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";

const COLORS = ["#1a7ff5", "#10b981", "#f59e0b"];

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 24px -6px rgba(15, 23, 42, 0.1)",
};

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  return (
    <AppLayout title={t("analytics.title")} subtitle={t("analytics.subtitle")}>
      {isLoading ? <PageLoader /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-slate-800 mb-1">Tendencia de Simulaciones</h3>
            <p className="text-xs text-slate-400 mb-5">Evolución mensual</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data?.simulations_by_month || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#1a7ff5" strokeWidth={2.5} dot={{ r: 4, fill: "#1a7ff5" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-slate-800 mb-1">Financiamiento por Categoría</h3>
            <p className="text-xs text-slate-400 mb-5">Montos por tipo de vehículo</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.financing_by_category || []} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#1a7ff5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-slate-800 mb-1">Distribución por Moneda</h3>
            <p className="text-xs text-slate-400 mb-5">PEN vs USD</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data?.currency_distribution || []}
                  dataKey="amount"
                  nameKey="currency"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ currency }) => currency}
                >
                  {(data?.currency_distribution || []).map((_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-slate-800 mb-5">Indicadores Clave</h3>
            <div className="space-y-3">
              {[
                { label: "Volumen Total", value: formatCurrency(data?.total_financed || 0) },
                { label: "Tasa de Aprobación", value: `${data?.approval_rate || 0}%` },
                { label: "Simulaciones Activas", value: String(data?.active_simulations || 0) },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
