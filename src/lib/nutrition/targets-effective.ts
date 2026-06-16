import "server-only";
import { getProfile, getLatestWeight, getPlan } from "@/lib/queries";
import {
  calcTargets,
  ageFromBirthYear,
  type Sex,
  type ActivityLevel,
  type GoalType,
} from "./targets";

export interface EffectiveTargets {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  // "imported" = vienen del plan del nutricionista · "computed" = fórmula
  source: "imported" | "computed";
}

/**
 * Objetivo diario efectivo (modo híbrido):
 * - Si hay un plan importado con calorías definidas, se usan esos objetivos.
 * - Si no, se calculan con Mifflin-St Jeor desde el perfil.
 */
export async function getEffectiveTargets(
  userId: string
): Promise<EffectiveTargets | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;

  const plan = await getPlan(userId);
  if (plan && plan.source === "imported" && plan.kcal != null) {
    return {
      kcal: Math.round(plan.kcal),
      protein: Math.round(plan.protein ?? 0),
      carb: Math.round(plan.carb ?? 0),
      fat: Math.round(plan.fat ?? 0),
      source: "imported",
    };
  }

  const latestWeight = await getLatestWeight(userId);
  const t = calcTargets({
    sex: profile.sex as Sex,
    age: ageFromBirthYear(profile.birthYear),
    heightCm: profile.heightCm,
    weightKg: latestWeight?.weightKg ?? profile.weightKg,
    activityLevel: profile.activityLevel as ActivityLevel,
    goalType: profile.goalType as GoalType,
    goalRateKgPerWeek: profile.goalRateKgPerWeek,
  });
  return {
    kcal: t.kcal,
    protein: t.protein,
    carb: t.carb,
    fat: t.fat,
    source: "computed",
  };
}
