'use client';

import { Plus, RefreshCw, Save } from 'lucide-react';
import {
  MealItemEditor,
  MealRatingPicker,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  sumMealItems,
  type MealRating,
  type MealType,
} from '@/entities/meal';
import { Button, Card, Tabs, TabsList, TabsTrigger } from '@/shared/ui';
import { formatKcal, formatMacro } from '@/shared/lib/format';
import { useAppDispatch, useAppSelector } from '@/shared/store';
import {
  backToCapture,
  itemAdded,
  itemRemoved,
  itemUpdated,
  mealTypeSet,
  ratingSet,
} from '../model/slice';

export type ReviewStepProps = {
  onSave: () => void;
  saving: boolean;
  error: string | null;
  photoUrl: string | null;
};

export function ReviewStep({ onSave, saving, error, photoUrl }: ReviewStepProps) {
  const dispatch = useAppDispatch();
  const { items, mealType, confidence, notes, userRating } = useAppSelector((s) => s.addMealPhoto);
  const totals = sumMealItems(items);
  const lowConfidence = confidence !== null && confidence < 0.5;

  return (
    <div className="space-y-4">
      {photoUrl && (
        <Card padded={false} className="overflow-hidden bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Geanalyseerde foto"
            className="aspect-[4/3] w-full object-contain"
          />
        </Card>
      )}

      {lowConfidence && (
        <Card padded className="border border-accent-yellow/60 bg-accent-yellow/10">
          <p className="text-sm text-ink">
            AI-analyse heeft een lage zekerheid ({Math.round((confidence ?? 0) * 100)}%). Controleer de
            items hieronder.
          </p>
          {notes && <p className="mt-1 text-xs text-ink-muted">{notes}</p>}
        </Card>
      )}

      <Card padded>
        <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
          Type maaltijd
        </label>
        <Tabs value={mealType} onValueChange={(v) => dispatch(mealTypeSet(v as MealType))}>
          <TabsList className="w-full [&>button]:flex-1">
            {MEAL_TYPE_ORDER.map((t) => (
              <TabsTrigger key={t} value={t}>
                {MEAL_TYPE_LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Card>

      <div className="space-y-2">
        {items.map((item) => (
          <MealItemEditor
            key={item.clientId}
            item={item}
            onChange={(patch) => dispatch(itemUpdated(patch))}
            onRemove={(id) => dispatch(itemRemoved(id))}
          />
        ))}
        <Button variant="ghost" icon={Plus} fullWidth onClick={() => dispatch(itemAdded())}>
          Item toevoegen
        </Button>
      </div>

      <Card padded className="flex items-center justify-between">
        <div>
          <div className="text-xs text-ink-muted">Totaal</div>
          <div className="text-xl font-semibold">{formatKcal(totals.calories)}</div>
        </div>
        <div className="text-right text-xs text-ink-muted space-y-0.5">
          <div>E {formatMacro(totals.protein)}</div>
          <div>K {formatMacro(totals.carbs)}</div>
          <div>V {formatMacro(totals.fat)}</div>
        </div>
      </Card>

      <Card padded>
        <div className="mb-2 text-sm font-medium text-ink">
          Hoe goed schatte de AI deze maaltijd?
        </div>
        <MealRatingPicker
          value={(userRating as MealRating | null) ?? null}
          onChange={(r) => dispatch(ratingSet(r))}
        />
        <p className="mt-2 text-xs text-ink-muted">
          Optioneel — je rating helpt om de schatting in de toekomst te verbeteren.
        </p>
      </Card>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button
          variant="secondary"
          icon={RefreshCw}
          onClick={() => dispatch(backToCapture())}
          disabled={saving}
        >
          Opnieuw
        </Button>
        <Button
          variant="primary"
          icon={Save}
          size="lg"
          onClick={onSave}
          disabled={saving || items.length === 0}
          loading={saving}
        >
          Opslaan
        </Button>
      </div>
    </div>
  );
}
