import "@/lib/load-env";
import { getTextProvider } from "@/lib/ai";

const SAMPLE = `PLAN ALIMENTARIO - Lic. Maria Gomez (MN 12345)
Paciente: Juan  Objetivo: descenso de peso
Valor calorico total: 1900 kcal/dia. Proteinas 140 g, Carbohidratos 180 g, Grasas 60 g.

DESAYUNO: 1 taza de cafe con leche descremada + 2 tostadas de pan integral con queso untable descremado.
COLACION: 1 fruta.
ALMUERZO: 150g de pollo o pescado a la plancha + ensalada de hojas verdes con 1 cdita de aceite de oliva + 1/2 plato de arroz integral.
MERIENDA: yogur descremado con avena.
CENA: 1 porcion de carne magra + vegetales al horno (no papa).

Recomendaciones: tomar 2 litros de agua por dia. Evitar frituras, gaseosas y azucar. Caminar 30 min diarios.`;

async function main() {
  console.log(`Texto: ${process.env.AI_TEXT_MODEL}\n`);

  console.log("=== OBJETIVOS EXTRAÍDOS ===");
  const t = await getTextProvider().extractTargetsFromText(SAMPLE);
  console.log(t, "\n");

  console.log("=== PLAN REPLICADO (markdown) ===");
  const plan = await getTextProvider().importPlanFromText(SAMPLE);
  console.log(plan.slice(0, 1100));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e?.message ?? e);
    process.exit(1);
  });
