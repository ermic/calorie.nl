'use client';

import { Save, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, Input } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/lib/api';
import { parseDecimalOrNull } from '@/shared/lib/number';
import { calculateTDEE, type User } from '@/entities/user/model/calculations';
import { pushToast, useAppDispatch } from '@/shared/store';
import { useSetDailyGoal } from '../api/useSetDailyGoal';

export type GoalFormProps = {
  user: User;
};

function parseGoal(raw: string): number | null {
  const n = parseDecimalOrNull(raw);
  return n === null ? null : Math.round(n);
}

export function GoalForm({ user }: GoalFormProps) {
  const dispatch = useAppDispatch();
  const update = useSetDailyGoal();
  const [value, setValue] = useState(user.dailyCalorieGoal != null ? String(user.dailyCalorieGoal) : '');
  const [error, setError] = useState<string | null>(null);

  const tdee = calculateTDEE(user);
  const parsed = parseGoal(value);
  const dirty = (parsed ?? null) !== (user.dailyCalorieGoal ?? null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    update.mutate(parsed, {
      onSuccess: () => {
        dispatch(pushToast({ type: 'success', message: 'Doel opgeslagen' }));
        // revalidatePath in de server-action refresht reeds alle RSC's.
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, 'Opslaan mislukt.'));
      },
    });
  };

  return (
    <Card padded>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <h2 className="text-base font-semibold">Dagelijks calorie-doel</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Gebruikt voor de dashboard-ring. Laat leeg om de TDEE-schatting te gebruiken.
          </p>
        </div>

        <Input
          label="Doel"
          type="text"
          inputMode="numeric"
          suffix="kcal"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={tdee ? String(tdee) : '2000'}
          aria-label="Dagelijks calorie-doel"
        />

        {tdee !== null && (
          <button
            type="button"
            onClick={() => setValue(String(tdee))}
            className="inline-flex items-center gap-2 text-sm text-primary-700 hover:underline"
          >
            <Sparkles size={16} aria-hidden />
            Gebruik TDEE-suggestie ({tdee} kcal)
          </button>
        )}
        {tdee === null && (
          <p className="text-xs text-ink-muted">
            Vul gewicht, lengte, geboortedatum, geslacht en activiteit in om een TDEE-suggestie te zien.
          </p>
        )}

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          icon={Save}
          fullWidth
          loading={update.isPending}
          disabled={update.isPending || !dirty}
        >
          Doel opslaan
        </Button>
      </form>
    </Card>
  );
}
