from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.db import models
from uuid import UUID
import uuid

router = APIRouter()

# ----- Schemas -----
class Measurements(BaseModel):
    temperature_c: float
    relative_humidity_pct: float
    solar_radiance_w_m2: float
    wind_speed_m_s: float
    wind_direction_deg: float
    battery_v: float | None = None

class TelemetryIn(BaseModel):
    device_id: str
    message_id: str
    timestamp: datetime
    measurements: Measurements
    meta: dict | None = None

def verify_device_token(token: str):
    if token != settings.DEVICE_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid device token')

# ----- WebSocket connection manager (by device_id) -----
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, device_id: Optional[str]):
        await websocket.accept()
        key = device_id or "*"    # clients without device_id receive all broadcasts
        self.active[key].add(websocket)

    def disconnect(self, websocket: WebSocket, device_id: Optional[str]):
        key = device_id or "*"
        if websocket in self.active.get(key, set()):
            self.active[key].remove(websocket)

    async def broadcast(self, device_id: str, payload: dict):
        # send to subscribers of this device AND to wildcard '*'
        targets = set(self.active.get(device_id, set())) | set(self.active.get("*", set()))
        for ws in list(targets):
            try:
                await ws.send_json(payload)
            except Exception:
                # cleanup broken sockets
                for key, group in list(self.active.items()):
                    if ws in group:
                        group.remove(ws)

manager = ConnectionManager()

# ----- WebSocket: /ws/live?device_id=abc -----
@router.websocket("/ws/live")
async def ws_live(websocket: WebSocket, device_id: Optional[str] = Query(default=None)):
    await manager.connect(websocket, device_id)
    try:
        while True:
            # optional: receive pings/commands (we ignore for now)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, device_id)

def is_valid_uuid(value: str) -> bool:
    try:
        UUID(str(value))
        return True
    except ValueError:
        return False
    
# ----- Ingest telemetry (POSTed by your devices) -----
@router.post('/api/v1/telemetry')
async def ingest_telemetry(
    payload: TelemetryIn,
    token: str | None = None,
    db: Session = Depends(get_db)
):
    print(">>> Expected token:", settings.DEVICE_TOKEN)
    print(">>> Received token:", token)
    verify_device_token(token or '')

    m = models.Measurement(
        time=payload.timestamp,
        device_id = UUID(payload.device_id) if is_valid_uuid(payload.device_id) else uuid.uuid4(),
        temperature_c=payload.measurements.temperature_c,
        relative_humidity_pct=payload.measurements.relative_humidity_pct,
        solar_radiance_w_m2=payload.measurements.solar_radiance_w_m2,
        wind_speed_m_s=payload.measurements.wind_speed_m_s,
        wind_direction_deg=payload.measurements.wind_direction_deg,
        battery_v=payload.measurements.battery_v,
        meta=payload.meta
    )
    db.add(m)
    db.commit()

    # broadcast to dashboards
    await manager.broadcast(
        device_id=payload.device_id,
        payload={
            "type": "measurement",
            "device_id": payload.device_id,
            "at": payload.timestamp.isoformat(),
            "data": payload.measurements.model_dump(),
        }
    )
    return {'status': 'ok'}

# ----- Read models → JSON helper -----
def serialize_measurement(row: models.Measurement) -> dict:
    return {
        "id": row.id,
        "time": row.time.isoformat(),
        "device_id": row.device_id,
        "temperature_c": row.temperature_c,
        "relative_humidity_pct": row.relative_humidity_pct,
        "solar_radiance_w_m2": row.solar_radiance_w_m2,
        "wind_speed_m_s": row.wind_speed_m_s,
        "wind_direction_deg": row.wind_direction_deg,
        "battery_v": row.battery_v,
        "meta": row.meta,
    }

# ----- Latest measurement for a device -----
@router.get("/api/v1/devices/{device_id}/latest")
def get_latest(device_id: UUID, db: Session = Depends(get_db)):
    row = (
        db.query(models.Measurement)
        .filter(models.Measurement.device_id == device_id)
        .order_by(models.Measurement.time.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No data for device")
    return serialize_measurement(row)

# ----- Summary (min/max/avg over last N hours; default 24h) -----
@router.get("/api/v1/devices/{device_id}/summary")
def get_summary(device_id: UUID, hours: int = 24, db: Session = Depends(get_db)):
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
        "device_id": device_id,
        "window_hours": hours,
        "temperature_c": pack(q[0], q[1], q[2]),
        "relative_humidity_pct": pack(q[3], q[4], q[5]),
        "solar_radiance_w_m2": pack(q[6], q[7], q[8]),
        "wind_speed_m_s": pack(q[9], q[10], q[11]),
        "wind_direction_deg": pack(q[12], q[13], q[14]),
    }
