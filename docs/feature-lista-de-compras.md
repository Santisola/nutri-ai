# Feature: Lista de compras alineada al plan

> Documento de planificación autosuficiente. Un chat con contexto vacío debería poder
> leer esto + `CLAUDE.md` + `AGENTS.md` y aplicarlo sin más explicaciones.
> Proyecto: **NutriAI** — app de nutrición (Next.js 16, App Router, Drizzle + Neon Postgres,
> Auth.js v5, IA vía OpenRouter). UI en **español rioplatense**. Iconos **lucide-react** (sin emoji).

---

## 1. Objetivo

Generar una **lista de compras semanal o quincenal** de ingredientes/materia prima accesible,
alineada al plan nutricional del usuario, para que pueda stockearse y preparar comidas
(planificadas o "para salir del apuro") sin recaer en delivery o comida fuera del plan.

**Condiciones del usuario:**
- Ingredientes **accesibles**: que se consigan en súper/hipermercado/verdulería/carnicería de
  barrio. Nada de lujo, importado raro ni dietética cara.
- **Grupo familiar**: poder cargar la cantidad de personas para escalar las cantidades.

## 2. Decisiones tomadas (cerradas)

1. **Formato híbrido**: la IA devuelve **JSON estructurado** (no markdown), se valida con Zod y
   se renderiza como **checklist interactiva** (ítems agrupados por categoría, con checkboxes
   que persisten).
2. **Incluye ideas de comidas rápidas** además de los ingredientes (refuerza "salir del apuro").
3. **Grupo familiar = cantidad simple** de personas (todos comen porciones similares; escalado
   lineal). Sin distinción adultos/niños por ahora.
4. **Ubicación**: dentro de `/dashboard/plan` como **tabs** ("Plan" | "Compras"). Además, **links
   en la Home** (`/dashboard/page.tsx`) para dar a conocer la feature.
5. **Una sola lista vigente por usuario** (se regenera, no hay historial).
6. `householdSize` vive en `profile` (default 1), editable al generar.

## 3. Visión a futuro (NO implementar ahora — solo guía de diseño)

A futuro se quiere un **calendario semanal de comidas** que:
- Se llena con sugerencias de IA en base al plan.
- El usuario puede editar/modificar comidas individuales: cargar recetas conocidas a mano, o
  pedirle a la IA "guardame esta comida" y que genere la receta.
- Está **conectado con la lista de compras** (la lista se deriva de las comidas planificadas).

**Implicancia de diseño para esta feature:** las "comidas" deben nacer como **proto-recetas
estructuradas y reutilizables**, para que el calendario futuro las "promueva" a su propia tabla
sin reescribir nada. Por eso (ver §5) las ideas de comida llevan `id`, `mealType`, `recipe`,
`ingredients` estructurados (misma forma `{name, quantity, category}` que los ítems de la lista)
y `source`. **El átomo compartido es: comida con ingredientes estructurados.**

Lo que el calendario agregará después (aditivo, no rompe esto):
- Tabla `saved_meal`/`recipe` (= la forma `MealIdea` + `userId`).
- Tabla `meal_plan_entry` (userId, date, mealType, ref a comida).
- Función pura `aggregateIngredients(meals[]) → items[]` para regenerar la lista al editar comidas.

**Estrategia elegida para HOY:** "alinear formas, lista directa". La IA genera ítems Y comidas en
la misma llamada; la lista se genera directa (no derivada). Bajo riesgo con modelos free, y
forward-compatible. NO construir agregación ni CRUD de comidas todavía.

---

## 4. Contexto de arquitectura (lo que un agente nuevo necesita saber)

### Abstracción de IA (`src/lib/ai/`)
- `types.ts`: interfaces `VisionProvider` / `TextProvider` + **todos los schemas Zod de salida**.
- `openrouter.ts`: implementa las interfaces con el SDK `openai` apuntado a OpenRouter.
- `index.ts`: factory `getTextProvider()` / `getVisionProvider()`.
- **Parsing tolerante**: los modelos free omiten campos o rompen JSON. Patrón obligatorio:
  `z.coerce.*` + `.catch(fallback)`, y descartar ítems nulos en arrays
  (ver `detectedFoods` en `types.ts`).
