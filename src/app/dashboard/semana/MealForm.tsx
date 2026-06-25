"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import FormError from "@/components/FormError";
import { createSavedMeal, updateSavedMeal, type SavedMealInput } from "./actions";
import { MEAL_LABEL, SLOT_ORDER, type MealView } from "./types";
import { SHOPPING_CATEGORY_VALUES } from "@/lib/ai/types";
import type { ShoppingCategory } from "@/db/schema";

const CATEGORY_LABEL: Record<ShoppingCategory, string> = {
  verduleria: "Verdulería",
  carniceria: "Carnicería",
  pescaderia: "Pescadería",
  lacteos: "Lácteos y huevos",
  panificados: "Panificados",
  almacen: "Almacén",
  congelados: "Congelados",
  bebidas: "Bebidas",
  otros: "Otros",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelClass = "block text-xs font-medium text-zinc-600 dark:text-zinc-400";

type Ingredient = { name: string; quantity: string; category: ShoppingCategory };

export default function MealForm({
  meal,
  onDone,
  onCancel,
}: {
  meal?: MealView;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(meal?.title ?? "");
  const [mealType, setMealType] = useState(meal?.mealType ?? "lunch");
  const [recipe, setRecipe] = useState(meal?.recipe ?? "");
  const [servings, setServings] = useState(meal?.servings ?? 1);
  const [kcal, setKcal] = useState(meal?.kcal ?? 0);
  const [protein, setProtein] = useState(meal?.protein ?? 0);
  const [carb, setCarb] = useState(meal?.carb ?? 0);
  const [fat, setFat] = useState(meal?.fat ?? 0);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    meal?.ingredients ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function addIngredient() {
    setIngredients((arr) => [
      ...arr,
      { name: "", quantity: "", category: "otros" },
    ]);
  }
  function updateIngredient(i: number, patch: Partial<Ingredient>) {
    setIngredients((arr) =>
      arr.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing))
    );
  }
  function removeIngredient(i: number) {
    setIngredients((arr) => arr.filter((_, idx) => idx !== i));
  }

  function submit() {
    if (!title.trim()) {
      setError("Poné un título a la comida.");
      return;
    }
    setError(null);
    const input: SavedMealInput = {
      title: title.trim(),
      mealType,
      recipe: recipe.trim(),
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          quantity: i.quantity.trim(),
          category: i.category,
        })),
      servings,
      kcal,
      protein,
      carb,
      fat,
    };
    start(async () => {
      const res = meal
        ? await updateSavedMeal(meal.id, input)
        : await createSavedMeal(input);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {meal ? "Editar comida" : "Nueva comida"}
        </h3>
        <button
          onClick={onCancel}
          className="text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
          aria-label="Cancelar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass} htmlFor="mf-title">
              Título
            </label>
            <input
              id="mf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pollo al horno con papas"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="mf-type">
              Momento
            </label>
            <select
              id="mf-type"
              value={mealType}
              onChange={(e) =>
                setMealType(e.target.value as MealView["mealType"])
              }
              className={inputClass}
            >
              {SLOT_ORDER.map((t) => (
                <option key={t} value={t}>
                  {MEAL_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="mf-servings">
              Porciones
            </label>
            <input
              id="mf-servings"
              type="number"
              min={1}
              max={20}
              value={servings}
              onChange={(e) =>
                setServings(Math.max(1, Number(e.target.value) || 1))
              }
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="mf-recipe">
            Receta
          </label>
          <textarea
            id="mf-recipe"
            value={recipe}
            onChange={(e) => setRecipe(e.target.value)}
            rows={3}
            placeholder="Pasos breves de preparación…"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <NumField label="kcal" value={kcal} onChange={setKcal} />
          <NumField label="Prot." value={protein} onChange={setProtein} />
          <NumField label="Carb." value={carb} onChange={setCarb} />
          <NumField label="Grasa" value={fat} onChange={setFat} />
        </div>
        <p className="-mt-1 text-xs text-zinc-400">
          Macros por porción. Si no los sabés, dejalos en 0.
        </p>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className={labelClass}>Ingredientes</span>
            <button
              onClick={addIngredient}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                  placeholder="Ingrediente"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <input
                  value={ing.quantity}
                  onChange={(e) =>
                    updateIngredient(i, { quantity: e.target.value })
                  }
                  placeholder="Cant."
                  className="w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <select
                  value={ing.category}
                  onChange={(e) =>
                    updateIngredient(i, {
                      category: e.target.value as ShoppingCategory,
                    })
                  }
                  className="w-28 shrink-0 rounded-lg border border-zinc-300 bg-white px-1 py-1.5 text-xs outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {SHOPPING_CATEGORY_VALUES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeIngredient(i)}
                  className="shrink-0 text-zinc-400 transition hover:text-red-500"
                  aria-label="Quitar ingrediente"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <FormError>{error}</FormError>}

        <button
          onClick={submit}
          disabled={pending}
          className="h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Guardando…" : meal ? "Guardar cambios" : "Guardar comida"}
        </button>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className={inputClass}
      />
    </div>
  );
}
