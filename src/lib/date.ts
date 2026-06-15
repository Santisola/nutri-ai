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
