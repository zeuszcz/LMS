from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchOut
from app.services import permissions

router = APIRouter()


@router.get("/", response_model=list[BranchOut])
async def list_branches(
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Branch]:
    result = await db.execute(
        select(Branch).where(Branch.deleted_at.is_(None)).order_by(Branch.name)
    )
    return list(result.scalars().all())


@router.post("/", response_model=BranchOut, status_code=status.HTTP_201_CREATED)
async def create_branch(
    payload: BranchCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Branch:
    if not permissions.is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    branch = Branch(**payload.model_dump())
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return branch


@router.get("/{branch_id}", response_model=BranchOut)
async def get_branch(
    branch_id: UUID,
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Branch:
    result = await db.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if branch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    return branch


@router.patch("/{branch_id}", response_model=BranchOut)
async def update_branch(
    branch_id: UUID,
    payload: BranchCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Branch:
    if not permissions.is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    res = await db.execute(select(Branch).where(Branch.id == branch_id))
    branch = res.scalar_one_or_none()
    if branch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    for k, v in payload.model_dump().items():
        setattr(branch, k, v)
    await db.commit()
    await db.refresh(branch)
    return branch
