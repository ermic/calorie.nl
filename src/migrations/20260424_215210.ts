import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "foods" ADD COLUMN "created_by_id" integer;
    ALTER TABLE "foods" ADD CONSTRAINT "foods_created_by_id_users_id_fk"
      FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
    CREATE INDEX "foods_created_by_idx" ON "foods" USING btree ("created_by_id");
  `);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "foods_created_by_idx";
    ALTER TABLE "foods" DROP CONSTRAINT IF EXISTS "foods_created_by_id_users_id_fk";
    ALTER TABLE "foods" DROP COLUMN IF EXISTS "created_by_id";
  `);
}
