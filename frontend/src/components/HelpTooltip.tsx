import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  field: string;
  className?: string;
}

export function HelpTooltip({ field, className = "" }: Props) {
  const { t } = useTranslation();
  const text = t(`help.${field}`, { defaultValue: "" });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  if (!text) return null;

  return (
    <span ref={rootRef} className={`relative inline-flex ml-1 align-middle ${className}`}>
      <button
        type="button"
        className="inline-flex text-gray-400 hover:text-brand-600 focus:text-brand-600 focus:outline-none"
        aria-label={t("help.ariaLabel")}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <Info className="w-4 h-4" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs text-white bg-gray-800 rounded-lg shadow-lg transition-opacity ${
          open ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
