import { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  variant?: "blue" | "brand" | "green" | "amber" | "purple";
}

const VARIANTS = {
  blue: { icon: "bg-brand-50 text-brand-600", accent: "from-brand-500/10 to-transparent" },
  brand: { icon: "bg-brand-50 text-brand-600", accent: "from-brand-500/10 to-transparent" },
  green: { icon: "bg-emerald-50 text-emerald-600", accent: "from-emerald-500/10 to-transparent" },
  amber: { icon: "bg-amber-50 text-amber-600", accent: "from-amber-500/10 to-transparent" },
  purple: { icon: "bg-purple-50 text-purple-600", accent: "from-purple-500/10 to-transparent" },
};

export function KpiCard({ title, value, icon, subtitle, variant = "blue" }: Props) {
  const v = VARIANTS[variant] ?? VARIANTS.blue;
  return (
    <div className={`card p-4 sm:p-6 relative overflow-hidden group hover:shadow-glow transition-shadow duration-300`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${v.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {icon && <div className={`stat-icon ${v.icon}`}>{icon}</div>}
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-2 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}
