import { Card } from '@/shared/ui';
import { ResetPasswordForm } from '@/features/auth';

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
