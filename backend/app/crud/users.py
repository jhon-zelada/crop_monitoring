# app/crud/users.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import User
from uuid import UUID

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(func.lower(User.email) == email.lower()).one_or_none()

def get_user(db: Session, user_id: UUID):
    return db.query(User).filter(User.id == user_id).one_or_none()

def create_user(db: Session, name: str, email: str, role: str, department: str | None, password_hash: str):
    user = User(name=name, email=email, role=role, department=department, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user: User, **fields):
    for k, v in fields.items():
        if v is not None:
            setattr(user, k, v)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def list_users(db: Session, query: str | None = None, role: str | None = None, status: str | None = None, offset: int = 0, limit: int = 25):
    q = db.query(User)
    if query:
        term = f"%{query.lower()}%"
        q = q.filter(func.lower(User.name).like(term) | func.lower(User.email).like(term) | func.lower(User.department).like(term))
    if role:
        q = q.filter(User.role == role)
    if status:
        q = q.filter(User.status == status)
    total = q.count()
    rows = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return rows, total

def counts(db: Session):
    total = db.query(func.count(User.id)).scalar()
    active = db.query(func.count(User.id)).filter(User.status == "activo").scalar()
    admins = db.query(func.count(User.id)).filter(User.role == "Administrador").scalar()
    operators = db.query(func.count(User.id)).filter(User.role == "Operador").scalar()
    viewers = db.query(func.count(User.id)).filter(User.role == "Visualizador").scalar()
    return {"total": total, "active": active, "admins": admins, "operators": operators, "viewers": viewers}
