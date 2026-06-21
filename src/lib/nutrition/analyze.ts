import { getVisionProvider, getTextProvider } from "@/lib/ai";
import type { FoodDetection } from "@/lib/ai/types";
import type { MealType } from "@/lib/date";
import { type AnalyzedItem } from "./foods";
import { resolveDetections } from "./foods.queries";

/**
 * Resuelve una lista de alimentos detectados (por foto o por texto) a items con
 * macros, en modo híbrido:
 *  1. Cruce con la base nutricional (números precisos cuando hay match).
 *  2. Fallback: para los sin match cuya estimación vino vacía, el modelo de texto
 *     completa los macros por 100g.
 */
async function resolveAndFill(
  detections: FoodDetection[]
): Promise<AnalyzedItem[]> {
  const items = await resolveDetections(detections);

  const needsMacros = items.filter(
    (it) => it.source === "ai" && it.kcalPer100g === 0
  );
  if (needsMacros.length > 0) {
    try {
      const est = await getTextProvider().estimateMacrosPer100g(
        needsMacros.map((it) => it.label)
      );
      needsMacros.forEach((it, i) => {
        const e = est.items[i];
        if (!e) return;
        it.kcalPer100g = e.kcalPer100g;
        it.proteinPer100g = e.proteinPer100g;
        it.carbPer100g = e.carbPer100g;
        it.fatPer100g = e.fatPer100g;
      });
    } catch {
      // Si el fallback falla, quedan en 0 y el usuario los edita.
    }
  }

  return items;
}

/** Pipeline completo foto → alimentos con macros (modo híbrido). */
export async function analyzeFoodPhoto(
  images: string[],
  description?: string
): Promise<AnalyzedItem[]> {
  const result = await getVisionProvider().analyzeFoodImage(images, description);
  return resolveAndFill(result.foods);
}

/** Pipeline texto/voz → alimentos de UNA comida con macros (modo híbrido). */
export async function analyzeMealText(
  description: string
): Promise<AnalyzedItem[]> {
  const result = await getTextProvider().estimateMealFromText(description);
  return resolveAndFill(result.foods);
}

export interface DayMealResult {
  mealType: MealType;
  items: AnalyzedItem[];
}

/** Pipeline texto/voz → día completo separado en comidas, cada una con macros. */
export async function analyzeDayText(
  description: string
): Promise<DayMealResult[]> {
  const result = await getTextProvider().estimateDayFromText(description);
  const meals = await Promise.all(
    result.meals.map(async (m) => ({
      mealType: m.mealType,
      items: await resolveAndFill(m.foods),
    }))
  );
  // Descartamos comidas que no resolvieron ningún alimento.
  return meals.filter((m) => m.items.length > 0);
}