- Helpers en `openrouter.ts`:
  - `firstContent(res)`: detecta respuesta de error sin `choices` (típico 429) y lanza Error claro.
  - `extractJson(text)`: extrae el primer bloque `{...}` (los free envuelven en fences).
  - `stripFences(text)`: para métodos que devuelven markdown crudo.
- Métodos que devuelven **markdown** (`generatePlan`, `modifyPlan`, `importPlanFromText`) usan
  `stripFences`. Métodos que devuelven **JSON** (`suggestMeal`, `estimate*`, `nutritionChat`)
  usan `extractJson` + `schema.parse`. **Esta feature devuelve JSON.**

### Targets efectivos (modo híbrido)
- `src/lib/nutrition/targets-effective.ts` → `getEffectiveTargets(userId)`: devuelve los targets
  del **plan importado** si existen, si no los calculados (Mifflin-St Jeor). **Usar SIEMPRE este
  helper**, nunca `calcTargets` directo en páginas.
- `src/lib/nutrition/context.ts` → `buildPlanContext(userId)`: arma `PlanContext` (perfil +
  targets efectivos + weight + prefs/allergies/dislikes). Reutilizable como base del contexto
  de la lista.

### Plan nutricional
- Tabla `nutrition_plan` (una fila/usuario): `content` (markdown), `source`
  (`generated` | `imported`), `kcal/protein/carb/fat` opcionales.
- `getPlan(userId)` en `src/lib/queries.ts` (server-only).

### Datos & auth
- Schema Drizzle: `src/db/schema.ts`. Cliente Neon http: `src/db/index.ts`.
- Read queries server-only: `src/lib/queries.ts`. `getCurrentUserId()` ahí.
- `profile` tiene: `displayName`, `nickname`, `sex`, `birthYear`, `heightCm`, `weightKg`,
  `activityLevel`, `goalType`, `goalRateKgPerWeek`, `targetWeightKg`, `dietaryPrefs[]`,
  `allergies[]`, `dislikes[]`, `updatedAt`.

### Layout & navegación dashboard (`src/app/dashboard/`)
- `layout.tsx`: centraliza guard auth/profile (sin sesión → `/login`; sin perfil → `/onboarding`).
  Es flex column de altura fija (`h-[100dvh]`): header + `main` (`overflow-hidden`) + bottom nav.
- **Cada página tiene su propio scroll**: `mx-auto h-full max-w-2xl ... overflow-y-auto px-5 py-6`.
  No convertir el wrapper de página en flex column (los hijos se encogen en vez de scrollear).
- `Nav.tsx`: tabs `TABS` (Hoy, Plan, Chat, Perfil). La navegación va por `useNav().navigate(href)`
  (provider `NavProgress.tsx` con barra de progreso), no `<Link>` plano.
- Mutaciones = **Server Actions**. Rate limiting: `src/lib/rate-limit.ts`
  (`rateLimit(key, max, windowMs)` → `{ ok, retryAfterMs }`, in-memory best-effort).
- Markdown se renderiza con `src/components/Markdown.tsx`. Errores con `src/components/FormError.tsx`.

### Comandos / validación
```bash
npm run db:generate   # genera migración SQL desde src/db/schema.ts
npm run db:migrate    # aplica migraciones (preferir sobre db:push)
npm run typecheck     # tsc --noEmit
npm run lint          # react-hooks rules son ERROR — deben pasar
npm run build
```
**No hay test framework.** Validación antes de pushear = `typecheck` + `lint` + `build`.
Scripts diagnósticos (pegan al modelo real) en `scripts/`, ejecutados con `npx tsx`; importan
`src/lib/load-env.ts` como **primer** import (los scripts no auto-cargan `.env.local`).

---

## 5. Modelo de datos

### 5.1 Nueva tabla `shopping_list` (en `src/db/schema.ts`)

