CREATE TYPE "public"."platform_role" AS ENUM('admin', 'staff');--> statement-breakpoint
CREATE TABLE "pre_registered_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"platform_role" "platform_role" NOT NULL,
	"created_by" integer,
	"used_at" timestamp with time zone,
	"used_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pre_registered_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "pre_registered_users" ADD CONSTRAINT "pre_registered_users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_registered_users" ADD CONSTRAINT "pre_registered_users_used_by_user_id_users_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;