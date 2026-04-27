from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserRole
from tests.factories import login_token, make_branch, make_course, make_user


async def test_branches_admin_only_create(client: AsyncClient, db_session: AsyncSession) -> None:
    await make_user(db_session, email="student@t.example.com", role=UserRole.student)
    student_token = await login_token(client, "student@t.example.com")
    response = await client.post(
        "/api/branches/",
        json={"name": "X", "address": "Y", "city": "Z"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 403


async def test_admin_creates_branch(client: AsyncClient, db_session: AsyncSession) -> None:
    await make_user(db_session, email="admin@t.example.com", role=UserRole.admin, is_superuser=True)
    admin_token = await login_token(client, "admin@t.example.com")
    response = await client.post(
        "/api/branches/",
        json={"name": "Митино", "address": "Митинская 35", "city": "Москва"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Митино"


async def test_student_cannot_create_group(client: AsyncClient, db_session: AsyncSession) -> None:
    await make_user(db_session, email="s@t.example.com", role=UserRole.student)
    course = await make_course(db_session)
    branch = await make_branch(db_session)
    token = await login_token(client, "s@t.example.com")
    response = await client.post(
        "/api/groups/",
        json={
            "course_id": str(course.id),
            "branch_id": str(branch.id),
            "mode": "offline",
            "start_date": "2026-05-01",
            "slots": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


async def test_methodist_creates_group(client: AsyncClient, db_session: AsyncSession) -> None:
    await make_user(db_session, email="m@t.example.com", role=UserRole.methodist)
    course = await make_course(db_session)
    branch = await make_branch(db_session)
    token = await login_token(client, "m@t.example.com")
    response = await client.post(
        "/api/groups/",
        json={
            "course_id": str(course.id),
            "branch_id": str(branch.id),
            "mode": "offline",
            "start_date": "2026-05-01",
            "slots": [{"weekday": 0, "start_time": "19:00:00", "end_time": "20:30:00", "valid_from": "2026-05-01"}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert response.json()["course_id"] == str(course.id)
