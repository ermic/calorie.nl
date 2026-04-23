import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_plan" AS ENUM('FREE', 'PREMIUM', 'PRO');
  CREATE TYPE "public"."enum_users_gender" AS ENUM('MALE', 'FEMALE', 'OTHER');
  CREATE TYPE "public"."enum_users_activity_level" AS ENUM('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');
  CREATE TYPE "public"."enum_foods_source" AS ENUM('USER', 'OPEN_FOOD_FACTS', 'AI_GENERATED', 'VERIFIED');
  CREATE TYPE "public"."enum_meals_meal_type" AS ENUM('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"plan" "enum_users_plan" DEFAULT 'FREE' NOT NULL,
  	"ai_photo_credits" numeric DEFAULT 5 NOT NULL,
  	"credits_reset_at" timestamp(3) with time zone,
  	"daily_calorie_goal" numeric DEFAULT 2000,
  	"weight_kg" numeric,
  	"height_cm" numeric,
  	"birth_date" timestamp(3) with time zone,
  	"gender" "enum_users_gender",
  	"activity_level" "enum_users_activity_level" DEFAULT 'MODERATE',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "foods" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"barcode" varchar,
  	"name" varchar NOT NULL,
  	"brand" varchar,
  	"calories_per100" numeric NOT NULL,
  	"protein_per100" numeric DEFAULT 0,
  	"carbs_per100" numeric DEFAULT 0,
  	"fat_per100" numeric DEFAULT 0,
  	"fiber_per100" numeric DEFAULT 0,
  	"sugar_per100" numeric DEFAULT 0,
  	"serving_size" numeric,
  	"serving_unit" varchar,
  	"source" "enum_foods_source" DEFAULT 'USER' NOT NULL,
  	"verified" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "day_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"total_calories" numeric DEFAULT 0,
  	"total_protein" numeric DEFAULT 0,
  	"total_carbs" numeric DEFAULT 0,
  	"total_fat" numeric DEFAULT 0,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "meals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"day_log_id" integer NOT NULL,
  	"eaten_at" timestamp(3) with time zone,
  	"meal_type" "enum_meals_meal_type" NOT NULL,
  	"photo_url" varchar,
  	"ai_analyzed" boolean DEFAULT false,
  	"ai_confidence" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "meal_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"meal_id" integer NOT NULL,
  	"food_id" integer,
  	"name" varchar NOT NULL,
  	"quantity" numeric NOT NULL,
  	"unit" varchar NOT NULL,
  	"calories" numeric NOT NULL,
  	"protein" numeric DEFAULT 0,
  	"carbs" numeric DEFAULT 0,
  	"fat" numeric DEFAULT 0,
  	"fiber" numeric DEFAULT 0,
  	"sugar" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"foods_id" integer,
  	"day_logs_id" integer,
  	"meals_id" integer,
  	"meal_items_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "day_logs" ADD CONSTRAINT "day_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "meals" ADD CONSTRAINT "meals_day_log_id_day_logs_id_fk" FOREIGN KEY ("day_log_id") REFERENCES "public"."day_logs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_foods_fk" FOREIGN KEY ("foods_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_day_logs_fk" FOREIGN KEY ("day_logs_id") REFERENCES "public"."day_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_meals_fk" FOREIGN KEY ("meals_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_meal_items_fk" FOREIGN KEY ("meal_items_id") REFERENCES "public"."meal_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "foods_barcode_idx" ON "foods" USING btree ("barcode");
  CREATE INDEX "foods_name_idx" ON "foods" USING btree ("name");
  CREATE INDEX "foods_updated_at_idx" ON "foods" USING btree ("updated_at");
  CREATE INDEX "foods_created_at_idx" ON "foods" USING btree ("created_at");
  CREATE INDEX "day_logs_user_idx" ON "day_logs" USING btree ("user_id");
  CREATE INDEX "day_logs_date_idx" ON "day_logs" USING btree ("date");
  CREATE INDEX "day_logs_updated_at_idx" ON "day_logs" USING btree ("updated_at");
  CREATE INDEX "day_logs_created_at_idx" ON "day_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_date_idx" ON "day_logs" USING btree ("user_id","date");
  CREATE INDEX "meals_user_idx" ON "meals" USING btree ("user_id");
  CREATE INDEX "meals_day_log_idx" ON "meals" USING btree ("day_log_id");
  CREATE INDEX "meals_updated_at_idx" ON "meals" USING btree ("updated_at");
  CREATE INDEX "meals_created_at_idx" ON "meals" USING btree ("created_at");
  CREATE INDEX "meal_items_meal_idx" ON "meal_items" USING btree ("meal_id");
  CREATE INDEX "meal_items_food_idx" ON "meal_items" USING btree ("food_id");
  CREATE INDEX "meal_items_updated_at_idx" ON "meal_items" USING btree ("updated_at");
  CREATE INDEX "meal_items_created_at_idx" ON "meal_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_foods_id_idx" ON "payload_locked_documents_rels" USING btree ("foods_id");
  CREATE INDEX "payload_locked_documents_rels_day_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("day_logs_id");
  CREATE INDEX "payload_locked_documents_rels_meals_id_idx" ON "payload_locked_documents_rels" USING btree ("meals_id");
  CREATE INDEX "payload_locked_documents_rels_meal_items_id_idx" ON "payload_locked_documents_rels" USING btree ("meal_items_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "foods" CASCADE;
  DROP TABLE "day_logs" CASCADE;
  DROP TABLE "meals" CASCADE;
  DROP TABLE "meal_items" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_plan";
  DROP TYPE "public"."enum_users_gender";
  DROP TYPE "public"."enum_users_activity_level";
  DROP TYPE "public"."enum_foods_source";
  DROP TYPE "public"."enum_meals_meal_type";`)
}
