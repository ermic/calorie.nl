import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// IF [NOT] EXISTS-patroon: dev krijgt deze tabel via Payload's auto-push
// (HMR), productie alleen via deze migratie. Idempotent dus altijd veilig.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "email_verifications" (
      "id" serial PRIMARY KEY NOT NULL,
      "token_hash" varchar NOT NULL,
      "user_id" varchar NOT NULL,
      "new_email" varchar,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "email_verifications_id" integer;
    CREATE UNIQUE INDEX IF NOT EXISTS "email_verifications_token_hash_idx" ON "email_verifications" USING btree ("token_hash");
    CREATE INDEX IF NOT EXISTS "email_verifications_user_id_idx" ON "email_verifications" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "email_verifications_expires_at_idx" ON "email_verifications" USING btree ("expires_at");
    CREATE INDEX IF NOT EXISTS "email_verifications_updated_at_idx" ON "email_verifications" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "email_verifications_created_at_idx" ON "email_verifications" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_verifications_fk"
        FOREIGN KEY ("email_verifications_id") REFERENCES "public"."email_verifications"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_email_verifications_id_idx" ON "payload_locked_documents_rels" USING btree ("email_verifications_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_email_verifications_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_email_verifications_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "email_verifications_id";
    DROP TABLE IF EXISTS "email_verifications" CASCADE;
  `)
}
