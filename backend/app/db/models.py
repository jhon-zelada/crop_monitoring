from sqlalchemy import Column, String, Integer, DateTime, Float, JSON, ForeignKey, Boolean, Index, BigInteger, Identity, TIMESTAMP, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.sql import func
from .session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)
    department = Column(String, nullable=True)
    status = Column(String, default="activo")
    password_hash = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    last_login = Column(TIMESTAMP(timezone=True), nullable=True)

class Device(Base):
    __tablename__ = "devices"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    device_type = Column(String)
    token = Column(String, nullable=False)
    meta = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Measurement(Base):
    __tablename__ = "measurements"
    # new integer primary key (easier for migrations / ORM)
    id = Column(BigInteger, primary_key=True, server_default=Identity(start=1))
    time = Column(DateTime(timezone=True), nullable=False, index=True)
    device_id = Column(UUID(as_uuid=True), ForeignKey('devices.id'), nullable=False, index=True)
    message_id = Column(String, unique=True, index=True, nullable=True)  # dedupe token
    temperature_c = Column(Float)
    relative_humidity_pct = Column(Float)
    solar_radiance_w_m2 = Column(Float)
    wind_speed_m_s = Column(Float)
    wind_direction_deg = Column(Float)
    battery_v = Column(Float)
    meta = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CameraSession(Base):
    __tablename__ = 'camera_sessions'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True), ForeignKey('devices.id'))
    operator_id = Column(String)
    field_id = Column(String)
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    frames_count = Column(Integer, default=0)
    meta = Column(JSON)

class Image(Base):
    __tablename__ = 'images'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('camera_sessions.id'))
    device_id = Column(UUID(as_uuid=True), ForeignKey('devices.id'))
    capture_time = Column(DateTime(timezone=True))
    s3_key = Column(String)
    width = Column(Integer)
    height = Column(Integer)
    thumbnail_key = Column(String)
    analysis = Column(JSON)
    status = Column(String, default='pending')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Alert(Base):
    __tablename__ = 'alerts'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    device_id = Column(UUID(as_uuid=True), ForeignKey('devices.id'))
    alert_type = Column(String)
    severity = Column(String)
    message = Column(String)
    payload = Column(JSON)
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String)

Index("ix_measurements_device_time", Measurement.device_id, Measurement.time.desc())