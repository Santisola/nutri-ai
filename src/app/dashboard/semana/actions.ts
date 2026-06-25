"use server";

import { z } from "zod";
import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  savedMeals,
  mealPlanEntries,
  mealLogs,
  mealLogItems,
  shoppingLists,
  type MealIngredient,
  type ShoppingItem,
} from "@/db/schema";
import { getCurrentUserId, getProfile, getWeekPlan } from "@/lib/queries";
import { buildPlanContext } from "@/lib/nutrition/context";
import { getTextProvider } from "@/lib/ai";
import {
  MEAL_TYPE_VALUES,
  SHOPPING_CATEGORY_VALUES,
  type MealType,
  type GeneratedMeal,
} from "@/lib/ai/types";
import { rateLimit } from "@/lib/rate-limit";
import { weekStartISO, weekDaysISO, addDaysISO } from "@/lib/date";

const SLOTS: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

type Result = { ok?: boolean; error?: string };

function aiError(e: unknown): string {
  const msg = (e as Error)?.message ?? "";
  if (msg.includes("429") || /rate/i.test(msg)) {
    return "El modelo gratuito está saturado. Probá en un minuto.";
  }
  return "No se pudo completar la acción. Reintentá.";
}

/** Convierte una comida generada por IA en una fila de saved_meal. */
function mealToRow(
  userId: string,
  m: GeneratedMeal,
  source: "ai" | "manual"
) {
  return {
    userId,
    title: m.title,
    mealType: m.mealType,
    recipe: m.recipe,
    ingredients: m.ingredients as MealIngredient[],
    servings: m.servings,
    kcal: m.kcal,
    protein: m.protein,
    carb: m.carb,
    fat: m.fat,
    source,
  };
}

const mealTypeSchema = z.enum(MEAL_TYPE_VALUES);
const isoSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/* ─────────────────────────  Fase 1: armar la semana  ───────────────────────── */

/** Genera un pool de comidas con IA y las distribuye a los slots de la semana. */
export async function generateWeek(weekStartInput: string): Promise<Result> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = isoSchema.safeParse(weekStartInput);
  if (!parsed.success) return { error: "Semana inválida" };
  const weekStart = weekStartISO(parsed.data); // normaliza a lunes

  const rl = rateLimit(`week:${userId}`, 4, 60 * 60_000);
  if (!rl.ok) {
    return {
      error: `Generaste varias semanas seguidas. Probá en ${Math.ceil(
        rl.retryAfterMs / 60_000
      )} min.`,
    };
  }

  const ctx = await buildPlanContext(userId);
  if (!ctx) return { error: "Completá tu perfil primero" };

  try {
    const { meals } = await getTextProvider().generateWeekMealPool(ctx, 10);
    if (meals.length === 0) return { error: "No se pudo armar la semana. Reintentá." };

    const inserted = await db
      .insert(savedMeals)
      .values(meals.map((m) => mealToRow(userId, m, "ai")))
      .returning({ id: savedMeals.id, mealType: savedMeals.mealType });

    // Agrupamos los ids por tipo para distribuir con repetición sensata.
    const byType: Record<string, number[]> = {};
    for (const r of inserted) (byType[r.mealType] ??= []).push(r.id);

    const days = weekDaysISO(weekStart);
    const entries: {
      userId: string;
      date: string;
      mealType: MealType;
      savedMealId: number;
    }[] = [];
    days.forEach((date, di) => {
      for (const slot of SLOTS) {
        const ids = byType[slot];
        if (!ids || ids.length === 0) continue;
        entries.push({
          userId,
          date,
          mealType: slot,
          savedMealId: ids[di % ids.length],
        });
      }
    });

    const weekEnd = addDaysISO(weekStart, 6);
    await db
      .delete(mealPlanEntries)
      .where(
        and(
          eq(mealPlanEntries.userId, userId),
          gte(mealPlanEntries.date, weekStart),
          lte(mealPlanEntries.date, weekEnd)
        )
      );
    if (entries.length > 0) await db.insert(mealPlanEntries).values(entries);

    revalidatePath("/dashboard/plan");
    return { ok: true };
  } catch (e) {
    return { error: aiError(e) };
  }
}

/* ─────────────────────────  Fase 2: editar slots / biblioteca  ───────────────────────── */

const slotSchema = z.object({
  date: isoSchema,
  mealType: mealTypeSchema,
});

/** Asigna (upsert) una comida de la biblioteca a un slot. */
export async function assignSavedMeal(
  date: string,
  mealType: string,
  savedMealId: number
): Promise<Result> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const slot = slotSchema.safeParse({ date, mealType });
  if (!slot.success) return { error: "Slot inválido" };

  // La comida debe pertenecer al usuario.
  const meal = await db
    .select({ id: savedMeals.id })
    .from(savedMeals)
    .where(and(eq(savedMeals.id, savedMealId), eq(savedMeals.userId, userId)))
    .limit(1);
  if (meal.length === 0) return { error: "Comida no encontrada" };

  await db
    .insert(mealPlanEntries)
    .values({ userId, date: slot.data.date, mealType: slot.data.mealType, savedMealId })
    .onConflictDoUpdate({
      target: [
        mealPlanEntries.userId,
        mealPlanEntries.date,
        mealPlanEntries.mealType,
      ],
      set: { savedMealId, mealLogId: null },
    });

  revalidatePath("/dashboard/plan");
  return { ok: true };
}

