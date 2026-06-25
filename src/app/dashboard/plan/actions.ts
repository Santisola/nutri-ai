"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { nutritionPlans, profiles, shoppingLists } from "@/db/schema";
import type { MealIdea, ShoppingItem } from "@/db/schema";
import {
  getCurrentUserId,
  getProfile,
  getPlan,
  getShoppingList,
} from "@/lib/queries";
import { buildPlanContext } from "@/lib/nutrition/context";
import { getEffectiveTargets } from "@/lib/nutrition/targets-effective";
import { getTextProvider } from "@/lib/ai";
import type { ImportedTargets } from "@/lib/ai/types";
import { rateLimit } from "@/lib/rate-limit";

const MAX_PDF_TEXT = 20000; // acotar tokens del modelo free

/** Genera (o regenera) el plan nutricional del usuario y lo guarda. */
export async function generateMyPlan(): Promise<{
  content?: string;
  error?: string;
}> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  // Generar un plan es costoso: máx 4 por hora.
  const rl = rateLimit(`plan:${userId}`, 4, 60 * 60_000);
  if (!rl.ok) {
    return {
      error: `Generaste varios planes seguidos. Probá de nuevo en ${Math.ceil(
        rl.retryAfterMs / 60_000
      )} min.`,
    };
  }

  const ctx = await buildPlanContext(userId);
  if (!ctx) return { error: "Completá tu perfil primero" };

  try {
    const content = await getTextProvider().generatePlan(ctx);
    if (!content.trim()) return { error: "No se pudo generar el plan. Reintentá." };

    // Al generar con IA, el plan vuelve a "generated" y limpia objetivos importados.
    const generated = {
      content,
      source: "generated" as const,
      kcal: null,
      protein: null,
      carb: null,
      fat: null,
    };
    await db
      .insert(nutritionPlans)
      .values({ userId, ...generated })
      .onConflictDoUpdate({
        target: nutritionPlans.userId,
        set: { ...generated, updatedAt: new Date() },
      });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/plan");
    return { content };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("429") || /rate/i.test(msg)) {
      return { error: "El modelo gratuito está saturado. Probá en un minuto." };
    }
    return { error: "No se pudo generar el plan. Reintentá." };
  }
}

/** Procesa el texto extraído de un PDF: lo estructura y extrae objetivos (sin guardar). */
export async function processImportedPlan(rawText: string): Promise<{
  plan?: string;
  targets?: ImportedTargets;
  error?: string;
}> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const text = (rawText ?? "").trim().slice(0, MAX_PDF_TEXT);
  if (text.length < 60) {
    return {
      error:
        "El PDF no tiene texto legible (¿es escaneado?). Subí un PDF digital o pedí el archivo a tu nutricionista.",
    };
  }

  const rl = rateLimit(`import:${userId}`, 4, 60 * 60_000);
  if (!rl.ok) {
    return { error: "Importaste varios planes seguidos. Probá más tarde." };
  }

  try {
    const provider = getTextProvider();
    const [plan, targets] = await Promise.all([
      provider.importPlanFromText(text),
      provider.extractTargetsFromText(text),
    ]);
    if (!plan.trim()) return { error: "No se pudo procesar el plan. Reintentá." };
    return { plan, targets };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("429") || /rate/i.test(msg)) {
      return { error: "El modelo gratuito está saturado. Probá en un minuto." };
    }
    return { error: "No se pudo procesar el plan. Reintentá." };
  }
}

const saveImportedSchema = z.object({
  content: z.string().min(1).max(40000),
  kcal: z.coerce.number().nonnegative().max(10000).nullable(),
  protein: z.coerce.number().nonnegative().max(2000).nullable(),
  carb: z.coerce.number().nonnegative().max(2000).nullable(),
  fat: z.coerce.number().nonnegative().max(2000).nullable(),
});

