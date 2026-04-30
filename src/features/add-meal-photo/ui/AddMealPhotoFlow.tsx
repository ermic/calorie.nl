'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector, pushToast } from '@/shared/store';
import { getApiErrorMessage } from '@/shared/lib/api';
import { useHasGeminiKey } from '@/shared/lib/gemini-key-storage';
import { useSaveMeal } from '@/entities/meal';
import type { PipelineLogEntry } from '@/features/analyze-photo';
import { useAnalyzePhoto } from '../api/useAnalyzePhoto';
import { analysisSucceeded, wizardReset } from '../model/slice';
import { PhotoCapture } from './PhotoCapture';
import { ReviewStep } from './ReviewStep';
import { PipelineLogPane } from './PipelineLogPane';

export function AddMealPhotoFlow() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { step, items, mealType, confidence } = useAppSelector((s) => s.addMealPhoto);
  const hasKey = useHasGeminiKey();
  const [hydrated, setHydrated] = useState(false);
  const [logs, setLogs] = useState<PipelineLogEntry[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const pushLog = useCallback((entry: Omit<PipelineLogEntry, 'ts'>) => {
    setLogs((prev) => [...prev, { ...entry, ts: Date.now() }]);
  }, []);

  const analyze = useAnalyzePhoto(pushLog);
  const save = useSaveMeal();

  // Voorkomt hydration-mismatch op de 'sleutel-instellen'-card: server
  // ziet null (no key), client ziet pas na hydration de echte status.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  // Reset zowel bij mount (verse mealType-guess op basis van huidige tijd)
  // als bij unmount (volgende bezoek start schoon).
  useEffect(() => {
    dispatch(wizardReset());
    return () => {
      dispatch(wizardReset());
    };
  }, [dispatch]);

  const onAnalyze = (file: File) => {
    setLogs([]);
    setPhotoFile(file);
    analyze.mutate(file, {
      onSuccess: (res) => {
        dispatch(analysisSucceeded(res.analysis));
      },
    });
  };

  useEffect(() => {
    if (step === 'capture') setPhotoFile(null);
  }, [step]);

  const onSave = () => {
    save.mutate(
      {
        mealType,
        eatenAt: new Date().toISOString(),
        aiAnalyzed: true,
        aiConfidence: confidence ?? undefined,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
        })),
      },
      {
        onSuccess: () => {
          dispatch(pushToast({ type: 'success', message: 'Maaltijd opgeslagen' }));
          dispatch(wizardReset());
          router.push('/');
        },
      },
    );
  };

  const logPane = <PipelineLogPane logs={logs} onClear={() => setLogs([])} />;

  if (step === 'review') {
    return (
      <div className="space-y-4">
        <ReviewStep
          onSave={onSave}
          saving={save.isPending}
          error={save.isError ? getApiErrorMessage(save.error, 'Opslaan mislukt.') : null}
          photoUrl={photoUrl}
        />
        {logPane}
      </div>
    );
  }

  if (!hydrated) return null;

  return (
    <div className="space-y-4">
      <PhotoCapture
        onAnalyze={onAnalyze}
        pending={analyze.isPending}
        error={analyze.isError ? getApiErrorMessage(analyze.error, 'Analyse mislukt.') : null}
        hasKey={hasKey}
      />
      {logPane}
    </div>
  );
}
