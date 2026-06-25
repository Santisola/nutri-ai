CREATE TABLE "shopping_list" (
	"userId" text PRIMARY KEY NOT NULL,
	"period" text DEFAULT 'weekly' NOT NULL,
	"householdSize" integer DEFAULT 1 NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mealIdeas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "householdSize" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "shopping_list" ADD CONSTRAINT "shopping_list_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;