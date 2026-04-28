import { Video } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  lessonTitle: string;
}

export function VideoClassroomStub({ open, onClose, lessonTitle }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Видеокласс"
      description={`«${lessonTitle}»`}
      footer={
        <button onClick={onClose} className="btn-primary">Закрыть</button>
      }
    >
      <div className="rounded-2xl bg-gradient-to-br from-ink-900 to-ink-800 text-white p-8 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur border border-white/20 mb-5">
          <Video size={28} strokeWidth={1.6} />
        </div>
        <h3 className="font-display text-display-md font-extrabold leading-tight">
          LiveKit-классы — Phase 2
        </h3>
        <p className="mt-3 text-sm text-white/80 max-w-md mx-auto leading-relaxed">
          Здесь будет интерактивная видео-комната с участниками, шарингом экрана,
          доской и записью урока. Self-hosted LiveKit в Yandex Cloud · совместим с
          requirements 152-ФЗ.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 py-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-gold-500 animate-pulse" />
          В разработке
        </div>
      </div>
    </Modal>
  );
}
