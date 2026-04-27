import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { fetchMe } from '@/api/auth';

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: !!accessToken && !user,
    retry: false,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  if (!accessToken) return <Navigate to="/login" replace />;
  if (isLoading && !user) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">Загрузка…</div>
    );
  }
  if (isError) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
