"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUserId } from "@/lib/queries";
import { profileSchema, toProfileValues } from "@/lib/profile";

export async function updateProfile(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

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

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/perfil");
  return { ok: true };
}
