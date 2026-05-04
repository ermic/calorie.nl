import { z } from 'zod';
import { isValidDecimalString, parseDecimalOrNull } from '@/shared/lib/number';
import { isValidTimezone } from '@/shared/lib/timezone';

// Form-inputs zijn altijd strings; we valideren als string (accepteert
// zowel NL-komma als punt) en pareren naar numbers / null vlak voor de
// mutation.
const numericString = z
  .string()
  .trim()
  .refine(isValidDecimalString, 'Ongeldige waarde');

export const ProfileSchema = z.object({
  name: z.string().trim().max(100),
  weightKg: numericString.refine(
    (v) => (parseDecimalOrNull(v) ?? 0) <= 500,
    'Maximaal 500 kg',
  ),
  heightCm: numericString.refine(
    (v) => (parseDecimalOrNull(v) ?? 0) <= 300,
    'Maximaal 300 cm',
  ),
  birthDate: z.string().trim(),
  gender: z.enum(['', 'MALE', 'FEMALE', 'OTHER']),
  activityLevel: z.enum(['', 'SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']),
  timezone: z.string().trim().refine(isValidTimezone, 'Ongeldige tijdzone'),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

// Vorm die richting de Payload API gaat — numeriek of null, geen lege strings.
export type ProfilePatch = {
  name?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  birthDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  activityLevel?: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE' | null;
  timezone?: string;
};

export function toProfilePatch(input: ProfileInput): ProfilePatch {
  return {
    name: input.name.trim() || null,
    weightKg: parseDecimalOrNull(input.weightKg),
    heightCm: parseDecimalOrNull(input.heightCm),
    birthDate: input.birthDate ? new Date(input.birthDate).toISOString() : null,
    gender: input.gender === '' ? null : input.gender,
    activityLevel: input.activityLevel === '' ? null : input.activityLevel,
    timezone: input.timezone,
  };
}
