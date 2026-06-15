import "@/lib/load-env";
import { readFileSync } from "node:fs";
import { sumAnalyzed, macrosFor } from "@/lib/nutrition/foods";
import { analyzeFoodPhoto } from "@/lib/nutrition/analyze";

/**
 * Diagnóstico del pipeline completo de visión (modo híbrido).
 * Uso:  npm run test:vision <ruta-local|url>
 */

async function toDataUrl(input: string): Promise<string> {
  if (input.startsWith("http")) {
    const res = await fetch(input);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
  const buf = readFileSync(input);
  const mime = input.endsWith(".png") ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Falta argumento: ruta local o URL de la imagen.");
    process.exit(1);
  }
  console.log(`\n🔍 Visión: ${process.env.AI_VISION_MODEL}`);
  console.log(`🔢 Texto:  ${process.env.AI_TEXT_MODEL}`);
  console.log(`🖼️  Imagen: ${input}\n`);

  const dataUrl = await toDataUrl(input);
  const description = process.argv[3]; // opcional: contexto extra

  const t0 = Date.now();
  const items = await analyzeFoodPhoto([dataUrl], description);
  console.log(`⏱️  ${Date.now() - t0} ms\n`);

  if (items.length === 0) {
    console.log("No se detectaron alimentos.");
    return;
  }

  console.log("🍽️  Resultado híbrido:");
  for (const it of items) {
    const m = macrosFor(it);
    const tag = it.source === "db" ? "✓ base (preciso)" : "≈ estimación IA";
    console.log(
      `   • ${it.label} ${it.grams}g → ${m.kcal} kcal (P${m.protein}/C${m.carb}/G${m.fat})  [${tag}]`
    );
  }

  const total = sumAnalyzed(items);
  console.log(
    `\n📊 TOTAL: ${total.kcal} kcal · P ${total.protein}g · C ${total.carb}g · G ${total.fat}g\n`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n💥 Error:", e?.message ?? e);
    if (e?.status) console.error("HTTP status:", e.status);
    process.exit(1);
  });
