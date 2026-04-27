"""Permission helpers — branch-scoped RBAC checks.

Routers should call these explicitly rather than re-implementing role checks.
"""
from __future__ import annotations

from uuid import UUID

from app.models.user import User, UserRole


def _active_roles(user: User) -> set[tuple[UserRole, UUID | None]]:
    return {(r.role, r.branch_id) for r in user.roles if r.revoked_at is None}


def has_role(user: User, role: UserRole, branch_id: UUID | None = None) -> bool:
    if user.is_superuser:
        return True
    for r, b in _active_roles(user):
        if r != role:
            continue
        if branch_id is None or b is None or b == branch_id:
            return True
    return False


def is_admin(user: User) -> bool:
    return user.is_superuser or has_role(user, UserRole.admin)


def is_methodist(user: User, branch_id: UUID | None = None) -> bool:
    return is_admin(user) or has_role(user, UserRole.methodist, branch_id)


def is_branch_manager(user: User, branch_id: UUID | None = None) -> bool:
    return is_admin(user) or has_role(user, UserRole.branch_manager, branch_id)


def is_teacher(user: User) -> bool:
    return user.is_superuser or any(r.role == UserRole.teacher for r in user.roles if r.revoked_at is None)


def is_student(user: User) -> bool:
    return any(r.role == UserRole.student for r in user.roles if r.revoked_at is None)


def is_parent(user: User) -> bool:
    return any(r.role == UserRole.parent for r in user.roles if r.revoked_at is None)


def can_manage_group(user: User, group_branch_id: UUID | None) -> bool:
    """Admin, methodist (any branch), branch_manager (own branch) — can edit groups."""
    if is_admin(user):
        return True
    if is_methodist(user):
        return True
    if group_branch_id is not None and is_branch_manager(user, group_branch_id):
        return True
    return False


def can_record_attendance(user: User, group_teacher_id: UUID | None, group_branch_id: UUID | None) -> bool:
    """Teacher of the group OR methodist of the branch OR admin."""
    if is_admin(user):
        return True
    if is_methodist(user, group_branch_id):
        return True
    if group_teacher_id is not None and user.id == group_teacher_id:
        return True
    return False


def can_grade(user: User, group_teacher_id: UUID | None, group_branch_id: UUID | None) -> bool:
    return can_record_attendance(user, group_teacher_id, group_branch_id)


def can_view_student(user: User, student_id: UUID, parent_links: set[UUID]) -> bool:
    """Self, linked parent, or staff with reach."""
    if is_admin(user) or is_methodist(user):
        return True
    if user.id == student_id:
        return True
    if is_parent(user) and student_id in parent_links:
        return True
    return False
