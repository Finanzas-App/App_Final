export type BalloonBase = "vehicle" | "financed";

export function computeBalloonAmount(
  vehiclePrice: number,
  downPayment: number,
  balloonPercent: number,
  balloonBase: BalloonBase,
): number {
  const amountFinanced = vehiclePrice - downPayment;
  const base = balloonBase === "vehicle" ? vehiclePrice : amountFinanced;
  return Math.round(base * balloonPercent * 100) / 100;
}

export function buildScenarioLabel(form: {
  term_months: number;
  rate_type: string;
  rate_value: number;
  balloon_percent: number;
  down_payment: number;
}): string {
  const rate = `${(form.rate_value * 100).toFixed(0)}% ${form.rate_type}`;
  const balloon = `${(form.balloon_percent * 100).toFixed(0)}% balón`;
  const initial = form.down_payment > 0 ? ` / ini. ${form.down_payment}` : "";
  return `${form.term_months}m · ${rate} · ${balloon}${initial}`;
}
