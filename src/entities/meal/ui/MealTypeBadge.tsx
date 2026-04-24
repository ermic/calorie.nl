import { Badge, type BadgeProps } from '@/shared/ui';
import { MEAL_TYPE_LABELS, type MealType } from '../model/types';

const VARIANT_BY_TYPE: Record<MealType, NonNullable<BadgeProps['variant']>> = {
  BREAKFAST: 'warning',
  LUNCH: 'success',
  DINNER: 'primary',
  SNACK: 'info',
};

export type MealTypeBadgeProps = {
  type: MealType;
  size?: BadgeProps['size'];
};

export function MealTypeBadge({ type, size = 'sm' }: MealTypeBadgeProps) {
  return (
    <Badge variant={VARIANT_BY_TYPE[type]} size={size}>
      {MEAL_TYPE_LABELS[type]}
    </Badge>
  );
}
