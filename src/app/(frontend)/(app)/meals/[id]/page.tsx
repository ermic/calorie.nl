import { notFound } from 'next/navigation';
import { MealDetailPage } from '@/views/meal-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isInteger(num) || num <= 0) notFound();
  return <MealDetailPage id={num} />;
}
