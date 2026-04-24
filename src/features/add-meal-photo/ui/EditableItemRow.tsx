'use client';

import { Trash2 } from 'lucide-react';
import { IconButton, Input } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { EditableItem } from '../model/types';

export type EditableItemRowProps = {
  item: EditableItem;
  onChange: (patch: Partial<EditableItem> & Pick<EditableItem, 'clientId'>) => void;
  onRemove: (clientId: string) => void;
  className?: string;
};

export function EditableItemRow({ item, onChange, onRemove, className }: EditableItemRowProps) {
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
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={item.quantity}
            suffix={item.unit || 'g'}
            onChange={(e) => onChange({ clientId: item.clientId, quantity: Number(e.target.value) || 0 })}
            aria-label="Hoeveelheid"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted">Calorieën</span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={item.calories}
            onChange={(e) => onChange({ clientId: item.clientId, calories: Number(e.target.value) || 0 })}
            aria-label="Calorieën"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted">Eiwit (g)</span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={item.protein}
            onChange={(e) => onChange({ clientId: item.clientId, protein: Number(e.target.value) || 0 })}
            aria-label="Eiwit in gram"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted">Koolh. (g)</span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={item.carbs}
            onChange={(e) => onChange({ clientId: item.clientId, carbs: Number(e.target.value) || 0 })}
            aria-label="Koolhydraten in gram"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted">Vet (g)</span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={item.fat}
            onChange={(e) => onChange({ clientId: item.clientId, fat: Number(e.target.value) || 0 })}
            aria-label="Vet in gram"
          />
        </label>
      </div>
    </div>
  );
}
