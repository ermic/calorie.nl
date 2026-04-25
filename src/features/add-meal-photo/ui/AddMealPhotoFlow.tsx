'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector, pushToast } from '@/shared/store';
import { getApiErrorMessage } from '@/shared/lib/api';
import { useHasGeminiKey } from '@/shared/lib/gemini-key-storage';
import { GEMINI_FALLBACK_MODEL } from '@/shared/api/gemini';
import { useSaveMeal } from '@/entities/meal';
import { useAnalyzePhoto } from '../api/useAnalyzePhoto';
import { analysisSucceeded, wizardReset } from '../model/slice';
import { PhotoCapture } from './PhotoCapture';
import { ReviewStep } from './ReviewStep';

export function AddMealPhotoFlow() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { step, items, mealType, confidence } = useAppSelector((s) => s.addMealPhoto);
  const hasKey = useHasGeminiKey();
  const [hydrated, setHydrated] = useState(false);

  const analyze = useAnalyzePhoto();
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
    analyze.mutate(file, {
      onSuccess: (res) => {
        dispatch(analysisSucceeded(res.analysis));
        if (res.model === GEMINI_FALLBACK_MODEL) {
          dispatch(
            pushToast({
              type: 'info',
              message: 'Quota van Gemini Flash bereikt — gebruik Flash Lite als fallback.',
            }),
          );
        }
      },
    });
  };

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

  if (step === 'review') {
    return (
      <ReviewStep
        onSave={onSave}
        saving={save.isPending}
        error={save.isError ? getApiErrorMessage(save.error, 'Opslaan mislukt.') : null}
      />
    );
  }

  if (!hydrated) return null;

  return (
    <PhotoCapture
      onAnalyze={onAnalyze}
      pending={analyze.isPending}
      error={analyze.isError ? getApiErrorMessage(analyze.error, 'Analyse mislukt.') : null}
      hasKey={hasKey}
    />
  );
}
