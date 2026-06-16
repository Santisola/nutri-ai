ALTER TABLE "nutrition_plan" ADD COLUMN "source" text DEFAULT 'generated' NOT NULL;--> statement-breakpoint
ALTER TABLE "nutrition_plan" ADD COLUMN "kcal" real;--> statement-breakpoint
ALTER TABLE "nutrition_plan" ADD COLUMN "protein" real;--> statement-breakpoint
ALTER TABLE "nutrition_plan" ADD COLUMN "carb" real;--> statement-breakpoint
ALTER TABLE "nutrition_plan" ADD COLUMN "fat" real;