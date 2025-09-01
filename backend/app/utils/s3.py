import boto3
from botocore.client import Config
from app.core.config import settings

def get_s3_client():
    s3 = boto3.client(
        's3',
        endpoint_url=(f"http://{settings.MINIO_ENDPOINT}" if not settings.MINIO_SECURE else f"https://{settings.MINIO_ENDPOINT}"),
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        config=Config(signature_version='s3v4'),
        region_name='us-east-1'
    )
    return s3

def generate_presigned_put(key, expires_in=3600):
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': settings.MINIO_BUCKET, 'Key': key},
        ExpiresIn=expires_in
    )