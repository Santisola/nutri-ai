/**
 * Fecha "de hoy" en la zona horaria de Argentina (UTC-3), como YYYY-MM-DD.
 * Evita que las comidas de la noche se registren en el día equivocado por usar UTC
 * en el server (Vercel corre en UTC).
 */
export function todayISO(tz = "America/Argentina/Buenos_Aires"): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA => YYYY-MM-DD
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/** Sugiere el tipo de comida según la hora local en Argentina. */
export function currentMealType(tz = "America/Argentina/Buenos_Aires"): MealType {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 19) return "snack";
  return "dinner";
}

export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(y, m - 1, d));
}

/* ─────────────────────────  Semana (lunes–domingo)  ───────────────────────── */
// Operamos sobre strings YYYY-MM-DD usando UTC para evitar corrimientos por DST/tz.

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Suma (o resta) días a una fecha ISO y devuelve ISO. */
export function addDaysISO(iso: string, days: number): string {
  const dt = toUTC(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return fromUTC(dt);
}

/** Lunes de la semana que contiene `iso` (YYYY-MM-DD). */
export function weekStartISO(iso: string): string {
  const dt = toUTC(iso);
  const dow = dt.getUTCDay(); // 0=domingo … 6=sábado
  const offset = (dow + 6) % 7; // días desde el lunes
  return addDaysISO(iso, -offset);
}

/** Los 7 días (ISO) de la semana que arranca en `weekStart` (debe ser lunes). */
export function weekDaysISO(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
}

/** Etiqueta corta de un día: "Lun 24". */
export function shortDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

/** Rango de semana legible: "23 – 29 de junio". */
export function weekRangeLabel(weekStart: string): string {
  const end = addDaysISO(weekStart, 6);
  const [, sm, sd] = weekStart.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const month = (m: number) =>
    new Intl.DateTimeFormat("es-AR", { month: "long" }).format(
      new Date(2020, m - 1, 1)
    );
  if (sm === em) return `${sd} – ${ed} de ${month(em)}`;
  return `${sd} de ${month(sm)} – ${ed} de ${month(em)} ${ey}`;
}
