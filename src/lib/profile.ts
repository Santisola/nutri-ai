import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  nickname: z.string().trim().max(40).optional(),
  sex: z.enum(["male", "female"]),
  birthYear: z.coerce.number().int().min(1920).max(new Date().getFullYear() - 10),
  heightCm: z.coerce.number().min(100).max(250),
  weightKg: z.coerce.number().min(30).max(400),
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "veryActive",
  ]),
  goalType: z.enum(["lose", "maintain", "gain"]),
  goalRateKgPerWeek: z.coerce.number().min(0).max(1.5),
  targetWeightKg: z.coerce.number().min(30).max(400).optional(),
  householdSize: z.coerce.number().int().min(1).max(20).catch(1),
  dietaryPrefs: z.string().optional(),
  allergies: z.string().optional(),
  dislikes: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function toList(v?: string): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Convierte el input validado a los valores de la tabla `profiles`. */
export function toProfileValues(d: ProfileInput) {
  return {
    displayName: d.displayName || null,
    nickname: d.nickname || null,
    sex: d.sex,
    birthYear: d.birthYear,
    heightCm: d.heightCm,
    weightKg: d.weightKg,
    activityLevel: d.activityLevel,
    goalType: d.goalType,
    goalRateKgPerWeek: d.goalType === "maintain" ? 0 : d.goalRateKgPerWeek,
    targetWeightKg: d.targetWeightKg ?? null,
    householdSize: d.householdSize,
    dietaryPrefs: toList(d.dietaryPrefs),
    allergies: toList(d.allergies),
    dislikes: toList(d.dislikes),
  };
}
