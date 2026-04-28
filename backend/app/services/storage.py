"""S3 (MinIO) file storage with presigned download URLs."""
from __future__ import annotations

import uuid
from datetime import timedelta

import structlog

try:
    import boto3
    from botocore.config import Config
    BOTO_OK = True
except ImportError:
    BOTO_OK = False

from app.core.config import settings

logger = structlog.get_logger(__name__)


def _client():
    if not BOTO_OK:
        raise RuntimeError("boto3 not installed")
    return boto3.client(
        's3',
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version='s3v4'),
    )


def ensure_bucket() -> None:
    if not BOTO_OK:
        return
    try:
        c = _client()
        existing = [b['Name'] for b in c.list_buckets().get('Buckets', [])]
        if settings.s3_bucket not in existing:
            c.create_bucket(Bucket=settings.s3_bucket)
            logger.info("bucket_created", bucket=settings.s3_bucket)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ensure_bucket_failed", error=str(exc))


def upload_object(content: bytes, content_type: str, suffix: str = "") -> tuple[str, str]:
    """Returns (object_key, presigned_url). Empty content_type is acceptable."""
    if not BOTO_OK:
        raise RuntimeError("boto3 not installed")
    ensure_bucket()
    key = f"submissions/{uuid.uuid4().hex}{suffix}"
    c = _client()
    c.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=content,
        ContentType=content_type or 'application/octet-stream',
    )
    url = c.generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.s3_bucket, 'Key': key},
        ExpiresIn=int(timedelta(days=7).total_seconds()),
    )
    return key, url
