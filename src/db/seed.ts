import "@/lib/load-env";
import { db } from "./index";
import { foods } from "./schema";
import { normalize } from "@/lib/nutrition/foods";

/**
 * Seed inicial de alimentos comunes (Argentina), valores por 100 g.
 * Fuente aproximada: tablas de composición (Argenfoods / USDA). Para producción,
 * ampliar y curar con una fuente verificada. Ejecutar con: npx tsx src/db/seed.ts
 */
const SEED: Array<{
  name: string;
  synonyms: string[];
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}> = [
  { name: "Fideos cocidos", synonyms: ["pasta", "tallarines", "spaghetti"], kcal: 158, protein: 5.8, carb: 31, fat: 0.9 },
  { name: "Crema de leche", synonyms: ["crema"], kcal: 340, protein: 2.1, carb: 3.4, fat: 35 },
  { name: "Arroz blanco cocido", synonyms: ["arroz"], kcal: 130, protein: 2.7, carb: 28, fat: 0.3 },
  { name: "Pollo a la plancha", synonyms: ["pechuga", "pollo"], kcal: 165, protein: 31, carb: 0, fat: 3.6 },
  { name: "Carne vacuna magra", synonyms: ["bife", "carne", "nalga"], kcal: 187, protein: 26, carb: 0, fat: 9 },
  { name: "Huevo", synonyms: ["huevos"], kcal: 155, protein: 13, carb: 1.1, fat: 11 },
  { name: "Pan blanco", synonyms: ["pan"], kcal: 265, protein: 9, carb: 49, fat: 3.2 },
  { name: "Papa hervida", synonyms: ["papas", "patata"], kcal: 87, protein: 1.9, carb: 20, fat: 0.1 },
  { name: "Tomate", synonyms: ["tomates"], kcal: 18, protein: 0.9, carb: 3.9, fat: 0.2 },
  { name: "Lechuga", synonyms: [], kcal: 15, protein: 1.4, carb: 2.9, fat: 0.2 },
  { name: "Queso cremoso", synonyms: ["queso"], kcal: 300, protein: 18, carb: 2, fat: 24 },
  { name: "Leche entera", synonyms: ["leche"], kcal: 61, protein: 3.2, carb: 4.8, fat: 3.3 },
  { name: "Banana", synonyms: ["bananas", "platano"], kcal: 89, protein: 1.1, carb: 23, fat: 0.3 },
  { name: "Manzana", synonyms: ["manzanas"], kcal: 52, protein: 0.3, carb: 14, fat: 0.2 },
  { name: "Aceite de girasol", synonyms: ["aceite"], kcal: 884, protein: 0, carb: 0, fat: 100 },
  { name: "Lentejas cocidas", synonyms: ["lenteja"], kcal: 116, protein: 9, carb: 20, fat: 0.4 },
  { name: "Milanesa de carne", synonyms: ["milanesa"], kcal: 270, protein: 18, carb: 15, fat: 15 },
  { name: "Yogur natural", synonyms: ["yogur", "yoghurt"], kcal: 61, protein: 3.5, carb: 4.7, fat: 3.3 },
];

async function main() {
  for (const f of SEED) {
    await db.insert(foods).values({
      name: f.name,
      normalizedName: normalize(f.name),
      synonyms: f.synonyms,
      kcalPer100g: f.kcal,
      proteinPer100g: f.protein,
      carbPer100g: f.carb,
      fatPer100g: f.fat,
      source: "argenfoods",
    });
  }
  console.log(`Seed completo: ${SEED.length} alimentos insertados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
