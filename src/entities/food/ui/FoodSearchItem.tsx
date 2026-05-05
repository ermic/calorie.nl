'use client';

import { Loader2, Plus } from 'lucide-react';
import { Badge, IconButton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatKcal, formatMacro } from '@/shared/lib/format';
import type { FoodSearchHit } from '../model/types';

export type FoodSearchItemProps = {
  hit: FoodSearchHit;
  onSelect: (hit: FoodSearchHit) => void;
  /** Toont een spinner ipv het + icoon op deze rij. Caller-managed
   *  zodat de NEVO-macro-fetch zichtbaar is in de UI. */
  busy?: boolean;
  className?: string;
};

function sourceBadge(source: FoodSearchHit['source']) {
  if (source === 'off')
    return (
      <Badge variant="info" size="sm">
        OFF
      </Badge>
    );
  if (source === 'nevo')
    return (
      <Badge variant="info" size="sm">
        NEVO
      </Badge>
    );
  return (
    <Badge variant="neutral" size="sm">
      Lokaal
    </Badge>
  );
}

export function FoodSearchItem({ hit, onSelect, busy, className }: FoodSearchItemProps) {
  // NEVO-rijen krijgen pas macros zodra de gebruiker ze pickt. Tot die
  // tijd 0 in alle velden — verberg de macro-regel om geen "0 kcal" te
  // suggereren.
  const showMacros = hit.source !== 'nevo';
  const subtitle = hit.brand ?? hit.foodGroupNl ?? null;

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
          {sourceBadge(hit.source)}
        </div>
        {subtitle && <p className="text-xs text-ink-muted truncate">{subtitle}</p>}
        {showMacros ? (
          <p className="mt-1 text-xs text-ink-muted">
            <span className="text-ink font-medium">{formatKcal(hit.caloriesPer100)}</span>
            <span> / 100g · E {formatMacro(hit.proteinPer100)} · K {formatMacro(hit.carbsPer100)} · V {formatMacro(hit.fatPer100)}</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-ink-muted">Macro&rsquo;s laden bij toevoegen</p>
        )}
      </div>
      <IconButton
        icon={busy ? Loader2 : Plus}
        variant="solid"
        size="sm"
        aria-label={`Voeg ${hit.name} toe`}
        onClick={() => onSelect(hit)}
        disabled={busy}
        className={busy ? '[&>svg]:animate-spin' : undefined}
      />
    </li>
  );
}
