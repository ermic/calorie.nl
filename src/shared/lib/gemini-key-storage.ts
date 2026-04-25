'use client';

import { useSyncExternalStore } from 'react';

// Browser-side opslag van de Gemini API key. Bewust geen server-side
// persistence: bij een DB-leak zou een aanvaller anders alle user-keys
// onbeperkt kunnen gebruiken. Trade-off: user moet de sleutel per device
// opnieuw invoeren.
//
// Versie-prefix in de key zodat we later kunnen migreren als we besluiten
// om bv. WebCrypto-encryptie met user-passphrase te introduceren.

const STORAGE_KEY = 'gemini-api-key:v1';
const CHANGE_EVENT = 'gemini-key-change';

export const KEY_VALIDATION_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

export function getGeminiKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    // Private mode / disabled storage — geen ramp, user ziet 'configureer
    // sleutel' UX.
    return null;
  }
}

export function setGeminiKey(value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    throw new Error('Sleutel kan niet worden opgeslagen — privé-modus actief?');
  }
}

export function clearGeminiKey(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // No-op — niet kritisch.
  }
}

export function hasGeminiKey(): boolean {
  return getGeminiKey() !== null;
}

export function isValidGeminiKey(value: string): boolean {
  return KEY_VALIDATION_PATTERN.test(value.trim());
}

// React-hook die altijd de actuele state volgt. Werkt cross-tab via het
// native 'storage'-event én same-tab via ons custom 'gemini-key-change'-
// event (storage event vuurt niet in de tab die het zelf zette).
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onCrossTab = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  const onSameTab = () => callback();
  window.addEventListener('storage', onCrossTab);
  window.addEventListener(CHANGE_EVENT, onSameTab);
  return () => {
    window.removeEventListener('storage', onCrossTab);
    window.removeEventListener(CHANGE_EVENT, onSameTab);
  };
}

function getSnapshot(): string | null {
  return getGeminiKey();
}

function getServerSnapshot(): string | null {
  return null;
}

/** Live-bound op localStorage: render reactief op insert/clear. */
export function useGeminiKey(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useHasGeminiKey(): boolean {
  return useGeminiKey() !== null;
}
