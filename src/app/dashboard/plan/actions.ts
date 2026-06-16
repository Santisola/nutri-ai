"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { nutritionPlans } from "@/db/schema";
import { getCurrentUserId } from "@/lib/queries";
import { buildPlanContext } from "@/lib/nutrition/context";
import { getTextProvider } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

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

    await db
      .insert(nutritionPlans)
      .values({ userId, content })
      .onConflictDoUpdate({
        target: nutritionPlans.userId,
        set: { content, updatedAt: new Date() },
      });

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
