import { NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(appUrl("/login?logged_out=1"));
}
