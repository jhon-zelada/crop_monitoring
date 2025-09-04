# app/routers/auth.py
from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import timedelta
from jose import JWTError

from app.core.config import settings
from app.core import security

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginIn(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(payload: LoginIn, response: Response):
    # Demo only - replace with DB checks + hashed password verification
    if not (payload.username == "admin" and payload.password == "secret"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user_sub = payload.username  # usually user id or username
    access_token = security.create_access_token(user_sub)
    refresh_jti = await security.create_refresh_token(user_sub)

    # Set httpOnly cookie for refresh token. Frontend should send credentials (fetch credentials:'include') on refresh calls.
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

    return {"access_token": access_token, "token_type": "bearer", "user": {"name": payload.username}}

@router.post("/refresh")
async def refresh(request: Request, response: Response):
    """
    Use the refresh cookie (httpOnly). If valid, rotate token and return new access_token and new refresh cookie.
    """
    jti = request.cookies.get("refresh_token")
    if not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    subject = await security.get_subject_from_refresh_jti(jti)
    if not subject:
        # token absent or expired
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # rotate: delete old and create new
    new_jti = await security.rotate_refresh_token(jti, subject)

    access_token = security.create_access_token(subject)

    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    response.set_cookie(
        key="refresh_token",
        value=new_jti,
        httponly=True,
        max_age=max_age,
        expires=max_age,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=settings.COOKIE_PATH
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout(request: Request, response: Response):
    jti = request.cookies.get("refresh_token")
    if jti:
        await security.revoke_refresh_token(jti)

    # clear cookie
    response.delete_cookie("refresh_token", path=settings.COOKIE_PATH)
    return {"status": "ok"}

