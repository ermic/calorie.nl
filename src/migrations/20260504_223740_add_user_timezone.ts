import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

// Voeg een per-user IANA-tijdzone toe. Bestaande users krijgen de v1
// default ('Europe/Amsterdam') zodat het gedrag identiek blijft aan
// vóór deze migratie. Nieuwe users krijgen via Payload defaultValue
// dezelfde fallback wanneer de client geen timezone meestuurt.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "timezone" varchar DEFAULT 'Europe/Amsterdam' NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone";
  `);
}
