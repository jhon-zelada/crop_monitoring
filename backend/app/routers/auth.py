# app/routers/auth.py
from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime, timezone
from jose import JWTError
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.config import settings
from app.core import security
from app.db.session import get_db
from app.db import models  # your models module

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginIn(BaseModel):
    username: str  # email or username
    password: str

@router.post("/login")
async def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    # Find user by email (case-insensitive)
    user = db.query(models.User).filter(
        or_(func.lower(models.User.email) == payload.username.lower(), 
            func.lower(models.User.name) == payload.username.lower())).one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # verify hashed password
    if not security.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # check status
    if getattr(user, "status", "activo") != "activo":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    # update last_login
    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    db.commit()

    # create tokens
    user_sub = str(user.id)
    access_token = security.create_access_token(user_sub)
    refresh_jti = await security.create_refresh_token(user_sub)

    # set refresh cookie (httpOnly)
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    response.set_cookie(
        key="refresh_token",
        value=refresh_jti,
        httponly=True,
        max_age=max_age,
        expires=max_age,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=settings.COOKIE_PATH
    )

    # Return minimal user info (avoid returning password_hash)
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role}}
