# Feature: Calendario semanal de comidas

> Especificación dirigida por SDD (Spec-Driven Development): **Requirements → Design → Tasks**.
> Documento autosuficiente. Un chat con contexto vacío debería poder aplicarlo leyendo esto +
> `CLAUDE.md` + `AGENTS.md` + `docs/feature-lista-de-compras.md` (§4 = primer de arquitectura,
> no se repite acá).
> Proyecto: **NutriAI** — Next.js 16 (App Router), Drizzle + Neon Postgres, Auth.js v5, IA vía
> OpenRouter. UI en **español rioplatense**, iconos **lucide-react** (sin emoji).

---

## 0. Resumen ejecutivo

Un calendario semanal (lunes–domingo, navegable) donde el usuario planifica sus comidas por slot
(Desayuno, Almuerzo, Merienda, Cena). El calendario:
- Se **autocompleta con IA** en base al plan/objetivo del usuario.
- Permite **editar cada slot**: cambiar con IA, elegir de una **biblioteca de comidas guardadas**,
  o cargar una comida propia a mano.
- Permite pedirle a la IA **generar la receta** de una comida descrita y guardarla en la biblioteca.
- Muestra **macros del día** (suma de comidas planificadas) frente al **objetivo efectivo**.
- **Deriva la lista de compras** de la semana planificada (coexiste con la generación directa actual).
- Permite **marcar una comida como comida** → la registra en el día (`meal_log`), con deshacer.

### Decisiones de producto (cerradas)
1. **Lista ↔ calendario:** la lista se puede generar derivada del calendario (agrega ingredientes
   de la semana) **o** directa desde el plan (lo ya construido). Ambas coexisten.
2. **Edición de comidas:** alcance **completo** — biblioteca de comidas guardadas reutilizables +
   carga manual + "generá la receta con IA".
3. **Tracking:** "marcar como comido" crea un `meal_log` con los macros de la comida (con deshacer).
4. **Tiempo:** semana calendario **lunes–domingo**, navegable a semanas anterior/siguiente. Slots
   fijos por día: Desayuno → `breakfast`, Almuerzo → `lunch`, Merienda → `snack`, Cena → `dinner`.

### Relación con lo ya existente
- **`MealIdea`** (en `src/db/schema.ts`, creado para la lista de compras) ya es la **proto-receta**:
  `{ id, mealType, title, recipe, ingredients: {name,quantity,category}[], source }`. La tabla
  `saved_meal` de esta feature es esa forma + `userId` + macros + porciones. **Promoción directa.**
- **Targets efectivos:** `getEffectiveTargets(userId)` (no recalcular a mano).
- **Lista de compras:** tabla `shopping_list` (una fila/usuario) y acciones en
  `src/app/dashboard/plan/actions.ts`. La derivación desde el calendario escribe en esa misma tabla.
- **Tracking:** tablas `meal_log` + `meal_log_item`; `sumDay()` y `getDayMeals()` en
  `src/lib/queries.ts`. El dashboard "Hoy" ya suma `meal_log.kcal/...` (no depende de los items).

---

## 1. Requirements (user stories + criterios EARS)

> Notación EARS: **CUANDO** \<evento\> / **MIENTRAS** \<estado\> / **SI** \<condición\> **ENTONCES**,
> **EL SISTEMA DEBE** \<respuesta\>. Criterios testeables manualmente (no hay test framework).

### US-1 — Autocompletar la semana con IA
> Como usuario con un plan/objetivo, quiero que la IA me arme una semana de comidas para no
> empezar de cero.

- AC-1.1 — CUANDO el usuario toca "Generar semana con IA" y tiene perfil + objetivo efectivo,
  EL SISTEMA DEBE generar un conjunto de comidas alineadas al plan, guardarlas en su biblioteca
  y asignarlas a los slots de la semana visible.
