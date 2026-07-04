import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="field-error" role="alert">{message}</p>;
}

export function FormAlert({
  message,
  type = "error",
}: {
  message?: string;
  type?: "error" | "success" | "warning";
}) {
  if (!message) return null;
  const styles = {
    error: "form-alert-error",
    success: "form-alert-success",
    warning: "form-alert-warning",
  };
  const icons = {
    error: AlertCircle,
    success: CheckCircle2,
    warning: AlertTriangle,
  };
  const Icon = icons[type];
  return (
    <div className={`${styles[type]} flex items-start gap-2.5`} role="alert">
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function inputClass(hasError?: boolean) {
  return hasError ? "input-field input-field-error" : "input-field";
}
