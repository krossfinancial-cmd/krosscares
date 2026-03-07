import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardRedirectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.role === "ADMIN" ? "/dashboard/admin" : user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor");
}
