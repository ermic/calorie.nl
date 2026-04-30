import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// IF [NOT] EXISTS-patroon: dev krijgt deze kolommen via Payload's auto-push
// (HMR), productie alleen via deze migratie. Idempotent dus altijd veilig.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_password" boolean DEFAULT true;
    ALTER TABLE "foods" ADD COLUMN IF NOT EXISTS "created_by_id" integer;
    DO $$ BEGIN
      ALTER TABLE "foods" ADD CONSTRAINT "foods_created_by_id_users_id_fk"
        FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "foods_created_by_idx" ON "foods" USING btree ("created_by_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "foods" DROP CONSTRAINT IF EXISTS "foods_created_by_id_users_id_fk";
    DROP INDEX IF EXISTS "foods_created_by_idx";
    ALTER TABLE "foods" DROP COLUMN IF EXISTS "created_by_id";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "has_password";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified";
  `)
}
