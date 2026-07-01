from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User, Vehicle
from app.schemas import VehicleCreate, VehicleResponse, VehicleUpdate
from app.services.audit import log_audit

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("", response_model=list[VehicleResponse])
def list_vehicles(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Vehicle).filter(Vehicle.is_active == True).order_by(Vehicle.id.desc()).all()


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    data: VehicleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = Vehicle(**data.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    log_audit(db, current_user.id, "CREATE", "vehicle", vehicle.id, None, data.model_dump(), request)
    return vehicle


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.is_active == True).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return vehicle


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.is_active == True).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    prev = {k: getattr(vehicle, k) for k in data.model_dump().keys()}
    for k, v in data.model_dump().items():
        setattr(vehicle, k, v)
    db.commit()
    db.refresh(vehicle)
    log_audit(db, current_user.id, "UPDATE", "vehicle", vehicle.id, prev, data.model_dump(), request)
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.is_active == True).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    vehicle.is_active = False
    db.commit()
    log_audit(db, current_user.id, "DELETE", "vehicle", vehicle.id, None, None, request)
