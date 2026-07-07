import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: `${API_URL}/api/v1` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const isAuthRequest = error.config?.url?.includes("/auth/login")
      || error.config?.url?.includes("/auth/verify-2fa")
      || error.config?.url?.includes("/auth/resend-2fa");
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem("token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    if (error.response?.status === 403 && !isAuthRequest) {
      console.warn("Acceso denegado:", error.response?.data?.detail);
    }
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  requires_2fa: boolean;
  challenge_id?: string;
  expires_in?: number;
  access_token?: string;
  token_type?: string;
}

export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>("/auth/login", { email, password }),
  verify2FA: (challengeId: string, code: string) => api.post<{ access_token: string; token_type: string }>("/auth/verify-2fa", { challenge_id: challengeId, code }),
  resend2FA: (challengeId: string) => api.post<{ requires_2fa: boolean; challenge_id: string; expires_in: number }>("/auth/resend-2fa", { challenge_id: challengeId }),
  register: (data: object) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  listUsers: () => api.get("/auth/users"),
};

export const customersApi = {
  list: () => api.get("/customers"),
  get: (id: number) => api.get(`/customers/${id}`),
  create: (data: object) => api.post("/customers", data),
  update: (id: number, data: object) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

export const vehiclesApi = {
  list: () => api.get("/vehicles"),
  get: (id: number) => api.get(`/vehicles/${id}`),
  create: (data: object) => api.post("/vehicles", data),
  update: (id: number, data: object) => api.put(`/vehicles/${id}`, data),
  delete: (id: number) => api.delete(`/vehicles/${id}`),
};

export const simulationsApi = {
  list: () => api.get("/simulations"),
  get: (id: number) => api.get(`/simulations/${id}`),
  create: (data: object) => api.post("/simulations", data),
  clone: (id: number) => api.post(`/simulations/${id}/clone`),
  export: (id: number) => api.get(`/simulations/${id}/export`, { responseType: "blob" }),
};

export const applicationsApi = {
  list: () => api.get("/applications"),
  get: (id: number) => api.get(`/applications/${id}`),
  create: (data: object) => api.post("/applications", data),
  updateStatus: (id: number, data: object) => api.put(`/applications/${id}/status`, data),
  activity: () => api.get("/applications/activity"),
  logView: (id: number) => api.post(`/applications/${id}/view`),
};

export const settingsApi = {
  getFinancial: () => api.get("/settings/financial"),
  updateFinancial: (data: object) => api.put("/settings/financial", data),
  listFinancieras: () => api.get("/settings/financieras"),
};

export const dashboardApi = {
  summary: () => api.get("/dashboard/summary"),
};
