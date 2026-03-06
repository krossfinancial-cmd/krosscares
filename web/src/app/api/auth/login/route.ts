import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const result = await loginWithPassword(email, password);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url));
  }

  const target = result.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/realtor";
  return NextResponse.redirect(new URL(target, request.url));
}
