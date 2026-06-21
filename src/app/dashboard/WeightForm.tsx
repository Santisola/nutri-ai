"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { logWeight } from "./actions";
import FormError from "@/components/FormError";

export default function WeightForm({ current }: { current?: number }) {
  const [state, formAction, pending] = useActionState(logWeight, null);

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="weightKg" className="block text-xs text-zinc-500">
            Peso de hoy (kg)
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            defaultValue={current}
            placeholder="80.0"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-zinc-800 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-700"
        >
          {pending ? "Guardando…" : "Registrar"}
        </button>
      </form>

      {state?.error && <FormError>{state.error}</FormError>}
      {state?.ok && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <Check className="h-4 w-4" /> Peso registrado para hoy.
        </p>
      )}
    </div>
  );
}