Una fila por usuario (PK = userId), igual patrón que `nutrition_plan`.

```ts
// Tipos del jsonb (definir/exportar para reuso en AI + UI).
// Categorías acotadas para agrupar en la UI.
export type ShoppingCategory =
  | "verduleria"
  | "carniceria"
  | "pescaderia"
  | "almacen"        // secos / enlatados / despensa
  | "lacteos"        // lácteos y huevos
  | "panificados"
  | "congelados"
  | "bebidas"
  | "otros";

export interface ShoppingItem {
  name: string;
  quantity: string;        // texto libre: "1.4 kg", "12 unidades", "2 paquetes"
  category: ShoppingCategory;
  checked: boolean;        // estado de tachado, persistido
}

export interface MealIdea {
  id: string;              // estable (la IA lo genera o se asigna en server). Forward-compat calendario.
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  recipe: string;          // pasos/preparación, markdown corto
  ingredients: Array<{ name: string; quantity: string; category: ShoppingCategory }>;
  source: "ai";            // a futuro: "ai" | "manual"
}

export const shoppingLists = pgTable("shopping_list", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  period: text("period").notNull().default("weekly"),       // "weekly" | "biweekly"
  householdSize: integer("householdSize").notNull().default(1),
  items: jsonb("items").$type<ShoppingItem[]>().notNull().default([]),
  mealIdeas: jsonb("mealIdeas").$type<MealIdea[]>().notNull().default([]),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
```

### 5.2 Campo nuevo en `profile`

```ts
householdSize: integer("householdSize").notNull().default(1),
```
- Default 1. Es el valor por defecto del form de generación; al generar con otro valor, se puede
  persistir de vuelta en el profile (opcional pero recomendado para que quede como preferencia).

### 5.3 Migración
```bash
npm run db:generate && npm run db:migrate
```

---

## 6. Capa de IA

### 6.1 `src/lib/ai/types.ts`

Agregar (con el patrón tolerante `z.coerce` + `.catch` y filtrado de nulos):

```ts
export const SHOPPING_CATEGORY_VALUES = [
  "verduleria","carniceria","pescaderia","almacen",
  "lacteos","panificados","congelados","bebidas","otros",
] as const;

const shoppingItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().catch(""),
  category: z.enum(SHOPPING_CATEGORY_VALUES).catch("otros"),
});

const mealIdeaSchema = z.object({
  mealType: z.enum(MEAL_TYPE_VALUES).catch("lunch"),   // MEAL_TYPE_VALUES ya existe
  title: z.string().min(1),
  recipe: z.string().catch(""),
  ingredients: z
    .array(shoppingItemSchema.nullable().catch(null))
    .transform((a) => a.filter((x): x is z.infer<typeof shoppingItemSchema> => x !== null)),
});

export const shoppingListSchema = z.object({
  items: z
    .array(shoppingItemSchema.nullable().catch(null))
    .transform((a) => a.filter((x): x is z.infer<typeof shoppingItemSchema> => x !== null)),
  mealIdeas: z
    .array(mealIdeaSchema.nullable().catch(null))
    .transform((a) => a.filter((x): x is z.infer<typeof mealIdeaSchema> => x !== null)),
});
export type ShoppingListResult = z.infer<typeof shoppingListSchema>;

export interface ShoppingListContext {
  targets: { kcal: number; protein: number; carb: number; fat: number };
  period: "weekly" | "biweekly";
  householdSize: number;
  dietaryPrefs: string[];
  allergies: string[];
  dislikes: string[];
  plan?: string | null;   // markdown del plan actual, como contexto (opcional)
}
```

> Nota: el schema de IA **no** incluye `id`/`checked`/`source` — esos los agrega el server al
> guardar (ver §7). El schema valida solo lo que produce el modelo.

Agregar a la interface `TextProvider`:
```ts
/** Genera la lista de compras (ítems + ideas de comida) alineada al plan. */
generateShoppingList(ctx: ShoppingListContext): Promise<ShoppingListResult>;
```

### 6.2 `src/lib/ai/openrouter.ts`

