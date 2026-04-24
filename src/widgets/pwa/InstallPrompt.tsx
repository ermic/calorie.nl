'use client';

import { Download, X } from 'lucide-react';
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

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Safari gebruikt nog niet de standaard media-query; fallback op iOS.
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(navigatorStandalone);
}

function snoozeActive(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < SNOOZE_MS;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone() || snoozeActive()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
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
        setVisible(false);
      }
      setDeferred(null);
    } catch (err) {
      console.error('[InstallPrompt] prompt mislukt:', err);
      dismiss();
    } finally {
      setInstalling(false);
    }
  };

  if (!visible || !deferred) return null;

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
          <Download size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p id="pwa-install-title" className="text-sm font-semibold">
            Installeer als app
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Snellere toegang, offline ondersteuning en een eigen plek op je beginscherm.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={install} loading={installing} disabled={installing}>
              Installeren
            </Button>
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
