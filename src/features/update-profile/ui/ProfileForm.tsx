'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button, Card, Input, Select } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/lib/api';
import { pushToast, useAppDispatch } from '@/shared/store';
import type { User } from '@/payload-types';
import { useUpdateProfile } from '../api/useUpdateProfile';
import { ProfileSchema, toProfilePatch, type ProfileInput } from '../model/schema';

export type ProfileFormProps = {
  user: User;
};

function defaultValues(user: User): ProfileInput {
  return {
    name: user.name ?? '',
    weightKg: user.weightKg != null ? String(user.weightKg) : '',
    heightCm: user.heightCm != null ? String(user.heightCm) : '',
    birthDate: user.birthDate ? user.birthDate.slice(0, 10) : '',
    gender: user.gender ?? '',
    activityLevel: user.activityLevel ?? '',
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const update = useUpdateProfile(user.id);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileInput>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: defaultValues(user),
  });

  const onSubmit = (data: ProfileInput) => {
    update.mutate(toProfilePatch(data), {
      onSuccess: (res) => {
        dispatch(pushToast({ type: 'success', message: 'Profiel opgeslagen' }));
        reset(defaultValues(res.doc));
        router.refresh();
      },
    });
  };

  const errorMessage = update.isError ? getApiErrorMessage(update.error, 'Opslaan mislukt.') : null;

  return (
    <Card padded>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <h2 className="text-base font-semibold">Profiel</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Lichaamsmaten worden gebruikt om je dagelijkse caloriebehoefte (TDEE) te schatten.
          </p>
        </div>

        <Input
          label="Naam"
          autoComplete="name"
          hint="Optioneel"
          {...register('name')}
          error={errors.name?.message}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Gewicht"
            type="text"
            inputMode="decimal"
            suffix="kg"
            {...register('weightKg')}
            error={errors.weightKg?.message}
          />
          <Input
            label="Lengte"
            type="text"
            inputMode="decimal"
            suffix="cm"
            {...register('heightCm')}
            error={errors.heightCm?.message}
          />
        </div>

        <Input
          label="Geboortedatum"
          type="date"
          {...register('birthDate')}
          error={errors.birthDate?.message}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Geslacht" {...register('gender')} error={errors.gender?.message}>
            <option value="">—</option>
            <option value="MALE">Man</option>
            <option value="FEMALE">Vrouw</option>
            <option value="OTHER">Anders</option>
          </Select>
          <Select label="Activiteit" {...register('activityLevel')} error={errors.activityLevel?.message}>
            <option value="">—</option>
            <option value="SEDENTARY">Weinig beweging</option>
            <option value="LIGHT">Licht actief</option>
            <option value="MODERATE">Matig actief</option>
            <option value="ACTIVE">Actief</option>
            <option value="VERY_ACTIVE">Zeer actief</option>
          </Select>
        </div>

        {errorMessage && (
          <p className="text-sm text-danger" role="alert">
            {errorMessage}
          </p>
        )}

        <Button
          type="submit"
          icon={Save}
          fullWidth
          loading={update.isPending}
          disabled={update.isPending || !isDirty}
        >
          Opslaan
        </Button>
      </form>
    </Card>
  );
}
