import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { releaseZip } from "@/lib/workflows";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(new URL("/login", request.url));

  const formData = await request.formData();
  const zipId = String(formData.get("zipId") || "");
  await releaseZip(zipId, user.id);

  return NextResponse.redirect(new URL("/dashboard/admin/zips?released=1", request.url));
}