Implementar `generateShoppingList` en `OpenRouterTextProvider`, siguiendo el patrón de
`suggestMeal`/`estimateDayFromText` (JSON + `extractJson` + `schema.parse`, con `max_tokens`
holgado por el tamaño de salida):

```ts
async generateShoppingList(ctx: ShoppingListContext): Promise<ShoppingListResult> {
  const model = process.env.AI_TEXT_MODEL;
  if (!model) throw new Error("AI_TEXT_MODEL no está definida");

  const dias = ctx.period === "biweekly" ? 14 : 7;
  const planBlock = ctx.plan
    ? `\nPlan actual del usuario (alineá la lista a esto):\n"""\n${ctx.plan}\n"""`
    : "";

  const prompt = `Sos un asistente de nutrición práctico para Argentina. Armá una LISTA DE COMPRAS
para ${dias} días y ${ctx.householdSize} persona(s), alineada al objetivo del usuario.

Objetivo diario por persona: ${ctx.targets.kcal} kcal, ${ctx.targets.protein}g proteína,
${ctx.targets.carb}g carbohidratos, ${ctx.targets.fat}g grasa.
Preferencias: ${ctx.dietaryPrefs.join(", ") || "ninguna"}.
Alergias (EVITAR SIEMPRE): ${ctx.allergies.join(", ") || "ninguna"}.
No le gusta: ${ctx.dislikes.join(", ") || "nada"}.${planBlock}

REGLAS:
- Ingredientes ACCESIBLES y comunes: súper/hipermercado/verdulería/carnicería de barrio.
  NADA de lujo, importado raro ni dietética cara.
- Cantidades estimadas para ${ctx.householdSize} persona(s) durante ${dias} días (escalá linealmente).
- Agrupá cada ítem en una categoría (usá EXACTAMENTE estos valores): verduleria, carniceria,
  pescaderia, almacen, lacteos, panificados, congelados, bebidas, otros.
- Sumá 3 a 6 ideas de comidas RÁPIDAS y simples (desayuno/almuerzo/cena/snack) alineadas al plan,
  que se preparen con esos ingredientes, con una receta breve. mealType: breakfast|lunch|dinner|snack.

Devolvé SOLO un JSON con esta forma exacta (sin texto extra):
{"items":[{"name":"","quantity":"","category":"almacen"}],
 "mealIdeas":[{"mealType":"lunch","title":"","recipe":"","ingredients":[{"name":"","quantity":"","category":"almacen"}]}]}`;

  const res = await client().chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 2000,
  });

  return shoppingListSchema.parse(extractJson(firstContent(res)));
}
```

---

## 7. Server actions (`src/app/dashboard/plan/actions.ts`)

Agregar (mismo archivo que `generateMyPlan`):

