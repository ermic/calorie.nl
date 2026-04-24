import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">{children}</div>;
}
