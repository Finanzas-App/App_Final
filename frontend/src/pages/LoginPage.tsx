import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TrendingUp, Mail, Lock, Car, Shield, BarChart3, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { authApi } from "../lib/api";
import { getHomeRoute, type Role } from "../lib/permissions";
import { parseApiError } from "../lib/errors";
import { validateLogin, hasErrors } from "../lib/validation";
import type { FieldErrors } from "../lib/errors";
import { FormAlert, FieldError } from "../components/ui/FormFeedback";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

const DEMO_USERS: { role: Role; email: string; password: string }[] = [
  { role: "Administrador", email: "admin@autofinance.pro", password: "admin123" },
  { role: "Soporte", email: "soporte@autofinance.pro", password: "soporte123" },
  { role: "Vendedor", email: "vendedor@autofinance.pro", password: "vend123" },
];

const ROLE_ICONS: Record<Role, typeof Shield> = {
  Administrador: Shield,
  Soporte: BarChart3,
  Vendedor: Car,
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("vendedor@autofinance.pro");
  const [password, setPassword] = useState("vend123");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const { login, verify2FA, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== 2 || !expiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, expiresAt]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  if (!authLoading && user) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setError(t("auth.completeFields"));
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.requires2FA) {
        const me = await authApi.me();
        navigate(getHomeRoute(me.data.role));
        return;
      }
      setChallengeId(result.challenge_id);
      setExpiresAt(Date.now() + result.expires_in * 1000);
      setCountdown(result.expires_in);
      setResendCooldown(60);
      setOtpCode("");
      setStep(2);
    } catch (err) {
      const { message, fieldErrors: apiFields } = parseApiError(err);
      setError(message);
      setFieldErrors(apiFields);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalized = otpCode.trim().toUpperCase();
    if (normalized.length !== 6) {
      setError(t("auth.invalidCode"));
      return;
    }
    setLoading(true);
    try {
      await verify2FA(challengeId, normalized);
      const me = await authApi.me();
      navigate(getHomeRoute(me.data.role));
    } catch (err) {
      const { message } = parseApiError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !challengeId) return;
    setError("");
    setLoading(true);
    try {
      const { data } = await authApi.resend2FA(challengeId);
      setChallengeId(data.challenge_id);
      setExpiresAt(Date.now() + data.expires_in * 1000);
      setCountdown(data.expires_in);
      setResendCooldown(60);
      setOtpCode("");
    } catch (err) {
      const { message } = parseApiError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setStep(1);
    setOtpCode("");
    setChallengeId("");
    setError("");
    setFieldErrors({});
  };

  const fillDemo = (demo: (typeof DEMO_USERS)[0]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setError("");
    setFieldErrors({});
    if (step === 2) backToLogin();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[45%] bg-hero relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 -left-20 w-72 h-72 bg-brand-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-glow">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t("common.appName")}</h1>
              <p className="text-sm text-slate-400">{t("common.tagline")}</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            {t("auth.heroTitle")}<br />
            <span className="text-brand-400">{t("auth.heroHighlight")}</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            {t("auth.heroDescription")}
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            { value: "48+", label: t("auth.statMonths") },
            { value: "TEA/TNA", label: t("auth.statRates") },
            { value: "100%", label: t("auth.statPdf") },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-surface-muted bg-mesh min-h-0">
        <div className="flex justify-end p-4 sm:p-6 lg:p-8 pb-0">
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:px-10 lg:pb-10 min-h-0">
          <div className="w-full max-w-md animate-slide-up">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">{t("common.appName")}</h1>
                <p className="text-xs text-slate-500">{t("common.vehicleFinancing")}</p>
              </div>
            </div>

            <div className="card p-5 sm:p-8">
              {step === 1 ? (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">{t("auth.welcome")}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t("auth.subtitle")}</p>
                  </div>

                  <form onSubmit={handleCredentialsSubmit} className="space-y-5" noValidate>
                    <FormAlert message={error} type="error" />
                    <div>
                      <label className="label-field label-required">{t("auth.email")}</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); setError(""); }}
                          className={`input-with-icon ${fieldErrors.email ? "input-field-error" : ""}`}
                          placeholder={t("auth.emailPlaceholder")}
                          aria-invalid={!!fieldErrors.email}
                        />
                      </div>
                      <FieldError message={fieldErrors.email} />
                    </div>
                    <div>
                      <label className="label-field label-required">{t("auth.password")}</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); setError(""); }}
                          className={`input-with-icon ${fieldErrors.password ? "input-field-error" : ""}`}
                          placeholder="••••••••"
                          aria-invalid={!!fieldErrors.password}
                        />
                      </div>
                      <FieldError message={fieldErrors.password} />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                      {loading ? t("auth.signingIn") : (
                        <>{t("auth.signIn")} <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-8">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                      <Shield className="w-6 h-6 text-brand-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{t("auth.twoFactorTitle")}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t("auth.twoFactorSubtitle")}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {t("auth.codeSentTo")} <span className="font-medium text-slate-600">{email}</span>
                    </p>
                  </div>

                  <form onSubmit={handleOtpSubmit} className="space-y-5" noValidate>
                    <FormAlert message={error} type="error" />
                    <div>
                      <label className="label-field label-required">{t("auth.verificationCode")}</label>
                      <input
                        type="text"
                        inputMode="text"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
                          setError("");
                        }}
                        className="input-field text-center text-2xl font-mono tracking-[0.4em] uppercase"
                        placeholder={t("auth.codePlaceholder")}
                        autoFocus
                      />
                      <p className="text-xs text-slate-400 text-center mt-2">
                        {countdown > 0
                          ? t("auth.expiresIn", { time: formatCountdown(countdown) })
                          : t("auth.invalidCode")}
                      </p>
                    </div>
                    <button type="submit" disabled={loading || countdown === 0} className="btn-primary w-full py-3">
                      {loading ? t("auth.verifying") : t("auth.verify")}
                    </button>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading || resendCooldown > 0}
                        className="btn-secondary w-full py-2.5 text-sm disabled:opacity-50"
                      >
                        {loading ? t("auth.resending") : resendCooldown > 0
                          ? t("auth.resendWait", { seconds: resendCooldown })
                          : t("auth.resendCode")}
                      </button>
                      <button type="button" onClick={backToLogin} className="btn-ghost w-full py-2 text-sm">
                        <ArrowLeft className="w-4 h-4" /> {t("auth.backToLogin")}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {step === 1 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
                    {t("auth.demoAccess")}
                  </p>
                  <div className="space-y-2">
                    {DEMO_USERS.map((demo) => {
                      const Icon = ROLE_ICONS[demo.role];
                      return (
                        <button
                          key={demo.role}
                          type="button"
                          onClick={() => fillDemo(demo)}
                          className="w-full text-left p-3.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/50 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                              <Icon className="w-4 h-4 text-slate-500 group-hover:text-brand-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800">{t(`roles.${demo.role}.label`)}</p>
                              <p className="text-xs text-slate-500 truncate">{t(`roles.${demo.role}.description`)}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
