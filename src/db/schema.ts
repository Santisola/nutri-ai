import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  date,
  primaryKey,
  serial,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ─────────────────────────  Auth.js (Drizzle adapter)  ───────────────────────── */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

/* ─────────────────────────────  Dominio NutriAI  ───────────────────────────── */

export const profiles = pgTable("profile", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // sex: "male" | "female"
  sex: text("sex").notNull(),
  birthYear: integer("birthYear").notNull(),
  heightCm: real("heightCm").notNull(),
  weightKg: real("weightKg").notNull(),
  // activityLevel: sedentary | light | moderate | active | veryActive
  activityLevel: text("activityLevel").notNull(),
  // goalType: lose | maintain | gain
  goalType: text("goalType").notNull(),
  goalRateKgPerWeek: real("goalRateKgPerWeek").notNull().default(0),
  targetWeightKg: real("targetWeightKg"),
  dietaryPrefs: jsonb("dietaryPrefs").$type<string[]>().default([]),
  allergies: jsonb("allergies").$type<string[]>().default([]),
  dislikes: jsonb("dislikes").$type<string[]>().default([]),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// Tabla de composición de alimentos (seed). Valores por 100 g.
export const foods = pgTable("food", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalizedName").notNull(),
  synonyms: jsonb("synonyms").$type<string[]>().default([]),
  kcalPer100g: real("kcalPer100g").notNull(),
  proteinPer100g: real("proteinPer100g").notNull(),
  carbPer100g: real("carbPer100g").notNull(),
  fatPer100g: real("fatPer100g").notNull(),
  // source: argenfoods | usda | openfoodfacts | manual
  source: text("source").notNull().default("manual"),
});

export const mealLogs = pgTable("meal_log", {
  id: serial("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  // mealType: breakfast | lunch | dinner | snack
  mealType: text("mealType").notNull(),
  note: text("note"),
  kcal: real("kcal").notNull().default(0),
  protein: real("protein").notNull().default(0),
  carb: real("carb").notNull().default(0),
  fat: real("fat").notNull().default(0),
  // source: ai | manual
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const mealLogItems = pgTable("meal_log_item", {
  id: serial("id").primaryKey(),
  mealLogId: integer("mealLogId")
    .notNull()
    .references(() => mealLogs.id, { onDelete: "cascade" }),
  foodId: integer("foodId").references(() => foods.id, { onDelete: "set null" }),
  label: text("label").notNull(),
  grams: real("grams").notNull(),
  kcal: real("kcal").notNull(),
  protein: real("protein").notNull(),
  carb: real("carb").notNull(),
  fat: real("fat").notNull(),
  // confidence: high | low (low = estimado por IA sin match en DB)
  confidence: text("confidence").notNull().default("high"),
});

export const weightLogs = pgTable("weight_log", {
  id: serial("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  weightKg: real("weightKg").notNull(),
});

// Plan/guía nutricional personalizado. Uno por usuario.
export const nutritionPlans = pgTable("nutrition_plan", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // markdown
  // "generated" (IA) | "imported" (PDF de nutricionista)
  source: text("source").notNull().default("generated"),
  // Objetivos del plan importado (null = usar los calculados por la fórmula).
  kcal: real("kcal"),
  protein: real("protein"),
  carb: real("carb"),
  fat: real("fat"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
