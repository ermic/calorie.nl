'use client';

import { Trash2 } from 'lucide-react';
import { IconButton, Input } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { parseDecimal } from '@/shared/lib/number';
import type { EditableMealItem } from '../model/types';

export type MealItemEditorProps = {
  item: EditableMealItem;
  onChange: (patch: Partial<EditableMealItem> & Pick<EditableMealItem, 'clientId'>) => void;
  onRemove: (clientId: string) => void;
  className?: string;
};

const DECIMAL_PATTERN = '[0-9]*[.,]?[0-9]*';

export function MealItemEditor({ item, onChange, onRemove, className }: MealItemEditorProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-ink/10 bg-surface p-3 space-y-2',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Input
          value={item.name}
          onChange={(e) => onChange({ clientId: item.clientId, name: e.target.value })}
          placeholder="Naam"
          aria-label="Naam"
          className="flex-1"
        />
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
            onChange={(e) => onChange({ clientId: item.clientId, quantity: parseDecimal(e.target.value) })}
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
