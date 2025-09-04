# app/api/telemetry.py
from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect,
    Header, status
)
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.db import models

# Auth deps / WS token verify
from app.deps.auth import get_current_user
from app.core.security import verify_ws_token

# celery task
from app.workers.tasks import process_measurement

router = APIRouter()

# ---------- Config helpers ----------
ALLOW_GLOBAL_DEVICE_TOKEN = getattr(settings, "ALLOW_GLOBAL_DEVICE_TOKEN", True)

# ---------- Schemas ----------
class Measurements(BaseModel):
    temperature_c: float
    relative_humidity_pct: float
    solar_radiance_w_m2: float
    wind_speed_m_s: float
    wind_direction_deg: float
    battery_v: float | None = None

class TelemetryIn(BaseModel):
    device_id: str
    message_id: str | None
    timestamp: datetime
    measurements: Measurements
    meta: dict | None = None

    @field_validator("device_id")
    @classmethod
    def must_be_uuid(cls, v: str) -> str:
        try:
            UUID(str(v))
            return v
        except Exception:
            raise ValueError("device_id must be a valid UUID string")

def _verify_device_token_for_device(token: str | None, device: models.Device):
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing device token")

    if token == getattr(settings, "DEVICE_TOKEN", None) and ALLOW_GLOBAL_DEVICE_TOKEN:
        return

    if device and token == device.token:
        return

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device token")

def _extract_user_access_token(query_params) -> Optional[str]:
    # keep helper for compatibility (reads ?access_token=...)
    return query_params.get("access_token")


# ---------- Connection manager (exportado como `manager`) ----------
class ConnectionManager:
    def __init__(self):
        self._device_subs: dict[str, set[WebSocket]] = defaultdict(set)
        self._all_subs: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, device_id: Optional[str]):
        await websocket.accept()
        async with self._lock:
            if device_id:
                self._device_subs[str(device_id)].add(websocket)
            else:
                self._all_subs.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self._all_subs.discard(websocket)
            for did, s in list(self._device_subs.items()):
                if websocket in s:
                    s.discard(websocket)
                    if not s:
                        del self._device_subs[did]

    async def broadcast(self, device_id: Optional[str], payload: dict):
        msg = json.dumps(payload, default=str)
        async with self._lock:
            recipients = []
            if device_id:
                recipients.extend(list(self._device_subs.get(str(device_id), [])))
            recipients.extend(list(self._all_subs))
        if not recipients:
            return

        async def _safe_send(ws: WebSocket):
            try:
                await ws.send_text(msg)
            except Exception:
                try:
                    await ws.close()
                except Exception:
                    pass
                await self._remove_ws(ws)

        await asyncio.gather(*[_safe_send(ws) for ws in recipients], return_exceptions=True)

    async def _remove_ws(self, ws: WebSocket):
        async with self._lock:
            self._all_subs.discard(ws)
            for did, s in list(self._device_subs.items()):
                if ws in s:
                    s.discard(ws)
                    if not s:
                        del self._device_subs[did]


# instancia exportada
manager = ConnectionManager()


# ---------- WebSocket: realtime viewer ----------
@router.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    """
    Viewer-only WebSocket (humans). Auth via access_token query param (JWT).
    Subscribes this connection to the ConnectionManager (specific device or all).
    """
    q = websocket.query_params
    device_id = q.get("device_id")  # optional: if omitted, subscribe to all

    # Validate access token passed as ?access_token=...
    token = _extract_user_access_token(q)
    subject = verify_ws_token(token)
    if subject is None:
        # no leak over handshake
        await websocket.close(code=1008)
        return

    # OPTIONAL: permission check
    # If you want to enforce that only certain users can subscribe to a given device,
    # you should check ownership or membership here (query DB).
    # Note: websockets cannot use FastAPI Depends easily, so open a DB session manually if needed.
    # Example (pseudo):
    #   async with some_session() as db: check device.owner==subject -> if not, close
    # For now we accept authenticated users; add checks if required.

    # validate device_id format
    if device_id:
        try:
            UUID(device_id)
        except Exception:
            await websocket.close(code=1008)
            return

    # register in manager (manager.connect accepts and registers)
    await manager.connect(websocket, device_id)

    try:
        while True:
            # wait for client pings or control messages (we ignore content)
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await manager.disconnect(websocket)


