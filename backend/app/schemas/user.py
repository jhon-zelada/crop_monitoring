# app/schemas/user.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    department: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None

class UserOut(UserBase):
    id: UUID
    status: str
    created_at: datetime | None
    last_login: datetime | None

    class Config:
        orm_mode = True
