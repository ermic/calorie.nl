import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// users_sessions had alleen indexen op _order en _parent_id; de globale
// cleanup van verlopen sessies (DELETE … WHERE expires_at < NOW()) deed
// een seq-scan. Met deze index wordt die delete logaritmisch i.p.v.
// lineair in het aantal sessies.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "users_sessions_expires_at_idx"
    ON "users_sessions" USING btree ("expires_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "users_sessions_expires_at_idx";
  `)
}
