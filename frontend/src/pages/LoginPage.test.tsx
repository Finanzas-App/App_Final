import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";

const mockLogin = vi.fn();
const mockVerify2FA = vi.fn();

vi.mock("../features/auth/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    verify2FA: mockVerify2FA,
    user: null,
    loading: false,
  }),
}));

vi.mock("../lib/api", () => ({
  authApi: {
    login: vi.fn(),
    verify2FA: vi.fn(),
    resend2FA: vi.fn(),
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sign in form", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /iniciar sesión|sign in/i })).toBeInTheDocument();
  });

  it("shows validation error for empty submit", async () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText(/tu@empresa|you@company/i);
    const passwordInput = screen.getByDisplayValue("vend123");
    fireEvent.change(emailInput, { target: { value: "" } });
    fireEvent.change(passwordInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión|sign in/i }));
    expect(await screen.findByText(/complete los campos|complete the required/i)).toBeInTheDocument();
  });

  it("renders demo access buttons for each role", () => {
    renderLogin();
    expect(screen.getByText(/administrador|administrator/i)).toBeInTheDocument();
    expect(screen.getByText(/vendedor|sales representative/i)).toBeInTheDocument();
    expect(screen.getByText(/soporte|support/i)).toBeInTheDocument();
  });
});
