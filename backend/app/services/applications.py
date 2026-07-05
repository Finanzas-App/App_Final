from fastapi import Request
from sqlalchemy.orm import Session

from app.models import Application, Simulation
from app.services.audit import log_audit


def create_application_for_simulation(
    db: Session,
    simulation_id: int,
    user_id: int | None,
    request: Request | None = None,
) -> Application | None:
    """Crea solicitud Pending si la simulación aún no tiene una."""
    existing = db.query(Application).filter(Application.simulation_id == simulation_id).first()
    if existing:
        return existing

    sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    if not sim:
        return None

    app = Application(simulation_id=simulation_id, status="Pending")
    db.add(app)
    db.flush()
    log_audit(db, user_id, "CREATE", "application", app.id, None, {"simulation_id": simulation_id}, request)
    return app


def sync_missing_applications(db: Session, user_id: int | None = None, request: Request | None = None) -> int:
    """Crea solicitudes pendientes para simulaciones que no tienen ninguna."""
    linked_ids = {row[0] for row in db.query(Application.simulation_id).all()}
    missing = db.query(Simulation.id).filter(~Simulation.id.in_(linked_ids)).all() if linked_ids else db.query(Simulation.id).all()
    created = 0
    for (sim_id,) in missing:
        create_application_for_simulation(db, sim_id, user_id, request)
        created += 1
    if created:
        db.commit()
    return created
