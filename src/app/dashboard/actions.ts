"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mealLogs, mealLogItems, weightLogs } from "@/db/schema";
import { getCurrentUserId } from "@/lib/queries";
import {
  scaleFood,
  macrosFor,
  type Food,
  type AnalyzedItem,
} from "@/lib/nutrition/foods";
import {
  searchFoods as searchFoodsQuery,
  getFoodsByIds,
} from "@/lib/nutrition/foods.queries";
import { analyzeFoodPhoto } from "@/lib/nutrition/analyze";
import { getTextProvider } from "@/lib/ai";
import {
  getProfile,
  getDayMeals,
  sumDay,
  getLatestWeight,
  getPlan,
} from "@/lib/queries";
import { buildPlanContext } from "@/lib/nutrition/context";
import { nutritionPlans } from "@/db/schema";
import {
  calcTargets,
  ageFromBirthYear,
  type Sex,
  type ActivityLevel,
  type GoalType,
} from "@/lib/nutrition/targets";
import type { MealSuggestion, ChatMessage, ChatReply } from "@/lib/ai/types";
import { todayISO, currentMealType, type MealType } from "@/lib/date";
import { rateLimit } from "@/lib/rate-limit";

export async function searchFoods(query: string): Promise<Food[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return searchFoodsQuery(query);
}

/**
 * Estima un alimento descrito en texto libre (con cantidad opcional): peso total
 * en gramos + macros por 100g. Luego el usuario puede refinar los gramos.
 */
export async function estimateManualFood(label: string): Promise<{
  item?: {
    grams: number;
    kcalPer100g: number;
    proteinPer100g: number;
    carbPer100g: number;
    fatPer100g: number;
  };
  error?: string;
}> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const name = label.trim();
  if (name.length < 2) return { error: "Escribí el alimento." };

  const rl = rateLimit(`estimate:${userId}`, 20, 60_000);
  if (!rl.ok) {
    return { error: "Esperá un momento antes de estimar otro alimento." };
  }

  try {
    const e = await getTextProvider().estimateFoodFromText(name);
    return {
      item: {
        grams: Math.round(e.grams),
        kcalPer100g: e.kcalPer100g,
        proteinPer100g: e.proteinPer100g,
        carbPer100g: e.carbPer100g,
        fatPer100g: e.fatPer100g,
      },
    };
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
}

const addMealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z
    .array(
      z.object({
        foodId: z.number().int(),
        grams: z.number().positive().max(5000),
      })
    )
    .min(1),
});

export async function addMeal(input: {
  mealType: string;
  items: { foodId: number; grams: number }[];
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = addMealSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos de comida inválidos" };
  const { mealType, items } = parsed.data;

  const foods = await getFoodsByIds(items.map((i) => i.foodId));
  const foodById = new Map(foods.map((f) => [f.id, f]));

  const resolved = items.map((i) => {
    const food = foodById.get(i.foodId);
    if (!food) throw new Error(`Alimento ${i.foodId} no existe`);
    return { food, grams: i.grams, macros: scaleFood(food, i.grams) };
  });

  const total = resolved.reduce(
    (acc, r) => ({
      kcal: round(acc.kcal + r.macros.kcal),
      protein: round(acc.protein + r.macros.protein),
      carb: round(acc.carb + r.macros.carb),
      fat: round(acc.fat + r.macros.fat),
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 }
  );

  const [meal] = await db
    .insert(mealLogs)
    .values({
      userId,
      date: todayISO(),
      mealType,
      kcal: total.kcal,
      protein: total.protein,
      carb: total.carb,
      fat: total.fat,
      source: "manual",
    })
    .returning({ id: mealLogs.id });

  await db.insert(mealLogItems).values(
    resolved.map((r) => ({
      mealLogId: meal.id,
      foodId: r.food.id,
      label: r.food.name,
      grams: r.grams,
      kcal: r.macros.kcal,
      protein: r.macros.protein,
      carb: r.macros.carb,
      fat: r.macros.fat,
      confidence: "high" as const,
    }))
  );

  revalidatePath("/dashboard");
  return { ok: true };
}

const MAX_IMAGES = 5;
const MAX_DESC_LEN = 400;

/** Analiza una o más fotos (+ descripción opcional) y devuelve los alimentos. */
export async function analyzeMealPhoto(input: {
  images: string[];
  description?: string;
}): Promise<{ items?: AnalyzedItem[]; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const images = Array.isArray(input.images) ? input.images : [];
  if (images.length === 0) return { error: "Subí al menos una foto." };
  if (images.length > MAX_IMAGES) {
    return { error: `Máximo ${MAX_IMAGES} fotos por comida.` };
  }
  if (!images.every((u) => typeof u === "string" && u.startsWith("data:image/"))) {
    return { error: "Alguna imagen es inválida." };
  }
  const description = (input.description ?? "").slice(0, MAX_DESC_LEN);

  // Rate limit: análisis de foto es costoso en el free tier.
  const rl = rateLimit(`vision:${userId}`, 8, 60_000);
  if (!rl.ok) {
    return {
      error: `Esperá ${Math.ceil(rl.retryAfterMs / 1000)}s antes de analizar otra foto.`,
    };
  }

  try {
    const items = await analyzeFoodPhoto(images, description);
    if (items.length === 0) {
      return { error: "No se detectaron alimentos en las fotos." };
    }
    return { items };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("429") || /rate/i.test(msg)) {
      return {
        error:
          "El modelo gratuito está saturado (límite de uso). Probá de nuevo en un minuto.",
      };
    }
    return { error: "No se pudo analizar la foto. Probá de nuevo." };
  }
}

const analyzedItemSchema = z.object({
  label: z.string().min(1),
  grams: z.number().positive().max(5000),
  foodId: z.number().int().nullable(),
  kcalPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
  source: z.enum(["db", "ai"]),
});

const saveAnalyzedSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z.array(analyzedItemSchema).min(1),
  source: z.enum(["ai", "manual"]).optional(),
});

