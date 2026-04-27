"""SQLAlchemy ORM models.

Imported by alembic/env.py to populate Base.metadata.
"""
from app.models.assignment import Assignment, AssignmentKind, Submission, SubmissionStatus
from app.models.audit import AuditLog
from app.models.base import Base
from app.models.billing import (
    LedgerReason,
    LessonCreditLedger,
    Payment,
    PaymentStatus,
    PricingPlan,
    PricingPlanKind,
    Subscription,
    SubscriptionStatus,
)
from app.models.branch import Branch
from app.models.course import AgeGroup, CefrLevel, Course, Language
from app.models.group import Enrollment, Group, GroupMode, GroupStatus
from app.models.lesson import Attendance, AttendanceStatus, LessonInstance, LessonStatus
from app.models.notification import (
    NotificationChannel,
    NotificationOutbox,
    NotificationStatus,
)
from app.models.schedule import ScheduleSlot
from app.models.user import (
    ParentLink,
    StudentProfile,
    TeacherProfile,
    User,
    UserRole,
    UserRoleAssignment,
)

__all__ = [
    "Base",
    # Identity
    "User",
    "UserRole",
    "UserRoleAssignment",
    "StudentProfile",
    "TeacherProfile",
    "ParentLink",
    # Org
    "Branch",
    # Catalog
    "Course",
    "Language",
    "CefrLevel",
    "AgeGroup",
    # Groups
    "Group",
    "GroupMode",
    "GroupStatus",
    "Enrollment",
    "ScheduleSlot",
    # Lessons
    "LessonInstance",
    "LessonStatus",
    "Attendance",
    "AttendanceStatus",
    # Homework
    "Assignment",
    "AssignmentKind",
    "Submission",
    "SubmissionStatus",
    # Billing
    "PricingPlan",
    "PricingPlanKind",
    "Subscription",
    "SubscriptionStatus",
    "Payment",
    "PaymentStatus",
    "LessonCreditLedger",
    "LedgerReason",
    # Notifications
    "NotificationOutbox",
    "NotificationChannel",
    "NotificationStatus",
    # Audit
    "AuditLog",
]
