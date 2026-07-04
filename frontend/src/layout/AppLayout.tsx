import { ReactNode } from "react";
import { Menu } from "lucide-react";
import { useSidebar } from "./SidebarContext";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppLayout({ title, subtitle, actions, children }: Props) {
  const { toggle } = useSidebar();

  return (
    <div className="min-h-screen bg-surface-muted bg-mesh lg:ml-64">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={toggle}
              className="lg:hidden mt-0.5 p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">{title}</h2>
              {subtitle && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 sm:line-clamp-none">{subtitle}</p>}
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 sm:gap-3 sm:shrink-0 [&_.btn-primary]:flex-1 [&_.btn-primary]:sm:flex-none [&_.btn-secondary]:flex-1 [&_.btn-secondary]:sm:flex-none">
              {actions}
            </div>
          )}
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8 page-enter">{children}</main>
    </div>
  );
}
