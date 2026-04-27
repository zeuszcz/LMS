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
  if (isError) return <Navigate to="/login" replace />;

  // Block children until store actually has the user — avoids race where
  // pages dereference user.* during the render cycle that sets it.
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-ink-500 text-sm flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-forest-500 animate-pulse" />
          Загрузка{isLoading ? '…' : ''}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
