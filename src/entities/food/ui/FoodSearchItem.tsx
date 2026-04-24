'use client';

import { Plus } from 'lucide-react';
import { Badge, IconButton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatKcal, formatMacro } from '@/shared/lib/format';
import type { FoodSearchHit } from '../model/types';

export type FoodSearchItemProps = {
  hit: FoodSearchHit;
  onSelect: (hit: FoodSearchHit) => void;
  className?: string;
};

export function FoodSearchItem({ hit, onSelect, className }: FoodSearchItemProps) {
  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-card)] border border-ink/10 bg-surface p-3 list-none',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-medium truncate">{hit.name}</h3>
          {hit.source === 'off' ? (
            <Badge variant="info" size="sm">
              OFF
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              Lokaal
            </Badge>
          )}
        </div>
        {hit.brand && <p className="text-xs text-ink-muted truncate">{hit.brand}</p>}
        <p className="mt-1 text-xs text-ink-muted">
          <span className="text-ink font-medium">{formatKcal(hit.caloriesPer100)}</span>
          <span> / 100g · E {formatMacro(hit.proteinPer100)} · K {formatMacro(hit.carbsPer100)} · V {formatMacro(hit.fatPer100)}</span>
        </p>
      </div>
      <IconButton
        icon={Plus}
        variant="solid"
        size="sm"
        aria-label={`Voeg ${hit.name} toe`}
        onClick={() => onSelect(hit)}
      />
    </li>
  );
}
