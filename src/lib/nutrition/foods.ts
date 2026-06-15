import type { foods } from "@/db/schema";

/**
 * Helpers PUROS de nutrición (sin acceso a base de datos). Seguro de importar
 * desde componentes cliente. Las consultas que tocan la DB viven en
 * `foods.queries.ts` (solo server).
 *
 * `type Food` usa `typeof` (posición de tipo) → se borra en compilación, así que
 * no arrastra el módulo de schema ni la DB al bundle del cliente.
 */
export type Food = typeof foods.$inferSelect;

// Resultado del análisis híbrido, normalizado a valores POR 100 g para que el
// cliente pueda reescalar al editar los gramos.
export interface AnalyzedItem {
  label: string;
  grams: number;
  foodId: number | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  // "db" → números de la base (preciso) · "ai" → estimación del modelo (aprox.)
  source: "db" | "ai";
}

export function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca tildes
    .trim();
}

export function scaleFood(food: Food, grams: number) {
  const factor = grams / 100;
  return {
    kcal: round(food.kcalPer100g * factor),
    protein: round(food.proteinPer100g * factor),
    carb: round(food.carbPer100g * factor),
    fat: round(food.fatPer100g * factor),
  };
}

export function macrosFor(item: {
  grams: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
}) {
  const f = item.grams / 100;
  return {
    kcal: round(item.kcalPer100g * f),
    protein: round(item.proteinPer100g * f),
    carb: round(item.carbPer100g * f),
    fat: round(item.fatPer100g * f),
  };
}

export function sumAnalyzed(items: AnalyzedItem[]) {
  return items.reduce(
    (acc, i) => {
      const m = macrosFor(i);
      return {
        kcal: round(acc.kcal + m.kcal),
        protein: round(acc.protein + m.protein),
        carb: round(acc.carb + m.carb),
        fat: round(acc.fat + m.fat),
      };
    },
    { kcal: 0, protein: 0, carb: 0, fat: 0 }
  );
}

export function round(n: number): number {
  return Math.round(n * 10) / 10;
}
