"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingCart,
  Plus,
  Check,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import FormError from "@/components/FormError";
import { useNav } from "../NavProgress";
import SlotSheet from "./SlotSheet";
import MealLibrary from "./MealLibrary";
import { generateWeek, deriveShoppingListFromWeek } from "./actions";
import {
  MEAL_LABEL,
  SLOT_ORDER,
  type EntryView,
  type MealView,
  type DayTargets,
} from "./types";
import type { MealType } from "@/lib/ai/types";
import {
  addDaysISO,
  weekDaysISO,
  weekRangeLabel,
  shortDayLabel,
} from "@/lib/date";

type View = "calendar" | "library";

const GEN_LOADING = [
  "Pensando comidas variadas…",
  "Cuidando que cierren tus macros…",
  "Usando ingredientes accesibles…",
  "Armando tu semana…",
];

export default function WeekCalendar({
  weekStart,
  entries,
  savedMeals,
  targets,
  today,
}: {
  weekStart: string;
  entries: EntryView[];
  savedMeals: MealView[];
  targets: DayTargets;
  today: string;
}) {
  const router = useRouter();
  const { navigate } = useNav();
  const days = weekDaysISO(weekStart);
  const initialDay = days.includes(today) ? today : weekStart;
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [view, setView] = useState<View>("calendar");
  const [openSlot, setOpenSlot] = useState<{
    date: string;
    mealType: MealType;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genPending, startGen] = useTransition();
  const [genStep, setGenStep] = useState(0);
  const [listPending, startList] = useTransition();
  const [listDone, setListDone] = useState(false);

  function goWeek(deltaDays: number) {
    navigate(`/dashboard/plan?tab=semana&week=${addDaysISO(weekStart, deltaDays)}`);
  }

  function makeWeek() {
    setError(null);
    setGenStep(0);
    const timer = setInterval(
      () => setGenStep((s) => Math.min(s + 1, GEN_LOADING.length - 1)),
      5000
    );
    startGen(async () => {
      const res = await generateWeek(weekStart);
      clearInterval(timer);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function makeList() {
    setError(null);
    setListDone(false);
    startList(async () => {
      const res = await deriveShoppingListFromWeek(weekStart);
      if (res.error) {
        setError(res.error);
        return;
      }
      setListDone(true);
      router.refresh();
    });
  }

  // Índice rápido (date|mealType) → entry.
  const byKey = new Map(entries.map((e) => [`${e.date}|${e.mealType}`, e]));
  const dayEntries = entries.filter((e) => e.date === selectedDay);
  const dayKcal = Math.round(dayEntries.reduce((s, e) => s + e.meal.kcal, 0));
  const dayPct =
    targets.kcal > 0 ? Math.min(100, Math.round((dayKcal / targets.kcal) * 100)) : 0;
  const openEntry = openSlot
    ? byKey.get(`${openSlot.date}|${openSlot.mealType}`) ?? null
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle de sub-vista */}
      <div className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
        <SubTab
          active={view === "calendar"}
          onClick={() => setView("calendar")}
          icon={<CalendarDays className="h-4 w-4" />}
          label="Planificador"
        />
        <SubTab
          active={view === "library"}
          onClick={() => setView("library")}
          icon={<BookOpen className="h-4 w-4" />}
          label="Mis comidas"
        />
      </div>

      {error && <FormError>{error}</FormError>}

      {view === "library" ? (
        <MealLibrary meals={savedMeals} />
      ) : (
        <>
          {/* Navegación de semana */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => goWeek(-7)}
              className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {weekRangeLabel(weekStart)}
            </span>
            <button
              onClick={() => goWeek(7)}
              className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Strip de días */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const has = entries.some((e) => e.date === d);
              const active = d === selectedDay;
              const isToday = d === today;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-xs transition ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="capitalize">
                    {shortDayLabel(d).split(" ")[0]}
                  </span>
                  <span className={`font-semibold ${isToday && !active ? "text-emerald-600" : ""}`}>
                    {d.split("-")[2]}
                  </span>
                  <span
                    className={`h-1 w-1 rounded-full ${
                      has ? (active ? "bg-white" : "bg-emerald-500") : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Macros del día */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-end justify-between">
              <p className="text-sm text-zinc-500">Planificado</p>
              <p className="text-sm text-zinc-500">
                {dayKcal} / {targets.kcal} kcal
              </p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${dayPct}%` }}
              />
            </div>
          </div>

          {/* Slots del día */}
          <div className="flex flex-col gap-2">
            {SLOT_ORDER.map((slot) => {
              const entry = byKey.get(`${selectedDay}|${slot}`);
              return (
                <button
                  key={slot}
                  onClick={() => setOpenSlot({ date: selectedDay, mealType: slot })}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-900/60"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                      {MEAL_LABEL[slot]}
                    </p>
                    {entry ? (
                      <p className="mt-0.5 truncate text-sm text-zinc-800 dark:text-zinc-100">
                        {entry.meal.title}
                        <span className="ml-1 text-xs text-zinc-400">
                          {Math.round(entry.meal.kcal)} kcal
                        </span>
                      </p>
                    ) : (
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-400">
                        <Plus className="h-3.5 w-3.5" /> Agregar
                      </p>
                    )}
                  </div>
                  {entry?.mealLogId && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={makeWeek}
              disabled={genPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {genPending
                ? GEN_LOADING[genStep]
                : entries.length > 0
                  ? "Regenerar semana"
                  : "Generar semana con IA"}
            </button>
            <button
              onClick={makeList}
              disabled={listPending || entries.length === 0}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <ShoppingCart className="h-4 w-4" />
              {listPending
                ? "Armando lista…"
                : listDone
                  ? "Lista actualizada ✓"
                  : "Generar lista desde mi semana"}
            </button>
          </div>
          {genPending && (
            <p className="text-center text-xs text-zinc-400">
              El modelo gratuito puede tardar ~30 segundos.
            </p>
          )}
        </>
      )}

      {openSlot && (
        <SlotSheet
          date={openSlot.date}
          mealType={openSlot.mealType}
          entry={openEntry}
          savedMeals={savedMeals}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}

function SubTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-emerald-600 shadow-sm dark:bg-zinc-950 dark:text-emerald-400"
          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
