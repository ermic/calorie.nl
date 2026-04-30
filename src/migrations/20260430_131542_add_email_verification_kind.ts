import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// IF [NOT] EXISTS-patroon: dev krijgt 'kind' via Payload's auto-push,
// productie alleen via deze migratie. Idempotent dus altijd veilig.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_email_verifications_kind" AS ENUM('verify', 'change-confirm', 'change-revoke');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    ALTER TABLE "email_verifications" ADD COLUMN IF NOT EXISTS "kind" "enum_email_verifications_kind" DEFAULT 'verify' NOT NULL;
    CREATE INDEX IF NOT EXISTS "email_verifications_kind_idx" ON "email_verifications" USING btree ("kind");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "email_verifications_kind_idx";
    ALTER TABLE "email_verifications" DROP COLUMN IF EXISTS "kind";
    DROP TYPE IF EXISTS "public"."enum_email_verifications_kind";
  `)
}
