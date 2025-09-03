# backend/app/routers/auth.py
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginIn(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(payload: LoginIn):
    # demo only - replace with real DB + hashed password check
    if payload.username == "admin" and payload.password == "secret":
        return {
            "access_token": "supersecrettoken123",
            "token_type": "bearer",
            "user": {"name": "Admin"}
        }
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
