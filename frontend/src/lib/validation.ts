import type { FieldErrors } from "./errors";
import i18n from "../i18n";

function req(value: unknown, label: string): string | undefined {
  if (value === null || value === undefined) return i18n.t("validation.required", { field: label });
  if (typeof value === "string" && !value.trim()) return i18n.t("validation.required", { field: label });
  return undefined;
}

function email(value: string): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return i18n.t("validation.invalidEmail");
  return undefined;
}

export function validateLogin(emailVal: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const e = req(emailVal, i18n.t("auth.email")) ?? email(emailVal);
  if (e) errors.email = e;
  if (req(password, i18n.t("auth.password"))) errors.password = i18n.t("validation.passwordRequired");
  return errors;
}

export function validateCustomer(form: {
  nombres: string; apellidos: string; dni: string; edad: number;
  ingreso_mensual: number; email: string; telefono: string; direccion: string;
}): FieldErrors {
  const f = (key: string) => i18n.t(`customers.fields.${key}`);
  const errors: FieldErrors = {};
  if (req(form.nombres, f("nombres"))) errors.nombres = req(form.nombres, f("nombres"))!;
  if (req(form.apellidos, f("apellidos"))) errors.apellidos = req(form.apellidos, f("apellidos"))!;
  if (req(form.dni, f("dni"))) errors.dni = req(form.dni, f("dni"))!;
  else if (!/^\d{8}$/.test(form.dni)) errors.dni = i18n.t("validation.dniFormat");
  if (req(form.email, f("email"))) errors.email = req(form.email, f("email"))!;
  else { const msg = email(form.email); if (msg) errors.email = msg; }
  if (req(form.telefono, f("telefono"))) errors.telefono = req(form.telefono, f("telefono"))!;
  else if (!/^\d{9}$/.test(form.telefono)) errors.telefono = i18n.t("validation.phoneFormat");
  if (form.edad < 18) errors.edad = i18n.t("validation.minAge");
  if (form.ingreso_mensual <= 0) errors.ingreso_mensual = i18n.t("validation.positiveIncome");
  return errors;
}

export function validateVehicle(form: {
  brand: string; model: string; year: number; color: string; price: number;
}): FieldErrors {
  const errors: FieldErrors = {};
  const labels: Record<string, string> = { brand: "Brand", model: "Model", color: "Color" };
  if (req(form.brand, labels.brand)) errors.brand = req(form.brand, labels.brand)!;
  if (req(form.model, labels.model)) errors.model = req(form.model, labels.model)!;
  if (req(form.color, labels.color)) errors.color = req(form.color, labels.color)!;
  if (form.year < 2020) errors.year = i18n.t("validation.minYear");
  if (form.price <= 0) errors.price = i18n.t("validation.positivePrice");
  return errors;
}

export function validateUser(form: { name: string; email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (req(form.name, "Name")) errors.name = req(form.name, "Name")!;
  if (req(form.email, i18n.t("auth.email"))) errors.email = req(form.email, i18n.t("auth.email"))!;
  else { const msg = email(form.email); if (msg) errors.email = msg; }
  if (req(form.password, i18n.t("auth.password"))) errors.password = req(form.password, i18n.t("auth.password"))!;
  else if (form.password.length < 6) errors.password = i18n.t("validation.minPassword");
  return errors;
}

export function validateSettings(form: {
  dealership_name: string; dealership_ruc: string; dealership_email: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (req(form.dealership_name, "Dealership")) errors.dealership_name = req(form.dealership_name, "Dealership")!;
  if (req(form.dealership_ruc, "RUC")) errors.dealership_ruc = req(form.dealership_ruc, "RUC")!;
  else if (!/^\d{11}$/.test(form.dealership_ruc)) errors.dealership_ruc = i18n.t("validation.rucFormat");
  if (req(form.dealership_email, i18n.t("auth.email"))) errors.dealership_email = req(form.dealership_email, i18n.t("auth.email"))!;
  else { const msg = email(form.dealership_email); if (msg) errors.dealership_email = msg; }
  return errors;
}

export function validateSimulationStep1(form: { customer_id: number; vehicle_id: number }): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.customer_id) errors.customer_id = i18n.t("validation.selectCustomer");
  if (!form.vehicle_id) errors.vehicle_id = i18n.t("validation.selectVehicle");
  return errors;
}

export function validateSimulationStep2(form: {
  down_payment: number; rate_value: number; term_months: number; balloon_percent: number;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (form.rate_value <= 0) errors.rate_value = i18n.t("validation.positivePrice");
  if (form.term_months <= 0) errors.term_months = i18n.t("validation.positivePrice");
  if (form.balloon_percent <= 0 || form.balloon_percent >= 1) {
    errors.balloon_percent = i18n.t("validation.positivePrice");
  }
  if (form.down_payment < 0) errors.down_payment = i18n.t("validation.positivePrice");
  return errors;
}

export function validateApplicationStatus(form: {
  status: string; decision_reason: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (form.status === "Rejected" && !form.decision_reason.trim()) {
    errors.decision_reason = i18n.t("applications.rejectReasonRequired");
  }
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
