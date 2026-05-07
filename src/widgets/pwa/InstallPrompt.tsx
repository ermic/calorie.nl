'use client';

import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Card, IconButton } from '@/shared/ui';

// beforeinstallprompt is Chrome/Edge/Samsung-specifiek; iOS Safari heeft
// een andere flow (Deel → Zet op beginscherm). Deze event biedt .prompt()
// om de install-dialog te tonen en een userChoice-promise te resolven.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'pwa:install-dismissed-at';
// Na dismiss 14 dagen niet opnieuw vragen.
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

type Variant = 'native' | 'ios' | null;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Safari gebruikt nog niet de standaard media-query; fallback op iOS.
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(navigatorStandalone);
}

// iOS Safari heeft geen beforeinstallprompt — detect via UA + standalone-
// property. Chrome op iOS gebruikt dezelfde WebKit en kent ook geen
// install-prompt; de hint geldt voor allebei. Edge cases (Firefox iOS,
// in-app browsers) worden via dezelfde 'iOS-like' detectie gevangen.
// iPadOS 13+ rapporteert MacIntel als platform; vangen via
// maxTouchPoints>1 zodat iPads ook de hint krijgen.
function isIOSLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

function snoozeActive(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < SNOOZE_MS;
  } catch {
    // Private mode / storage disabled — behandel als gesnoozed zodat
    // we de mount-flow niet breken met een uncaught throw.
    return true;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [variant, setVariant] = useState<Variant>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone() || snoozeActive()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVariant('native');
    };
    const onInstalled = () => {
      setVariant(null);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS-pad: geen event om op te wachten — toon de hint direct als we
    // op iOS zijn en niet al standalone draaien. Met een korte delay
    // zodat we niet meteen na load de UI vol drukken.
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (isIOSLike()) {
      iosTimer = setTimeout(() => setVariant((v) => v ?? 'ios'), 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    setVariant(null);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode / storage disabled — geen ramp; user ziet de prompt
      // dan later opnieuw.
    }
  };

  const install = async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'dismissed') {
        dismiss();
      } else {
        setVariant(null);
      }
      setDeferred(null);
    } catch (err) {
      console.error('[InstallPrompt] prompt mislukt:', err);
      dismiss();
    } finally {
      setInstalling(false);
    }
  };

  if (variant === null) return null;
  if (variant === 'native' && !deferred) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-16 md:bottom-4 z-40 px-4 pointer-events-none"
      role="dialog"
      aria-labelledby="pwa-install-title"
    >
      <Card
        padded
        className="pointer-events-auto mx-auto max-w-md flex items-start gap-3 border border-ink/10"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          {variant === 'ios' ? <Share size={20} aria-hidden /> : <Download size={20} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p id="pwa-install-title" className="text-sm font-semibold">
            Installeer als app
          </p>
          {variant === 'ios' ? (
            <p className="mt-0.5 text-xs text-ink-muted">
              Tik op het deel-icoon{' '}
              <Share size={12} className="inline-block align-text-bottom" aria-hidden />{' '}
              onderaan je browser en kies <strong>Zet op beginscherm</strong>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-muted">
              Snellere toegang, offline ondersteuning en een eigen plek op je beginscherm.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {variant === 'native' && (
              <Button size="sm" onClick={install} loading={installing} disabled={installing}>
                Installeren
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss} disabled={installing}>
              Later
            </Button>
          </div>
        </div>
        <IconButton
          icon={X}
          variant="ghost"
          size="sm"
          aria-label="Sluiten"
          onClick={dismiss}
          disabled={installing}
        />
      </Card>
    </div>
  );
}
