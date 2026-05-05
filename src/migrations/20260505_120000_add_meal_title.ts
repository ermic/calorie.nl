import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

// Voeg een korte AI-samenvatting toe aan meals (bv. "kipfilet met rijst").
// Nullable: bestaande meals én niet-AI-flows (handmatige toevoeg-flow) hebben
// geen titel — UI valt dan terug op het mealType-label. IF NOT EXISTS zodat
// een dev-mode push die de kolom al toegevoegd heeft niet blokkeert.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "title" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "meals" DROP COLUMN IF EXISTS "title";
  `);
}
