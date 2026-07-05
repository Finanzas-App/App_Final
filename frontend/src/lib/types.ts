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

export interface ApplicationActivity {
  id: number;
  application_id: number | null;
  action: string;
  message: string;
  activity_type: "info" | "success" | "warning" | "error";
  user_name: string | null;
  created_at: string;
}
