import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, MessageCircle, PenLine, Send } from 'lucide-react';
import {
  fetchAssignments,
  fetchSubmissions,
  gradeSubmission,
  submitHomework,
} from '@/api/assignments';
import { fetchUsers } from '@/api/users';
import { useAuthStore } from '@/stores/authStore';
import { ASSIGNMENT_KIND_LABEL, formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SubmissionPill } from '@/components/ui/StatusPill';
import type { Assignment, Submission } from '@/types';

export function HomeworkPage() {
  const user = useAuthStore((s) => s.user);
  const isStudent = !!user && user.roles.includes('student') && !user.roles.includes('teacher');

  const assignments = useQuery({
    queryKey: ['hw', isStudent],
    queryFn: () => fetchAssignments({ student_only: isStudent }),
  });

  const [openId, setOpenId] = useState<string | null>(null);

  const items = assignments.data ?? [];
  const opened = items.find((a) => a.id === openId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Письменные и устные задания"
        title="Домашние задания"
        description={
          isStudent
            ? 'Сдавайте работы и следите за оценкой.'
            : 'Выдавайте задания, проверяйте сдачи, ставьте оценки.'
        }
      />

      {assignments.isLoading ? (
        <div className="card text-ink-500 text-sm">Загрузка…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<PenLine size={20} strokeWidth={1.6} />}
          title="Заданий нет"
          description={isStudent ? 'Заданий пока нет — отдыхайте.' : 'Создайте первое задание после урока.'}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          <aside className="card-bare overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-900/10 text-[10px] uppercase tracking-[0.2em] text-ink-500 font-semibold">
              Задания · {items.length}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-ink-900/5">
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setOpenId(a.id)}
                    className={
                      openId === a.id
                        ? 'block w-full text-left px-4 py-3 bg-paper-100 border-l-2 border-l-forest-700'
                        : 'block w-full text-left px-4 py-3 hover:bg-paper-100 border-l-2 border-l-transparent'
                    }
                  >
                    <div className="font-display text-sm font-medium text-ink-900 truncate">{a.title}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5">
                      {ASSIGNMENT_KIND_LABEL[a.kind]} ·{' '}
                      {a.due_at ? `до ${formatDateTime(a.due_at)}` : 'без дедлайна'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <main>
            {opened ? (
              <AssignmentDetail assignment={opened} isStudent={isStudent} />
            ) : (
              <div className="card text-ink-500 text-center py-16">
                <div className="font-display italic text-display-md text-ink-300 mb-2">
                  ←
                </div>
                Выберите задание слева
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function AssignmentDetail({ assignment, isStudent }: { assignment: Assignment; isStudent: boolean }) {
  const qc = useQueryClient();
  const submissions = useQuery({
    queryKey: ['submissions', assignment.id],
    queryFn: () => fetchSubmissions(assignment.id),
  });
  const users = useQuery({ queryKey: ['users-min'], queryFn: () => fetchUsers({ limit: 200 }) });

  const userById = new Map((users.data ?? []).map((u) => [u.id, u]));

  const [draft, setDraft] = useState('');

  const submit = useMutation({
    mutationFn: (asSubmit: boolean) =>
      submitHomework(assignment.id, { answer: draft }, asSubmit),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submissions', assignment.id] }),
  });

  return (
    <div className="space-y-4">
      <div className="card relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-gold-50 opacity-50" />
        <div className="relative">
          <div className="eyebrow flex items-center gap-2">
            <FileText size={12} strokeWidth={1.6} />
            {ASSIGNMENT_KIND_LABEL[assignment.kind]}
          </div>
          <h2 className="font-display text-display-md font-medium text-ink-900 leading-tight text-balance">
            {assignment.title}
          </h2>
          {assignment.instructions && (
            <p className="text-sm text-ink-600 mt-3 leading-relaxed">{assignment.instructions}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
            <span>
              Макс.&nbsp;балл:{' '}
              <span className="font-display font-medium text-ink-900 num">{assignment.max_score}</span>
            </span>
            {assignment.due_at && (
              <span>
                Срок:{' '}
                <span className="text-ink-700 num">{formatDateTime(assignment.due_at)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {isStudent ? (
        <div className="card space-y-3">
          <div className="flex items-center gap-2 eyebrow">
            <PenLine size={12} strokeWidth={1.6} /> Моя работа
          </div>
          <textarea
            className="input w-full"
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Введите ваш ответ…"
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => submit.mutate(false)} className="btn-secondary text-sm">
              Сохранить черновик
            </button>
            <button onClick={() => submit.mutate(true)} className="btn-primary text-sm">
              <Send size={14} strokeWidth={2} /> Отправить
            </button>
          </div>
          <div className="rule pt-3">
            <div className="hairline-label mb-3">история попыток</div>
            <SubmissionList submissions={submissions.data ?? []} userById={userById} canGrade={false} />
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center gap-2 eyebrow">
            <MessageCircle size={12} strokeWidth={1.6} /> Сдачи студентов · {(submissions.data ?? []).length}
          </div>
          <SubmissionList
            submissions={submissions.data ?? []}
            userById={userById}
            canGrade
            maxScore={assignment.max_score}
          />
        </div>
      )}
    </div>
  );
}

function SubmissionList({
  submissions,
  userById,
  canGrade,
  maxScore,
}: {
  submissions: Submission[];
  userById: Map<string, { full_name: string }>;
  canGrade: boolean;
  maxScore?: number;
}) {
  if (submissions.length === 0) {
    return <div className="text-sm text-ink-400 italic font-display py-4">Сдач пока нет</div>;
  }
  return (
    <ul className="divide-y divide-ink-900/5">
      {submissions.map((s) => (
        <SubmissionRow
          key={s.id}
          submission={s}
          studentName={userById.get(s.student_id)?.full_name ?? s.student_id.slice(0, 8)}
          canGrade={canGrade}
          maxScore={maxScore ?? 10}
        />
      ))}
    </ul>
  );
}

function SubmissionRow({
  submission,
  studentName,
  canGrade,
  maxScore,
}: {
  submission: Submission;
  studentName: string;
  canGrade: boolean;
  maxScore: number;
}) {
  const qc = useQueryClient();
  const [grade, setGrade] = useState<number>(submission.score ?? Math.round(maxScore * 0.7));
  const [feedback, setFeedback] = useState(submission.feedback ?? '');

  const gradeMut = useMutation({
    mutationFn: () => gradeSubmission(submission.id, grade, feedback),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submissions'] }),
  });

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink-900">{studentName}</div>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs text-ink-500">
            <SubmissionPill status={submission.status} />
            <span>попытка {submission.attempt_no}</span>
            {submission.submitted_at && (
              <span className="num">· {formatDateTime(submission.submitted_at)}</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {submission.score !== null ? (
            <div>
              <div className="font-display text-display-md font-medium num text-forest-700 leading-none">
                {submission.score}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold mt-1 num">
                из {maxScore}
              </div>
            </div>
          ) : (
            <div className="text-xs text-ink-400 italic">не оценено</div>
          )}
        </div>
      </div>
      {submission.feedback && (
        <div className="mt-2 text-sm text-ink-600 italic font-display border-l-2 border-gold-300 pl-3">
          «{submission.feedback}»
        </div>
      )}
      {canGrade && submission.status === 'submitted' && (
        <div className="mt-3 flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-ink-500 font-semibold block mb-1">
              Балл (0–{maxScore})
            </label>
            <input
              type="number"
              min={0}
              max={maxScore}
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="input w-20 py-1 px-2 text-sm num"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase tracking-[0.18em] text-ink-500 font-semibold block mb-1">
              Фидбек
            </label>
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="input w-full py-1 px-2 text-sm"
            />
          </div>
          <button
            onClick={() => gradeMut.mutate()}
            disabled={gradeMut.isPending}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <CheckCircle2 size={12} strokeWidth={2} /> Оценить
          </button>
        </div>
      )}
    </li>
  );
}
