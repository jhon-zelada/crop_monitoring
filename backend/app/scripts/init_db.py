from db.session import SessionLocal, engine, Base
from db import models

# create tables if they don't exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# create a device
device = models.Device(
    name="Test Weather Station",
    device_type="sensor",
    token="supersecret"   # same token you send in ?token=supersecret
)
db.add(device)
db.commit()
db.refresh(device)

print("Created device with id:", device.id)
