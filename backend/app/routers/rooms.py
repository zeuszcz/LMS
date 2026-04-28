from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.room import Room
from app.services import permissions

router = APIRouter()


class RoomIn(BaseModel):
    branch_id: UUID | None = None
    name: str = Field(min_length=1, max_length=80)
    capacity: int = Field(ge=1, le=200, default=12)
    equipment: str | None = Field(default=None, max_length=500)
    is_online: bool = False


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    branch_id: UUID | None
    name: str
    capacity: int
    equipment: str | None
    is_online: bool


@router.get("/", response_model=list[RoomOut])
async def list_rooms(
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    branch_id: UUID | None = None,
) -> list[Room]:
    stmt = select(Room).where(Room.deleted_at.is_(None))
    if branch_id is not None:
        stmt = stmt.where(Room.branch_id == branch_id)
    stmt = stmt.order_by(Room.name)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.post("/", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomIn,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Room:
    if not (permissions.is_admin(user) or permissions.is_branch_manager(user, payload.branch_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    room = Room(**payload.model_dump())
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.patch("/{room_id}", response_model=RoomOut)
async def update_room(
    room_id: UUID,
    payload: RoomIn,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Room:
    res = await db.execute(select(Room).where(Room.id == room_id))
    room = res.scalar_one_or_none()
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    if not (permissions.is_admin(user) or permissions.is_branch_manager(user, room.branch_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    for k, v in payload.model_dump().items():
        setattr(room, k, v)
    await db.commit()
    await db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    res = await db.execute(select(Room).where(Room.id == room_id))
    room = res.scalar_one_or_none()
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    if not (permissions.is_admin(user) or permissions.is_branch_manager(user, room.branch_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    from datetime import UTC, datetime
    room.deleted_at = datetime.now(UTC)
    await db.commit()
