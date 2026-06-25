"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus, Pencil, Trash2 } from "lucide-react";
import FormError from "@/components/FormError";
import MealForm from "./MealForm";
import { generateRecipeAndSave, deleteSavedMeal } from "./actions";
import { MEAL_LABEL, type MealView } from "./types";

export default function MealLibrary({ meals }: { meals: MealView[] }) {
  const router = useRouter();
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // null = no form; "new" = crear; número = editar esa comida.
  const [editing, setEditing] = useState<"new" | number | null>(null);

  function generate() {
    if (desc.trim().length < 3) {
      setError("Describí la comida que querés guardar.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await generateRecipeAndSave(desc.trim());
      if (res.error) {
        setError(res.error);
        return;
      }
      setDesc("");
      router.refresh();
    });
  }

  function remove(id: number) {
    start(async () => {
      await deleteSavedMeal(id);
      router.refresh();
    });
  }

  const editingMeal =
    typeof editing === "number" ? meals.find((m) => m.id === editing) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Generar con IA */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Guardá una comida con IA
        </label>
        <p className="mb-2 text-xs text-zinc-400">
          Describila y la IA arma la receta, ingredientes y macros.
        </p>
        <div className="flex gap-2">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Ej: pollo al curry con arroz"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            onClick={generate}
            disabled={pending}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {pending ? "…" : "Generar"}
          </button>
        </div>
        {error && <FormError className="mt-2">{error}</FormError>}
      </div>

      {/* Form de carga/edición manual */}
      {editing === "new" && (
        <MealForm onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
      )}
      {editingMeal && (
        <MealForm
          meal={editingMeal}
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      )}

      {editing === null && (
        <button
          onClick={() => setEditing("new")}
          className="flex items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" /> Cargar una comida a mano
        </button>
      )}

      {/* Lista */}
      <div className={pending ? "opacity-60" : ""}>
        {meals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Todavía no tenés comidas guardadas. Generá tu semana o agregá una acá.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {meals.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {m.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {MEAL_LABEL[m.mealType]} · {Math.round(m.kcal)} kcal · P{" "}
                    {Math.round(m.protein)}g
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditing(m.id)}
                    className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    className="rounded-full p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
