'use client';

import Link from 'next/link';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IconButton, Input } from '@/shared/ui';
import { ApiError } from '@/shared/lib/api';
import { FoodSearchItem, type FoodSearchHit } from '@/entities/food';
import { useNevoLookup } from '@/entities/meal';
import { useAppDispatch, pushToast } from '@/shared/store';
import { useSearchFoods } from '../api/useSearchFoods';

export type FoodSearchProps = {
  onSelect: (hit: FoodSearchHit) => void;
};

function hitKey(hit: FoodSearchHit) {
  return `${hit.source}-${hit.id ?? hit.barcode ?? hit.name}`;
}

export function FoodSearch({ onSelect }: FoodSearchProps) {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const lookup = useNevoLookup();
  // Stale closure: handleSelect leest `input` op het moment dat de async
  // mutation start. Tijdens de await kan de gebruiker doortypen — dan mag
  // de input niet alsnog gewist worden. Ref houdt de laatste waarde bij.
  const inputRef = useRef(input);
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input), 250);
    return () => window.clearTimeout(t);
  }, [input]);

  const { data, isFetching, isError, error } = useSearchFoods(debounced);
  // Gate op de huidige input, niet op `data` zelf: react-query houdt via
  // keepPreviousData oude hits vast nadat het zoekveld geleegd is.
  const isActive = input.trim().length >= 2;
  const hits = isActive ? data?.results ?? [] : [];
  const offAvailable = data?.offAvailable ?? true;
  const nevoAvailable = data?.nevoAvailable ?? true;
  const showHint = input.length > 0 && input.trim().length < 2;
  const sessionExpired = error instanceof ApiError && error.status === 401;

  const handleSelect = async (hit: FoodSearchHit) => {
    // NEVO-rijen krijgen pas macros via een aparte calculate-call. Lookup
    // hier zodat de Redux-slice synchroon blijft en niets weet van NEVO.
    if (hit.source === 'nevo' && hit.id != null) {
      if (busyKey) return; // voorkom dubbele clicks tijdens een lopende lookup
      const key = hitKey(hit);
      const inputAtClick = inputRef.current;
      setBusyKey(key);
      try {
        const per100g = await lookup.mutateAsync({ nevoCode: hit.id });
        const enriched: FoodSearchHit = {
          ...hit,
          caloriesPer100: per100g.calories,
          proteinPer100: per100g.protein,
          carbsPer100: per100g.carbs,
          fatPer100: per100g.fat,
        };
        // Alleen wissen als de gebruiker tijdens de lookup niet alvast
        // verder is gaan typen — anders blazen we hun nieuwe zoekopdracht weg.
        if (inputRef.current === inputAtClick) setInput('');
        onSelect(enriched);
      } catch {
        dispatch(
          pushToast({
            type: 'error',
            message: 'NEVO-data niet beschikbaar. Probeer opnieuw.',
          }),
        );
      } finally {
        setBusyKey(null);
      }
      return;
    }
    setInput('');
    onSelect(hit);
  };

  return (
    <div className="space-y-3">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Zoek voedingsmiddel…"
        aria-label="Zoek voedingsmiddel"
        prefix={<Search size={16} aria-hidden />}
        suffix={
          isFetching ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : input ? (
            <IconButton
              icon={X}
              variant="ghost"
              size="sm"
              aria-label="Wissen"
              onClick={() => setInput('')}
            />
          ) : null
        }
      />

      {showHint && (
        <p className="text-xs text-ink-muted">Typ minimaal 2 letters om te zoeken.</p>
      )}

      {sessionExpired ? (
        <p className="text-sm text-danger" role="alert">
          Sessie verlopen.{' '}
          <Link href="/login" className="underline">
            Log opnieuw in
          </Link>
          .
        </p>
      ) : (
        isError && (
          <p className="text-sm text-danger" role="alert">
            Zoeken mislukt. Probeer opnieuw.
          </p>
        )
      )}

      {isActive && debounced.length >= 2 && hits.length === 0 && !isFetching && !isError && (
        <p className="text-sm text-ink-muted">
          Geen resultaten voor &ldquo;{debounced}&rdquo;.
          {!offAvailable && ' Open Food Facts is tijdelijk niet bereikbaar.'}
          {!nevoAvailable && ' NEVO-bron is tijdelijk niet bereikbaar.'}
        </p>
      )}

      {hits.length > 0 && (
        <ul role="list" aria-label="Zoekresultaten" className="space-y-2">
          {hits.map((hit, index) => {
            const key = hitKey(hit);
            return (
              <FoodSearchItem
                // OFF kan duplicates zonder barcode/id teruggeven; index-in-
                // result-set is stabiel binnen 1 query.
                key={`${key}-${index}`}
                hit={hit}
                onSelect={handleSelect}
                busy={busyKey === key}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
