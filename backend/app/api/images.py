from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.utils.s3 import generate_presigned_put, get_s3_client
from app.core.config import settings
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.db import models
from datetime import datetime
import uuid

router = APIRouter()

class StartSessionIn(BaseModel):
    device_id: str
    operator_id: str | None = None
    field_id: str | None = None
    timestamp: datetime | None = None

class ImageCompleteIn(BaseModel):
    session_id: str
    frame_index: int
    timestamp: datetime
    s3_key: str
    width: int | None = None
    height: int | None = None

@router.post('/api/v1/camera/sessions/start')
def start_session(payload: StartSessionIn, db: Session = Depends(get_db)):
    session = models.CameraSession(
        device_id=payload.device_id,
        operator_id=payload.operator_id,
        field_id=payload.field_id,
        started_at=payload.timestamp or datetime.utcnow(),
        frames_count=0,
        meta={}
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {'session_id': str(session.id)}

@router.post('/api/v1/images/request-upload')
def request_upload(device_id: str, frame_index: int):
    # create key
    key = f"camera/{device_id}/{uuid.uuid4()}.jpg"
    url = generate_presigned_put(key)
    return {'upload_url': url, 's3_key': key}

@router.post('/api/v1/images/complete')
def image_complete(payload: ImageCompleteIn, db: Session = Depends(get_db)):
    # create image row and enqueue processing
    img = models.Image(
        session_id=payload.session_id,
        device_id=None, # can be filled if needed
        capture_time=payload.timestamp,
        s3_key=payload.s3_key,
        width=payload.width,
        height=payload.height,
        status='pending'
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    # enqueue Celery task
    from app.workers.tasks import process_image
    process_image.delay(str(img.id), payload.s3_key)
    return {'image_id': str(img.id)}