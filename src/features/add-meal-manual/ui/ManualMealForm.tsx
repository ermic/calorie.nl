'use client';

import { Plus, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  MealItemEditor,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  sumMealItems,
  useSaveMeal,
  type MealType,
} from '@/entities/meal';
import type { FoodSearchHit } from '@/entities/food';
import { Button, Card, Tabs, TabsList, TabsTrigger } from '@/shared/ui';
import { formatKcal, formatMacro } from '@/shared/lib/format';
import { getApiErrorMessage } from '@/shared/lib/api';
import { useAppDispatch, useAppSelector, pushToast } from '@/shared/store';
import {
  emptyItemAdded,
  foodHitAdded,
  itemRemoved,
  itemUpdated,
  mealTypeSet,
  wizardReset,
} from '../model/slice';
import { FoodSearch } from './FoodSearch';

export function ManualMealForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, mealType } = useAppSelector((s) => s.addMealManual);
  const save = useSaveMeal();
  const totals = sumMealItems(items);

  useEffect(() => {
    dispatch(wizardReset());
    return () => {
      dispatch(wizardReset());
    };
  }, [dispatch]);

  const onSelect = (hit: FoodSearchHit) => {
    dispatch(foodHitAdded({ hit }));
  };

  const onSave = () => {
    save.mutate(
      {
        mealType,
        eatenAt: new Date().toISOString(),
        aiAnalyzed: false,
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

  return (
    <div className="space-y-4">
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

      <Card padded>
        <FoodSearch onSelect={onSelect} />
      </Card>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <MealItemEditor
              key={item.clientId}
              item={item}
              onChange={(patch) => dispatch(itemUpdated(patch))}
              onRemove={(id) => dispatch(itemRemoved(id))}
            />
          ))}
        </div>
      )}

      <Button variant="ghost" icon={Plus} fullWidth onClick={() => dispatch(emptyItemAdded())}>
        Leeg item toevoegen
      </Button>

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

      {save.isError && (
        <p className="text-sm text-danger" role="alert">
          {getApiErrorMessage(save.error, 'Opslaan mislukt.')}
        </p>
      )}

      <Button
        variant="primary"
        icon={Save}
        size="lg"
        fullWidth
        onClick={onSave}
        disabled={save.isPending || items.length === 0}
        loading={save.isPending}
      >
        Opslaan
      </Button>
    </div>
  );
}
