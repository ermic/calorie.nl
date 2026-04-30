import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// IF [NOT] EXISTS-patroon: dev krijgt deze schema-veranderingen via
// Payload's auto-push (HMR), productie alleen via deze migratie.
// Idempotent dus altijd veilig.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_users_providers_provider" AS ENUM('google', 'facebook', 'passkey');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_login_challenges_kind" AS ENUM('oauth-state', 'webauthn-register', 'webauthn-login');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "users_providers" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "provider" "enum_users_providers_provider" NOT NULL,
      "provider_user_id" varchar NOT NULL,
      "email" varchar,
      "email_verified" boolean DEFAULT false,
      "linked_at" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "login_challenges" (
      "id" serial PRIMARY KEY NOT NULL,
      "kind" "enum_login_challenges_kind" NOT NULL,
      "challenge" varchar NOT NULL,
      "pkce_verifier" varchar,
      "provider" varchar,
      "intent" varchar,
      "user_id" varchar,
      "return_to" varchar,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "login_challenges_id" integer;

    DO $$ BEGIN
      ALTER TABLE "users_providers" ADD CONSTRAINT "users_providers_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "users_providers_order_idx" ON "users_providers" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "users_providers_parent_id_idx" ON "users_providers" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "users_providers_provider_user_id_idx" ON "users_providers" USING btree ("provider_user_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "users_providers_unique" ON "users_providers" USING btree ("provider", "provider_user_id");

    CREATE INDEX IF NOT EXISTS "login_challenges_kind_idx" ON "login_challenges" USING btree ("kind");
    CREATE UNIQUE INDEX IF NOT EXISTS "login_challenges_challenge_idx" ON "login_challenges" USING btree ("challenge");
    CREATE INDEX IF NOT EXISTS "login_challenges_user_id_idx" ON "login_challenges" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "login_challenges_expires_at_idx" ON "login_challenges" USING btree ("expires_at");
    CREATE INDEX IF NOT EXISTS "login_challenges_updated_at_idx" ON "login_challenges" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "login_challenges_created_at_idx" ON "login_challenges" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_login_challenges_fk"
        FOREIGN KEY ("login_challenges_id") REFERENCES "public"."login_challenges"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_login_challenges_id_idx" ON "payload_locked_documents_rels" USING btree ("login_challenges_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_login_challenges_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_login_challenges_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "login_challenges_id";
    DROP TABLE IF EXISTS "users_providers" CASCADE;
    DROP TABLE IF EXISTS "login_challenges" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_users_providers_provider";
    DROP TYPE IF EXISTS "public"."enum_login_challenges_kind";
  `)
}
