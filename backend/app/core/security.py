# app/core/security.py
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from jose import jwt, JWTError
import redis.asyncio as aioredis

from app.core.config import settings

# reuse a single async redis client
_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    now = datetime.now(timezone.utc)
    if expires_minutes is None:
        expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    exp = now + timedelta(minutes=expires_minutes)
    to_encode = {
        "sub": str(subject),
        "iat": int(now.timestamp()), 
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def create_refresh_token(subject: str) -> str:
    """
    Returns a random refresh token jti and stores it in Redis with TTL.
    """
    jti = str(uuid.uuid4())
    key = f"refresh:{jti}"
    # Store subject -> value (could be user id). Use EX to set TTL in seconds.
    await _redis.set(key, subject, ex=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600)
    return jti

async def rotate_refresh_token(old_jti: Optional[str], subject: str) -> str:
    """
    Delete old_jti if present, create and return new jti (atomic-ish).
    """
    if old_jti:
        try:
            await _redis.delete(f"refresh:{old_jti}")
        except Exception:
            pass
    return await create_refresh_token(subject)

async def revoke_refresh_token(jti: str):
    await _redis.delete(f"refresh:{jti}")

async def get_subject_from_refresh_jti(jti: str) -> Optional[str]:
    if jti is None:
        return None
    key = f"refresh:{jti}"
    return await _redis.get(key)

def verify_access_token(token: str) -> str:
    """
    Returns the subject (user id/username) if token valid, else raises JWTError.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise JWTError("missing sub")
        return sub
    except JWTError:
        raise

def verify_ws_token(token: str) -> str | None:
    """
    Validate an access token used for WebSocket query param.
    Returns the subject string on success, or None on failure.
    """
    try:
        return verify_access_token(token)
    except JWTError:
        return None