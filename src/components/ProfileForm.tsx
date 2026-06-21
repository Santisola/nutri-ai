"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import FormError from "@/components/FormError";

export type ProfileFormState = { error?: string; ok?: boolean } | null;

export interface ProfileDefaults {
  sex?: string;
  birthYear?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: string;
  goalType?: string;
  goalRateKgPerWeek?: number;
  targetWeightKg?: number | null;
  dietaryPrefs?: string[];
  allergies?: string[];
  dislikes?: string[];
}

const field =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function ProfileForm({
  action,
  defaults,
  submitLabel,
  successMessage,
}: {
  action: (
    state: ProfileFormState,
    formData: FormData
  ) => Promise<ProfileFormState>;
  defaults?: ProfileDefaults;
  submitLabel: string;
  successMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const d = defaults ?? {};
  const list = (a?: string[]) => (a && a.length ? a.join(", ") : "");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="sex">
            Sexo
          </label>
          <select id="sex" name="sex" className={field} defaultValue={d.sex} required>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="birthYear">
            Año de nacimiento
          </label>
          <input
            id="birthYear"
            name="birthYear"
            type="number"
            placeholder="1995"
            defaultValue={d.birthYear}
            className={field}
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="heightCm">
            Altura (cm)
          </label>
          <input
            id="heightCm"
            name="heightCm"
            type="number"
            step="0.1"
            placeholder="175"
            defaultValue={d.heightCm}
            className={field}
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="weightKg">
            Peso actual (kg)
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            placeholder="80"
            defaultValue={d.weightKg}
            className={field}
            required
          />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="activityLevel">
          Nivel de actividad
        </label>
        <select
          id="activityLevel"
          name="activityLevel"
          className={field}
          defaultValue={d.activityLevel}
          required
        >
          <option value="sedentary">Sedentario (poco o nada de ejercicio)</option>
          <option value="light">Ligero (1-3 días/semana)</option>
          <option value="moderate">Moderado (3-5 días/semana)</option>
          <option value="active">Activo (6-7 días/semana)</option>
          <option value="veryActive">Muy activo (intenso / trabajo físico)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="goalType">
            Objetivo
          </label>
          <select
            id="goalType"
            name="goalType"
            className={field}
            defaultValue={d.goalType}
            required
          >
            <option value="lose">Bajar de peso</option>
            <option value="maintain">Mantener</option>
            <option value="gain">Subir de peso</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="goalRateKgPerWeek">
            Ritmo (kg/semana)
          </label>
          <input
            id="goalRateKgPerWeek"
            name="goalRateKgPerWeek"
            type="number"
            step="0.1"
            defaultValue={d.goalRateKgPerWeek ?? 0.5}
            className={field}
          />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="targetWeightKg">
          Peso objetivo (kg) — opcional
        </label>
        <input
          id="targetWeightKg"
          name="targetWeightKg"
          type="number"
          step="0.1"
          placeholder="75"
          defaultValue={d.targetWeightKg ?? undefined}
          className={field}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className={label} htmlFor="dietaryPrefs">
            Preferencias (separadas por coma)
          </label>
          <input
            id="dietaryPrefs"
            name="dietaryPrefs"
            placeholder="vegetariano, sin lactosa"
            defaultValue={list(d.dietaryPrefs)}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="allergies">
            Alergias (separadas por coma)
          </label>
          <input
            id="allergies"
            name="allergies"
            placeholder="maní, mariscos"
            defaultValue={list(d.allergies)}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="dislikes">
            No te gusta (separado por coma)
          </label>
          <input
            id="dislikes"
            name="dislikes"
            placeholder="brócoli, hígado"
            defaultValue={list(d.dislikes)}
            className={field}
          />
        </div>
      </div>

      {state?.error && <FormError>{state.error}</FormError>}
      {state?.ok && successMessage && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
