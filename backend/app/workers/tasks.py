# app/workers/tasks.py
import json
from uuid import UUID
from datetime import datetime
import redis
from sqlalchemy.exc import IntegrityError

from app.workers.celery_app import celery
from app.db.session import SessionLocal
from app.db import models
from app.core.config import settings

# blocking redis client for celery worker
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

@celery.task(bind=True, max_retries=3, acks_late=True)
def process_measurement(self, payload: dict):
    """
    Process a single telemetry measurement:
      - validate/dedupe
      - insert into DB
      - publish to Redis pubsub for realtime WS consumers
    """
    db = SessionLocal()
    try:
        device_id = payload.get("device_id")
        message_id = payload.get("message_id")

        # Validate device_id
        try:
            device_uuid = UUID(device_id)
        except Exception:
            return {"error": "invalid device_id"}

        # Build row
        m = models.Measurement(
            time=datetime.fromisoformat(payload["timestamp"]) if isinstance(payload["timestamp"], str) else payload["timestamp"],
            device_id=device_uuid,
            message_id=message_id,
            temperature_c=payload["measurements"].get("temperature_c"),
            relative_humidity_pct=payload["measurements"].get("relative_humidity_pct"),
            solar_radiance_w_m2=payload["measurements"].get("solar_radiance_w_m2"),
            wind_speed_m_s=payload["measurements"].get("wind_speed_m_s"),
            wind_direction_deg=payload["measurements"].get("wind_direction_deg"),
            battery_v=payload["measurements"].get("battery_v"),
            meta=payload.get("meta"),
        )

        db.add(m)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            # likely duplicate message_id
            return {"status": "duplicate", "message_id": message_id}

        # Prepare stable pubsub JSON
        pub = {
            "type": "measurement",
            "device_id": str(device_uuid),
            "time": m.time.isoformat(),
            "data": {
                "temperature_c": m.temperature_c,
                "relative_humidity_pct": m.relative_humidity_pct,
                "solar_radiance_w_m2": m.solar_radiance_w_m2,
                "wind_speed_m_s": m.wind_speed_m_s,
                "wind_direction_deg": m.wind_direction_deg,
                "battery_v": m.battery_v,
            },
            "meta": m.meta,
            "message_id": message_id,
        }

        # publish per-device channel and global channel
        redis_client.publish(f"telemetry:{device_uuid}", json.dumps(pub))
        redis_client.publish("telemetry:all", json.dumps(pub))

        return {"status": "ok", "id": m.id}

    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc, countdown=5)
    finally:
        db.close()
