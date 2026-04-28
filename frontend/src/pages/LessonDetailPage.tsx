import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Lock, Pencil, PenLine, Play, Plus, Save, Sparkles, Video } from 'lucide-react';
import {
  AttendanceInput,
  closeLesson,
  fetchAttendance,
  fetchLesson,
  recordAttendance,
  selfCompleteLesson,
  startLesson,
} from '@/api/lessons';
import { fetchAssignments } from '@/api/assignments';
import { toast } from '@/components/ui/Toast';
import { fetchEnrollments, fetchGroup } from '@/api/groups';
import { fetchUsers } from '@/api/users';
import { CreateAssignmentModal } from '@/components/forms/CreateAssignmentModal';
import { EditLessonModal } from '@/components/forms/EditLessonModal';
import { VideoClassroom } from '@/components/classroom/VideoClassroom';
import { useAuthStore } from '@/stores/authStore';
import { LessonStatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ATTENDANCE_LABEL,
  formatDateTime,
} from '@/lib/format';
import type { AttendanceStatus } from '@/types';

const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];
const SCORES: number[] = [1, 2, 3, 4, 5];

const STATUS_TONE: Record<AttendanceStatus, string> = {
  present: 'bg-sage-500 text-paper-50 border-sage-700',
  late: 'bg-gold-500 text-ink-900 border-gold-700',
  absent: 'bg-terra-500 text-paper-50 border-terra-700',
  excused: 'bg-ink-700 text-paper-50 border-ink-900',
};

