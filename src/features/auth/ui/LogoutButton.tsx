'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useLogout } from '../api/useLogout';

export function LogoutButton({ fullWidth }: { fullWidth?: boolean }) {
  const logout = useLogout();

  return (
    <Button
      variant="secondary"
      icon={LogOut}
      onClick={() => logout.mutate()}
      loading={logout.isPending}
      fullWidth={fullWidth}
    >
      Uitloggen
    </Button>
  );
}
