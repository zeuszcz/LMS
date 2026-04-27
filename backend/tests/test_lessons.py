from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserRole
from tests.factories import (
    enroll,
    login_token,
    make_branch,
    make_course,
    make_group,
    make_lesson,
    make_user,
)


async def test_close_lesson_requires_full_attendance(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    teacher = await make_user(db_session, email="teacher@t.example.com", role=UserRole.teacher)
    student_a = await make_user(db_session, email="a@t.example.com", role=UserRole.student)
    student_b = await make_user(db_session, email="b@t.example.com", role=UserRole.student)

    branch = await make_branch(db_session)
    course = await make_course(db_session)
    group = await make_group(db_session, course=course, branch=branch, teacher=teacher)
    await enroll(db_session, group, student_a)
    await enroll(db_session, group, student_b)
    lesson = await make_lesson(db_session, group, in_past=True)

    token = await login_token(client, "teacher@t.example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Closing with attendance for only one student must fail.
    response = await client.post(
        f"/api/lessons/{lesson.id}/close",
        json={"attendance": [{"student_id": str(student_a.id), "status": "present"}]},
        headers=headers,
    )
    assert response.status_code == 400
    assert "Attendance missing" in response.json()["detail"]

    # Closing with attendance for both students succeeds.
    response = await client.post(
        f"/api/lessons/{lesson.id}/close",
        json={
            "attendance": [
                {"student_id": str(student_a.id), "status": "present", "participation_score": 5},
                {"student_id": str(student_b.id), "status": "absent"},
            ]
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "finished"


async def test_close_lesson_blocked_for_non_teacher_of_group(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    teacher_a = await make_user(db_session, email="ta@t.example.com", role=UserRole.teacher)
    teacher_b = await make_user(db_session, email="tb@t.example.com", role=UserRole.teacher)
    student = await make_user(db_session, email="s@t.example.com", role=UserRole.student)

    branch = await make_branch(db_session)
    course = await make_course(db_session)
    group = await make_group(db_session, course=course, branch=branch, teacher=teacher_a)
    await enroll(db_session, group, student)
    lesson = await make_lesson(db_session, group, in_past=True)

    token_b = await login_token(client, "tb@t.example.com")
    response = await client.post(
        f"/api/lessons/{lesson.id}/close",
        json={"attendance": [{"student_id": str(student.id), "status": "present"}]},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 403
