import { UserRole } from "@prisma/client";
import { appUrl } from "@/lib/app-url";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type CreateSupabaseAuthUserArgs = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
};

export async function createSupabaseAuthUser(args: CreateSupabaseAuthUserArgs) {
  const supabaseAdmin = createAdminSupabaseClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
    user_metadata: {
      fullName: args.fullName,
      role: args.role,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Unable to create auth user.");
  }

  return data.user;
}

export async function deleteSupabaseAuthUser(userId: string) {
  const supabaseAdmin = createAdminSupabaseClient();
  await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => null);
}

export async function buildPasswordSetupUrl(email: string, next = "/set-password") {
  const supabaseAdmin = createAdminSupabaseClient();
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error || !data.properties.hashed_token) {
    throw new Error(error?.message || "Unable to create password setup link.");
  }

  const params = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: "recovery",
    next,
  });

  return appUrl(`/auth/confirm?${params.toString()}`).toString();
}
