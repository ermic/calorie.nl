'use client';

import { Camera, ImageUp, KeyRound, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

const MAX_MB = 10;

export type PhotoCaptureProps = {
  onAnalyze: (file: File) => void;
  pending: boolean;
  error: string | null;
  hasKey: boolean;
};

export function PhotoCapture({ onAnalyze, pending, error, hasKey }: PhotoCaptureProps) {
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

  if (!hasKey) {
    return (
      <Card padded className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <KeyRound size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Eerst een API key instellen</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Foto-analyse roept Gemini direct vanuit je browser aan met je eigen sleutel — wij slaan
              hem nooit op. Stel hem in op je profiel.
            </p>
          </div>
        </div>
        <Link
          href="/profile"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-600 text-white px-5 text-sm font-medium hover:bg-primary-700"
        >
          <KeyRound size={18} aria-hidden />
          Sleutel instellen
        </Link>
      </Card>
    );
  }

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
