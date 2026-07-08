import { inputClass } from "./FormFeedback";

interface PercentInputProps {
  value: number;
  onChange: (decimal: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hasError?: boolean;
  id?: string;
  className?: string;
}

export function PercentInput({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  hasError = false,
  id,
  className = "",
}: PercentInputProps) {
  const displayValue = Number.isFinite(value) ? Math.round(value * 10000) / 100 : 0;

  const handleChange = (raw: string) => {
    if (raw === "") {
      onChange(0);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(parsed / 100);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={displayValue || ""}
        onChange={(e) => handleChange(e.target.value)}
        className={`${inputClass(hasError)} pr-10`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span>
    </div>
  );
}
