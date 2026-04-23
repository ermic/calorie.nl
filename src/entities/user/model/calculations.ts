import type { User } from '@/payload-types';

export type { User };

export type Gender = NonNullable<User['gender']>;
export type ActivityLevel = NonNullable<User['activityLevel']>;

export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}): number {
  const { weightKg, heightCm, age, gender } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'MALE' ? base + 5 : base - 161;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export function calculateTDEE(
  user: Pick<User, 'weightKg' | 'heightCm' | 'birthDate' | 'gender' | 'activityLevel'>,
): number | null {
  if (!user.weightKg || !user.heightCm || !user.birthDate || !user.gender || !user.activityLevel) {
    return null;
  }
  const age = new Date().getFullYear() - new Date(user.birthDate).getFullYear();
  const bmr = calculateBMR({
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    age,
    gender: user.gender,
  });
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[user.activityLevel]);
}

export function getDailyAICredits(plan: User['plan']): number {
  switch (plan) {
    case 'FREE':
      return 5;
    case 'PREMIUM':
      return 50;
    case 'PRO':
      return 500;
    default:
      return 5;
  }
}