/** Genera una comida nueva con IA para el slot y la asigna. */
export async function regenerateSlot(
  date: string,
  mealType: string
): Promise<Result> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const slot = slotSchema.safeParse({ date, mealType });
  if (!slot.success) return { error: "Slot inválido" };

  const rl = rateLimit(`slot:${userId}`, 15, 60 * 60_000);
  if (!rl.ok) return { error: "Demasiados cambios seguidos. Probá en un rato." };

  const ctx = await buildPlanContext(userId);
  if (!ctx) return { error: "Completá tu perfil primero" };

  try {
    const meal = await getTextProvider().generateMealForSlot(
      ctx,
      slot.data.mealType
    );
    const [row] = await db
      .insert(savedMeals)
      .values(mealToRow(userId, meal, "ai"))
      .returning({ id: savedMeals.id });

    await db
      .insert(mealPlanEntries)
      .values({
        userId,
        date: slot.data.date,
        mealType: slot.data.mealType,
        savedMealId: row.id,
      })
      .onConflictDoUpdate({
        target: [
          mealPlanEntries.userId,
          mealPlanEntries.date,
          mealPlanEntries.mealType,
        ],
        set: { savedMealId: row.id, mealLogId: null },
      });

    revalidatePath("/dashboard/plan");
    return { ok: true };
  } catch (e) {
    return { error: aiError(e) };
  }
}

/** Vacía un slot (quita la comida asignada). */
export async function clearSlot(date: string, mealType: string): Promise<Result> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const slot = slotSchema.safeParse({ date, mealType });
  if (!slot.success) return { error: "Slot inválido" };

  await db
    .delete(mealPlanEntries)
    .where(
      and(
        eq(mealPlanEntries.userId, userId),
        eq(mealPlanEntries.date, slot.data.date),
        eq(mealPlanEntries.mealType, slot.data.mealType)
      )
    );

  revalidatePath("/dashboard/plan");
  return { ok: true };
}

const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.string().trim().max(40).catch(""),
  category: z.enum(SHOPPING_CATEGORY_VALUES).catch("otros"),
});

const savedMealInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  mealType: mealTypeSchema,
  recipe: z.string().trim().max(4000).catch(""),
  ingredients: z.array(ingredientSchema).max(40).catch([]),
  servings: z.coerce.number().int().min(1).max(20).catch(1),
  kcal: z.coerce.number().nonnegative().max(10000).catch(0),
  protein: z.coerce.number().nonnegative().max(2000).catch(0),
  carb: z.coerce.number().nonnegative().max(2000).catch(0),
  fat: z.coerce.number().nonnegative().max(2000).catch(0),
});

export type SavedMealInput = z.infer<typeof savedMealInputSchema>;

/** Crea una comida en la biblioteca (carga manual). */
export async function createSavedMeal(input: SavedMealInput): Promise<{
  id?: number;
  error?: string;
}> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = savedMealInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" };

  const [row] = await db
    .insert(savedMeals)
    .values({ userId, ...parsed.data, source: "manual" })
    .returning({ id: savedMeals.id });

  revalidatePath("/dashboard/plan");
  return { id: row.id };
}

/** Edita una comida de la biblioteca. */
export async function updateSavedMeal(
  id: number,
  input: SavedMealInput
): Promise<Result> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = savedMealInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" };

  await db
    .update(savedMeals)
    .set(parsed.data)
    .where(and(eq(savedMeals.id, id), eq(savedMeals.userId, userId)));

  revalidatePath("/dashboard/plan");
  return { ok: true };
}

/** Elimina una comida de la biblioteca (cascade quita sus asignaciones). */
export async function deleteSavedMeal(id: number): Promise<Result> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  await db
    .delete(savedMeals)
    .where(and(eq(savedMeals.id, id), eq(savedMeals.userId, userId)));

  revalidatePath("/dashboard/plan");
  return { ok: true };
}

/** Genera una receta con IA a partir de una descripción y la guarda. */
export async function generateRecipeAndSave(description: string): Promise<{
  id?: number;
  error?: string;
}> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const desc = (description ?? "").trim().slice(0, 200);
  if (desc.length < 3) return { error: "Describí la comida que querés guardar." };

  const rl = rateLimit(`recipe:${userId}`, 10, 60 * 60_000);
  if (!rl.ok) return { error: "Demasiadas recetas seguidas. Probá en un rato." };

  const ctx = await buildPlanContext(userId);
  if (!ctx) return { error: "Completá tu perfil primero" };

  try {
    const meal = await getTextProvider().generateMealRecipe(desc, ctx);
    const [row] = await db
      .insert(savedMeals)
      .values(mealToRow(userId, meal, "ai"))
      .returning({ id: savedMeals.id });

    revalidatePath("/dashboard/plan");
    return { id: row.id };
  } catch (e) {
    return { error: aiError(e) };
  }
}

