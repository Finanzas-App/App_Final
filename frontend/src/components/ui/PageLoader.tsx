export function PageLoader({ message = "Cargando..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-brand-100" />
        <div className="absolute inset-0 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-slate-500 font-medium animate-pulse-soft">{message}</p>
    </div>
  );
}
