"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ShoppingCart,
  Sparkles,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";
import Markdown from "@/components/Markdown";
import FormError from "@/components/FormError";
import {
  generateShoppingList,
  toggleShoppingItem,
  type ShoppingListPayload,
} from "./actions";
import type { ShoppingCategory } from "@/db/schema";

const LOADING = [
  "Revisando tu objetivo y preferencias…",
  "Eligiendo ingredientes accesibles…",
  "Calculando cantidades para tu grupo…",
  "Armando ideas de comidas…",
];

// Orden de las categorías en la UI (recorrido típico de compra).
const CATEGORY_ORDER: ShoppingCategory[] = [
  "verduleria",
  "carniceria",
  "pescaderia",
  "lacteos",
  "panificados",
  "almacen",
  "congelados",
  "bebidas",
  "otros",
];

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

const MEAL_LABEL: Record<ShoppingListPayload["mealIdeas"][number]["mealType"], string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function ShoppingListView({
  initialList,
  defaultHouseholdSize,
}: {
  initialList: ShoppingListPayload | null;
  defaultHouseholdSize: number;
}) {
  const [list, setList] = useState<ShoppingListPayload | null>(initialList);
  const [period, setPeriod] = useState<"weekly" | "biweekly">(
    initialList?.period ?? "weekly"
  );
  const [householdSize, setHouseholdSize] = useState(
    initialList?.householdSize ?? defaultHouseholdSize
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);

  function generate() {
    setError(null);
    setStep(0);
    start(async () => {
      const res = await generateShoppingList({ period, householdSize });
      if (res.error || !res.list) {
        setError(res.error ?? "No se pudo generar la lista.");
        return;
      }
      setList(res.list);
      setPeriod(res.list.period);
      setHouseholdSize(res.list.householdSize);
    });
  }

  // Tacha/destacha de forma optimista y persiste; revierte si falla.
  async function toggle(index: number, checked: boolean) {
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it, i) =>
              i === index ? { ...it, checked } : it
            ),
          }
        : prev
    );
    const res = await toggleShoppingItem(index, checked);
    if (res.error) {
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((it, i) =>
                i === index ? { ...it, checked: !checked } : it
              ),
            }
          : prev
      );
    }
  }

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING.length - 1)),
      5000
    );
    return () => clearInterval(id);
  }, [pending]);

  if (pending) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="font-medium text-zinc-800 dark:text-zinc-100">
          {LOADING[step]}
        </p>
        <p className="text-xs text-zinc-400">
          El modelo gratuito puede tardar ~30 segundos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Form de generación */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="period">
              Período
            </label>
            <select
              id="period"
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value as "weekly" | "biweekly")
              }
              className={inputClass}
            >
              <option value="weekly">Semanal (7 días)</option>
              <option value="biweekly">Quincenal (14 días)</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="householdSize">
              Personas
            </label>
            <input
              id="householdSize"
              type="number"
              min={1}
              max={20}
              value={householdSize}
              onChange={(e) =>
                setHouseholdSize(
                  Math.max(1, Math.min(20, Number(e.target.value) || 1))
                )
              }
              className={inputClass}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Cantidades para tu grupo familiar, con ingredientes accesibles
          alineados a tu plan.
        </p>
        {error && <FormError className="mt-3">{error}</FormError>}
        <button
          onClick={generate}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          {list ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerar lista
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Generar lista de compras
            </>
          )}
        </button>
      </div>

      {!list ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <p className="max-w-xs text-sm text-zinc-500">
            Generá tu lista de compras para stockearte de lo que necesitás y
            comer alineado al plan sin recaer en delivery.
          </p>
        </div>
      ) : (
        <>
          <ItemsByCategory items={list.items} onToggle={toggle} />
          {list.mealIdeas.length > 0 && <MealIdeas ideas={list.mealIdeas} />}
        </>
      )}
    </div>
  );
}

function ItemsByCategory({
  items,
  onToggle,
}: {
  items: ShoppingListPayload["items"];
  onToggle: (index: number, checked: boolean) => void;
}) {
  // Conservamos el índice original (lo necesita la persistencia por índice).
  const indexed = items.map((item, index) => ({ item, index }));
  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    rows: indexed.filter(({ item }) => item.category === cat),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ cat, rows }) => (
        <section
          key={cat}
          className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {CATEGORY_LABEL[cat]}
          </h3>
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map(({ item, index }) => (
              <li key={index}>
                <label className="flex cursor-pointer items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => onToggle(index, e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      item.checked
                        ? "text-zinc-400 line-through"
                        : "text-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    {item.name}
                  </span>
                  {item.quantity && (
                    <span
                      className={`text-xs ${
                        item.checked ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {item.quantity}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MealIdeas({ ideas }: { ideas: ShoppingListPayload["mealIdeas"] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        <UtensilsCrossed className="h-4 w-4" />
        Ideas de comidas
      </h2>
      <div className="flex flex-col gap-3">
        {ideas.map((idea) => (
          <article
            key={idea.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                {idea.title}
              </h3>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                {MEAL_LABEL[idea.mealType]}
              </span>
            </div>
            {idea.recipe && (
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                <Markdown>{idea.recipe}</Markdown>
              </div>
            )}
            {idea.ingredients.length > 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                {idea.ingredients
                  .map((i) => (i.quantity ? `${i.name} (${i.quantity})` : i.name))
                  .join(" · ")}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
