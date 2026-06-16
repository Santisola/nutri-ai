import "server-only";
import { getProfile, getLatestWeight } from "@/lib/queries";
import {
  calcTargets,
  ageFromBirthYear,
  type Sex,
  type ActivityLevel,
  type GoalType,
} from "./targets";
import type { PlanContext } from "@/lib/ai/types";

/** Arma el contexto (perfil + objetivo calculado) para generar/modificar el plan. */
export async function buildPlanContext(
  userId: string
): Promise<PlanContext | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;

  const latestWeight = await getLatestWeight(userId);
  const weightKg = latestWeight?.weightKg ?? profile.weightKg;

  const targets = calcTargets({
    sex: profile.sex as Sex,
    age: ageFromBirthYear(profile.birthYear),
    heightCm: profile.heightCm,
    weightKg,
    activityLevel: profile.activityLevel as ActivityLevel,
    goalType: profile.goalType as GoalType,
    goalRateKgPerWeek: profile.goalRateKgPerWeek,
  });

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
