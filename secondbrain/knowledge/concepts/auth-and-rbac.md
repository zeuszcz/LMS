# Auth and RBAC

JWT-based authentication with refresh rotation, role-based authorization with
branch scoping.

## Token model

| Token   | TTL      | Storage (frontend)                        | Purpose                            |
|---------|----------|-------------------------------------------|------------------------------------|
| access  | 30 min   | Zustand `authStore`, localStorage (persist) | Sent as `Authorization: Bearer`    |
| refresh | 14 days  | Same                                       | Exchange for new pair on 401       |

JWT claims:
```
{ "sub": "<user_uuid>", "iat": ..., "exp": ..., "type": "access"|"refresh" }
```

Algorithm: HS256 with `jwt_secret` from env. Production: rotate secret quarterly, store in vault.

## Login flow

```
POST /api/auth/login  { email, password }
        │
        ▼
verify_password(plain, user.password_hash)   ← bcrypt, deprecated="auto"
        │
        ▼
update user.last_seen_at
        │
        ▼
return { access_token, refresh_token }
```

Failure modes return 401 (`invalid email or password`) or 403 (`user disabled`)
without leaking which one is which. (Phase 2: add rate limit per IP+email.)

## Refresh flow

`POST /api/auth/refresh { refresh_token }` → new access+refresh pair.

Frontend uses a **single-flight** refresh: if multiple requests fire 401 in
parallel, only one refresh call is made; others await the same promise. See
`frontend/src/api/client.ts:refreshPromise`.

**Phase 2**: persist refresh tokens in `refresh_token` table with `revoked_at`,
support logout-all-sessions and silent invalidation on password change.

## Authorization

Two layers:

**Coarse-grained, in `app/core/auth.py`:**

- `get_current_user` — required, raises 401 if missing/invalid token.
- `require_roles(*allowed)` — factory, raises 403 if user lacks any of `allowed`. Use this for endpoints whose access is purely role-based with no branch nuance.

```python
@router.post("/", dependencies=[Depends(require_roles(UserRole.admin, UserRole.methodist))])
async def create_course(...): ...
```

**Fine-grained, in `app/services/permissions.py`:**

Helpers that consider branch scoping and resource ownership:
- `is_admin(user)`, `is_methodist(user, branch_id=None)`, `is_branch_manager(user, branch_id)`, `is_teacher(user)`, `is_student(user)`, `is_parent(user)`
- `can_manage_group(user, group_branch_id)` — admin / methodist / branch_manager-of-that-branch
- `can_record_attendance(user, group_teacher_id, group_branch_id)` — teacher of group + methodist of branch + admin
- `can_grade(...)` — same as record_attendance
- `can_view_student(user, student_id, parent_links: set[UUID])` — self / linked parent / staff

Use this layer when the answer depends on **the resource**, not just the role. Example: a teacher can record attendance for *their own* group but not for a colleague's. Calling `require_roles(UserRole.teacher)` would let through the wrong teacher; `can_record_attendance(...)` keeps the check honest.

```python
if not permissions.can_manage_group(user, group.branch_id):
    raise HTTPException(403, "Forbidden")
```

## Role matrix

| Role              | Can do                                                                               |
|-------------------|--------------------------------------------------------------------------------------|
| student           | View own courses/lessons/homework; submit homework; view own progress                 |
| teacher           | View groups assigned; manage journal; grade homework; chat with students             |
| parent            | View linked students' progress, attendance, payments (read-only)                     |
| methodist         | CRUD courses; observe any group in branch; reassign teachers                         |
| branch_manager    | CRUD groups in branch; view all journals in branch; financial summary                 |
| admin             | Everything cross-branch; user management; system settings                             |
| b2b_coordinator   | (Phase 4) Manage company-tenant employees, view aggregate progress                    |

## Branch scoping

A user can have the same role at multiple branches. `user_role` row = `(user_id, role, branch_id)`. Permission checks combine role + branch:

```python
# Pseudo
def can_edit_group(user, group):
    if user.is_superuser: return True
    for r in user.roles:
        if r.role == UserRole.branch_manager and r.branch_id == group.branch_id:
            return True
        if r.role == UserRole.admin:  # cross-branch
            return True
    return False
```

This logic lives in `app/services/permissions.py` (Phase 1, week 6+).

## Password policy

- Minimum 8 chars (Pydantic schema enforces).
- Bcrypt cost factor 12 (passlib default).
- No max length restriction beyond bcrypt's 72-byte truncation (documented gotcha).
- (Phase 2) Disallow top-1k common passwords via `pwned_passwords` lookup.
- (Phase 3) Optional MFA (TOTP) for admin/methodist.

## Bootstrap

`app/services/bootstrap.py` runs once after migrations:
- Creates superuser from `BOOTSTRAP_SUPERUSER_EMAIL/PASSWORD`.
- Idempotent (skips if exists).
- Logs a loud warning that the password must be changed.

## Threat model (MVP scope)

| Threat                              | Mitigation                                              |
|-------------------------------------|---------------------------------------------------------|
| Credential stuffing                 | Rate limit (Phase 2), captcha on N failures (Phase 2)   |
| Token leak via XSS                  | httpOnly cookie storage option (Phase 2 alternative)    |
| Token replay after logout           | Refresh-token revocation table (Phase 2)                 |
| Privilege escalation via tampering  | Role check uses DB `user.roles`, not JWT claims          |
| Brute-force on bootstrap password   | Doc says CHANGE IMMEDIATELY; bootstrap skipped if exists |

## Invariants

1. JWT `sub` claim must parse as UUID; otherwise 401.
2. JWT `type` must match endpoint expectation (access vs refresh).
3. `User.disabled_at != null` blocks all auth and authorization.
4. `UserRoleAssignment.revoked_at != null` excludes the row from permission checks.