- AC-1.2 — EL SISTEMA DEBE respetar SIEMPRE alergias, y tener en cuenta preferencias y dislikes.
- AC-1.3 — EL SISTEMA DEBE permitir repetición razonable de comidas en la semana (no exige 28
  comidas distintas) para que el resultado sea realista y económico.
- AC-1.4 — SI el modelo falla o devuelve vacío, ENTONCES EL SISTEMA DEBE mostrar un error claro
  y no dejar la semana a medio asignar.
- AC-1.5 — SI el usuario no tiene perfil, ENTONCES EL SISTEMA DEBE pedir completarlo primero.
- AC-1.6 — MIENTRAS la generación está en curso, EL SISTEMA DEBE mostrar estado de carga
  (el modelo free puede tardar ~30 s).

### US-2 — Ver la semana y los macros del día
> Como usuario quiero ver mi semana y cuánto suma cada día frente a mi objetivo.

- AC-2.1 — EL SISTEMA DEBE mostrar una grilla lunes–domingo con los 4 slots por día.
- AC-2.2 — EL SISTEMA DEBE permitir navegar a la semana anterior y siguiente.
- AC-2.3 — CUANDO un slot tiene comida asignada, EL SISTEMA DEBE mostrar su título y tipo.
- AC-2.4 — EL SISTEMA DEBE mostrar, por día, la suma de kcal/macros de las comidas planificadas y
  compararla con el objetivo efectivo (`getEffectiveTargets`).
- AC-2.5 — Las fechas DEBEN usar timezone Argentina (`src/lib/date.ts`).

### US-3 — Cambiar una comida de un slot con IA
- AC-3.1 — CUANDO el usuario pide "cambiar/otra opción" en un slot, EL SISTEMA DEBE generar una
  comida alternativa para ese `mealType`, alineada al plan, guardarla en la biblioteca y asignarla.
- AC-3.2 — EL SISTEMA DEBE permitir vaciar un slot (quitar la comida asignada).

### US-4 — Elegir una comida de la biblioteca
- AC-4.1 — CUANDO el usuario abre un slot, EL SISTEMA DEBE ofrecer elegir una comida existente de
  su biblioteca.
- AC-4.2 — EL SISTEMA DEBE poder filtrar/sugerir por `mealType` del slot, pero permitir asignar
  cualquier comida a cualquier slot.

### US-5 — Cargar una comida propia a mano
- AC-5.1 — EL SISTEMA DEBE permitir crear una comida con título, tipo, receta (texto) e
  ingredientes (nombre + cantidad + categoría), y guardarla en la biblioteca.
- AC-5.2 — WHERE el usuario lo solicite, EL SISTEMA DEBE poder estimar macros de la comida con IA
  a partir de su descripción/ingredientes; si no, los macros quedan en 0 (editable luego).
- AC-5.3 — EL SISTEMA DEBE validar campos mínimos (título no vacío) y longitudes máximas.

### US-6 — Generar la receta con IA y guardarla
- AC-6.1 — CUANDO el usuario describe una comida (ej. "pollo al curry con arroz"), EL SISTEMA DEBE
  generar receta + ingredientes + macros estimados y guardarla en la biblioteca.
- AC-6.2 — EL SISTEMA DEBE respetar alergias/preferencias del perfil al generar.

### US-7 — Gestionar la biblioteca de comidas
- AC-7.1 — EL SISTEMA DEBE listar las comidas guardadas del usuario.
- AC-7.2 — EL SISTEMA DEBE permitir editar y eliminar una comida guardada.
- AC-7.3 — CUANDO se elimina una comida guardada, EL SISTEMA DEBE quitar sus asignaciones del
  calendario (no dejar slots apuntando a una comida inexistente).

### US-8 — Derivar la lista de compras desde la semana
- AC-8.1 — CUANDO el usuario toca "Generar lista desde mi semana", EL SISTEMA DEBE consolidar los
  ingredientes de las comidas planificadas de la semana visible, escalados por `householdSize`, y
  guardarlos en `shopping_list` (reemplazando la lista vigente).