# ---------- Ingest telemetry (devices) ----------
@router.post("/api/v1/telemetry", status_code=202)
async def ingest_telemetry(
    payload: TelemetryIn,
    token: str | None = Header(default=None, alias="X-Device-Token"),
    db: Session = Depends(get_db)
):
    """
    Device ingestion endpoint:
      - validates device exists
      - validates device's token (per-device or global in dev)
      - pushes a Celery job for processing (DB insert + Redis pub)
    """
    device_uuid = UUID(payload.device_id)
    device = db.query(models.Device).filter(models.Device.id == device_uuid).one_or_none()
    if device is None:
        raise HTTPException(status_code=404, detail="device not found")

    _verify_device_token_for_device(token, device)

    job_payload = {
        "device_id": str(device_uuid),
        "message_id": payload.message_id,
        "timestamp": payload.timestamp.isoformat(),
        "measurements": payload.measurements.model_dump(),
        "meta": payload.meta,
    }
    process_measurement.delay(job_payload)
    return {"status": "accepted"}


# ---------- Helpers to serialize DB rows ----------
def serialize_measurement(row: models.Measurement) -> dict:
    return {
        "id": row.id,
        "time": row.time.isoformat() if row.time else None,
        "device_id": str(row.device_id),
        "temperature_c": row.temperature_c,
        "relative_humidity_pct": row.relative_humidity_pct,
        "solar_radiance_w_m2": row.solar_radiance_w_m2,
        "wind_speed_m_s": row.wind_speed_m_s,
        "wind_direction_deg": row.wind_direction_deg,
        "battery_v": row.battery_v,
        "meta": row.meta,
        "message_id": row.message_id,
    }


# ---------- Historical APIs for the frontend (protected) ----------
@router.get("/api/v1/devices/{device_id}/latest")
def get_latest(device_id: UUID, db: Session = Depends(get_db), user = Depends(get_current_user)):
    """
    Protected: only authenticated users (use `user` to enforce more fine-grained permissions).
    """
    # TODO: enforce user->device access here if you have device ownership
    row = (
        db.query(models.Measurement)
        .filter(models.Measurement.device_id == device_id)
        .order_by(models.Measurement.time.desc(), models.Measurement.id.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No data for device")
    return serialize_measurement(row)


@router.get("/api/v1/devices/{device_id}/summary")
def get_summary(device_id: UUID, hours: int = 24, db: Session = Depends(get_db), user = Depends(get_current_user)):
    """
    Protected endpoint: returns min/max/avg over a sliding window.
    """
    # TODO: enforce user->device access here if you have device ownership
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    q = (
        db.query(
            func.min(models.Measurement.temperature_c),
            func.max(models.Measurement.temperature_c),
            func.avg(models.Measurement.temperature_c),
            func.min(models.Measurement.relative_humidity_pct),
            func.max(models.Measurement.relative_humidity_pct),
            func.avg(models.Measurement.relative_humidity_pct),
            func.min(models.Measurement.solar_radiance_w_m2),
            func.max(models.Measurement.solar_radiance_w_m2),
            func.avg(models.Measurement.solar_radiance_w_m2),
            func.min(models.Measurement.wind_speed_m_s),
            func.max(models.Measurement.wind_speed_m_s),
            func.avg(models.Measurement.wind_speed_m_s),
            func.min(models.Measurement.wind_direction_deg),
            func.max(models.Measurement.wind_direction_deg),
            func.avg(models.Measurement.wind_direction_deg),
        )
        .filter(
            models.Measurement.device_id == device_id,
            models.Measurement.time >= since,
        )
        .one()
    )

    def pack(min_v, max_v, avg_v):
        return {"min": min_v, "max": max_v, "avg": avg_v}

    return {
        "device_id": str(device_id),
        "window_hours": hours,
        "temperature_c": pack(q[0], q[1], q[2]),
        "relative_humidity_pct": pack(q[3], q[4], q[5]),
        "solar_radiance_w_m2": pack(q[6], q[7], q[8]),
        "wind_speed_m_s": pack(q[9], q[10], q[11]),
        "wind_direction_deg": pack(q[12], q[13], q[14]),
    }
