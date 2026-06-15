"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUserId } from "@/lib/queries";
import { profileSchema, toProfileValues } from "@/lib/profile";

export async function saveProfile(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Revisá los datos: algunos valores no son válidos." };
  }
  const values = toProfileValues(parsed.data);

  await db
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { ...values, updatedAt: new Date() },
    });

  redirect("/dashboard");
}
