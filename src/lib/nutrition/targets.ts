/**
 * Cálculo determinista del objetivo calórico y de macros.
 * Basado en la ecuación de Mifflin-St Jeor (sin IA, reproducible).
 *
 * AVISO: esto NO es consejo médico. Mostrar disclaimer al usuario y
 * recomendar consultar a un profesional de la salud.
 */

export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";
export type GoalType = "lose" | "maintain" | "gain";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // poco o nada de ejercicio
  light: 1.375, // 1-3 días/semana
  moderate: 1.55, // 3-5 días/semana
  active: 1.725, // 6-7 días/semana
  veryActive: 1.9, // ejercicio intenso / trabajo físico
};

// ~7700 kcal equivalen aprox. a 1 kg de masa corporal.
const KCAL_PER_KG = 7700;

// Pisos de seguridad para no recomendar dietas peligrosas.
const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

export interface TargetInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  goalRateKgPerWeek: number; // p.ej. 0.5 para bajar 0.5 kg/semana
}

export interface Targets {
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number; // gramos
  fat: number; // gramos
  carb: number; // gramos
  flooredToSafetyMin: boolean;
}

export function calcBMR(input: TargetInput): number {
  const { weightKg, heightCm, age, sex } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calcTargets(input: TargetInput): Targets {
  const bmr = calcBMR(input);
  const tdee = bmr * ACTIVITY_FACTORS[input.activityLevel];

  // Ajuste calórico diario según objetivo.
  const dailyDelta = (input.goalRateKgPerWeek * KCAL_PER_KG) / 7;
  let kcal: number;
  if (input.goalType === "lose") kcal = tdee - dailyDelta;
  else if (input.goalType === "gain") kcal = tdee + dailyDelta;
  else kcal = tdee;

  // Piso de seguridad.
  const floor = MIN_KCAL[input.sex];
  const flooredToSafetyMin = kcal < floor;
  if (flooredToSafetyMin) kcal = floor;

  kcal = Math.round(kcal);

  // Distribución de macros:
  //  - proteína: 1.8 g por kg de peso corporal
  //  - grasa: 27% de las calorías
  //  - carbohidratos: el resto
  const protein = Math.round(1.8 * input.weightKg);
  const fat = Math.round((kcal * 0.27) / 9);
  const carbKcal = kcal - (protein * 4 + fat * 9);
  const carb = Math.max(0, Math.round(carbKcal / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal,
    protein,
    fat,
    carb,
    flooredToSafetyMin,
  };
}

export function ageFromBirthYear(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}
