import { getVisionProvider, getTextProvider } from "@/lib/ai";
import { type AnalyzedItem } from "./foods";
import { resolveDetections } from "./foods.queries";

/**
 * Pipeline completo foto → alimentos con macros (modo híbrido):
 *  1. Visión: identifica alimentos + porciones.
 *  2. Cruce con la base nutricional (números precisos cuando hay match).
 *  3. Fallback: para los sin match cuya estimación vino vacía, el modelo de
 *     texto completa los macros por 100g.
 */
export async function analyzeFoodPhoto(
  images: string[],
  description?: string
): Promise<AnalyzedItem[]> {
  const result = await getVisionProvider().analyzeFoodImage(images, description);
  const items = await resolveDetections(result.foods);

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
