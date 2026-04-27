"""One-shot bootstrap helpers.

Run via CLI: `python -m app.services.bootstrap` after migrations applied.
Creates the superuser if it does not exist yet.
"""
import asyncio

import structlog
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole, UserRoleAssignment

logger = structlog.get_logger(__name__)


async def ensure_superuser() -> None:
    async with SessionLocal() as db:
        existing = await db.execute(
            select(User).where(User.email == settings.bootstrap_superuser_email)
        )
        if existing.scalar_one_or_none():
            logger.info("superuser_already_exists", email=settings.bootstrap_superuser_email)
            return

        user = User(
            email=settings.bootstrap_superuser_email,
            full_name="System Administrator",
            password_hash=hash_password(settings.bootstrap_superuser_password),
            is_superuser=True,
            locale="ru",
            timezone="Europe/Moscow",
        )
        db.add(user)
        await db.flush()
        db.add(UserRoleAssignment(user_id=user.id, role=UserRole.admin))
        await db.commit()
        logger.warning(
            "superuser_created",
            email=settings.bootstrap_superuser_email,
            note="CHANGE THE PASSWORD IMMEDIATELY",
        )


def main() -> None:
    asyncio.run(ensure_superuser())


if __name__ == "__main__":
    main()
