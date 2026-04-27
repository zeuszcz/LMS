from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, require_roles
from app.core.database import get_db
from app.core.security import hash_password
from app.models.user import User, UserRole, UserRoleAssignment
from app.schemas.user import UserCreate, UserOut

router = APIRouter()


@router.get("/", response_model=list[UserOut])
async def list_users(
    _user: Annotated[User, Depends(require_roles(UserRole.admin, UserRole.branch_manager))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
    offset: int = 0,
) -> list[User]:
    result = await db.execute(
        select(User)
        .where(User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
        .limit(min(limit, 200))
        .offset(offset)
    )
    return list(result.scalars().all())


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    _user: Annotated[User, Depends(require_roles(UserRole.admin))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not payload.email and not payload.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or phone is required",
        )
    if payload.email:
        existing = await db.execute(select(User).where(User.email == payload.email))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
            )

    user = User(
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        locale=payload.locale,
        timezone=payload.timezone,
    )
    db.add(user)
    await db.flush()

    for role in payload.roles:
        db.add(UserRoleAssignment(user_id=user.id, role=role))

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
async def get_me(current: CurrentUser) -> User:
    return current
