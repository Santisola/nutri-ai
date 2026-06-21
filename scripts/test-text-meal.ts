import "@/lib/load-env";
import { getTextProvider } from "@/lib/ai";

// Smoke test de las nuevas piezas IA: comida por texto/voz y día completo.
async function main() {
  console.log(`Texto: ${process.env.AI_TEXT_MODEL}\n`);

  console.log("── Comida (estimateMealFromText) ──");
  const meal = await getTextProvider().estimateMealFromText(
    "dos milanesas de pollo con puré y una ensalada de tomate y cebolla"
  );
  console.log(`  isFood=${meal.isFood}`);
  for (const f of meal.foods) {
    console.log(
      `  • ${f.name} · ${f.estimatedGrams}g · ${f.kcal} kcal (${f.confidence})`
    );
  }

  console.log('\n── No comida ("bla bla bla") ──');
  const junk = await getTextProvider().estimateMealFromText("bla bla bla");
  console.log(`  isFood=${junk.isFood} · foods=${junk.foods.length}`);
  console.log(`  message: ${junk.message}`);

  console.log("\n── Día completo (estimateDayFromText) ──");
  const day = await getTextProvider().estimateDayFromText(
    "en el desayuno tomé un café con leche y dos tostadas con queso. " +
      "Al mediodía comí milanesa con ensalada. A la tarde un yogur con una banana. " +
      "A la noche dos porciones de pizza de muzzarella."
  );
  for (const m of day.meals) {
    console.log(`  [${m.mealType}]`);
    for (const f of m.foods) {
      console.log(`    • ${f.name} · ${f.estimatedGrams}g · ${f.kcal} kcal`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e?.message ?? e);
    process.exit(1);
  });
