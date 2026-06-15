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

export const visionResultSchema = z.object({
  // Descartamos ítems sin nombre válido en lugar de romper todo el resultado.
  foods: z.array(foodDetectionSchema.nullable().catch(null)).transform((arr) =>
    arr.filter((f): f is FoodDetection => f !== null)
  ),
  notes: z.string().optional(),
});
export type VisionResult = z.infer<typeof visionResultSchema>;

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
}

// Respuesta del chat. Fail-closed: si no se puede determinar, onTopic = false.
export const chatReplySchema = z.object({
  onTopic: z.coerce.boolean().catch(false),
  answer: z.string().catch(""),
});
export type ChatReply = z.infer<typeof chatReplySchema>;

export interface TextProvider {
  suggestMeal(ctx: MealSuggestionContext): Promise<MealSuggestion>;
  /** Estima kcal y macros por 100g para una lista de alimentos por nombre. */
  estimateMacrosPer100g(names: string[]): Promise<MacroEstimate>;
  /** Chat restringido a consultas de nutrición/alimentación. */
  nutritionChat(
    history: ChatMessage[],
    context: ChatContext
  ): Promise<ChatReply>;
}
