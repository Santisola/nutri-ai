import "@/lib/load-env";
import { db } from "@/db";
import {
  users,
  profiles,
  mealLogs,
  weightLogs,
  sessions,
  accounts,
} from "@/db/schema";
import { eq } from "drizzle-orm";

// Uso: tsx scripts/delete-user.ts <email>
// Borra el usuario y todo lo asociado (cascade): perfil, comidas, pesos, sesión, cuenta.
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: tsx scripts/delete-user.ts <email>");
    process.exit(1);
  }

  const user = (
    await db.select().from(users).where(eq(users.email, email)).limit(1)
  )[0];
  if (!user) {
    console.log(`No existe usuario con email ${email}.`);
    return;
  }

  const [prof, meals, weights, sess, accs] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, user.id)),
    db.select().from(mealLogs).where(eq(mealLogs.userId, user.id)),
    db.select().from(weightLogs).where(eq(weightLogs.userId, user.id)),
    db.select().from(sessions).where(eq(sessions.userId, user.id)),
    db.select().from(accounts).where(eq(accounts.userId, user.id)),
  ]);

  console.log(`Usuario: ${email} (${user.id})`);
  console.log(
    `Se borran → perfil:${prof.length} comidas:${meals.length} pesos:${weights.length} sesiones:${sess.length} cuentas:${accs.length}`
  );

  await db.delete(users).where(eq(users.id, user.id));
  console.log("Usuario y datos asociados eliminados (cascade).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
