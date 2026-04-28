import { useEffect, useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { Loader2, Video, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle: string;
}

interface TokenResponse {
  url: string;
  token: string;
  room: string;
  identity: string;
  role: 'teacher' | 'student';
}

export function VideoClassroom({ open, onClose, lessonId, lessonTitle }: Props) {
  const [data, setData] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<TokenResponse>(`/api/livekit/lesson/${lessonId}/token`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        const detail =
          err?.response?.data?.detail ?? err?.message ?? 'Не удалось получить токен';
        setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lessonId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Видеокласс"
      description={`«${lessonTitle}»`}
      size="full"
      footer={
        <button onClick={onClose} className="btn-secondary">
          Покинуть
        </button>
      }
    >
      <div className="-mx-6 -mb-6 h-[70vh] min-h-[480px] overflow-hidden rounded-b-3xl bg-ink-950">
        {loading && (
          <div className="flex h-full items-center justify-center text-white/80">
            <Loader2 className="mr-3 animate-spin" size={20} />
            Подключаемся к комнате…
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30">
              <AlertCircle size={26} strokeWidth={1.7} />
            </div>
            <div className="max-w-md">
              <h3 className="font-display text-lg font-semibold text-white">
                LiveKit недоступен
              </h3>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">{error}</p>
              <p className="mt-3 text-xs text-white/50">
                Убедитесь что в .env заданы LIVEKIT_URL / LIVEKIT_API_KEY /
                LIVEKIT_API_SECRET и сервер LiveKit запущен.
              </p>
            </div>
          </div>
        )}

        {data && !loading && !error && (
          <LiveKitRoom
            token={data.token}
            serverUrl={data.url}
            connect
            video
            audio
            onDisconnected={onClose}
            data-lk-theme="default"
            style={{ height: '100%' }}
          >
            <VideoConference />
            <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
              <Video size={14} strokeWidth={1.8} />
              {data.role === 'teacher' ? 'Преподаватель' : 'Студент'} ·{' '}
              {data.identity}
            </div>
          </LiveKitRoom>
        )}
      </div>
    </Modal>
  );
}
