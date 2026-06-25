import type { ShoppingCategory } from "@/db/schema";
import type { MealType } from "@/lib/ai/types";

// Formas planas (serializables) que el server pasa a los componentes cliente.

export interface MealView {
  id: number;
  title: string;
  mealType: MealType;
  recipe: string;
  ingredients: { name: string; quantity: string; category: ShoppingCategory }[];
  servings: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  source: "ai" | "manual";
}

export interface EntryView {
  id: number;
  date: string;
  mealType: MealType;
  mealLogId: number | null;
  meal: MealView;
}

export interface DayTargets {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export const SLOT_ORDER: MealType[] = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  snack: "Merienda",
  dinner: "Cena",
};
