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

// Jaren-diff met correctie voor mensen die nog geen verjaardag hadden
// dit jaar. Gewoon getFullYear-diff zou iedereen vóór zijn verjaardag
// een jaar te oud maken — significant bij BMR-schatting voor jonge
// users.
export function calculateAge(birthDate: Date | string, now: Date = new Date()): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthdayThisYear =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthdayThisYear) age -= 1;
  return Math.max(0, age);
}

export function calculateTDEE(
  user: Pick<User, 'weightKg' | 'heightCm' | 'birthDate' | 'gender' | 'activityLevel'>,
): number | null {
  if (!user.weightKg || !user.heightCm || !user.birthDate || !user.gender || !user.activityLevel) {
    return null;
  }
  const bmr = calculateBMR({
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    age: calculateAge(user.birthDate),
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