export function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const lesson = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => fetchLesson(id!),
    enabled: !!id,
  });
  const group = useQuery({
    queryKey: ['group', lesson.data?.group_id],
    queryFn: () => fetchGroup(lesson.data!.group_id),
    enabled: !!lesson.data?.group_id,
  });
  const enrollments = useQuery({
    queryKey: ['enrollments', lesson.data?.group_id],
    queryFn: () => fetchEnrollments(lesson.data!.group_id),
    enabled: !!lesson.data?.group_id,
  });
  const attendance = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => fetchAttendance(id!),
    enabled: !!id,
  });
  const users = useQuery({ queryKey: ['users-min'], queryFn: () => fetchUsers({ limit: 200 }) });

  const isTeacherOfGroup = !!user && group.data && user.id === group.data.teacher_id;
  const canEdit =
    !!user &&
    (user.is_superuser ||
      user.roles.includes('admin') ||
      user.roles.includes('methodist') ||
      !!isTeacherOfGroup);

  const studentRows = useMemo(() => {
    const userById = new Map((users.data ?? []).map((u) => [u.id, u]));
    return (enrollments.data ?? [])
      .map((e) => ({
        id: e.student_id,
        name: userById.get(e.student_id)?.full_name ?? e.student_id.slice(0, 8),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [enrollments.data, users.data]);

  const [drafts, setDrafts] = useState<Record<string, AttendanceInput>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const next: Record<string, AttendanceInput> = {};
    for (const r of studentRows) {
      const existing = (attendance.data ?? []).find((a) => a.student_id === r.id);
      next[r.id] = existing
        ? {
            student_id: r.id,
            status: existing.status,
            participation_score: existing.participation_score,
            comment: existing.comment,
          }
        : { student_id: r.id, status: 'present', participation_score: null, comment: null };
    }
    setDrafts(next);
  }, [studentRows.length, attendance.data]);

  const saveAttendance = useMutation({
    mutationFn: () => recordAttendance(id!, Object.values(drafts)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', id] }),
  });
  const start = useMutation({
    mutationFn: () => startLesson(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson', id] }),
  });
  const close = useMutation({
    mutationFn: () => closeLesson(id!, Object.values(drafts), notes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson', id] });
      qc.invalidateQueries({ queryKey: ['attendance', id] });
    },
  });
  const lessonAssignments = useQuery({
    queryKey: ['assignments-of-lesson', id],
    queryFn: () => fetchAssignments({ lesson_instance_id: id! }),
    enabled: !!id,
  });
  const [createHwOpen, setCreateHwOpen] = useState(false);
  const [editLessonOpen, setEditLessonOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const selfComplete = useMutation({
    mutationFn: () => selfCompleteLesson(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', id] });
      qc.invalidateQueries({ queryKey: ['module'] });
      toast('success', 'Урок изучен', 'Прогресс обновлён');
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast('error', 'Не удалось отметить', err?.response?.data?.detail ?? 'Ошибка');
    },
  });

  const myAttendance = (attendance.data ?? []).find((a) => a.student_id === user?.id);
  const isStudent =
    !!user &&
    user.roles.includes('student') &&
    !user.roles.includes('teacher') &&
    !user.roles.includes('admin') &&
    !user.is_superuser;
  const showSelfComplete = isStudent && !!lesson.data?.content_md;
  const completedByStudent =
    myAttendance && (myAttendance.status === 'present' || myAttendance.status === 'late');

  if (lesson.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    );
  }
  if (!lesson.data) return <div className="text-terra-700">Урок не найден</div>;

  const isFinished = lesson.data.status === 'finished';
  const counts = Object.values(drafts).reduce<Record<AttendanceStatus, number>>(
    (acc, d) => ({ ...acc, [d.status]: (acc[d.status] ?? 0) + 1 }),
    { present: 0, late: 0, absent: 0, excused: 0 },
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-500 font-semibold">
        <Link to="/lessons" className="hover:text-forest-700 inline-flex items-center gap-1">
          <ArrowLeft size={12} strokeWidth={2} /> Уроки
        </Link>
        <span className="text-ink-300">/</span>
        <Link to={`/groups/${lesson.data.group_id}`} className="hover:text-forest-700">
          Группа
        </Link>
        <span className="text-ink-300">/</span>
        <span className="text-ink-900">#{lesson.data.sequence}</span>
      </div>

      {/* Hero */}
      <div className="border-b border-ink-900/10 pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex items-start gap-5">
          <span className="font-display text-display-xl font-light text-ink-300 num leading-none">
            {String(lesson.data.sequence).padStart(2, '0')}
          </span>
          <div>
            <div className="eyebrow">Урок</div>
            <h1 className="font-display text-display-lg font-semibold text-ink-900 leading-[1.05] text-balance">
              {lesson.data.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
              <span className="num">{formatDateTime(lesson.data.scheduled_at)}</span>
              <span>·</span>
              <span className="num">{lesson.data.duration_min} мин</span>
              <span>·</span>
              <LessonStatusPill status={lesson.data.status} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setVideoOpen(true)} className="btn-secondary btn-sm">
            <Video size={12} strokeWidth={2} /> Видеокласс
          </button>
          {canEdit && (
            <button onClick={() => setEditLessonOpen(true)} className="btn-secondary btn-sm">
              <Pencil size={12} strokeWidth={2.5} /> Редактировать
            </button>
          )}
          {canEdit && lesson.data.status === 'planned' && (
            <button
              onClick={() => start.mutate()}
              disabled={start.isPending}
              className="btn-gold"
            >
              <Play size={14} strokeWidth={2} fill="currentColor" /> Начать урок
            </button>
          )}
        </div>
      </div>

      {/* Lesson summary tagline */}
      {lesson.data.summary && (
        <div className="text-base text-ink-600 italic max-w-3xl text-pretty leading-relaxed">
          {lesson.data.summary}
        </div>
      )}

      {/* Lesson learning content (markdown body) */}
      {lesson.data.content_md && (
        <div className="card-elevated relative overflow-hidden">
          <div className="blob bg-forest-500 h-48 w-48 -top-8 -right-8 opacity-20" />
          <div className="relative">
            <div className="eyebrow">Материал урока</div>
            <LessonMarkdown content={lesson.data.content_md} />
          </div>
        </div>
      )}

      {/* Self-completion CTA (student only) */}
      {showSelfComplete && (
        <div
          className={
            completedByStudent
              ? 'rounded-3xl bg-sage-50 border-2 border-sage-300 p-6 sm:p-8 flex items-start gap-4 flex-wrap'
              : 'rounded-3xl bg-gradient-to-br from-forest-600 to-forest-800 text-white p-6 sm:p-8 shadow-pop-lg flex items-start gap-4 flex-wrap relative overflow-hidden'
          }
        >
          {!completedByStudent && (
            <div className="blob bg-gold-500 h-40 w-40 -top-8 -right-8 opacity-30" />
          )}
          <div className={completedByStudent ? 'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-500 text-white flex-shrink-0' : 'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex-shrink-0 relative'}>
            {completedByStudent ? (
              <CheckCircle2 size={22} strokeWidth={2.5} />
            ) : (
              <Sparkles size={22} strokeWidth={2} />
            )}
          </div>
          <div className="flex-1 min-w-0 relative">
            <h3 className={completedByStudent ? 'font-display text-xl font-extrabold text-sage-700' : 'font-display text-xl font-extrabold'}>
              {completedByStudent ? 'Урок пройден' : 'Готовы двигаться дальше?'}
            </h3>
            <p className={completedByStudent ? 'text-sm text-sage-700/80 mt-1' : 'text-sm text-white/85 mt-1'}>
              {completedByStudent
                ? 'Вы изучили материал. Прогресс модуля обновлён.'
                : 'Когда дочитаете и проработаете материал, отметьте урок как изученный — обновим ваш прогресс модуля.'}
            </p>
          </div>
          {!completedByStudent && (
            <button
              onClick={() => selfComplete.mutate()}
              disabled={selfComplete.isPending}
              className="rounded-xl bg-white text-forest-700 hover:bg-paper-100 px-5 h-11 text-sm font-bold inline-flex items-center gap-2 shadow-pop transition-colors flex-shrink-0 relative"
            >
              <CheckCircle2 size={16} strokeWidth={2.5} />
              {selfComplete.isPending ? 'Сохранение…' : 'Я изучил материал'}
            </button>
          )}
        </div>
      )}

      {/* Assignments attached to this lesson */}
      <div className="card-elevated">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
              <PenLine size={14} strokeWidth={2.5} />
            </span>
            <h2 className="font-display text-lg font-extrabold text-ink-900">
              Домашние задания · {(lessonAssignments.data ?? []).length}
            </h2>
          </div>
          {canEdit && (
            <button onClick={() => setCreateHwOpen(true)} className="btn-primary btn-sm">
              <Plus size={12} strokeWidth={2.5} /> Создать домашку
            </button>
          )}
        </div>
        {(lessonAssignments.data ?? []).length === 0 ? (
          <div className="text-sm text-ink-500 italic">
            {canEdit
              ? 'К этому уроку ещё не прикреплено заданий. Создайте первое — оно сразу появится у студентов.'
              : 'К этому уроку нет домашек.'}
          </div>
        ) : (
          <ul className="divide-y divide-paper-300">
            {(lessonAssignments.data ?? []).map((a) => (
              <li key={a.id}>
                <Link to="/homework" className="group flex items-center gap-3 py-3 hover:bg-paper-100 transition-colors px-2 -mx-2 rounded-lg">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                    <PenLine size={14} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm text-ink-900 truncate">{a.title}</div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {a.kind} · макс. {a.max_score}{' '}
                      {a.due_at && <>· до {formatDateTime(a.due_at)}</>}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-ink-300 group-hover:text-forest-700 transition-colors flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Attendance summary (teacher / methodist view) */}
      {!isFinished && studentRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile label="Был" count={counts.present} accent="sage" />
          <SummaryTile label="Опоздал" count={counts.late} accent="gold" />
          <SummaryTile label="Отсутств." count={counts.absent} accent="terra" />
          <SummaryTile label="Уваж." count={counts.excused} accent="ink" />
        </div>
      )}

      {/* Journal */}
      <div className="card-bare overflow-hidden">
        <div className="px-5 py-3 border-b border-ink-900/10 bg-paper-100 flex items-center justify-between">
          <div className="flex items-center gap-2 eyebrow">
            <ClipboardCheck size={12} strokeWidth={1.6} />
            Журнал · {studentRows.length} студ.
          </div>
          {isFinished && (
            <div className="inline-flex items-center gap-1 text-[11px] text-ink-500">
              <Lock size={11} strokeWidth={1.6} /> закрыт
            </div>
          )}
        </div>

        {studentRows.length === 0 ? (
          <div className="text-sm text-ink-500 px-5 py-8 text-center">
            В группе нет студентов
          </div>
        ) : (
          <div className="divide-y divide-ink-900/5">
            {studentRows.map((r, idx) => {
              const d = drafts[r.id];
              if (!d) return null;
              const disabled = !canEdit || isFinished;
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-12 items-center gap-3 px-5 py-3 hover:bg-paper-100/60 transition-colors"
                >
                  <div className="col-span-12 md:col-span-3 flex items-center gap-3 min-w-0">
                    <span className="font-display text-xs text-ink-300 num w-6 flex-shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-ink-900 font-medium truncate">{r.name}</span>
                  </div>

                  <div className="col-span-12 md:col-span-5 flex flex-wrap gap-1">
                    {STATUSES.map((st) => {
                      const active = d.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={disabled}
                          onClick={() => setDrafts({ ...drafts, [r.id]: { ...d, status: st } })}
                          className={
                            active
                              ? `inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${STATUS_TONE[st]}`
                              : 'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-paper-300 bg-paper-50 text-ink-600 hover:border-ink-700 hover:text-ink-900 transition-colors disabled:opacity-50'
                          }
                        >
                          {ATTENDANCE_LABEL[st]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="col-span-4 md:col-span-2 flex gap-0.5">
                    {SCORES.map((s) => {
                      const on = d.participation_score === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            setDrafts({
                              ...drafts,
                              [r.id]: { ...d, participation_score: on ? null : s },
                            })
                          }
                          className={
                            on
                              ? 'h-7 w-7 rounded text-xs font-display font-medium bg-forest-700 text-paper-50 num'
                              : 'h-7 w-7 rounded text-xs font-display text-ink-500 hover:bg-paper-200 hover:text-ink-900 num disabled:opacity-50'
                          }
                          title={`Балл участия ${s}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  <div className="col-span-8 md:col-span-2">
                    <input
                      type="text"
                      value={d.comment ?? ''}
                      disabled={disabled}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [r.id]: { ...d, comment: e.target.value } })
                      }
                      placeholder="заметка…"
                      className="input py-1 px-2 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {canEdit && !isFinished && (
        <div className="card space-y-3">
          <div>
            <div className="eyebrow">Заметка для методиста</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full text-sm"
              rows={2}
              placeholder="Опционально: что хотелось бы передать методисту?"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveAttendance.mutate()}
              disabled={saveAttendance.isPending || studentRows.length === 0}
              className="btn-secondary text-sm"
            >
              <Save size={14} strokeWidth={1.6} />
              {saveAttendance.isPending ? 'Сохранение…' : 'Сохранить посещаемость'}
            </button>
            <button
              type="button"
              onClick={() => close.mutate()}
              disabled={close.isPending || studentRows.length === 0}
              className="btn-primary text-sm"
            >
              <Lock size={14} strokeWidth={1.6} />
              {close.isPending ? 'Закрытие…' : 'Закрыть урок'}
            </button>
            {(saveAttendance.isError || close.isError) && (
              <span className="text-xs text-terra-700 self-center">
                Ошибка: проверьте, что для всех студентов выставлен статус.
              </span>
            )}
          </div>
        </div>
      )}

      <CreateAssignmentModal
        open={createHwOpen}
        onClose={() => setCreateHwOpen(false)}
        lessonId={id!}
      />

      {editLessonOpen && lesson.data && (
        <EditLessonModal
          open
          onClose={() => setEditLessonOpen(false)}
          lesson={lesson.data}
        />
      )}
      {videoOpen && lesson.data && (
        <VideoClassroom
          open
          onClose={() => setVideoOpen(false)}
          lessonId={lesson.data.id}
          lessonTitle={lesson.data.title}
        />
      )}
    </div>
  );
}

/** Lightweight markdown → JSX renderer (no deps). Supports # ## ###, bold,
 * italic, bullet lists, blockquotes, tables, and code-fences as <pre>.
 * Good enough for lesson body that we author ourselves. */
function LessonMarkdown({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const inline = (s: string): React.ReactNode => {
    // bold **x** then italic *x*
    const parts: React.ReactNode[] = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith('**')) parts.push(<strong key={parts.length} className="text-ink-900 font-bold">{tok.slice(2, -2)}</strong>);
      else if (tok.startsWith('`')) parts.push(<code key={parts.length} className="font-mono text-xs bg-paper-200 text-ink-800 px-1.5 py-0.5 rounded">{tok.slice(1, -1)}</code>);
      else parts.push(<em key={parts.length} className="text-ink-700">{tok.slice(1, -1)}</em>);
      last = m.index + tok.length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith('### ')) {
      out.push(<h4 key={key++} className="font-display text-base font-bold text-ink-900 mt-5 mb-2">{inline(line.slice(4))}</h4>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      out.push(<h3 key={key++} className="font-display text-lg font-extrabold text-ink-900 mt-6 mb-2">{inline(line.slice(3))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      out.push(<h2 key={key++} className="font-display text-xl font-extrabold text-ink-900 mt-7 mb-3">{inline(line.slice(2))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) { buf.push(lines[i].slice(2)); i++; }
      out.push(
        <blockquote key={key++} className="border-l-4 border-forest-500 bg-forest-50/50 pl-4 py-2 my-3 italic text-ink-700">
          {buf.map((b, j) => <div key={j}>{inline(b)}</div>)}
        </blockquote>,
      );
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <ul key={key++} className="list-disc list-outside space-y-1 my-3 ml-5 marker:text-forest-500">
          {items.map((it, j) => <li key={j} className="text-ink-700 leading-relaxed">{inline(it)}</li>)}
        </ul>,
      );
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      out.push(
        <ol key={key++} className="list-decimal list-outside space-y-1 my-3 ml-5 marker:text-forest-500 marker:font-bold">
          {items.map((it, j) => <li key={j} className="text-ink-700 leading-relaxed">{inline(it)}</li>)}
        </ol>,
      );
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (/^\|\s*-/.test(lines[i])) { i++; continue; }
        rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()));
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={key++} className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-paper-300 rounded-lg overflow-hidden">
            <thead className="bg-paper-100">
              <tr>{head.map((h, j) => <th key={j} className="px-3 py-2 text-left font-semibold text-ink-900">{inline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, j) => (
                <tr key={j} className="border-t border-paper-300">
                  {r.map((c, k) => <td key={k} className="px-3 py-2 text-ink-700">{inline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    out.push(<p key={key++} className="text-ink-700 leading-relaxed my-3">{inline(line)}</p>);
    i++;
  }

  return <div className="text-sm">{out}</div>;
}

function SummaryTile({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent: 'sage' | 'gold' | 'terra' | 'ink';
}) {
  const tone =
    accent === 'sage'
      ? 'text-sage-700'
      : accent === 'gold'
      ? 'text-gold-700'
      : accent === 'terra'
      ? 'text-terra-500'
      : 'text-ink-700';
  return (
    <div className="card-flat py-3 px-4 flex items-baseline justify-between">
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-500 font-semibold">{label}</span>
      <span className={`font-display text-2xl font-medium num ${tone}`}>{count}</span>
    </div>
  );
}
