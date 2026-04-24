'use client';

import { Camera, ImageUp, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

const MAX_MB = 4;

export type PhotoCaptureProps = {
  onAnalyze: (file: File) => void;
  pending: boolean;
  error: string | null;
};

export function PhotoCapture({ onAnalyze, pending, error }: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onPick = (chosen: File | null | undefined) => {
    setLocalError(null);
    if (!chosen) return;
    if (!chosen.type.startsWith('image/')) {
      setLocalError('Kies een foto (jpg, png).');
      return;
    }
    if (chosen.size > MAX_MB * 1024 * 1024) {
      setLocalError(`Foto is te groot (max ${MAX_MB}MB).`);
      return;
    }
    setFile(chosen);
  };

  const shownError = localError ?? error;

  return (
    <Card padded className="space-y-4">
      <div
        className={cn(
          'aspect-[4/3] w-full rounded-[var(--radius-card)] bg-surface-muted flex items-center justify-center overflow-hidden',
          preview && 'bg-ink',
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto van de maaltijd" className="h-full w-full object-contain" />
        ) : (
          <div className="text-ink-muted text-center px-6">
            <Camera size={40} className="mx-auto mb-2 opacity-60" aria-hidden />
            <p className="text-sm">Maak een foto van je maaltijd voor AI-analyse.</p>
          </div>
        )}
      </div>

      {shownError && (
        <p className="text-sm text-danger" role="alert">
          {shownError}
        </p>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={file ? 'secondary' : 'primary'}
          icon={Camera}
          onClick={() => cameraRef.current?.click()}
          disabled={pending}
        >
          Camera
        </Button>
        <Button
          variant="secondary"
          icon={ImageUp}
          onClick={() => galleryRef.current?.click()}
          disabled={pending}
        >
          Galerij
        </Button>
      </div>

      {file && (
        <Button
          variant="primary"
          icon={pending ? Loader2 : undefined}
          fullWidth
          size="lg"
          disabled={pending}
          loading={pending}
          onClick={() => onAnalyze(file)}
        >
          {pending ? 'Bezig met analyseren…' : 'Analyseer foto'}
        </Button>
      )}
    </Card>
  );
}
