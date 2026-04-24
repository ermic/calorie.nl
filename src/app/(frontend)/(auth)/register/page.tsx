import { redirect } from 'next/navigation';
import { Card } from '@/shared/ui';
import { RegisterForm } from '@/features/auth';
import { getCurrentUser } from '@/shared/lib/auth-guard';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  return (
    <Card className="w-full max-w-sm">
      <RegisterForm />
    </Card>
  );
}
