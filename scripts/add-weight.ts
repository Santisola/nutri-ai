import "@/lib/load-env";
import { db } from "@/db";
import { users, weightLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// Uso: tsx scripts/add-weight.ts <email> <kg> [YYYY-MM-DD | ayer]
function yesterdayAR(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

async function main() {
  const email = process.argv[2];
  const kg = Number(process.argv[3]);
  const dateArg = process.argv[4];
  const date = !dateArg || dateArg === "ayer" ? yesterdayAR() : dateArg;

  if (!email || !Number.isFinite(kg)) {
    console.error("Uso: tsx scripts/add-weight.ts <email> <kg> [YYYY-MM-DD]");
    process.exit(1);
  }

  const user = (
    await db.select().from(users).where(eq(users.email, email)).limit(1)
  )[0];
  if (!user) {
    console.error(`No existe usuario con email ${email}. ¿Ya hizo login?`);
    process.exit(1);
  }

  const existing = (
    await db
      .select({ id: weightLogs.id })
      .from(weightLogs)
      .where(and(eq(weightLogs.userId, user.id), eq(weightLogs.date, date)))
      .limit(1)
  )[0];

  if (existing) {
    await db
      .update(weightLogs)
      .set({ weightKg: kg })
      .where(eq(weightLogs.id, existing.id));
    console.log(`Actualizado: ${email} → ${kg} kg el ${date}`);
  } else {
    await db.insert(weightLogs).values({ userId: user.id, date, weightKg: kg });
    console.log(`Insertado: ${email} → ${kg} kg el ${date}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
