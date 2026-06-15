import "@/lib/load-env";
import { getTextProvider } from "@/lib/ai";

async function main() {
  console.log(`🔢 Texto: ${process.env.AI_TEXT_MODEL}\n`);
  const t0 = Date.now();
  const res = await getTextProvider().suggestMeal({
    remaining: { kcal: 650, protein: 40, carb: 70, fat: 20 },
    mealType: "dinner",
    dietaryPrefs: ["práctico"],
    allergies: ["maní"],
    dislikes: ["hígado"],
  });
  console.log(`⏱️  ${Date.now() - t0} ms\n`);
  for (const s of res.suggestions) {
    console.log(`• ${s.title}  (~${s.approxKcal} kcal)`);
    console.log(`  ${s.description}`);
    console.log(`  ingredientes: ${s.ingredients.join(", ")}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("💥", e?.message ?? e);
    process.exit(1);
  });
