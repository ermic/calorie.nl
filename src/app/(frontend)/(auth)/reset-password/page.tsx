import type { Metadata } from 'next';
import { Card } from '@/shared/ui';
import { ResetPasswordForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Wachtwoord opnieuw instellen',
  // URL bevat een eenmalig reset-token; nooit indexeren of in archief opslaan.
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token = '' } = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <ResetPasswordForm token={token} />
    </Card>
  );
}