/** Guarda una comida revisada por el usuario (de foto-IA o carga manual). */
export async function saveAnalyzedMeal(input: {
  mealType: string;
  items: AnalyzedItem[];
  source?: "ai" | "manual";
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = saveAnalyzedSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" };
  const { mealType, items, source = "ai" } = parsed.data;

  const computed = items.map((it) => ({ ...it, m: macrosFor(it) }));
  const total = computed.reduce(
    (acc, r) => ({
      kcal: round(acc.kcal + r.m.kcal),
      protein: round(acc.protein + r.m.protein),
      carb: round(acc.carb + r.m.carb),
      fat: round(acc.fat + r.m.fat),
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 }
  );

  const [meal] = await db
    .insert(mealLogs)
    .values({
      userId,
      date: todayISO(),
      mealType,
      kcal: total.kcal,
      protein: total.protein,
      carb: total.carb,
      fat: total.fat,
      source,
    })
    .returning({ id: mealLogs.id });

  await db.insert(mealLogItems).values(
    computed.map((r) => ({
      mealLogId: meal.id,
      foodId: r.foodId,
      label: r.label,
      grams: r.grams,
      kcal: r.m.kcal,
      protein: r.m.protein,
      carb: r.m.carb,
      fat: r.m.fat,
      confidence: r.source === "db" ? ("high" as const) : ("low" as const),
    }))
  );

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Arma el contexto nutricional del usuario (datos del server, no del usuario). */
async function getUserNutritionContext(userId: string) {
  const profile = await getProfile(userId);
  if (!profile) return null;

  const [meals, latestWeight] = await Promise.all([
    getDayMeals(userId, todayISO()),
    getLatestWeight(userId),
  ]);
  const consumed = sumDay(meals);

  const targets = calcTargets({
    sex: profile.sex as Sex,
    age: ageFromBirthYear(profile.birthYear),
    heightCm: profile.heightCm,
    weightKg: latestWeight?.weightKg ?? profile.weightKg,
    activityLevel: profile.activityLevel as ActivityLevel,
    goalType: profile.goalType as GoalType,
    goalRateKgPerWeek: profile.goalRateKgPerWeek,
  });

  return {
    goalType: profile.goalType as GoalType,
    remaining: {
      kcal: Math.max(0, Math.round(targets.kcal - consumed.kcal)),
      protein: Math.max(0, Math.round(targets.protein - consumed.protein)),
      carb: Math.max(0, Math.round(targets.carb - consumed.carb)),
      fat: Math.max(0, Math.round(targets.fat - consumed.fat)),
    },
    dietaryPrefs: profile.dietaryPrefs ?? [],
    allergies: profile.allergies ?? [],
    dislikes: profile.dislikes ?? [],
  };
}

function aiErrorMessage(e: unknown): string {
  const msg = (e as Error)?.message ?? "";
  if (msg.includes("429") || /rate/i.test(msg)) {
    return "El modelo gratuito está saturado. Probá de nuevo en un minuto.";
  }
  return "No se pudo procesar. Probá de nuevo.";
}

/** Sugiere la próxima comida según los macros que le quedan al usuario hoy. */
export async function suggestNextMeal(
  mealType?: MealType
): Promise<{ suggestion?: MealSuggestion; mealType?: MealType; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const ctx = await getUserNutritionContext(userId);
  if (!ctx) return { error: "Completá tu perfil primero" };

  const meal = mealType ?? currentMealType();

  try {
    const suggestion = await getTextProvider().suggestMeal({
      remaining: ctx.remaining,
      mealType: meal,
      dietaryPrefs: ctx.dietaryPrefs,
      allergies: ctx.allergies,
      dislikes: ctx.dislikes,
    });
    return { suggestion, mealType: meal };
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
}

// ── Chat de nutrición (restringido y validado) ─────────────────────────────
const MAX_MSG_LEN = 600; // tope para el mensaje del usuario
const MAX_ASSISTANT_LEN = 8000; // las respuestas del asistente pueden ser largas
const MAX_HISTORY = 8; // mensajes previos que mandamos como contexto

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_ASSISTANT_LEN),
});
const chatHistorySchema = z.array(chatMessageSchema).min(1).max(40);

export async function sendChatMessage(
  history: ChatMessage[]
): Promise<{ reply?: ChatReply; error?: string; planUpdated?: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  // Rate limit: máx 12 mensajes por minuto por usuario.
  const rl = rateLimit(`chat:${userId}`, 12, 60_000);
  if (!rl.ok) {
    return {
      error: `Esperá ${Math.ceil(rl.retryAfterMs / 1000)}s antes de seguir consultando.`,
    };
  }

  // Validación de forma.
  const parsed = chatHistorySchema.safeParse(history);
  if (!parsed.success) {
    return { error: "Mensaje inválido." };
  }
  const safeHistory = parsed.data.slice(-MAX_HISTORY);
  const last = safeHistory[safeHistory.length - 1];
  // El último mensaje debe ser tuyo y respetar el límite de longitud.
  if (last.role !== "user") {
    return { error: "Mensaje inválido." };
  }
  if (last.content.length > MAX_MSG_LEN) {
    return { error: `Tu mensaje es muy largo (máx ${MAX_MSG_LEN} caracteres).` };
  }

  const ctx = await getUserNutritionContext(userId);
  if (!ctx) return { error: "Completá tu perfil primero" };

  const plan = await getPlan(userId);

  try {
    const reply = await getTextProvider().nutritionChat(safeHistory, {
      goalType: ctx.goalType,
      remaining: ctx.remaining,
      dietaryPrefs: ctx.dietaryPrefs,
      allergies: ctx.allergies,
      dislikes: ctx.dislikes,
      plan: plan?.content ?? null,
    });
    // Salvaguarda extra: si el modelo devolvió onTopic pero answer vacío.
    if (!reply.answer.trim()) {
      return {
        reply: {
          onTopic: false,
          answer:
            "Eso se me escapó del plato. Lo mío es la comida: ¿qué querés comer o consultar?",
          modifyPlan: false,
        },
      };
    }

    // Si pidió modificar el plan y tiene uno, lo procesamos y guardamos.
    let planUpdated = false;
    if (reply.modifyPlan && plan) {
      try {
        const planCtx = await buildPlanContext(userId);
        if (planCtx) {
          const updated = await getTextProvider().modifyPlan(
            plan.content,
            last.content,
            planCtx
          );
          if (updated.trim()) {
            await db
              .insert(nutritionPlans)
              .values({ userId, content: updated })
              .onConflictDoUpdate({
                target: nutritionPlans.userId,
                set: { content: updated, updatedAt: new Date() },
              });
            revalidatePath("/dashboard/plan");
            planUpdated = true;
          }
        }
      } catch {
        // Si falla la modificación, el chat igual respondió; avisamos abajo.
      }
    }

    return { reply, planUpdated };
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
}

export async function deleteMeal(mealId: number) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  await db
    .delete(mealLogs)
    .where(and(eq(mealLogs.id, mealId), eq(mealLogs.userId, userId)));

  revalidatePath("/dashboard");
  return { ok: true };
}

const weightSchema = z.coerce.number().min(30).max(400);

export async function logWeight(_prev: unknown, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = weightSchema.safeParse(formData.get("weightKg"));
  if (!parsed.success) return { error: "Peso inválido (30–400 kg)" };

  const date = todayISO();

  // Un registro por día: si ya hay uno hoy, lo actualizamos.
  const existing = await db
    .select({ id: weightLogs.id })
    .from(weightLogs)
    .where(and(eq(weightLogs.userId, userId), eq(weightLogs.date, date)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(weightLogs)
      .set({ weightKg: parsed.data })
      .where(eq(weightLogs.id, existing[0].id));
  } else {
    await db.insert(weightLogs).values({ userId, date, weightKg: parsed.data });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
