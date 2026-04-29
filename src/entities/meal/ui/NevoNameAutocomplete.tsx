'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Input } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useNevoSearch, type NevoSuggestion } from '../api/useNevoSearch';

export type NevoNameAutocompleteProps = {
  value: string;
  onChange: (next: string) => void;
  onPick: (suggestion: NevoSuggestion) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

const DEBOUNCE_MS = 250;

export function NevoNameAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
  ariaLabel,
  className,
}: NevoNameAutocompleteProps) {
  const listboxId = useId();
  const [debounced, setDebounced] = useState(value);
  // `open` is alleen door user-intent gestuurd (typing/focus opent, blur/
  // escape/pick sluit). Of er feitelijk een dropdown rendert hangt af van
  // suggestions.length tijdens render — geen sync setState in een effect.
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value]);

  const { data, isFetching } = useNevoSearch(debounced);
  const suggestions = data?.results ?? [];
  const showDropdown = open && suggestions.length > 0;
  const safeActive = activeIndex < suggestions.length ? activeIndex : 0;

  const close = () => {
    setOpen(false);
    setActiveIndex(0);
  };

  const select = (s: NevoSuggestion) => {
    onPick(s);
    close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (showDropdown && suggestions[safeActive]) {
        e.preventDefault();
        select(suggestions[safeActive]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  const activeOptionId = showDropdown ? `${listboxId}-opt-${safeActive}` : undefined;

  return (
    <div className={cn('relative', className)}>
      <Input
        value={value}
        onChange={(e) => {
          setOpen(true);
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        // 100ms vertraging zodat een mousedown op een option afgehandeld kan
        // worden voordat de blur de dropdown sluit.
        onBlur={() => window.setTimeout(close, 100)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        suffix={isFetching ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
      />
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className={cn(
            'absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-[var(--radius-card)]',
            'border border-ink/10 bg-surface shadow-lg',
          )}
        >
          {suggestions.map((s, idx) => {
            const active = idx === safeActive;
            return (
              <li
                key={s.nevoCode}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  // mousedown ipv click: Input.onBlur firet vóór click en zou
                  // anders de lijst al gesloten hebben.
                  e.preventDefault();
                  select(s);
                }}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  active ? 'bg-primary-500/10 text-ink' : 'text-ink hover:bg-ink/5',
                )}
              >
                <div className="font-medium">{s.nameNl}</div>
                {s.foodGroupNl && (
                  <div className="text-xs text-ink-muted">{s.foodGroupNl}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
