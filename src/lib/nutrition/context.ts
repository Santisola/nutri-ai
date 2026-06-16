import "server-only";
import { getProfile, getLatestWeight } from "@/lib/queries";
import { getEffectiveTargets } from "./targets-effective";
import type { GoalType } from "./targets";
import type { PlanContext } from "@/lib/ai/types";

/** Arma el contexto (perfil + objetivo efectivo) para generar/modificar el plan. */
export async function buildPlanContext(
  userId: string
): Promise<PlanContext | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;

  const [latestWeight, targets] = await Promise.all([
    getLatestWeight(userId),
    getEffectiveTargets(userId),
  ]);
  if (!targets) return null;

  const weightKg = latestWeight?.weightKg ?? profile.weightKg;

  return {
    goalType: profile.goalType as GoalType,
    targets: {
      kcal: targets.kcal,
      protein: targets.protein,
      carb: targets.carb,
      fat: targets.fat,
    },
    weightKg,
    targetWeightKg: profile.targetWeightKg,
    activityLevel: profile.activityLevel,
    dietaryPrefs: profile.dietaryPrefs ?? [],
    allergies: profile.allergies ?? [],
    dislikes: profile.dislikes ?? [],
  };
}