/* ─────────────────────────  Fase 3: derivar lista de compras  ───────────────────────── */

/** Consolida la lista de compras a partir de las comidas planificadas de la semana. */
export async function deriveShoppingListFromWeek(
  weekStartInput: string
): Promise<Result> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = isoSchema.safeParse(weekStartInput);
  if (!parsed.success) return { error: "Semana inválida" };
  const weekStart = weekStartISO(parsed.data);

  const rl = rateLimit(`shopping:${userId}`, 4, 60 * 60_000);
  if (!rl.ok) return { error: "Generaste varias listas seguidas. Probá más tarde." };

  const [profile, entries] = await Promise.all([
    getProfile(userId),
    getWeekPlan(userId, weekStart),
  ]);
  if (!profile) return { error: "Completá tu perfil primero" };
  if (entries.length === 0) {
    return { error: "Tu semana no tiene comidas planificadas todavía." };
  }

  // Agrupamos por comida y contamos cuántas veces aparece en la semana.
  const counts = new Map<
    number,
    { title: string; ingredients: MealIngredient[]; count: number }
  >();
  for (const e of entries) {
    const cur = counts.get(e.savedMealId);
    if (cur) cur.count += 1;
    else
      counts.set(e.savedMealId, {
        title: e.meal.title,
        ingredients: e.meal.ingredients,
        count: 1,
      });
  }

  const meals = Array.from(counts.values()).map((m) => ({
    title: m.count > 1 ? `${m.title} (x${m.count})` : m.title,
    ingredients: m.ingredients,
  }));

  try {
    const result = await getTextProvider().consolidateShoppingList({
      meals,
      householdSize: profile.householdSize,
      period: "weekly",
    });
    if (result.items.length === 0) {
      return { error: "No se pudo consolidar la lista. Reintentá." };
    }

    const items: ShoppingItem[] = result.items.map((i) => ({
      ...i,
      checked: false,
    }));
    const values = {
      period: "weekly" as const,
      householdSize: profile.householdSize,
      items,
      mealIdeas: [],
    };
    await db
      .insert(shoppingLists)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: shoppingLists.userId,
        set: { ...values, updatedAt: new Date() },
      });

    revalidatePath("/dashboard/plan");
    return { ok: true };
  } catch (e) {
    return { error: aiError(e) };
  }
}

/* ─────────────────────────  Fase 4: marcar como comido  ───────────────────────── */

/** Registra la comida planificada en el día (crea meal_log). Idempotente. */
export async function markEntryEaten(entryId: number): Promise<Result> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const rows = await db
    .select({ entry: mealPlanEntries, meal: savedMeals })
    .from(mealPlanEntries)
    .innerJoin(savedMeals, eq(mealPlanEntries.savedMealId, savedMeals.id))
    .where(
      and(eq(mealPlanEntries.id, entryId), eq(mealPlanEntries.userId, userId))
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "Comida no encontrada" };
  if (row.entry.mealLogId) return { ok: true }; // ya registrada

  const { entry, meal } = row;
  const [log] = await db
    .insert(mealLogs)
    .values({
      userId,
      date: entry.date,
      mealType: entry.mealType,
      note: meal.title,
      kcal: meal.kcal,
      protein: meal.protein,
      carb: meal.carb,
      fat: meal.fat,
      source: "plan",
    })
    .returning({ id: mealLogs.id });

  await db.insert(mealLogItems).values({
    mealLogId: log.id,
    label: meal.title,
    grams: 0,
    kcal: meal.kcal,
    protein: meal.protein,
    carb: meal.carb,
    fat: meal.fat,
    confidence: "low",
  });

  await db
    .update(mealPlanEntries)
    .set({ mealLogId: log.id })
    .where(eq(mealPlanEntries.id, entryId));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/plan");
  return { ok: true };
}

/** Deshace el registro: borra el meal_log vinculado a la comida planificada. */
export async function unmarkEntryEaten(entryId: number): Promise<Result> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const rows = await db
    .select()
    .from(mealPlanEntries)
    .where(
      and(eq(mealPlanEntries.id, entryId), eq(mealPlanEntries.userId, userId))
    )
    .limit(1);
  const entry = rows[0];
  if (!entry) return { error: "Comida no encontrada" };
  if (!entry.mealLogId) return { ok: true };

  await db.delete(mealLogs).where(eq(mealLogs.id, entry.mealLogId));
  await db
    .update(mealPlanEntries)
    .set({ mealLogId: null })
    .where(eq(mealPlanEntries.id, entryId));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/plan");
  return { ok: true };
}
