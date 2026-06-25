import { z } from "zod";

/* ───── Salida del análisis de imagen (validada con Zod) ───── */

// Los modelos free a veces omiten campos o devuelven strings. Toleramos eso con
// coerción + `.catch()` para no descartar todo el análisis por un macro faltante.
const num = (fallback: number) => z.coerce.number().nonnegative().catch(fallback);

export const foodDetectionSchema = z.object({
  name: z.string().min(1).describe("Nombre del alimento en español"),
  estimatedGrams: z.coerce.number().positive().catch(100),
  confidence: z
    .enum(["high", "medium", "low"])
    .catch("medium"),
  // Estimación propia del modelo para la porción detectada (modo híbrido):
  // se usa como fallback cuando el alimento no matchea la base de datos.
  kcal: num(0),
  protein: num(0),
  carb: num(0),
  fat: num(0),
});
export type FoodDetection = z.infer<typeof foodDetectionSchema>;

// Lista de alimentos detectados, descartando ítems sin nombre válido en lugar de
// romper todo el resultado. Compartida por visión (foto) y estimación por texto.
const detectedFoods = z
  .array(foodDetectionSchema.nullable().catch(null))
  .transform((arr) => arr.filter((f): f is FoodDetection => f !== null));

export const visionResultSchema = z.object({
  foods: detectedFoods,
  notes: z.string().optional(),
});
export type VisionResult = z.infer<typeof visionResultSchema>;

/* ───── Comida descrita en texto/voz (misma forma que la visión) ───── */

export const mealFromTextSchema = z.object({
  // El modelo decide si el texto realmente describe comida. Default true para no
  // bloquear inputs legítimos si el modelo omite el campo.
  isFood: z.coerce.boolean().catch(true),
  // Mensaje irónico que el modelo arma cuando isFood=false (basado en el input).
  message: z.string().catch(""),
  foods: detectedFoods,
  notes: z.string().optional(),
});
export type MealFromText = z.infer<typeof mealFromTextSchema>;

/* ───── Día completo descrito en texto/voz (varias comidas) ───── */

export const MEAL_TYPE_VALUES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;

export const dayMealSchema = z.object({
  mealType: z.enum(MEAL_TYPE_VALUES).catch("snack"),
  foods: detectedFoods,
});
export type DayMeal = z.infer<typeof dayMealSchema>;

export const dayFromTextSchema = z.object({
  isFood: z.coerce.boolean().catch(true),
  message: z.string().catch(""),
  // Descartamos comidas nulas o sin alimentos.
  meals: z
    .array(dayMealSchema.nullable().catch(null))
    .transform((arr) =>
      arr.filter((m): m is DayMeal => m !== null && m.foods.length > 0)
    ),
});
export type DayFromText = z.infer<typeof dayFromTextSchema>;

/* ───── Entrada para sugerencia de comida ───── */

export interface MealSuggestionContext {
  remaining: { kcal: number; protein: number; carb: number; fat: number };
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  dietaryPrefs: string[];
  allergies: string[];
  dislikes: string[];
}

export const mealSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      approxKcal: z.number(),
      ingredients: z.array(z.string()),
    })
  ),
});
export type MealSuggestion = z.infer<typeof mealSuggestionSchema>;

/* ───── Lista de compras (ítems + ideas de comida) ───── */

export const SHOPPING_CATEGORY_VALUES = [
  "verduleria",
  "carniceria",
  "pescaderia",
  "almacen",
  "lacteos",
  "panificados",
  "congelados",
  "bebidas",
  "otros",
] as const;

// Ítem tal como lo produce el modelo (sin `checked`, que lo agrega el server).
const shoppingItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().catch(""),
  category: z.enum(SHOPPING_CATEGORY_VALUES).catch("otros"),
});
export type ShoppingItemAI = z.infer<typeof shoppingItemSchema>;

// Idea de comida tal como la produce el modelo (sin `id`/`source`).
const mealIdeaSchema = z.object({
  mealType: z.enum(MEAL_TYPE_VALUES).catch("lunch"),
  title: z.string().min(1),
  recipe: z.string().catch(""),
  ingredients: z
    .array(shoppingItemSchema.nullable().catch(null))
    .transform((arr) => arr.filter((x): x is ShoppingItemAI => x !== null)),
});

