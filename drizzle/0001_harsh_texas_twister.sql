CREATE TABLE "nutrition_plan" (
	"userId" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nutrition_plan" ADD CONSTRAINT "nutrition_plan_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;