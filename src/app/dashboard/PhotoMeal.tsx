"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { analyzeMealPhoto, saveAnalyzedMeal } from "./actions";
import { macrosFor, type AnalyzedItem } from "@/lib/nutrition/foods";
import { fileToScaledDataUrl, takePendingPhotos, PHOTOS_EVENT } from "@/lib/image";

const MAX_IMAGES = 5;

const MEAL_TYPES = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Snack" },
] as const;

const LOADING_STEPS = [
  "Subiendo las fotos…",
  "Detectando alimentos…",
  "Estimando porciones…",
  "Cruzando con la base nutricional…",
  "Casi listo…",
];

function scale(item: AnalyzedItem) {
  return macrosFor(item);
}

export default function PhotoMeal() {
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<AnalyzedItem[] | null>(null);
  const [mealType, setMealType] = useState<string>("lunch");
  const [error, setError] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [saving, startSave] = useTransition();
  const [step, setStep] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Toma las fotos que llegan desde el FAB del navbar (en el mount y por evento).
  useEffect(() => {
    const load = () => {
      const pend = takePendingPhotos();
      if (pend.length === 0) return;
      setItems(null);
      setImages((prev) => [...prev, ...pend].slice(0, MAX_IMAGES));
    };
    load();
    window.addEventListener(PHOTOS_EVENT, load);
    return () => window.removeEventListener(PHOTOS_EVENT, load);
  }, []);

  // Cicla los mensajes de carga mientras analiza (~20-40s en modelo free).
  useEffect(() => {
    if (!analyzing) {
      setStep(0);
      return;
    }
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      5000
    );
    return () => clearInterval(id);
  }, [analyzing]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setItems(null);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`Máximo ${MAX_IMAGES} fotos.`);
      return;
    }
    try {
      const scaled = await Promise.all(
        files.slice(0, room).map((f) => fileToScaledDataUrl(f))
      );
      setImages((prev) => [...prev, ...scaled]);
    } catch {
      setError("No se pudo procesar alguna imagen.");
    } finally {
      input.value = ""; // permite volver a elegir la misma foto
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function analyze() {
    if (images.length === 0) return;
    setError(null);
    startAnalyze(async () => {
      const res = await analyzeMealPhoto({ images, description });
      if (res.error || !res.items) {
        setError(res.error ?? "Error al analizar.");
        return;
      }
      setItems(res.items);
    });
  }

  function setGrams(idx: number, grams: number) {
    setItems((prev) =>
      prev ? prev.map((it, i) => (i === idx ? { ...it, grams } : it)) : prev
    );
  }

  function removeItem(idx: number) {
    setItems((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev));
  }

  function reset() {
    setImages([]);
    setDescription("");
    setItems(null);
    setError(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  function save() {
    if (!items || items.length === 0) return;
    startSave(async () => {
      const res = await saveAnalyzedMeal({ mealType, items });
      if (res?.error) {
        setError(res.error);
        return;
      }
      reset();
    });
  }

  const total = (items ?? []).reduce(
    (acc, it) => {
      const m = scale(it);
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carb: acc.carb + m.carb,
        fat: acc.fat + m.fat,
      };
    },
    { kcal: 0, protein: 0, carb: 0, fat: 0 }
  );

  return (
    <div className="flex flex-col gap-4">
      {(images.length > 0 || items) && (
        <div className="flex justify-end">
          <button
            onClick={reset}
            className="text-sm text-zinc-400 hover:text-zinc-600"
          >
            Empezar de nuevo
          </button>
        </div>
      )}

      {/* Galería de fotos */}
      {!items && images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, idx) => (
            <div key={idx} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Foto ${idx + 1}`}
                className="h-full w-full rounded-xl object-cover"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Quitar foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Acciones de carga: cámara o galería */}
      {!items && images.length < MAX_IMAGES && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-400">
            <Camera className="h-5 w-5" />
            Cámara
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={onPick}
              className="hidden"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-400">
            <ImagePlus className="h-5 w-5" />
            Galería
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              className="hidden"
            />
          </label>
        </div>
      )}

      {images.length > 0 && !items && (
        <p className="text-xs text-zinc-400">
          {images.length}/{MAX_IMAGES} fotos · podés sumar varios ángulos o
          platos de la misma comida.
        </p>
      )}

      {/* Descripción opcional */}
      {!items && (
        <div>
          <label
            htmlFor="meal-desc"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Descripción (opcional)
          </label>
          <textarea
            id="meal-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 400))}
            rows={2}
            placeholder="Ej: milanesa de pollo casera, la pasta tiene crema y queso rallado…"
            className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Dale contexto a la IA: ingredientes, forma de cocción, tamaño de la
            porción.
          </p>
        </div>
      )}

      {images.length > 0 && !items && (
        <button
          onClick={analyze}
          disabled={analyzing}
          className="h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-70"
        >
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> {LOADING_STEPS[step]}
            </span>
          ) : (
            `Analizar ${images.length > 1 ? `${images.length} fotos` : "foto"}`
          )}
        </button>
      )}

      {analyzing && (
        <p className="text-center text-xs text-zinc-500">
          El modelo gratuito puede tardar ~20-40 segundos. No cierres la página.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {items && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setMealType(t.value)}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  mealType === t.value
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <ul className="flex flex-col gap-2">
            {items.map((it, idx) => {
              const m = scale(it);
              return (
                <li
                  key={idx}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 dark:bg-zinc-900"
                >
                  <div className="flex-1">
                    <p className="text-sm">{it.label}</p>
                    <span
                      className={`text-[10px] font-medium uppercase ${
                        it.source === "db"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {it.source === "db" ? "base · preciso" : "estimación IA"}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={it.grams}
                    min={1}
                    onChange={(e) =>
                      setGrams(idx, Math.max(1, Number(e.target.value) || 0))
                    }
                    className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  <span className="text-xs text-zinc-500">g</span>
                  <span className="w-16 text-right text-sm font-medium text-emerald-600">
                    {m.kcal} kcal
                  </span>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-zinc-400 transition hover:text-red-500"
                    aria-label="Quitar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between rounded-lg bg-emerald-100 px-3 py-2 text-sm dark:bg-emerald-950/40">
            <span className="font-medium">Total</span>
            <span>
              {Math.round(total.kcal)} kcal · P {Math.round(total.protein)} · C{" "}
              {Math.round(total.carb)} · G {Math.round(total.fat)}
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            Revisá y ajustá los gramos. Los ítems marcados “estimación IA” son
            aproximados.
          </p>

          <button
            onClick={save}
            disabled={saving}
            className="h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Confirmar y guardar"}
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