- AC-8.2 — EL SISTEMA DEBE seguir permitiendo la generación directa desde el plan (feature actual).
- AC-8.3 — La lista derivada DEBE quedar en el mismo formato (checklist por categoría) que la actual.
- AC-8.4 — SI la semana no tiene comidas asignadas, ENTONCES EL SISTEMA DEBE avisar y no generar.

### US-9 — Marcar como comido (registrar en el día)
- AC-9.1 — CUANDO el usuario marca una comida planificada como comida, EL SISTEMA DEBE crear un
  `meal_log` para esa fecha y `mealType` con los macros de la comida, y vincularlo a la asignación.
- AC-9.2 — EL SISTEMA DEBE permitir deshacer: al desmarcar, eliminar el `meal_log` creado.
- AC-9.3 — EL SISTEMA DEBE evitar doble registro de la misma asignación (idempotente vía el vínculo).
- AC-9.4 — El registro creado DEBE reflejarse en el dashboard "Hoy" y en `sumDay`.

### Requisitos no funcionales
- NFR-1 — Mutaciones vía **Server Actions**; rate limit en las que llaman al modelo
  (`src/lib/rate-limit.ts`), p. ej. generar semana / receta: 4–6 por hora por usuario.
- NFR-2 — **Boundary cliente/servidor**: componentes cliente nunca importan `@/db` ni
  `queries.ts`; reciben datos por props desde Server Components.
- NFR-3 — Parsing de IA **tolerante** (Zod `.coerce`/`.catch`, descartar nulos) — modelos free
  rompen JSON / dan 429.
- NFR-4 — Markdown (recetas) vía `src/components/Markdown.tsx` (XSS-safe).

---

## 2. Design

### 2.1 Modelo de datos (`src/db/schema.ts`)

**Tabla `saved_meal`** — biblioteca de comidas/recetas reutilizables del usuario.
```ts
export const savedMeals = pgTable("saved_meal", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // mealType = slot típico sugerido (no restringe dónde se puede asignar).
  mealType: text("mealType").notNull(), // breakfast | lunch | dinner | snack
  recipe: text("recipe").notNull().default(""), // markdown corto
  ingredients: jsonb("ingredients")
    .$type<Array<{ name: string; quantity: string; category: ShoppingCategory }>>()
    .notNull().default([]),
  // Macros por porción (servings = porciones que rinde la receta).
  servings: integer("servings").notNull().default(1),
  kcal: real("kcal").notNull().default(0),
  protein: real("protein").notNull().default(0),
  carb: real("carb").notNull().default(0),
  fat: real("fat").notNull().default(0),
  source: text("source").notNull().default("ai"), // ai | manual
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
```
> `ShoppingCategory` ya existe y se exporta desde `schema.ts`. La forma de `ingredients` es la
> misma que `MealIdea.ingredients` → reuso total.

**Tabla `meal_plan_entry`** — asignación de una comida a un día×slot.
```ts
export const mealPlanEntries = pgTable("meal_plan_entry", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  mealType: text("mealType").notNull(), // slot: breakfast | lunch | dinner | snack
  savedMealId: integer("savedMealId")
    .notNull().references(() => savedMeals.id, { onDelete: "cascade" }),
  // Vínculo al registro creado al "marcar como comido" (null = no comido aún).
  mealLogId: integer("mealLogId").references(() => mealLogs.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
}, (t) => [
  // Un slot por día (Desayuno/Almuerzo/Merienda/Cena, uno c/u).
  unique().on(t.userId, t.date, t.mealType),
]);
```
> `unique` se importa de `drizzle-orm/pg-core`. `onDelete: "cascade"` en `savedMealId` cumple AC-7.3.
> `mealLogId set null` evita romper la entry si el log se borra por otro lado.

Migración: `npm run db:generate && npm run db:migrate`.

### 2.2 Decisión clave — derivación de la lista de compras (AC-8)