```ts
import { shoppingLists } from "@/db/schema";
import { getEffectiveTargets } from "@/lib/nutrition/targets-effective";
import { getProfile, getPlan } from "@/lib/queries";
// crypto.randomUUID() está disponible en runtime Node de Next 16.

const periodSchema = z.enum(["weekly", "biweekly"]);

export async function generateShoppingList(input: {
  period: "weekly" | "biweekly";
  householdSize: number;
}): Promise<{ ok?: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const period = periodSchema.catch("weekly").parse(input.period);
  const householdSize = Math.min(20, Math.max(1, Math.round(input.householdSize || 1)));

  const rl = rateLimit(`shopping:${userId}`, 4, 60 * 60_000);
  if (!rl.ok) return { error: "Generaste varias listas seguidas. Probá más tarde." };

  const [profile, targets, plan] = await Promise.all([
    getProfile(userId),
    getEffectiveTargets(userId),
    getPlan(userId),
  ]);
  if (!profile || !targets) return { error: "Completá tu perfil primero" };

  try {
    const result = await getTextProvider().generateShoppingList({
      targets,
      period,
      householdSize,
      dietaryPrefs: profile.dietaryPrefs ?? [],
      allergies: profile.allergies ?? [],
      dislikes: profile.dislikes ?? [],
      plan: plan?.content ?? null,
    });

    // El server agrega los campos que no produce el modelo: checked + id + source.
    const items = result.items.map((i) => ({ ...i, checked: false }));
    const mealIdeas = result.mealIdeas.map((m) => ({
      ...m, id: crypto.randomUUID(), source: "ai" as const,
    }));

    const values = { period, householdSize, items, mealIdeas };
    await db.insert(shoppingLists).values({ userId, ...values })
      .onConflictDoUpdate({
        target: shoppingLists.userId,
        set: { ...values, updatedAt: new Date() },
      });

    // Persistir householdSize como preferencia del perfil (opcional).
    if (profile.householdSize !== householdSize) {
      await db.update(profiles).set({ householdSize }).where(eq(profiles.userId, userId));
    }

    revalidatePath("/dashboard/plan");
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("429") || /rate/i.test(msg))
      return { error: "El modelo gratuito está saturado. Probá en un minuto." };
    return { error: "No se pudo generar la lista. Reintentá." };
  }
}

/** Tacha/destacha un ítem por índice. Optimistic en cliente, persiste el array completo. */
export async function toggleShoppingItem(index: number, checked: boolean):
  Promise<{ ok?: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const rows = await db.select().from(shoppingLists)
    .where(eq(shoppingLists.userId, userId)).limit(1);
  const list = rows[0];
  if (!list || index < 0 || index >= list.items.length) return { error: "Lista no encontrada" };

  const items = list.items.map((it, i) => (i === index ? { ...it, checked } : it));
  await db.update(shoppingLists).set({ items, updatedAt: new Date() })
    .where(eq(shoppingLists.userId, userId));
  // No revalidar para no romper el estado optimista del cliente.
  return { ok: true };
}
```
> Requiere imports de `profiles`, `eq` (drizzle-orm) en el archivo. Verificar que estén.
> Agregar `getShoppingList(userId)` en `src/lib/queries.ts` (server-only) para la lectura.

---

## 8. UI

### 8.1 Tabs en `/dashboard/plan`
- Convertir `plan/page.tsx` para que cargue también la lista (`getShoppingList(userId)`) y pase
  todo a un componente cliente con tabs ("Plan" | "Compras"), o usar dos subcomponentes. Mantener
  el `PlanView` actual intacto para la pestaña "Plan".
- **Respetar el scroll**: el wrapper sigue siendo `h-full ... overflow-y-auto`. No flex column.
- Tabs simples controlados por estado (no hace falta routing anidado). Iconos lucide:
  `ClipboardList` (plan) / `ShoppingCart` (compras).

### 8.2 Componente `ShoppingListView.tsx` (nuevo, `"use client"`)
- Props: lista inicial (items, mealIdeas, period, householdSize) + default `householdSize` del perfil.
- **Estado vacío**: card punteada con CTA "Generar lista de compras" (espejo del estado vacío de
  `PlanView`: `Sparkles`, borde dashed, etc.).
- **Form de generación**: selector período (semanal/quincenal) + input numérico personas
  (default = `profile.householdSize`) + botón generar. Loading con `useTransition` + mensajes
  rotativos (patrón de `PlanView`: el modelo free tarda ~30s).
- **Render de la lista**: agrupar `items` por `category` (orden fijo de categorías), título por
  grupo, cada ítem con checkbox + nombre + `quantity`. Checkbox → `toggleShoppingItem` optimista.
- **Ideas de comidas**: sección aparte; cada idea = card con `title`, `mealType` (label español),
  `recipe` (renderizar con `Markdown`) e `ingredients`.
- Botón "Regenerar" (mismo patrón que PlanView). Errores con `FormError`.
- **react-hooks rules son ERROR**: cuidar deps de `useEffect`/`useCallback`.

Labels español para categorías y mealType (constantes en el componente):
```ts
const CATEGORY_LABEL = { verduleria:"Verdulería", carniceria:"Carnicería",
  pescaderia:"Pescadería", almacen:"Almacén", lacteos:"Lácteos y huevos",
  panificados:"Panificados", congelados:"Congelados", bebidas:"Bebidas", otros:"Otros" };
const MEAL_LABEL = { breakfast:"Desayuno", lunch:"Almuerzo", dinner:"Cena", snack:"Snack" };
```

