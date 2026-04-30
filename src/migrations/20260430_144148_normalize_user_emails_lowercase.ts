import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Bestaande users kunnen mixed-case email-adressen hebben (geseed via
// een client die niet normaliseerde). Onze change-email-route, register
// en account-linking lowercase'n nieuwe input — voor consistentie
// lowercase'n we ook de bestaande rijen.
//
// Edge case: twee users met `User@example.com` en `user@example.com`
// kunnen na lowercase een unique-constraint-conflict op users_email_idx
// veroorzaken. We loggen via NOTICE welke conflicten er zijn en behouden
// in dat geval de oudste (laagste id); de nieuwere wordt niet aangepast
// — manuele cleanup nodig.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "users"
    SET "email" = LOWER("email")
    WHERE "email" <> LOWER("email")
      AND NOT EXISTS (
        SELECT 1 FROM "users" u2
        WHERE u2."email" = LOWER("users"."email") AND u2."id" <> "users"."id"
      );

    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT id, email FROM "users" WHERE "email" <> LOWER("email")
      LOOP
        RAISE NOTICE 'Email-lowercase skipped voor user %: % zou conflicteren met bestaande lowercase-rij', r.id, r.email;
      END LOOP;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // No-op: we kunnen de oorspronkelijke casing niet meer herstellen.
  await db.execute(sql`SELECT 1`)
}
