"use client";

import { useState } from "react";
import {
  Target,
  Camera,
  TrendingUp,
  MessageCircle,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import ProfileForm, {
  type ProfileFormState,
} from "@/components/ProfileForm";

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Target,
    title: "Definí tu objetivo",
    desc: "Cargás tus datos y tu meta de peso. Calculamos tus calorías y macros diarios.",
  },
  {
    icon: Camera,
    title: "Registrá con una foto",
    desc: "Sacás una foto de tu comida y la IA estima los alimentos, calorías y nutrientes.",
  },
  {
    icon: TrendingUp,
    title: "Seguí tu progreso",
    desc: "Mirás tu día frente al objetivo y la evolución de tu peso en el tiempo.",
  },
  {
    icon: MessageCircle,
    title: "Consultá lo que quieras",
    desc: "Un asistente para dudas de alimentación: antojos, snacks, qué te conviene comer.",
  },
];

export default function OnboardingFlow({
  action,
}: {
  action: (
    state: ProfileFormState,
    formData: FormData
  ) => Promise<ProfileFormState>;
}) {
  const [phase, setPhase] = useState<"intro" | "form">("intro");

  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-8">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="text-3xl font-bold tracking-tight text-emerald-600">
            NutriAI
          </span>
          <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
            Tu nutrición, simple. Registrá lo que comés con una foto y alcanzá tu
            objetivo de peso, con seguimiento día a día.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Cómo funciona
          </h2>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {s.title}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setPhase("form")}
            className="h-12 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700"
          >
            Empezar
          </button>
          <p className="text-center text-xs text-zinc-400">
            El siguiente paso es completar tus datos para calcular tu objetivo.
            No es consejo médico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => setPhase("intro")}
        className="flex items-center gap-1 self-start text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Contanos sobre vos
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Con estos datos calculamos tu objetivo calórico diario y tus macros.
        </p>
      </header>

      <ProfileForm action={action} submitLabel="Calcular mi objetivo" stepped />

      <p className="text-xs text-zinc-400">
        Cálculo basado en la ecuación de Mifflin-St Jeor. No es consejo médico.
      </p>
    </div>
  );
}
