'use client';

import { RefreshCw, Trash2 } from 'lucide-react';
import { IconButton, Input } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { parseDecimal } from '@/shared/lib/number';
import { useNevoLookup } from '../api/useNevoLookup';
import type { NevoSuggestion } from '../api/useNevoSearch';
import { NevoNameAutocomplete } from './NevoNameAutocomplete';
import type { EditableMealItem, NevoPer100g } from '../model/types';

export type MealItemEditorProps = {
  item: EditableMealItem;
  onChange: (patch: Partial<EditableMealItem> & Pick<EditableMealItem, 'clientId'>) => void;
  onRemove: (clientId: string) => void;
  className?: string;
};

const DECIMAL_PATTERN = '[0-9]*[.,]?[0-9]*';

function scaleMacros(per100g: NevoPer100g, grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round(per100g.calories * factor),
    protein: Math.round(per100g.protein * factor),
    carbs: Math.round(per100g.carbs * factor),
    fat: Math.round(per100g.fat * factor),
  };
}

export function MealItemEditor({ item, onChange, onRemove, className }: MealItemEditorProps) {
  const lookup = useNevoLookup();

  const handlePick = (s: NevoSuggestion) => {
    onChange({ clientId: item.clientId, name: s.nameNl, nevoCode: s.nevoCode });
    lookup.mutate(
      { nevoCode: s.nevoCode },
      {
        onSuccess: (per100g) => {
          const grams = item.quantity > 0 ? item.quantity : 100;
          onChange({
            clientId: item.clientId,
            nevoPer100g: per100g,
            // Vul tegelijk een werkbare default-quantity in als de
            // gebruiker er nog geen had — voorkomt 0 kcal direct na pick.
            quantity: item.quantity > 0 ? item.quantity : 100,
            unit: item.unit || 'g',
            ...scaleMacros(per100g, grams),
          });
        },
      },
    );
  };

  const handleQuantity = (raw: string) => {
    const quantity = parseDecimal(raw);
    const patch: Partial<EditableMealItem> & Pick<EditableMealItem, 'clientId'> = {
      clientId: item.clientId,
      quantity,
    };
    if (item.nevoPer100g) Object.assign(patch, scaleMacros(item.nevoPer100g, quantity));
    onChange(patch);
  };

  const handleReset = () => {
    if (!item.nevoPer100g) return;
    const grams = item.quantity > 0 ? item.quantity : 100;
    onChange({
      clientId: item.clientId,
      quantity: item.quantity > 0 ? item.quantity : 100,
      ...scaleMacros(item.nevoPer100g, grams),
    });
  };

  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-ink/10 bg-surface p-3 space-y-2',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <NevoNameAutocomplete
          value={item.name}
          onChange={(name) => onChange({ clientId: item.clientId, name })}
          onPick={handlePick}
          placeholder="Naam"
          ariaLabel="Naam"
          className="flex-1"
        />
        {item.nevoPer100g && (
          <IconButton
            icon={RefreshCw}
            variant="ghost"
            size="sm"
            aria-label="Macro's terugzetten naar NEVO-waarden"
            title="Macro's terugzetten naar NEVO-waarden"
            onClick={handleReset}
          />
        )}
        <IconButton
          icon={Trash2}
          variant="ghost"
          size="sm"
          aria-label="Verwijder item"
          onClick={() => onRemove(item.clientId)}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted">Hoeveelheid</span>
          <Input
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_PATTERN}
            value={item.quantity}
            suffix={item.unit || 'g'}
            onChange={(e) => handleQuantity(e.target.value)}
            aria-label="Hoeveelheid"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted">Calorieën</span>
          <Input
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_PATTERN}
            value={item.calories}
            onChange={(e) => onChange({ clientId: item.clientId, calories: parseDecimal(e.target.value) })}
            aria-label="Calorieën"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted">Eiwit (g)</span>
          <Input
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_PATTERN}
            value={item.protein}
            onChange={(e) => onChange({ clientId: item.clientId, protein: parseDecimal(e.target.value) })}
            aria-label="Eiwit in gram"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted">Koolh. (g)</span>
          <Input
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_PATTERN}
            value={item.carbs}
            onChange={(e) => onChange({ clientId: item.clientId, carbs: parseDecimal(e.target.value) })}
            aria-label="Koolhydraten in gram"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted">Vet (g)</span>
          <Input
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_PATTERN}
            value={item.fat}
            onChange={(e) => onChange({ clientId: item.clientId, fat: parseDecimal(e.target.value) })}
            aria-label="Vet in gram"
          />
        </label>
      </div>
    </div>
  );
}
