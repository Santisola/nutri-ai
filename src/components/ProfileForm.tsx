"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ArrowLeft,
  ArrowRight,
  User,
  Ruler,
  Activity,
  Salad,
  type LucideIcon,
} from "lucide-react";
import FormError from "@/components/FormError";

export type ProfileFormState = { error?: string; ok?: boolean } | null;

export interface ProfileDefaults {
  displayName?: string | null;
  nickname?: string | null;
  sex?: string;
  birthYear?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: string;
  goalType?: string;
  goalRateKgPerWeek?: number;
  targetWeightKg?: number | null;
  householdSize?: number;
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
  stepped = false,
}: {
  action: (
    state: ProfileFormState,
    formData: FormData
  ) => Promise<ProfileFormState>;
  defaults?: ProfileDefaults;
  submitLabel: string;
  successMessage?: string;
  /** Onboarding: muestra las secciones de a una, con navegación paso a paso. */
  stepped?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [step, setStep] = useState(0);
  const d = defaults ?? {};
  const list = (a?: string[]) => (a && a.length ? a.join(", ") : "");

  const sections: {
    icon: LucideIcon;
    title: string;
    desc: string;
    node: ReactNode;
  }[] = [
    {
      icon: User,
      title: "Sobre vos",
      desc: "Cómo te llamás y algunos datos básicos.",
      node: (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="displayName">
                Nombre
              </label>
              <input
                id="displayName"
                name="displayName"
                placeholder="Santiago"
                defaultValue={d.displayName ?? ""}
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="nickname">
                Apodo
              </label>
              <input
                id="nickname"
                name="nickname"
                placeholder="Santi"
                defaultValue={d.nickname ?? ""}
                className={field}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-zinc-400">
            Usamos tu apodo para hablarte de forma más cercana. Es opcional.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="sex">
                Sexo
              </label>
              <select
                id="sex"
                name="sex"
                className={field}
                defaultValue={d.sex}
                required
              >
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
          </div>
        </>
      ),
    },
    {
      icon: Ruler,
      title: "Tu cuerpo",
      desc: "Tu altura y peso actual para calcular tu objetivo.",
      node: (
        <div className="grid grid-cols-2 gap-4">
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
      ),
    },
    {
      icon: Activity,
      title: "Actividad y objetivo",
      desc: "Qué tan activo sos y a dónde querés llegar.",
      node: (
        <>
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
              <option value="sedentary">
                Sedentario (poco o nada de ejercicio)
              </option>
              <option value="light">Ligero (1-3 días/semana)</option>
              <option value="moderate">Moderado (3-5 días/semana)</option>
              <option value="active">Activo (6-7 días/semana)</option>
              <option value="veryActive">
                Muy activo (intenso / trabajo físico)
              </option>
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
        </>
      ),
    },
    {
      icon: Salad,
      title: "Preferencias",
      desc: "Para personalizar tu plan y las sugerencias. Todo opcional.",
      node: (
        <>
          <div>
            <label className={label} htmlFor="householdSize">
              Personas en tu grupo familiar
            </label>
            <input
              id="householdSize"
              name="householdSize"
              type="number"
              min={1}
              max={20}
              defaultValue={d.householdSize ?? 1}
              className={field}
            />
            <p className="mt-1 text-xs text-zinc-400">
              Lo usamos para armar tu lista de compras con las cantidades justas.
            </p>
          </div>
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
        </>
      ),
    },
  ];

  const isLast = step === sections.length - 1;

  // Valida solo los controles de la sección actual (HTML5) antes de avanzar.
  const validateStep = (i: number) => {
    const el = stepRefs.current[i];
    if (!el) return true;
    const controls = el.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea");
    for (const c of Array.from(controls)) {
      if (!c.checkValidity()) {
        c.reportValidity();
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, sections.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const submitStepped = () => {
    if (validateStep(step)) formRef.current?.requestSubmit();
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate={stepped}
      className="flex flex-col gap-5"
    >
      {stepped && (
        <div className="flex items-center gap-2">
          {sections.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step
                  ? "bg-emerald-500"
                  : "bg-zinc-200 dark:bg-zinc-800"
              }`}
            />
          ))}
        </div>
      )}

      {sections.map((s, i) => {
        const hidden = stepped && i !== step;
        const Icon = s.icon;
        // En modo perfil separamos visualmente cada grupo con una línea.
        const divider = !stepped && i > 0 ? "border-t border-zinc-200 pt-5 dark:border-zinc-800" : "";
        return (
          <div
            key={i}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            className={hidden ? "hidden" : `flex flex-col gap-4 ${divider}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {s.title}
                </h3>
                <p className="text-xs text-zinc-500">{s.desc}</p>
              </div>
            </div>
            {s.node}
          </div>
        );
      })}

      {state?.error && <FormError>{state.error}</FormError>}
      {state?.ok && successMessage && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          {successMessage}
        </p>
      )}

      {stepped ? (
        <div className="mt-1 flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="flex h-11 items-center gap-1 rounded-full border border-zinc-300 px-5 font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              onClick={submitStepped}
              disabled={pending}
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? "Guardando…" : submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="flex h-11 flex-1 items-center justify-center gap-1 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700"
            >
              Siguiente <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="mt-1 h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
      )}
    </form>
  );
}
