import "@/lib/load-env";
import { getTextProvider } from "@/lib/ai";

async function main() {
  console.log(`Texto: ${process.env.AI_TEXT_MODEL}\n`);
  for (const desc of [
    "2 porciones de ñoquis con tuco",
    "una milanesa napolitana grande",
    "un puñado de almendras",
  ]) {
    const e = await getTextProvider().estimateFoodFromText(desc);
    const kcalTotal = Math.round((e.kcalPer100g * e.grams) / 100);
    console.log(
      `"${desc}" → ${Math.round(e.grams)}g · ${e.kcalPer100g} kcal/100g → total ≈ ${kcalTotal} kcal (P${e.proteinPer100g}/C${e.carbPer100g}/G${e.fatPer100g} por 100g)`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e?.message ?? e);
    process.exit(1);
  });
