import { redirect } from "next/navigation";
import { cache } from "react";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function homeForRole(role: UserRole) {
  if (role === "ADMIN") return "/dashboard/admin";
  if (role === "DEALER") return "/dashboard/dealer";
  return "/dashboard/realtor";
}

const loadCurrentUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: claims.sub },
    include: {
      client: true,
    },
  });
});

export const loadCurrentAuthUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
});

export async function getCurrentUser() {
  return loadCurrentUser();
}

export async function getCurrentAuthUser() {
  return loadCurrentAuthUser();
}

export async function requireUser(role?: UserRole) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(homeForRole(user.role));
  return user;
}

export async function requireAuthUser() {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}
