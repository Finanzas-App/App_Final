from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Customer, User
from app.schemas import CustomerCreate, CustomerResponse, CustomerUpdate
from app.services.audit import log_audit

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Customer).filter(Customer.is_active == True).order_by(Customer.id.desc()).all()


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: CustomerCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(Customer).filter(Customer.dni == data.dni).first():
        raise HTTPException(status_code=400, detail="DNI ya registrado")
    customer = Customer(**data.model_dump(), created_by=current_user.id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    log_audit(db, current_user.id, "CREATE", "customer", customer.id, None, data.model_dump(), request)
    return customer


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_active == True).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_active == True).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    prev = {k: getattr(customer, k) for k in data.model_dump().keys()}
    for k, v in data.model_dump().items():
        setattr(customer, k, v)
    db.commit()
    db.refresh(customer)
    log_audit(db, current_user.id, "UPDATE", "customer", customer.id, prev, data.model_dump(), request)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_active == True).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    customer.is_active = False
    db.commit()
    log_audit(db, current_user.id, "DELETE", "customer", customer.id, None, None, request)
