CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "food" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalizedName" text NOT NULL,
	"synonyms" jsonb DEFAULT '[]'::jsonb,
	"kcalPer100g" real NOT NULL,
	"proteinPer100g" real NOT NULL,
	"carbPer100g" real NOT NULL,
	"fatPer100g" real NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_log_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"mealLogId" integer NOT NULL,
	"foodId" integer,
	"label" text NOT NULL,
	"grams" real NOT NULL,
	"kcal" real NOT NULL,
	"protein" real NOT NULL,
	"carb" real NOT NULL,
	"fat" real NOT NULL,
	"confidence" text DEFAULT 'high' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" date NOT NULL,
	"mealType" text NOT NULL,
	"note" text,
	"kcal" real DEFAULT 0 NOT NULL,
	"protein" real DEFAULT 0 NOT NULL,
	"carb" real DEFAULT 0 NOT NULL,
	"fat" real DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"userId" text PRIMARY KEY NOT NULL,
	"sex" text NOT NULL,
	"birthYear" integer NOT NULL,
	"heightCm" real NOT NULL,
	"weightKg" real NOT NULL,
	"activityLevel" text NOT NULL,
	"goalType" text NOT NULL,
	"goalRateKgPerWeek" real DEFAULT 0 NOT NULL,
	"targetWeightKg" real,
	"dietaryPrefs" jsonb DEFAULT '[]'::jsonb,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"dislikes" jsonb DEFAULT '[]'::jsonb,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "weight_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" date NOT NULL,
	"weightKg" real NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_item" ADD CONSTRAINT "meal_log_item_mealLogId_meal_log_id_fk" FOREIGN KEY ("mealLogId") REFERENCES "public"."meal_log"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_item" ADD CONSTRAINT "meal_log_item_foodId_food_id_fk" FOREIGN KEY ("foodId") REFERENCES "public"."food"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log" ADD CONSTRAINT "meal_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_log" ADD CONSTRAINT "weight_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;