export const shoppingListSchema = z.object({
  items: z
    .array(shoppingItemSchema.nullable().catch(null))
    .transform((arr) => arr.filter((x): x is ShoppingItemAI => x !== null)),
  mealIdeas: z
    .array(mealIdeaSchema.nullable().catch(null))
    .transform((arr) =>
      arr.filter((m): m is z.infer<typeof mealIdeaSchema> => m !== null)
    ),
});
export type ShoppingListResult = z.infer<typeof shoppingListSchema>;

export interface ShoppingListContext {
  targets: { kcal: number; protein: number; carb: number; fat: number };
  period: "weekly" | "biweekly";
  householdSize: number;
  dietaryPrefs: string[];
  allergies: string[];
  dislikes: string[];
  plan?: string | null; // markdown del plan actual, como contexto
}

/* ───── Calendario: comidas generadas (proto-receta con macros) ───── */

export type MealType = (typeof MEAL_TYPE_VALUES)[number];

// Comida con receta + ingredientes + macros por porción, tal como la produce el
// modelo (sin `id`/`source`, que los agrega el server al guardar en saved_meal).
const generatedMealSchema = z.object({
  mealType: z.enum(MEAL_TYPE_VALUES).catch("lunch"),
  title: z.string().min(1),
  recipe: z.string().catch(""),
  ingredients: z
    .array(shoppingItemSchema.nullable().catch(null))
    .transform((arr) => arr.filter((x): x is ShoppingItemAI => x !== null)),
  servings: z.coerce.number().int().positive().catch(1),
  kcal: z.coerce.number().nonnegative().catch(0),
  protein: z.coerce.number().nonnegative().catch(0),
  carb: z.coerce.number().nonnegative().catch(0),
  fat: z.coerce.number().nonnegative().catch(0),
});
export type GeneratedMeal = z.infer<typeof generatedMealSchema>;

export const generatedMealResultSchema = generatedMealSchema;

export const weekMealPoolSchema = z.object({
  meals: z
    .array(generatedMealSchema.nullable().catch(null))
    .transform((arr) => arr.filter((m): m is GeneratedMeal => m !== null)),
});
export type WeekMealPool = z.infer<typeof weekMealPoolSchema>;

// Entrada para consolidar la lista de compras desde comidas planificadas.
export interface ConsolidateShoppingInput {
  meals: Array<{
    title: string;
    ingredients: Array<{ name: string; quantity: string; category: string }>;
  }>;
  householdSize: number;
  period: "weekly" | "biweekly";
}

/* ───── Interfaces de proveedores (abstracción para migrar a pago) ───── */

export interface VisionProvider {
  /**
   * Recibe una o más imágenes (data URLs) de la misma comida y una descripción
   * opcional del usuario para dar contexto, y devuelve los alimentos detectados.
   */
  analyzeFoodImage(
    images: string[],
    description?: string
  ): Promise<VisionResult>;
}

export const macroEstimateSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      kcalPer100g: z.coerce.number().nonnegative().catch(0),
      proteinPer100g: z.coerce.number().nonnegative().catch(0),
      carbPer100g: z.coerce.number().nonnegative().catch(0),
      fatPer100g: z.coerce.number().nonnegative().catch(0),
    })
  ),
});
export type MacroEstimate = z.infer<typeof macroEstimateSchema>;

// Estimación de un alimento descrito en texto libre (con cantidad opcional):
// peso total estimado + valores por 100g.
export const foodTextEstimateSchema = z.object({
  // Igual que en las cargas por texto/voz: el modelo decide si es comida y, si no,
  // devuelve un mensaje irónico. Default true para no bloquear inputs legítimos.
  isFood: z.coerce.boolean().catch(true),
  message: z.string().catch(""),
  grams: z.coerce.number().positive().catch(100),
  kcalPer100g: z.coerce.number().nonnegative().catch(0),
  proteinPer100g: z.coerce.number().nonnegative().catch(0),
  carbPer100g: z.coerce.number().nonnegative().catch(0),
  fatPer100g: z.coerce.number().nonnegative().catch(0),
});
export type FoodTextEstimate = z.infer<typeof foodTextEstimateSchema>;

