import { useQuery } from '@tanstack/react-query';
import { fetchCourses } from '@/api/courses';
import type { Course } from '@/types';

const LANGUAGE_LABEL: Record<string, string> = {
  en: 'Английский',
  de: 'Немецкий',
  fr: 'Французский',
  it: 'Итальянский',
  es: 'Испанский',
  zh: 'Китайский',
  ja: 'Японский',
  ko: 'Корейский',
};

const AGE_LABEL: Record<string, string> = {
  kids: 'Дети',
  teens: 'Подростки',
  adults: 'Взрослые',
};

export function CoursesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['courses'],
    queryFn: () => fetchCourses({ only_published: true, limit: 100 }),
  });

  if (isLoading) return <div className="text-slate-500">Загрузка курсов…</div>;
  if (isError) return <div className="text-red-600">Ошибка загрузки курсов</div>;

  const courses = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Каталог курсов</h1>
        <span className="text-sm text-slate-500">Всего: {data?.total ?? 0}</span>
      </div>

      {courses.length === 0 ? (
        <div className="card text-center text-slate-500">
          Курсов пока нет. Методист или администратор может добавить курс через API
          <code className="text-xs ml-1">POST /api/courses/</code>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{course.title}</h3>
        <span className="text-xs font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
          {course.level}
        </span>
      </div>
      <div className="text-sm text-slate-500 mt-1">
        {LANGUAGE_LABEL[course.language] ?? course.language} ·{' '}
        {AGE_LABEL[course.age_group] ?? course.age_group}
      </div>
      <p className="text-sm text-slate-600 mt-2 line-clamp-3">
        {course.description ?? 'Описание не задано'}
      </p>
      <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
        <span>{course.lessons_count} уроков</span>
        <span>{course.duration_weeks} нед.</span>
      </div>
    </div>
  );
}
