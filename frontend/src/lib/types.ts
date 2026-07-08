export interface DashboardSummary {
  total_financed: number;
  active_simulations: number;
  approval_rate: number;
  total_customers: number;
  total_vehicles: number;
  simulations_by_month: { month: string; count: number }[];
  financing_by_category: { category: string; amount: number }[];
  currency_distribution: { currency: string; amount: number }[];
}

export interface Application {
  id: number;
  simulation_id: number;
  simulation_code?: string | null;
  amount_financed?: number | null;
  currency?: string | null;
  status: string;
  decision_reason: string | null;
  approved_amount: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ApplicationStatusForm {
  status: string;
  decision_reason: string;
  approved_amount: number;
}

export interface SimulationPreview {
  vehicle_price: number;
  down_payment: number;
  amount_financed: number;
  currency: string;
  rate_type: string;
  rate_value: number;
  grace_type: string;
  grace_months: number;
  term_months: number;
  balloon_percent: number;
  balloon_base: string;
  balloon_amount: number;
  monthly_payment: number;
  total_interest: number;
  total_monthly_payment: number;
  tcea: number | null;
  van: number | null;
  schedule: { period: number; payment: number; interest: number; amortization: number }[];
}

export interface ComparisonScenario {
  id: string;
  label: string;
  form: Record<string, unknown>;
  preview: SimulationPreview;
}

  id: number;
  application_id: number | null;
  action: string;
  message: string;
  activity_type: "info" | "success" | "warning" | "error";
  user_name: string | null;
  created_at: string;
}
