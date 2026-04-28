from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.services.storage import BOTO_OK, upload_object

router = APIRouter()


class UploadResult(BaseModel):
    key: str
    url: str
    content_type: str
    size: int


@router.post("/upload", response_model=UploadResult)
async def upload(
    _user: CurrentUser,
    file: UploadFile = File(...),
) -> UploadResult:
    if not BOTO_OK:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Object storage not configured",
        )
    if file.size and file.size > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 25 MB)")

    suffix = ''
    if file.filename and '.' in file.filename:
        suffix = '.' + file.filename.rsplit('.', 1)[-1].lower()[:6]

    content = await file.read()
    key, url = upload_object(content, file.content_type or '', suffix=suffix)
    return UploadResult(
        key=key,
        url=url,
        content_type=file.content_type or 'application/octet-stream',
        size=len(content),
    )
