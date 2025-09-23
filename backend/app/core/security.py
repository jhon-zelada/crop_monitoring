# app/core/security.py
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from jose import jwt, JWTError
import redis.asyncio as aioredis
from passlib.context import CryptContext

from app.core.config import settings

# Async Redis client (single instance)
_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

# Password hashing context (bcrypt)
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    """Hash a plain password (use on user creation / password reset)."""
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return pwd_ctx.verify(plain, hashed)

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
    Create a refresh token id (jti) and persist mapping jti -> subject in Redis with TTL.
    The value stored is the subject (e.g. user id string).
    """
    jti = str(uuid.uuid4())
    key = f"refresh:{jti}"
    await _redis.set(key, subject, ex=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600)
    return jti

async def rotate_refresh_token(old_jti: Optional[str], subject: str) -> str:
    """
    Remove old_jti (if present) and create a new jti.
    Note: for stricter reuse detection you can implement token families / use WATCH or Lua to make rotation atomic.
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
    Returns subject (user id) if token is valid, otherwise raises JWTError (including expired).
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise JWTError("missing sub claim")
        return sub
    except JWTError:
        # propagate to caller; caller will convert to HTTPException
        raise

def verify_ws_token(token: str) -> str | None:
    """
    Validate JWT used in websocket query param. Return subject or None (no exceptions).
    """
    try:
        return verify_access_token(token)
    except JWTError:
        return None

# Helper to close redis on app shutdown
async def close_redis():
    try:
        await _redis.close()
        await _redis.wait_closed()
    except Exception:
        pass
