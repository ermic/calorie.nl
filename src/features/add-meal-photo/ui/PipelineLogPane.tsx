'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, IconButton } from '@/shared/ui';
import type { PipelineLogEntry } from '@/features/analyze-photo';
import { cn } from '@/shared/lib/cn';

export type PipelineLogPaneProps = {
  logs: PipelineLogEntry[];
  onClear: () => void;
};

const LEVEL_STYLES: Record<PipelineLogEntry['level'], string> = {
  info: 'text-ink',
  warn: 'text-accent-yellow',
  error: 'text-danger',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(
    d.getSeconds(),
  ).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export function PipelineLogPane({ logs, onClear }: PipelineLogPaneProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Houd de scroll-positie onderaan: nieuwe events zijn de relevante.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || collapsed) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, collapsed]);

  if (logs.length === 0) return null;

  return (
    <Card padded className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <Terminal size={14} aria-hidden />
          Pipeline-log ({logs.length})
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            size="sm"
            aria-label={collapsed ? 'Toon log' : 'Verberg log'}
            icon={collapsed ? ChevronDown : ChevronUp}
            onClick={() => setCollapsed((v) => !v)}
          />
          <IconButton size="sm" aria-label="Wis log" icon={Trash2} onClick={onClear} />
        </div>
      </div>

      {!collapsed && (
        <div
          ref={scrollRef}
          className="max-h-64 overflow-auto rounded-md bg-surface-muted p-2 font-mono text-[11px] leading-relaxed"
        >
          {logs.map((entry, i) => (
            <div key={i} className="space-y-0.5 border-b border-line/40 py-1 last:border-b-0">
              <div className="flex items-baseline gap-2">
                <span className="text-ink-muted shrink-0">{formatTime(entry.ts)}</span>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase',
                    entry.level === 'info' && 'bg-primary-100 text-primary-700',
                    entry.level === 'warn' && 'bg-accent-yellow/20 text-accent-yellow',
                    entry.level === 'error' && 'bg-danger/15 text-danger',
                  )}
                >
                  {entry.level}
                </span>
                <span className={cn('break-words', LEVEL_STYLES[entry.level])}>{entry.message}</span>
              </div>
              {entry.data !== undefined && (
                <pre className="ml-2 whitespace-pre-wrap break-words text-ink-muted">
                  {safeStringify(entry.data)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
