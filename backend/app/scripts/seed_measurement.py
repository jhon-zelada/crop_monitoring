# backend/app/scripts/seed_measurement.py
from app.db.session import SessionLocal
from app.db import models
import uuid
from datetime import datetime, timezone
db = SessionLocal()

measurement = models.Measurement(
    device_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
    time=datetime.now(timezone.utc),
    temperature_c=22.5,
    relative_humidity_pct=60.0,
    solar_radiance_w_m2=800.0,
    wind_speed_m_s=2.3,
    wind_direction_deg=180.0,
    battery_v=3.7,
    meta={"note": "seeded measurement"},
)

db.add(measurement)
db.commit()
print("✅ Measurement inserted for device 11111111-1111-1111-1111-111111111111")
