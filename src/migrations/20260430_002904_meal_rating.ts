import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // IF NOT EXISTS: in dev kan Payload de kolommen al via dev-mode push
  // hebben aangemaakt. Productie ziet ze niet — daar voegt deze migratie
  // ze toe. Idempotent, dus altijd veilig.
  await db.execute(sql`
    ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "user_rating" numeric;
    ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "ai_snapshot" jsonb;
    ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "pipeline_debug" jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "meals" DROP COLUMN IF EXISTS "pipeline_debug";
    ALTER TABLE "meals" DROP COLUMN IF EXISTS "ai_snapshot";
    ALTER TABLE "meals" DROP COLUMN IF EXISTS "user_rating";
  `);
}
