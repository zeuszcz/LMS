import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, BookOpen, Plus, Users } from 'lucide-react';
import { fetchEnrollments, fetchGroup } from '@/api/groups';
import { fetchLessons } from '@/api/lessons';
import { fetchUsers } from '@/api/users';
import { fetchCourses } from '@/api/courses';
import { LanguageMark } from '@/components/ui/LanguageMark';
import { GroupStatusPill, LessonStatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { CreateLessonModal } from '@/components/forms/CreateLessonModal';
import { ManageGroupModal, GroupManagementButtons } from '@/components/forms/ManageGroupModal';
import { useAuthStore } from '@/stores/authStore';
import {
  formatDate,
  formatDateTime,
  GROUP_MODE_LABEL,
  weekdayShort,
} from '@/lib/format';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const group = useQuery({
    queryKey: ['group', id],
    queryFn: () => fetchGroup(id!),
    enabled: !!id,
  });
  const enrollments = useQuery({
    queryKey: ['enrollments', id],
    queryFn: () => fetchEnrollments(id!),
    enabled: !!id,
  });
  const lessons = useQuery({
    queryKey: ['group-lessons', id],
    queryFn: () => fetchLessons({ group_id: id!, upcoming_only: false }),
    enabled: !!id,
  });
  const users = useQuery({ queryKey: ['users-min'], queryFn: () => fetchUsers({ limit: 200 }) });
  const courses = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => fetchCourses({ limit: 100, only_published: false }),
  });
  const me = useAuthStore((s) => s.user);
  const [createLessonOpen, setCreateLessonOpen] = useState(false);
  const [manageMode, setManageMode] = useState<'teacher' | 'students' | null>(null);

  if (group.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  }
  if (!group.data) return <div className="text-terra-700">Группа не найдена</div>;

  const course = (courses.data?.items ?? []).find((c) => c.id === group.data!.course_id);
  const userById = new Map((users.data ?? []).map((u) => [u.id, u]));
  const studentList = (enrollments.data ?? [])
    .map((e) => userById.get(e.student_id))
    .filter(Boolean);
  const sortedLessons = (lessons.data ?? [])
    .slice()
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const past = sortedLessons.filter((l) => new Date(l.scheduled_at) < new Date());
  const upcoming = sortedLessons.filter((l) => new Date(l.scheduled_at) >= new Date());

  const isTeacherOfGroup = !!me && me.id === group.data.teacher_id;
  const canManageLessons =
    !!me &&
    (me.is_superuser ||
      me.roles.includes('admin') ||
      me.roles.includes('methodist') ||
      isTeacherOfGroup);
  const canManageGroup =
    !!me &&
    (me.is_superuser ||
      me.roles.includes('admin') ||
      me.roles.includes('methodist') ||
      me.roles.includes('branch_manager'));
  const teacher = group.data.teacher_id ? userById.get(group.data.teacher_id) : undefined;
  const nextSequence = (sortedLessons[sortedLessons.length - 1]?.sequence ?? 0) + 1;

  return (
    <div className="space-y-8">
      <Link
        to="/groups"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-ink-500 hover:text-forest-700 font-semibold transition-colors"
      >
        <ArrowLeft size={12} strokeWidth={2} />
        Все группы
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6 lg:items-end lg:justify-between border-b border-ink-900/10 pb-6">
        <div className="flex items-start gap-5">
          {course && <LanguageMark language={course.language} size="lg" />}
          <div>
            <div className="eyebrow">{GROUP_MODE_LABEL[group.data.mode]} · {course?.level ?? '—'}</div>
            <h1 className="font-display text-display-lg font-semibold text-ink-900 leading-[1.05] text-balance">
              {course?.title ?? 'Группа'}
            </h1>
            <div className="mt-2 text-sm text-ink-500 num">
              старт {formatDate(group.data.start_date)}
              {group.data.end_date && ` — ${formatDate(group.data.end_date)}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <GroupStatusPill status={group.data.status} className="text-sm px-3 py-1" />
          <GroupManagementButtons
            group={group.data}
            canManage={canManageGroup}
            onManageTeacher={() => setManageMode('teacher')}
            onManageStudents={() => setManageMode('students')}
          />
        </div>
      </div>

      {/* Teacher card */}
      <div className="card-flat flex items-center gap-3 flex-wrap">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-500 to-forest-700 text-white text-sm font-extrabold flex-shrink-0">
          {teacher
            ? teacher.full_name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
            : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
            Преподаватель
          </div>
          <div className="font-display text-base font-extrabold text-ink-900 truncate">
            {teacher?.full_name ?? 'Не назначен'}
          </div>
          {teacher?.email && (
            <div className="text-xs text-ink-500 font-mono truncate">{teacher.email}</div>
          )}
        </div>
      </div>

      {/* Schedule strip */}
      {group.data.slots.length > 0 && (
        <div className="card-flat">
          <div className="eyebrow">Расписание</div>
          <div className="flex flex-wrap items-center gap-3">
            {group.data.slots.map((s) => (
              <div
                key={s.id}
                className="inline-flex items-baseline gap-2 px-3 py-2 rounded-md bg-paper-100 border border-paper-200"
              >
                <span className="font-display text-lg font-medium text-ink-900">
                  {weekdayShort(s.weekday)}
                </span>
                <span className="font-mono text-sm text-ink-600 num">
                  {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <aside className="lg:col-span-2 card">
          <div className="flex items-center gap-2 eyebrow">
            <Users size={12} strokeWidth={1.6} />
            Студенты · {studentList.length}/{group.data.max_students}
          </div>
          {studentList.length === 0 ? (
            <p className="text-sm text-ink-400 italic font-display py-4">Никто не зачислен</p>
          ) : (
            <ul className="divide-y divide-ink-900/5">
              {studentList.map(
                (u, idx) =>
                  u && (
                    <li
                      key={u.id}
                      className="py-2.5 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-display text-xs text-ink-300 num w-6">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-ink-800">{u.full_name}</span>
                      </div>
                    </li>
                  ),
              )}
            </ul>
          )}
        </aside>

        <section className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2 eyebrow">
              <BookOpen size={12} strokeWidth={1.6} />
              Уроки · {sortedLessons.length}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-[11px] text-ink-500 num">
                <span className="text-ink-700 font-medium">{past.length}</span> прошло ·{' '}
                <span className="text-ink-700 font-medium">{upcoming.length}</span> впереди
              </div>
              {canManageLessons && (
                <button
                  onClick={() => setCreateLessonOpen(true)}
                  className="btn-primary btn-sm"
                >
                  <Plus size={12} strokeWidth={2.5} /> Урок
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-ink-900/5 max-h-[28rem] overflow-y-auto -mx-2">
            {sortedLessons.length === 0 ? (
              <div className="text-sm text-ink-400 italic font-display py-4 px-2">
                Уроков пока нет
              </div>
            ) : (
              sortedLessons.map((l) => (
                <Link
                  key={l.id}
                  to={`/lessons/${l.id}`}
                  className="flex items-center justify-between gap-3 px-2 py-2 hover:bg-paper-100 rounded transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display text-sm text-ink-300 num w-7 flex-shrink-0">
                      {String(l.sequence).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-ink-800 truncate">{l.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-ink-500 num">
                      {formatDateTime(l.scheduled_at)}
                    </span>
                    <LessonStatusPill status={l.status} />
                    <ArrowUpRight
                      size={12}
                      className="text-ink-300 group-hover:text-forest-700 transition-colors"
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <CreateLessonModal
        open={createLessonOpen}
        onClose={() => setCreateLessonOpen(false)}
        groupId={group.data.id}
        defaultSequence={nextSequence}
      />
      {manageMode && (
        <ManageGroupModal
          open
          mode={manageMode}
          group={group.data}
          onClose={() => setManageMode(null)}
        />
      )}
    </div>
  );
}
