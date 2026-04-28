from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    assignments,
    auth,
    billing,
    branches,
    courses,
    enrollment_requests,
    groups,
    health,
    lessons,
    notifications,
    progress,
    teachers,
    users,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", env=settings.app_env, debug=settings.debug)
    yield
    logger.info("shutdown")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.debug,
    lifespan=lifespan,
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(branches.router, prefix="/api/branches", tags=["branches"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["lessons"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["assignments"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(
    enrollment_requests.router,
    prefix="/api/enrollment-requests",
    tags=["enrollment-requests"],
)
app.include_router(teachers.router, prefix="/api/teachers", tags=["teachers"])


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "version": "0.1.0", "status": "ok"}
