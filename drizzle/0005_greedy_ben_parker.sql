CREATE TABLE "meal_plan_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" date NOT NULL,
	"mealType" text NOT NULL,
	"savedMealId" integer NOT NULL,
	"mealLogId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meal_plan_entry_userId_date_mealType_unique" UNIQUE("userId","date","mealType")
);
--> statement-breakpoint
CREATE TABLE "saved_meal" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"mealType" text NOT NULL,
	"recipe" text DEFAULT '' NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"servings" integer DEFAULT 1 NOT NULL,
	"kcal" real DEFAULT 0 NOT NULL,
	"protein" real DEFAULT 0 NOT NULL,
	"carb" real DEFAULT 0 NOT NULL,
	"fat" real DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'ai' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_plan_entry" ADD CONSTRAINT "meal_plan_entry_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_entry" ADD CONSTRAINT "meal_plan_entry_savedMealId_saved_meal_id_fk" FOREIGN KEY ("savedMealId") REFERENCES "public"."saved_meal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_entry" ADD CONSTRAINT "meal_plan_entry_mealLogId_meal_log_id_fk" FOREIGN KEY ("mealLogId") REFERENCES "public"."meal_log"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meal" ADD CONSTRAINT "saved_meal_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;