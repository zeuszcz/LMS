import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAssignments,
  fetchSubmissions,
  gradeSubmission,
  submitHomework,
} from '@/api/assignments';
import { fetchUsers } from '@/api/users';
import { useAuthStore } from '@/stores/authStore';
import { ASSIGNMENT_KIND_LABEL, formatDateTime } from '@/lib/format';
import type { Assignment, Submission } from '@/types';

export function HomeworkPage() {
  const user = useAuthStore((s) => s.user)!;
  const isStudent = user.roles.includes('student') && !user.roles.includes('teacher');

  const assignments = useQuery({
    queryKey: ['hw', isStudent],
    queryFn: () => fetchAssignments({ student_only: isStudent }),
  });

  const [openId, setOpenId] = useState<string | null>(null);

  if (assignments.isLoading) return <div className="text-slate-500">Загрузка…</div>;

  const items = assignments.data ?? [];
  const opened = items.find((a) => a.id === openId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Домашние задания</h1>

      {items.length === 0 ? (
        <div className="card text-center text-slate-500">Заданий нет</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card lg:col-span-1 max-h-[36rem] overflow-y-auto p-2">
            <ul className="divide-y divide-slate-100">
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setOpenId(a.id)}
                    className={
                      openId === a.id
                        ? 'block w-full text-left px-3 py-2 bg-brand-50 text-brand-700'
                        : 'block w-full text-left px-3 py-2 hover:bg-slate-50'
                    }
                  >
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-slate-500">
                      {ASSIGNMENT_KIND_LABEL[a.kind]} ·{' '}
                      {a.due_at ? `до ${formatDateTime(a.due_at)}` : 'без дедлайна'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            {opened ? (
              <AssignmentDetail assignment={opened} isStudent={isStudent} />
            ) : (
              <div className="card text-slate-500 text-center">Выберите задание слева</div>
            )}
          </div>
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
    <div className="space-y-3">
      <div className="card">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          {ASSIGNMENT_KIND_LABEL[assignment.kind]}
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mt-1">{assignment.title}</h2>
        {assignment.instructions && (
          <p className="text-sm text-slate-600 mt-2">{assignment.instructions}</p>
        )}
        <div className="text-xs text-slate-400 mt-2">
          Макс. балл: {assignment.max_score}
          {assignment.due_at && ` · до ${formatDateTime(assignment.due_at)}`}
        </div>
      </div>

      {isStudent ? (
        <div className="card space-y-2">
          <h3 className="font-semibold text-slate-900">Моя работа</h3>
          <textarea
            className="input w-full"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Введите ваш ответ…"
          />
          <div className="flex gap-2">
            <button onClick={() => submit.mutate(false)} className="btn-secondary text-sm">
              Сохранить черновик
            </button>
            <button onClick={() => submit.mutate(true)} className="btn-primary text-sm">
              Отправить
            </button>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-2">
            <h4 className="text-sm font-medium text-slate-700 mb-1">История попыток</h4>
            <SubmissionList submissions={submissions.data ?? []} userById={userById} canGrade={false} />
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-semibold text-slate-900 mb-2">
            Сдачи студентов ({(submissions.data ?? []).length})
          </h3>
          <SubmissionList submissions={submissions.data ?? []} userById={userById} canGrade maxScore={assignment.max_score} />
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
  if (submissions.length === 0) return <div className="text-sm text-slate-400">Сдач пока нет</div>;
  return (
    <ul className="divide-y divide-slate-100">
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
    <li className="py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{studentName}</div>
          <div className="text-xs text-slate-500">
            {submission.status} · попытка {submission.attempt_no}
            {submission.submitted_at && ` · сдано ${formatDateTime(submission.submitted_at)}`}
          </div>
        </div>
        <div className="text-right">
          {submission.score !== null ? (
            <div className="text-lg font-semibold text-brand-700">
              {submission.score} / {maxScore}
            </div>
          ) : (
            <div className="text-xs text-slate-400">не оценено</div>
          )}
        </div>
      </div>
      {submission.feedback && (
        <div className="text-xs text-slate-500 mt-1 italic">«{submission.feedback}»</div>
      )}
      {canGrade && submission.status === 'submitted' && (
        <div className="mt-2 flex gap-2 items-end">
          <div>
            <label className="text-[10px] text-slate-500 block">Балл (0–{maxScore})</label>
            <input
              type="number"
              min={0}
              max={maxScore}
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="input w-20 py-1 px-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 block">Фидбек</label>
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
            Оценить
          </button>
        </div>
      )}
    </li>
  );
}
