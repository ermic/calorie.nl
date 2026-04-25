'use client';

import { Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Card, IconButton, Input } from '@/shared/ui';
import { pushToast, useAppDispatch } from '@/shared/store';
import {
  clearGeminiKey,
  isValidGeminiKey,
  setGeminiKey,
  useHasGeminiKey,
} from '@/shared/lib/gemini-key-storage';

export function ApiKeyCard() {
  const dispatch = useAppDispatch();
  const hasKey = useHasGeminiKey();
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // useSyncExternalStore returns server-snapshot tijdens SSR (null);
  // pas na hydration weet de UI of er een sleutel staat. Dit voorkomt
  // hydration-mismatch tussen 'niet ingesteld' en 'ingesteld'.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const close = () => {
    setEditing(false);
    setRevealed(false);
    setValue('');
    setError(null);
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!isValidGeminiKey(trimmed)) {
      setError('Ongeldige sleutel — verwacht een AI Studio key (alleen letters, cijfers, _ en -, minimaal 20 tekens).');
      return;
    }
    try {
      setGeminiKey(trimmed);
      dispatch(pushToast({ type: 'success', message: 'API-key opgeslagen op dit toestel' }));
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    }
  };

  const onClear = () => {
    clearGeminiKey();
    dispatch(pushToast({ type: 'success', message: 'API-key gewist' }));
    close();
  };

  return (
    <Card padded>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <KeyRound size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Gemini API key</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Eigen sleutel voor foto-analyse. Haal hem op via{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-700 hover:underline"
            >
              aistudio.google.com/apikey
            </a>
            . De sleutel blijft op dit apparaat — wij slaan hem nooit op onze servers op. Bij een ander device moet je hem opnieuw invoeren.
          </p>
          <p className="mt-2 text-xs">
            Status:{' '}
            {!hydrated ? (
              <span className="text-ink-muted">…</span>
            ) : hasKey ? (
              <span className="font-medium text-[#3f6d1e]">✓ ingesteld op dit toestel</span>
            ) : (
              <span className="font-medium text-danger">✗ niet ingesteld</span>
            )}
          </p>
        </div>
      </div>

      {editing ? (
        <form onSubmit={onSave} className="mt-4 space-y-3" noValidate>
          <Input
            label={hasKey ? 'Nieuwe sleutel' : 'Sleutel'}
            type={revealed ? 'text' : 'password'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Plak hier je AI Studio API key"
            autoComplete="off"
            spellCheck={false}
            error={error ?? undefined}
            suffix={
              <IconButton
                icon={revealed ? EyeOff : Eye}
                variant="ghost"
                size="sm"
                aria-label={revealed ? 'Verberg sleutel' : 'Toon sleutel'}
                onClick={(e) => {
                  e.preventDefault();
                  setRevealed((v) => !v);
                }}
              />
            }
          />
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={!value.trim()}>
              Opslaan
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Annuleer
            </Button>
          </div>
        </form>
      ) : (
        hydrated && (
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => setEditing(true)}>{hasKey ? 'Vervangen' : 'Instellen'}</Button>
            {hasKey && (
              <Button variant="danger" icon={Trash2} onClick={onClear}>
                Wissen
              </Button>
            )}
          </div>
        )
      )}
    </Card>
  );
}
