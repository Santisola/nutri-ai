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

  console.log("=== GENERAR PLAN ===");
  let t = Date.now();
  const plan = await getTextProvider().generatePlan(ctx);
  console.log(`(${Date.now() - t} ms)\n`);
  console.log(plan.slice(0, 900));
  console.log("\n…\n");

  console.log("=== MODIFICAR: 'quiero 5 comidas al día y opciones vegetarianas' ===");
  t = Date.now();
  const updated = await getTextProvider().modifyPlan(
    plan,
    "quiero 5 comidas al día y que sean opciones vegetarianas",
    ctx
  );
  console.log(`(${Date.now() - t} ms)\n`);
  console.log(updated.slice(0, 900));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e?.message ?? e);
    process.exit(1);
  });