Las cantidades de los ingredientes son **texto libre** ("200 g", "2 unidades"), así que **sumarlas
de forma determinística es lossy** (requiere normalizar unidades). Para v1 se elige
**consolidación asistida por IA**: un método `consolidateShoppingList(meals, householdSize, period)`
que recibe las comidas planificadas de la semana y devuelve la lista consolidada por categoría
(mismo `shoppingListSchema`). Es robusto con modelos free y consistente con la generación actual.

> **Futuro (no ahora):** estructurar `quantity` como `{ amount: number, unit: string }` para una
> agregación determinística (`aggregateIngredients` puro). Documentado como mejora, no bloquea v1.

### 2.3 Capa de IA (`src/lib/ai/types.ts` + `openrouter.ts`)

Para acotar el tamaño de salida (los free no rinden 28 comidas en una llamada), la generación de la
semana produce un **pool** de comidas distintas que luego se **distribuye** a los slots en el server.

Nuevos schemas/tipos (patrón tolerante):
```ts
// Comida con receta + ingredientes + macros estimados (proto-receta con macros).
export const generatedMealSchema = z.object({
  mealType: z.enum(MEAL_TYPE_VALUES).catch("lunch"),
  title: z.string().min(1),
  recipe: z.string().catch(""),
  ingredients: z.array(/* shoppingItemSchema sin checked */).transform(filtrarNulos),
  servings: z.coerce.number().int().positive().catch(1),
  kcal: z.coerce.number().nonnegative().catch(0),
  protein: z.coerce.number().nonnegative().catch(0),
  carb: z.coerce.number().nonnegative().catch(0),
  fat: z.coerce.number().nonnegative().catch(0),
});

export const weekMealPoolSchema = z.object({
  meals: z.array(generatedMealSchema.nullable().catch(null)).transform(filtrarNulos),
});
```

Nuevos métodos en `TextProvider` (implementar en `OpenRouterTextProvider`, patrón
`extractJson` + `schema.parse` + `firstContent`, `max_tokens` holgado):
```ts
// Pool de comidas para armar la semana (ej. 8-12 comidas variadas, cubriendo los 4 tipos).
generateWeekMealPool(ctx: PlanContext & { count?: number }): Promise<WeekMealPool>;
// Una comida alternativa para un mealType puntual (US-3).
generateMealForSlot(ctx: PlanContext, mealType: MealType): Promise<GeneratedMeal>;
// Receta + ingredientes + macros a partir de una descripción libre (US-6).
generateMealRecipe(description: string, ctx: PlanContext): Promise<GeneratedMeal>;
// Consolida la lista de compras desde comidas planificadas (US-8).
consolidateShoppingList(input: {
  meals: Array<{ title: string; ingredients: {...}[] }>;
  householdSize: number; period: "weekly" | "biweekly";
}): Promise<ShoppingListResult>; // reusa shoppingListSchema
```
> Prompts: reusar `planContextBlock(ctx)`; reglas de "accesible para Argentina", respetar alergias,
> `mealType` exacto en inglés, categorías exactas. Macros **por porción**.

### 2.4 Server actions (`src/app/dashboard/semana/actions.ts`, nuevo)

- `generateWeek(weekStartISO)`: valida lunes; llama `generateWeekMealPool`; inserta comidas en
  `saved_meal`; distribuye a los 7×4 slots (con repetición sensata); upsert `meal_plan_entry`
  (borra entries de esa semana y reescribe). Rate limit. Devuelve la semana armada.
- `regenerateSlot(dateISO, mealType)`: `generateMealForSlot` → guarda en `saved_meal` → upsert entry.
- `clearSlot(dateISO, mealType)`: borra la entry del slot.
- `assignSavedMeal(dateISO, mealType, savedMealId)`: upsert entry (respeta unique).
- `createSavedMeal(input)` / `updateSavedMeal(id, input)` / `deleteSavedMeal(id)`: CRUD biblioteca
  (validación Zod). `createSavedMeal` con flag opcional `estimateWithAI` para US-5.2.
