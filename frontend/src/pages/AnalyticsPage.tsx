import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { AppLayout } from "../layout/AppLayout";
import { dashboardApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";

const COLORS = ["#2563eb", "#10b981", "#f59e0b"];

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.summary().then((r) => r.data) });

  return (
    <AppLayout title="Analytics" subtitle="Análisis de simulaciones y financiamiento">
      {isLoading ? <p>Cargando...</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Tendencia de Simulaciones</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.simulations_by_month || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis /><Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Financiamiento por Categoría</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.financing_by_category || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" /><YAxis /><Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Distribución por Moneda</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data?.currency_distribution || []} dataKey="amount" nameKey="currency" cx="50%" cy="50%" outerRadius={100} label>
                  {(data?.currency_distribution || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Indicadores Clave</h3>
            <div className="space-y-4">
              <div className="flex justify-between p-4 bg-gray-50 rounded-xl"><span>Volumen Total</span><span className="font-bold">{formatCurrency(data?.total_financed || 0)}</span></div>
              <div className="flex justify-between p-4 bg-gray-50 rounded-xl"><span>Tasa de Aprobación</span><span className="font-bold">{data?.approval_rate || 0}%</span></div>
              <div className="flex justify-between p-4 bg-gray-50 rounded-xl"><span>Simulaciones Activas</span><span className="font-bold">{data?.active_simulations || 0}</span></div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
