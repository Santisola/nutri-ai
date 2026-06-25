import "@/lib/load-env";
import { getTextProvider } from "@/lib/ai";
import type { ShoppingListContext } from "@/lib/ai/types";

const ctx: ShoppingListContext = {
  targets: { kcal: 2100, protein: 150, carb: 200, fat: 65 },
  period: "weekly",
  householdSize: 3,
  dietaryPrefs: ["práctico", "económico"],
  allergies: ["maní"],
  dislikes: ["hígado"],
  plan: null,
};

async function main() {
  console.log(`Texto: ${process.env.AI_TEXT_MODEL}\n`);

  console.log("=== GENERAR LISTA DE COMPRAS (semanal, 3 personas) ===");
  const t = Date.now();
  const res = await getTextProvider().generateShoppingList(ctx);
  console.log(`(${Date.now() - t} ms)\n`);

  console.log(`Ítems: ${res.items.length}`);
  for (const i of res.items) {
    console.log(`  · [${i.category}] ${i.name} — ${i.quantity}`);
  }

  console.log(`\nIdeas de comidas: ${res.mealIdeas.length}`);
  for (const m of res.mealIdeas) {
    console.log(`  · (${m.mealType}) ${m.title} — ${m.ingredients.length} ingr.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e?.message ?? e);
    process.exit(1);
  });