/** Guarda el plan importado (revisado por el usuario) con sus objetivos. */
export async function saveImportedPlan(input: {
  content: string;
  kcal: number | null;
  protein: number | null;
  carb: number | null;
  fat: number | null;
}): Promise<{ ok?: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = saveImportedSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" };
  const { content, kcal, protein, carb, fat } = parsed.data;

  const values = {
    content,
    source: "imported" as const,
    kcal: kcal && kcal > 0 ? kcal : null,
    protein: kcal && kcal > 0 ? protein : null,
    carb: kcal && kcal > 0 ? carb : null,
    fat: kcal && kcal > 0 ? fat : null,
  };

  await db
    .insert(nutritionPlans)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: nutritionPlans.userId,
      set: { ...values, updatedAt: new Date() },
    });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/plan");
  return { ok: true };
}

/* ─────────────────────────  Lista de compras  ───────────────────────── */

const shoppingInputSchema = z.object({
  period: z.enum(["weekly", "biweekly"]).catch("weekly"),
  householdSize: z.coerce.number().int().min(1).max(20).catch(1),
});

export interface ShoppingListPayload {
  period: "weekly" | "biweekly";
  householdSize: number;
  items: ShoppingItem[];
  mealIdeas: MealIdea[];
}

/** Genera (o regenera) la lista de compras del usuario y la guarda. */
export async function generateShoppingList(input: {
  period: "weekly" | "biweekly";
  householdSize: number;
}): Promise<{ list?: ShoppingListPayload; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const { period, householdSize } = shoppingInputSchema.parse(input);

  // Generar la lista es costoso: máx 4 por hora.
  const rl = rateLimit(`shopping:${userId}`, 4, 60 * 60_000);
  if (!rl.ok) {
    return {
      error: `Generaste varias listas seguidas. Probá de nuevo en ${Math.ceil(
        rl.retryAfterMs / 60_000
      )} min.`,
    };
  }

  const [profile, targets, plan] = await Promise.all([
    getProfile(userId),
    getEffectiveTargets(userId),
    getPlan(userId),
  ]);
  if (!profile || !targets) return { error: "Completá tu perfil primero" };

  try {
    const result = await getTextProvider().generateShoppingList({
      targets: {
        kcal: targets.kcal,
        protein: targets.protein,
        carb: targets.carb,
        fat: targets.fat,
      },
      period,
      householdSize,
      dietaryPrefs: profile.dietaryPrefs ?? [],
      allergies: profile.allergies ?? [],
      dislikes: profile.dislikes ?? [],
      plan: plan?.content ?? null,
    });

    if (result.items.length === 0) {
      return { error: "No se pudo armar la lista. Reintentá." };
    }

    // El server agrega lo que el modelo no produce: checked + id + source.
    const items: ShoppingItem[] = result.items.map((i) => ({
      ...i,
      checked: false,
    }));
    const mealIdeas: MealIdea[] = result.mealIdeas.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      source: "ai" as const,
    }));

    const values = { period, householdSize, items, mealIdeas };
    await db
      .insert(shoppingLists)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: shoppingLists.userId,
        set: { ...values, updatedAt: new Date() },
      });

    // Persistir householdSize como preferencia del perfil si cambió.
    if (profile.householdSize !== householdSize) {
      await db
        .update(profiles)
        .set({ householdSize })
        .where(eq(profiles.userId, userId));
    }

    revalidatePath("/dashboard/plan");
    return { list: { period, householdSize, items, mealIdeas } };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("429") || /rate/i.test(msg)) {
      return { error: "El modelo gratuito está saturado. Probá en un minuto." };
    }
    return { error: "No se pudo generar la lista. Reintentá." };
  }
}

/** Tacha/destacha un ítem por índice. Optimista en cliente, persiste el array. */
export async function toggleShoppingItem(
  index: number,
  checked: boolean
): Promise<{ ok?: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const list = await getShoppingList(userId);
  if (!list || index < 0 || index >= list.items.length) {
    return { error: "Lista no encontrada" };
  }

  const items = list.items.map((it, i) =>
    i === index ? { ...it, checked } : it
  );
  await db
    .update(shoppingLists)
    .set({ items, updatedAt: new Date() })
    .where(eq(shoppingLists.userId, userId));

  // No revalidamos para no pisar el estado optimista del cliente.
  return { ok: true };
}
