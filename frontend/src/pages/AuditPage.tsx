import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppLayout } from "../layout/AppLayout";
import { PageLoader } from "../components/ui/PageLoader";
import { auditApi } from "../lib/api";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Creación",
  UPDATE: "Actualización",
  DELETE: "Eliminación",
  LOGIN: "Inicio de sesión",
  LOGIN_FAILED: "Login fallido",
  CLONE: "Clonación",
  STATUS_CHANGE: "Cambio de estado",
};

export default function AuditPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith("en") ? "en-US" : "es-PE";
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", entityFilter, actionFilter],
    queryFn: () =>
      auditApi
        .list({
          entity_type: entityFilter || undefined,
          action: actionFilter || undefined,
          limit: 200,
        })
        .then((r) => r.data),
  });

  return (
    <AppLayout title={t("audit.title")} subtitle={t("audit.subtitle")}>
      <div className="card p-4 sm:p-6 mb-6">
        <div className="form-grid max-w-2xl">
          <div>
            <label className="label-field">{t("audit.filterEntity")}</label>
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="input-field">
              <option value="">{t("audit.allEntities")}</option>
              {["user", "customer", "vehicle", "simulation", "application", "financial_settings"].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">{t("audit.filterAction")}</label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input-field">
              <option value="">{t("audit.allActions")}</option>
              {Object.entries(ACTION_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[t("audit.cols.date"), t("audit.cols.user"), t("audit.cols.action"), t("audit.cols.entity"), t("audit.cols.ip")].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">{t("common.noData")}</td>
                  </tr>
                ) : (
                  logs.map((log: {
                    id: number;
                    created_at: string;
                    user_name: string | null;
                    user_role: string | null;
                    action: string;
                    entity_type: string;
                    entity_id: number | null;
                    ip_address: string | null;
                  }) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString(dateLocale)}
                      </td>
                      <td>
                        <p className="font-medium">{log.user_name || "—"}</p>
                        {log.user_role && <p className="text-xs text-slate-500">{log.user_role}</p>}
                      </td>
                      <td>
                        <span className="badge-gray">{ACTION_LABELS[log.action] || log.action}</span>
                      </td>
                      <td>
                        <span className="font-mono text-xs">{log.entity_type}</span>
                        {log.entity_id != null && <span className="text-slate-500"> #{log.entity_id}</span>}
                      </td>
                      <td className="text-slate-500">{log.ip_address || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
