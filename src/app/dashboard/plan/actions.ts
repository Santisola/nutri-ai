"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { nutritionPlans } from "@/db/schema";
import { getCurrentUserId } from "@/lib/queries";
import { buildPlanContext } from "@/lib/nutrition/context";
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
