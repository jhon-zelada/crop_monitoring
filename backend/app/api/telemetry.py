from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
from app.core.config import settings
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.db import models

router = APIRouter()

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
    # simple token check for scaffold; replace with DB lookup in prod
    if token != settings.DEVICE_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid device token')

@router.post('/api/v1/telemetry')
async def ingest_telemetry(payload: TelemetryIn, token: str | None = None, db: Session = Depends(get_db)):
    # token may be provided in header via dependency injection in main -- simplified here
    verify_device_token(token or '')
    # insert into DB (synchronous for scaffold)
    m = models.Measurement(
        time=payload.timestamp,
        device_id=payload.device_id,
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
    # TODO: evaluate alert rules, publish websocket event
    return {'status':'ok'}