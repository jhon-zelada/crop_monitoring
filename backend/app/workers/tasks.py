from app.workers.celery_app import celery
from app.utils.s3 import get_s3_client
from PIL import Image
from io import BytesIO
import os

@celery.task(bind=True)
def process_image(self, image_id: str, s3_key: str):
    """Simple stub detection: download image, run a fake detector, keep or delete based on fake detection."""
    s3 = get_s3_client()
    bucket = os.environ.get('MINIO_BUCKET', 'crop-images')

    obj = s3.get_object(Bucket=bucket, Key=s3_key)
    body = obj['Body'].read()

    # load image
    img = Image.open(BytesIO(body))

    # fake detection: keep only if mean brightness below a threshold (example)
    grayscale = img.convert('L')
    stat = grayscale.getextrema()
    mean = sum(stat)/2
    detected = mean < 250  # this is a dummy rule; replace with ML model

    if detected:
        # generate thumbnail and store
        thumb = img.copy()
        thumb.thumbnail((640, 480))
        buf = BytesIO()
        thumb.save(buf, format='JPEG', quality=75)
        buf.seek(0)
        thumb_key = s3_key.replace('.jpg', '.thumb.jpg')
        s3.put_object(Bucket=bucket, Key=thumb_key, Body=buf.read(), ContentType='image/jpeg')
        # update DB row (left as an exercise to connect DB or signal via API)
        return {'status': 'kept', 'thumb': thumb_key}
    else:
        # delete object
        s3.delete_object(Bucket=bucket, Key=s3_key)
        return {'status': 'discarded'}