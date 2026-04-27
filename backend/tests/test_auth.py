from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User, UserRole, UserRoleAssignment


async def _create_user(
    db: AsyncSession,
    email: str = "alice@example.com",
    password: str = "S3curePass!",
    role: UserRole = UserRole.student,
) -> User:
    user = User(
        email=email,
        full_name="Alice Test",
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.flush()
    db.add(UserRoleAssignment(user_id=user.id, role=role))
    await db.commit()
    await db.refresh(user)
    return user


async def test_login_success(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_user(db_session)
    response = await client.post(
        "/api/auth/login", json={"email": "alice@example.com", "password": "S3curePass!"}
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_user(db_session)
    response = await client.post(
        "/api/auth/login", json={"email": "alice@example.com", "password": "wrong"}
    )
    assert response.status_code == 401


async def test_login_unknown_email(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/login", json={"email": "ghost@example.com", "password": "doesntmatter"}
    )
    assert response.status_code == 401


async def test_me_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_me_returns_current_user(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_user(db_session)
    login = await client.post(
        "/api/auth/login", json={"email": "alice@example.com", "password": "S3curePass!"}
    )
    token = login.json()["access_token"]
    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "alice@example.com"
    assert "student" in body["roles"]
