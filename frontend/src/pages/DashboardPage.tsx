import { useQuery } from "@tanstack/react-query";
import { DollarSign, Calculator, CheckCircle, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AppLayout } from "../layout/AppLayout";
import { KpiCard } from "../components/KpiCard";
import { dashboardApi } from "../lib/api";
import { formatCurrency } from "../lib/formatters";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.summary().then((r) => r.data) });

  if (isLoading) return <AppLayout title="Dashboard"><p>Cargando...</p></AppLayout>;

  return (
    <AppLayout title="Dashboard" subtitle="Indicadores generales de la concesionaria">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Volumen Financiado" value={formatCurrency(data?.total_financed || 0)} icon={<DollarSign className="w-6 h-6" />} />
        <KpiCard title="Simulaciones Activas" value={data?.active_simulations || 0} icon={<Calculator className="w-6 h-6" />} />
        <KpiCard title="Tasa de Aprobación" value={`${data?.approval_rate || 0}%`} icon={<CheckCircle className="w-6 h-6" />} />
        <KpiCard title="Clientes Registrados" value={data?.total_customers || 0} icon={<Users className="w-6 h-6" />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Simulaciones por Mes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.simulations_by_month || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Financiamiento por Categoría</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data?.financing_by_category || []} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                {(data?.financing_by_category || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  );
}
