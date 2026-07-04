import json
from typing import Any, Literal

from app.models import AuditLog

ActivityType = Literal["info", "success", "warning", "error"]

STATUS_LABELS: dict[str, str] = {
    "Pending": "Pendiente",
    "Approved": "Aprobada",
    "Observed": "Observada",
    "Rejected": "Rechazada",
}

ACTION_TYPE: dict[str, ActivityType] = {
    "CREATE": "info",
    "OPEN_EVALUATION": "info",
    "STATUS_CHANGE": "success",
}


def _parse_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _format_amount(amount: float | None) -> str:
    if amount is None or amount <= 0:
        return "sin monto"
    return f"S/ {amount:,.2f}"


def _status_changes(prev: dict[str, Any], new: dict[str, Any]) -> list[str]:
    changes: list[str] = []
    prev_status = prev.get("status")
    new_status = new.get("status")
    if prev_status != new_status:
        changes.append(
            f"Estado: {STATUS_LABELS.get(str(prev_status), prev_status)} → "
            f"{STATUS_LABELS.get(str(new_status), new_status)}"
        )

    prev_amount = prev.get("approved_amount")
    new_amount = new.get("approved_amount")
    if prev_amount != new_amount:
        changes.append(f"Monto: {_format_amount(float(new_amount) if new_amount is not None else None)}")

    prev_reason = (prev.get("decision_reason") or "").strip()
    new_reason = (new.get("decision_reason") or "").strip()
    if prev_reason != new_reason:
        if new_reason:
            changes.append(f'Motivo: "{new_reason}"')
        else:
            changes.append("Motivo eliminado")

    return changes


def format_application_activity(log: AuditLog) -> tuple[str, ActivityType]:
    action = log.action
    activity_type = ACTION_TYPE.get(action, "info")
    entity_id = log.entity_id
    prev = _parse_json(log.previous_value)
    new = _parse_json(log.new_value)

    if action == "CREATE":
        sim_id = new.get("simulation_id", "?")
        return f"Solicitud #{entity_id} creada (SIM-{sim_id})", activity_type

    if action == "OPEN_EVALUATION":
        sim_id = new.get("simulation_id", "?")
        return f"Abrió evaluación de solicitud #{entity_id} (SIM-{sim_id})", activity_type

    if action == "STATUS_CHANGE":
        changes = _status_changes(prev, new)
        summary = " · ".join(changes) if changes else "Evaluación guardada correctamente"
        return f"Solicitud #{entity_id} guardada: {summary}", activity_type

    return f"Acción {action} en solicitud #{entity_id}", activity_type
