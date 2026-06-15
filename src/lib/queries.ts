import "server-only";
import { db } from "@/db";
import { profiles, mealLogs, mealLogItems, weightLogs } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getProfile(userId: string) {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export type MealWithItems = typeof mealLogs.$inferSelect & {
  items: (typeof mealLogItems.$inferSelect)[];
};

export async function getDayMeals(
  userId: string,
  date: string
): Promise<MealWithItems[]> {
  const meals = await db
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.date, date)))
    .orderBy(mealLogs.createdAt);

  if (meals.length === 0) return [];

  const result: MealWithItems[] = [];
  for (const m of meals) {
    const items = await db
      .select()
      .from(mealLogItems)
      .where(eq(mealLogItems.mealLogId, m.id));
    result.push({ ...m, items });
  }
  return result;
}

export function sumDay(meals: MealWithItems[]) {
  return meals.reduce(
    (acc, m) => ({
      kcal: round(acc.kcal + m.kcal),
      protein: round(acc.protein + m.protein),
      carb: round(acc.carb + m.carb),
      fat: round(acc.fat + m.fat),
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 }
  );
}

export async function getLatestWeight(userId: string) {
  const rows = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.date))
    .limit(1);
  return rows[0] ?? null;
}

export async function getWeightHistory(userId: string, limit = 30) {
  return db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.date))
    .limit(limit);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