### 8.3 Links en la Home (`src/app/dashboard/page.tsx`)
- Agregar una **card/banner** que enlace a `/dashboard/plan` (pestaña Compras) para dar a conocer
  la feature. Icono `ShoppingCart`. Texto tipo "Armá tu lista de compras de la semana".
- La navegación dentro del dashboard usa `useNav().navigate()` — pero `page.tsx` es Server
  Component. Opciones: (a) un `<Link>` simple (aceptable, no rompe), o (b) un pequeño componente
  cliente que use `useNav`. Preferir un componente cliente chico para consistencia con la barra
  de progreso, salvo que se priorice simplicidad.

### 8.4 `profile.householdSize` en onboarding y perfil
- Agregar el campo (input numérico, default 1) en el form de onboarding
  (`src/app/onboarding/`) y en Perfil (`src/app/dashboard/perfil/`). El último commit ya separó
  los campos de perfil en secciones — ubicarlo donde tenga sentido (datos del hogar / generales).
- Actualizar los schemas Zod y server actions de onboarding/perfil para incluir `householdSize`.

---

## 9. Orden de implementación sugerido

1. **Schema**: agregar `shoppingLists` + `profiles.householdSize` en `src/db/schema.ts`. Exportar
   tipos `ShoppingItem` / `MealIdea` / `ShoppingCategory`.
2. **Migración**: `npm run db:generate && npm run db:migrate`.
3. **AI types**: schemas + `ShoppingListContext` + método en interface `TextProvider`.
4. **AI impl**: `generateShoppingList` en `openrouter.ts`.
5. **Query**: `getShoppingList(userId)` en `queries.ts`.
6. **Server actions**: `generateShoppingList` + `toggleShoppingItem` en `plan/actions.ts`.
7. **UI**: `ShoppingListView.tsx` + tabs en `plan/page.tsx`.
8. **Onboarding/Perfil**: campo `householdSize`.
9. **Home**: card/link a la lista.
10. **Validar**: `typecheck` + `lint` + `build`. Probar generación real (ojo 429 modelos free).

## 10. Gotchas / recordatorios

- **Boundary cliente/servidor**: nunca importar `@/db` ni `queries.ts` (server-only) desde un
  componente cliente. `ShoppingListView` recibe data por props desde el Server Component.
- **Modelos free**: lentos (~20-40s) y rate-limited (429 común). El JSON puede venir roto → el
  schema tolerante + `firstContent` cubren lo esencial; mensajes de error friendly en las actions.
- **`AI_TEXT_MODEL`** debe estar seteado en `.env.local`. Salida grande → `max_tokens` holgado.
- **`.next` corrupto**: si todas las rutas dan 404 sin error en log → borrar `.next` y reiniciar.
- **Sin emoji en UI**: solo lucide-react. UI en español rioplatense. Fechas/timezone Argentina
  (`src/lib/date.ts`).
- **Markdown** (recetas) se renderiza con `src/components/Markdown.tsx` (XSS-safe).
- **No romper el scroll** del dashboard (cada página `h-full overflow-y-auto`, no flex column).
- **No hay tests**: validar con `typecheck`+`lint`+`build`. Para probar el método de IA contra el
  modelo real, se puede crear un `scripts/test-shopping.ts` (importar `src/lib/load-env.ts`
  primero, como los demás scripts).

## 11. Forward-compat (no implementar — checklist de que no nos encerramos)

- [x] `MealIdea` tiene `id`, `mealType`, `recipe`, `ingredients` estructurados, `source`.
- [x] `ShoppingItem.ingredients` y los items comparten la forma `{name, quantity, category}`.
- [x] La generación está aislada en `generateShoppingList` (input = contexto, no acoplado a UI).
- [x] La lista es una sola fila/usuario → el calendario futuro agrega tablas aparte sin migrar esto.
