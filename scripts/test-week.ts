import "@/lib/load-env";
import { getTextProvider } from "@/lib/ai";
import type { PlanContext } from "@/lib/ai/types";

const ctx: PlanContext = {
  goalType: "lose",
  targets: { kcal: 2100, protein: 150, carb: 200, fat: 65 },
  weightKg: 93,
  targetWeightKg: 83,
  activityLevel: "moderate",
  dietaryPrefs: ["práctico", "económico"],
  allergies: ["maní"],
  dislikes: ["hígado"],
};

async function main() {
  console.log(`Texto: ${process.env.AI_TEXT_MODEL}\n`);
  const provider = getTextProvider();

  console.log("=== POOL DE COMIDAS DE LA SEMANA ===");
  let t = Date.now();
  const { meals } = await provider.generateWeekMealPool(ctx, 10);
  console.log(`(${Date.now() - t} ms) — ${meals.length} comidas`);
  const byType: Record<string, number> = {};
  for (const m of meals) {
    byType[m.mealType] = (byType[m.mealType] ?? 0) + 1;
    console.log(
      `  · (${m.mealType}) ${m.title} — ${m.kcal}kcal, ${m.ingredients.length} ingr, ${m.servings} porc.`
    );
  }
  console.log("Por tipo:", byType);

  console.log("\n=== CONSOLIDAR LISTA DESDE 3 COMIDAS ===");
  t = Date.now();
  const list = await provider.consolidateShoppingList({
    meals: meals.slice(0, 3).map((m) => ({
      title: m.title,
      ingredients: m.ingredients,
    })),
    householdSize: 3,
    period: "weekly",
  });
  console.log(`(${Date.now() - t} ms) — ${list.items.length} ítems`);
  for (const i of list.items) console.log(`  · [${i.category}] ${i.name} — ${i.quantity}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e?.message ?? e);
    process.exit(1);
  });