- `generateRecipeAndSave(description)`: `generateMealRecipe` → `saved_meal` (US-6).
- `deriveShoppingListFromWeek(weekStartISO)`: junta comidas asignadas de la semana →
  `consolidateShoppingList` → escribe en `shopping_list` (mismo upsert/forma que la action actual,
  agregando `checked/id/source` en server). Reusar helpers de `plan/actions.ts` si conviene.
- `markEntryEaten(entryId)` / `unmarkEntryEaten(entryId)`:
  - eaten: crea `meal_log` (date, mealType, source `"plan"`, macros de la comida) + un
    `meal_log_item` (label = título, grams ≈ porción, macros = de la comida, `confidence: "low"`);
    guarda `mealLogId` en la entry. Idempotente (si ya tiene `mealLogId`, no duplica).
  - unmark: borra el `meal_log` vinculado (cascade borra items) y limpia `mealLogId`.
  - `revalidatePath("/dashboard")` para reflejar en "Hoy".

Queries nuevas en `src/lib/queries.ts` (server-only): `getWeekPlan(userId, weekStartISO)`
(entries de la semana con su `saved_meal` joined), `getSavedMeals(userId)`.

### 2.5 UI

**Ruta nueva `/dashboard/semana`** (Server Component que carga semana + biblioteca + targets y
pasa a cliente). Respetar el patrón de scroll del dashboard (`h-full overflow-y-auto`, no flex column).

Componentes cliente:
- `WeekGrid`: navegación de semana (‹ semana › con `src/lib/date.ts`), grilla 7 días × 4 slots.
  En mobile, vista por día con tabs/scroll horizontal; en desktop, grilla. Cada slot = celda con
  título de la comida o "+ agregar".
- `DayMacros`: por día, suma de macros planificados vs objetivo efectivo (barras, estilo del
  resumen de "Hoy").
- `SlotSheet` (modal/sheet al tocar un slot): acciones → Cambiar con IA / Elegir de biblioteca /
  Cargar a mano / Vaciar / (si asignada) Ver receta + "Marcar como comido".
- `MealLibrary`: lista de comidas guardadas con editar/eliminar y "＋ Nueva comida" (form manual)
  y "Generar con IA" (input de descripción). Puede vivir como tab/secundario dentro de `/semana`.
- Botón "Generar lista desde mi semana" (US-8) visible en `/semana` y/o en la pestaña Compras.

**Navegación:** agregar acceso a `/dashboard/semana`.
- **Decisión recomendada (ajustable):** nuevo ítem en el nav. Como el bottom nav está lleno
  (2 + PhotoFab + 2 en `Nav.tsx`), evaluar: (a) pasar a 5 ítems reordenando, o (b) acceso desde la
  Home + tab dentro de `/dashboard/plan` (Plan | Compras | Semana). Preferir (b) si no se quiere
  tocar el layout del bottom nav. **Marcado como ítem abierto §5.**
- Agregar también una card de acceso en la Home (como `ShoppingListCard.tsx`).

**Labels español:** Desayuno/Almuerzo/Merienda/Cena (snack = "Merienda" en este contexto).

### 2.6 Diagrama de flujo (alto nivel)
```
Perfil/Plan ──► generateWeek ──► saved_meal[] + meal_plan_entry[7x4]
                                        │
   WeekGrid ◄───────────────────────────┤
        │                                │
        ├─ regenerateSlot / assign / manual / generateRecipe ─► saved_meal / entry
        ├─ markEntryEaten ─► meal_log (+item) ──► Dashboard "Hoy" / sumDay
        └─ deriveShoppingListFromWeek ─► consolidateShoppingList ─► shopping_list
                                                                      │
                                          ShoppingListView (ya existe) ◄┘
```

---

## 3. Tasks (incrementales, cada fase es entregable y verificable)