/* ───── Chat de nutrición (restringido) ───── */

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatContext {
  goalType: "lose" | "maintain" | "gain";
  remaining: { kcal: number; protein: number; carb: number; fat: number };
  dietaryPrefs: string[];
  allergies: string[];
  dislikes: string[];
  plan?: string | null; // plan nutricional actual (markdown), si existe
}

// Respuesta del chat. Fail-closed: si no se puede determinar, onTopic = false.
export const chatReplySchema = z.object({
  onTopic: z.coerce.boolean().catch(false),
  answer: z.string().catch(""),
  // true cuando el usuario pidió modificar su plan nutricional.
  modifyPlan: z.coerce.boolean().catch(false),
});
export type ChatReply = z.infer<typeof chatReplySchema>;

// Objetivos extraídos de un plan importado (PDF). `found` = el PDF los tenía.
export const importedTargetsSchema = z.object({
  found: z.coerce.boolean().catch(false),
  kcal: z.coerce.number().nonnegative().catch(0),
  protein: z.coerce.number().nonnegative().catch(0),
  carb: z.coerce.number().nonnegative().catch(0),
  fat: z.coerce.number().nonnegative().catch(0),
});
export type ImportedTargets = {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
} | null;

// Contexto para generar/modificar el plan nutricional.
export interface PlanContext {
  goalType: "lose" | "maintain" | "gain";
  targets: { kcal: number; protein: number; carb: number; fat: number };
  weightKg: number;
  targetWeightKg?: number | null;
  activityLevel: string;
  dietaryPrefs: string[];
  allergies: string[];
  dislikes: string[];
}

export interface TextProvider {
  suggestMeal(ctx: MealSuggestionContext): Promise<MealSuggestion>;
  /** Estima kcal y macros por 100g para una lista de alimentos por nombre. */
  estimateMacrosPer100g(names: string[]): Promise<MacroEstimate>;
  /** Estima peso total (g) y macros/100g de un alimento descrito en texto libre. */
  estimateFoodFromText(description: string): Promise<FoodTextEstimate>;
  /** Identifica los alimentos de UNA comida descrita en texto/voz, con porciones. */
  estimateMealFromText(description: string): Promise<MealFromText>;
  /** Separa la descripción de un día entero en comidas, cada una con sus alimentos. */
  estimateDayFromText(description: string): Promise<DayFromText>;
  /** Chat restringido a consultas de nutrición/alimentación. */
  nutritionChat(
    history: ChatMessage[],
    context: ChatContext
  ): Promise<ChatReply>;
  /** Genera un plan/guía nutricional en markdown según el perfil y objetivo. */
  generatePlan(ctx: PlanContext): Promise<string>;
  /** Reformatea el texto de un plan importado (PDF) al markdown de la app, fielmente. */
  importPlanFromText(rawText: string): Promise<string>;
  /** Extrae los objetivos (kcal/macros) del texto de un plan importado, o null. */
  extractTargetsFromText(rawText: string): Promise<ImportedTargets>;
  /** Devuelve el plan completo actualizado aplicando una instrucción del usuario. */
  modifyPlan(
    currentPlan: string,
    instruction: string,
    ctx: PlanContext
  ): Promise<string>;
  /** Genera la lista de compras (ítems + ideas de comida) alineada al plan. */
  generateShoppingList(ctx: ShoppingListContext): Promise<ShoppingListResult>;
  /** Genera un pool de comidas variadas para armar la semana del calendario. */
  generateWeekMealPool(
    ctx: PlanContext,
    count?: number
  ): Promise<WeekMealPool>;
  /** Genera una comida alternativa para un slot puntual (mealType dado). */
  generateMealForSlot(
    ctx: PlanContext,
    mealType: MealType
  ): Promise<GeneratedMeal>;
  /** Genera receta + ingredientes + macros a partir de una descripción libre. */
  generateMealRecipe(
    description: string,
    ctx: PlanContext
  ): Promise<GeneratedMeal>;
  /** Consolida la lista de compras a partir de comidas planificadas. */
  consolidateShoppingList(
    input: ConsolidateShoppingInput
  ): Promise<ShoppingListResult>;
}
