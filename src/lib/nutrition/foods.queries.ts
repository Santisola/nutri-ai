import { db } from "@/db";
import { foods } from "@/db/schema";
import { ilike, or, inArray } from "drizzle-orm";
import type { FoodDetection } from "@/lib/ai/types";
import { normalize, round, type AnalyzedItem, type Food } from "./foods";

/** Consultas a la tabla `foods`. Solo server (importa `@/db`). */

export async function searchFoods(query: string, limit = 8): Promise<Food[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const n = normalize(q);
  return db
    .select()
    .from(foods)
    .where(or(ilike(foods.normalizedName, `%${n}%`), ilike(foods.name, `%${q}%`)))
    .limit(limit);
}

export async function getFoodsByIds(ids: number[]): Promise<Food[]> {
  if (ids.length === 0) return [];
  return db.select().from(foods).where(inArray(foods.id, ids));
}

async function findFood(name: string) {
  const n = normalize(name);
  const rows = await db
    .select()
    .from(foods)
    .where(or(ilike(foods.normalizedName, `%${n}%`), ilike(foods.name, `%${name}%`)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Modo híbrido. Por cada alimento detectado:
 *  - Match en la base → valores reales por 100g (source "db", preciso).
 *  - Sin match        → se deriva por 100g desde la estimación del modelo para la
 *                        porción detectada (source "ai", aproximado y editable).
 */
export async function resolveDetections(
  detections: FoodDetection[]
): Promise<AnalyzedItem[]> {
  const out: AnalyzedItem[] = [];
  for (const d of detections) {
    const food = await findFood(d.name);
    if (food) {
      out.push({
        label: food.name,
        grams: d.estimatedGrams,
        foodId: food.id,
        kcalPer100g: food.kcalPer100g,
        proteinPer100g: food.proteinPer100g,
        carbPer100g: food.carbPer100g,
        fatPer100g: food.fatPer100g,
        source: "db",
      });
    } else {
      const g = d.estimatedGrams > 0 ? d.estimatedGrams : 100;
      const per100 = (v: number) => round((v / g) * 100);
      out.push({
        label: d.name,
        grams: d.estimatedGrams,
        foodId: null,
        kcalPer100g: per100(d.kcal),
        proteinPer100g: per100(d.protein),
        carbPer100g: per100(d.carb),
        fatPer100g: per100(d.fat),
        source: "ai",
      });
    }
  }
  return out;
}
