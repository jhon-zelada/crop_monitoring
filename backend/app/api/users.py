# app/api/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.schemas.user import UserOut, UserCreate, UserUpdate
from app.crud import users as crud_users
from app.deps.auth import get_current_user  # returns user model or schema
from app.models import User as UserModel
from app.core.security import hash_password

router = APIRouter()

# Counts
@router.get("/api/v1/users/counts")
def get_counts(db: Session = Depends(get_db), current=Depends(get_current_user)):
    # Optionally restrict to admin only:
    if current.role != "Administrador":
        raise HTTPException(status_code=403, detail="Requires admin")
    return crud_users.counts(db)

# List with pagination & filters
@router.get("/api/v1/users")
def list_users(query: Optional[str] = None, role: Optional[str] = None, status: Optional[str] = None, page: int = 1, per_page: int = 25, db: Session = Depends(get_db), current=Depends(get_current_user)):
    if current.role != "Administrador":
        # you could allow operators to list only their team etc.
        raise HTTPException(status_code=403, detail="Requires admin")

    offset = (page - 1) * per_page
    rows, total = crud_users.list_users(db, query=query, role=role, status=status, offset=offset, limit=per_page)
    return {"users": rows, "total": total}

# Create user (admin)
@router.post("/api/v1/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    if current.role != "Administrador":
        raise HTTPException(status_code=403, detail="Requires admin")

    if crud_users.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already in use")
    hashed = hash_password(payload.password)
    user = crud_users.create_user(db, payload.name, payload.email, payload.role, payload.department, hashed)
    return user

# Get single user
@router.get("/api/v1/users/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db), current=Depends(get_current_user)):
    user = crud_users.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404)
    # allow admin or self
    if current.role != "Administrador" and current.id != user.id:
        raise HTTPException(status_code=403)
    return user

# Patch/update user
@router.patch("/api/v1/users/{user_id}", response_model=UserOut)
def patch_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    user = crud_users.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404)
    # only admin or self (but restrict changing role/status to admins)
    if current.role != "Administrador" and current.id != user.id:
        raise HTTPException(status_code=403)
    # prevent non-admin from changing role/status
    update_fields = payload.dict(exclude_unset=True)
    if ("role" in update_fields or "status" in update_fields) and current.role != "Administrador":
        raise HTTPException(status_code=403, detail="Only admin can change role/status")
    updated = crud_users.update_user(db, user, **update_fields)
    return updated
