# Feature: Importar plan nutricional desde PDF

Permitir, en la sección **Plan**, subir un PDF de un plan existente (típicamente hecho
por un nutricionista) y replicarlo dentro de la app: se procesa, se estructura en el
formato de plan de NutriAI y queda disponible para ver, consultar y modificar por chat.

## Decisiones (entrevista)

| Tema | Decisión |
|---|---|
| Objetivos diarios | **Híbrido**: si el PDF trae calorías/macros explícitos, se usan esos (manda el profesional); si no, se mantienen los calculados por Mifflin-St Jeor. |
| Tipos de PDF (MVP) | **Solo PDF digital** (con texto). Si es escaneado/imagen, se detecta y se avisa (OCR/visión queda para v2). |
| Flujo | **Con paso de revisión**: se muestra lo extraído (plan + objetivos) editable antes de guardar. |
| Archivo original | **No se guarda**: solo el resultado procesado (igual que las fotos). |

## Arquitectura / pipeline

```
[Plan section] → botón "Importar PDF"
  → (cliente) elige PDF → extrae TEXTO con pdfjs-dist (dynamic import, en el navegador)
      → si el texto es muy corto ⇒ "parece escaneado", se avisa y no se procesa
  → (server action) importPlanFromText(texto):
      1. Modelo de texto → reformatea el plan a markdown FIEL (mismas secciones del plan app)
      2. Modelo de texto → extrae objetivos {kcal,protein,carb,fat} | null
      → devuelve { plan: markdown, targets }
  → (cliente) pantalla de REVISIÓN: markdown editable + campos de objetivos editables
  → confirmar → saveImportedPlan(plan, targets):
      guarda en nutrition_plan (content + source="imported" + targets)
      revalida /dashboard, /dashboard/plan
```

**Por qué extracción en el cliente:** evita el límite de ~1MB de los server actions, no
sube el archivo (más privado: solo viaja el texto), y `pdfjs-dist` se carga lazy solo al
importar. El PDF nunca sale del dispositivo.

## Modelo de datos

Extender `nutrition_plan`:

```ts
// nuevos campos (todos opcionales salvo source)
source: text("source").notNull().default("generated"), // "generated" | "imported"
kcal: real("kcal"),      // objetivos del plan importado (null = usar los calculados)
protein: real("protein"),
carb: real("carb"),
fat: real("fat"),
```

Migración aditiva (sin romper datos existentes; default "generated").

## "Objetivos efectivos" (clave del híbrido)

Hoy todos calculan con `calcTargets` (Mifflin-St Jeor) directo: dashboard Hoy, perfil,
`suggestNextMeal`, contexto del chat, `buildPlanContext`.

Nuevo helper `getEffectiveTargets(userId)`:
- Si el plan es `imported` y tiene `kcal` no nulo → usar los objetivos del plan.
- Si no → `calcTargets(profile)` como ahora.

Refactor: reemplazar los call-sites de `calcTargets` por `getEffectiveTargets` en:
`dashboard/page.tsx`, `perfil/page.tsx`, `getUserNutritionContext` (chat/suggest),
`buildPlanContext`. (El perfil sigue mostrando el cálculo de la fórmula como referencia,
pero el objetivo activo puede venir del plan importado — mostrar un cartelito
"objetivo según tu plan importado".)

## IA (TextProvider, nuevos métodos)

- `importPlanFromText(rawText): Promise<string>` → markdown FIEL del plan.
  Prompt clave: estructurá el plan provisto en las secciones de la app; **no inventes**
  alimentos ni números; si una sección no está en el original, omitila; conservá las
  indicaciones del profesional tal cual. Recordá que no reemplaza el consejo médico.
- `extractTargetsFromText(rawText): Promise<{kcal,protein,carb,fat} | null>` → JSON chico.
  Devuelve null si el PDF no especifica objetivos numéricos claros.

(Dos llamadas separadas para no embeber markdown grande en JSON — robusto, y es una
operación ocasional.)

## UX (sección Plan)

- Si no hay plan: además de "Generar mi plan", botón secundario **"Importar PDF de mi nutricionista"**.
- Si ya hay plan: botón "Importar PDF" junto a "Regenerar".
- Estados: seleccionando → extrayendo texto → procesando con IA (loading por pasos,
  ~30-40s free) → **revisión** (markdown editable + objetivos editables + aviso de que
  revise la fidelidad) → guardar.
- Plan importado se marca visualmente ("Importado de tu nutricionista · fecha").
- El chat ya lee el plan ⇒ Q&A y modificaciones funcionan igual sobre el importado.

## Archivos a tocar / crear

- `src/db/schema.ts` — nuevos campos en `nutrition_plan` + migración.
- `src/lib/ai/types.ts` — schemas + métodos `importPlanFromText`, `extractTargetsFromText`.
- `src/lib/ai/openrouter.ts` — implementación.
- `src/lib/nutrition/targets-effective.ts` (nuevo) — `getEffectiveTargets`.
- `src/app/dashboard/plan/actions.ts` — `importPlanFromText` (procesa) + `saveImportedPlan`.
- `src/app/dashboard/plan/ImportPdf.tsx` (nuevo, cliente) — upload + extracción pdfjs + review.
- `src/app/dashboard/plan/PlanView.tsx` — entrada al import + badge "importado".
- Refactor de objetivos: `dashboard/page.tsx`, `perfil/page.tsx`, `dashboard/actions.ts`,
  `lib/nutrition/context.ts`.
- Dependencia nueva: `pdfjs-dist` (worker configurado para Next).

## Riesgos y límites

- **Fidelidad de extracción**: tablas/columnas pueden salir mal → mitigado con el paso de
  revisión editable.
- **PDF escaneado**: no soportado en MVP → detectar texto vacío y avisar ("subí un PDF con
  texto o pedile el archivo digital a tu nutri").
- **Tamaño/tokens**: planes muy largos → truncar el texto a ~20k caracteres antes de la IA.
- **Modelo free**: latencia ~30-40s y posible 429 → loading states + manejo de error ya existentes.
- **Responsabilidad**: es el plan de un profesional; la app lo replica pero puede leer mal →
  el paso de revisión + disclaimer de "no reemplaza el consejo médico" son obligatorios.
- **pdfjs en Next 16**: configurar el worker (workerSrc) correctamente para que corra en el
  navegador con Turbopack.

## Fases sugeridas

1. **Datos + objetivos efectivos**: migración de `nutrition_plan`, `getEffectiveTargets`,
   refactor de call-sites. (No cambia comportamiento todavía.)
2. **IA**: `importPlanFromText` + `extractTargetsFromText` + test contra el modelo.
3. **Extracción PDF cliente**: integrar `pdfjs-dist`, detección de escaneado.
4. **UI**: `ImportPdf.tsx` (upload → loading → review editable → guardar) + entrada en PlanView.
5. **Pulido**: badge "importado", aviso de objetivos del plan en Hoy/Perfil, manejo de errores.
