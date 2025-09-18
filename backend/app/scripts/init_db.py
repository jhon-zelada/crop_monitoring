from app.db.session import SessionLocal
from app.db import models
import uuid

db = SessionLocal()

device = models.Device(
    id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
    message_id="msg-0001",
    name="Parcela 1 - Quinua",
    device_type="sensor-node",
    token="supersecrettoken123",
    meta={"location": "field A"}
)

db.add(device)
db.commit()

