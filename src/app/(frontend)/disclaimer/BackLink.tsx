'use client';

import { useRouter } from 'next/navigation';

export function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        } else {
          router.push('/');
        }
      }}
      className="text-sm text-primary-600 hover:underline"
    >
      Terug
    </button>
  );
}