### Fase 1 — Datos + ver semana + autocompletar con IA (núcleo)
1. Schema: `saved_meal` + `meal_plan_entry` (+ import `unique`). `db:generate` + `db:migrate`.
2. Queries: `getWeekPlan`, `getSavedMeals`.
3. AI: `generatedMealSchema` / `weekMealPoolSchema` + `generateWeekMealPool` (types + openrouter).
4. Action `generateWeek` (pool → saved_meal → distribuir a slots → upsert entries).
5. UI `/dashboard/semana`: `WeekGrid` (read + navegación) + `DayMacros` + botón "Generar semana".
6. Script diagnóstico `scripts/test-week.ts` (modelo real).
7. **Validar:** `typecheck` + `lint` + `build`.

### Fase 2 — Edición de slots + biblioteca + manual + receta IA
8. AI: `generateMealForSlot`, `generateMealRecipe`.
9. Actions: `regenerateSlot`, `clearSlot`, `assignSavedMeal`, CRUD `savedMeal`,
   `generateRecipeAndSave`.
10. UI: `SlotSheet` (cambiar/elegir/manual/vaciar/ver receta) + `MealLibrary` (CRUD + IA + manual).

### Fase 3 — Derivar lista de compras desde la semana
11. AI: `consolidateShoppingList`.
12. Action `deriveShoppingListFromWeek` (escribe en `shopping_list`).
13. UI: botón en `/semana` (y/o tab Compras); reusar `ShoppingListView` para mostrar resultado.

### Fase 4 — Tracking (marcar como comido)
14. Actions `markEntryEaten` / `unmarkEntryEaten` (crea/borra `meal_log` + item; idempotente).
15. UI en `SlotSheet`: toggle "Marcar como comido" con estado y deshacer; revalidar "Hoy".

### Transversal
16. Navegación: resolver acceso a `/semana` (ver §5) + card en la Home.
17. Validación final: `typecheck` + `lint` + `build` + pruebas manuales de los AC.

---

## 4. Validación

- Sin test framework: validar con `npm run typecheck` + `npm run lint` (react-hooks = ERROR) +
  `npm run build`.
- Scripts `npx tsx scripts/test-week.ts` (y reuso de `test-shopping.ts`) para probar IA real
  (importar `src/lib/load-env.ts` primero). Modelos free: ~20-40 s y 429 frecuente.
- Pruebas manuales por AC (generar semana, editar slot, biblioteca, derivar lista, marcar comido +
  ver en "Hoy", navegar semanas, deshacer).

## 5. Ítems abiertos (decidir durante implementación)
- **Navegación a `/dashboard/semana`**: ¿5º ítem en el nav (reordenar bottom nav) o tab dentro de
  Plan (Plan | Compras | Semana)? Recomendado: tab dentro de Plan + card en Home, para no tocar el
  layout del bottom nav. Confirmar al empezar Fase 1/UI.
- **Distribución del pool a slots**: heurística de repetición (p. ej. 2-3 opciones de desayuno
  rotando, almuerzos/cenas variando). Definir regla simple y determinística en `generateWeek`.
- **Macros en carga manual** (US-5.2): por defecto 0 + botón "estimar con IA", o estimar siempre.
- **`meal_log.source`**: usar el valor `"plan"` (columna text, sin migración). Confirmar que la UI
  de `MealList` lo muestre bien.

## 6. Forward-compat / checklist de que no nos encerramos
- [x] `saved_meal` = forma de `MealIdea` + `userId` + macros/porciones (promoción directa).
- [x] `meal_plan_entry` con `unique(userId,date,mealType)` → un slot por comida, fácil de leer/escribir.
- [x] Lista de compras derivada escribe en la MISMA tabla `shopping_list` (coexiste con la directa).
- [x] Tracking reusa `meal_log`/`meal_log_item` y `sumDay` existentes (sin duplicar lógica de "Hoy").
- [x] Quantities como texto en v1; ruta clara a `{amount,unit}` para agregación determinística futura.
