'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector, pushToast } from '@/shared/store';
import { getApiErrorMessage } from '@/shared/lib/api';
import { useSaveMeal } from '@/entities/meal';
import { useAnalyzePhoto } from '../api/useAnalyzePhoto';
import { analysisSucceeded, wizardReset } from '../model/slice';
import { PhotoCapture } from './PhotoCapture';
import { ReviewStep } from './ReviewStep';

export function AddMealPhotoFlow() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { step, items, mealType, confidence } = useAppSelector((s) => s.addMealPhoto);

  const analyze = useAnalyzePhoto();
  const save = useSaveMeal();

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

  return (
    <PhotoCapture
      onAnalyze={onAnalyze}
      pending={analyze.isPending}
      error={analyze.isError ? getApiErrorMessage(analyze.error, 'Analyse mislukt.') : null}
    />
  );
}
