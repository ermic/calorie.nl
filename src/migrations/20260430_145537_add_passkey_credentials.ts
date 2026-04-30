import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// IF [NOT] EXISTS-patroon: dev krijgt deze tabel via Payload's auto-push
// (HMR), productie alleen via deze migratie. Idempotent dus altijd veilig.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_users_passkey_credentials_device_type" AS ENUM('singleDevice', 'multiDevice');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "users_passkey_credentials" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "credential_id" varchar NOT NULL,
      "public_key" varchar NOT NULL,
      "counter" numeric DEFAULT 0 NOT NULL,
      "transports" jsonb,
      "device_type" "enum_users_passkey_credentials_device_type",
      "backed_up" boolean DEFAULT false,
      "label" varchar,
      "created_at" timestamp(3) with time zone,
      "last_used_at" timestamp(3) with time zone
    );

    DO $$ BEGIN
      ALTER TABLE "users_passkey_credentials" ADD CONSTRAINT "users_passkey_credentials_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "users_passkey_credentials_order_idx" ON "users_passkey_credentials" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "users_passkey_credentials_parent_id_idx" ON "users_passkey_credentials" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "users_passkey_credentials_credential_id_idx" ON "users_passkey_credentials" USING btree ("credential_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "users_passkey_credentials" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_users_passkey_credentials_device_type";
  `)
}
