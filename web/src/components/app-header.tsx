import Link from "next/link";
import { Building2, LayoutDashboard, Search, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export async function AppHeader() {
  const user = await getCurrentUser();

  return (
    <header className="glass sticky top-0 z-50 border-b border-blue-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2 text-white">
            <Building2 size={18} />
          </div>
          <Link href="/" className="text-lg font-semibold text-blue-950">
            Kross Cares Territories
          </Link>
        </div>

        <nav className="hidden items-center gap-4 text-sm font-medium text-blue-900 md:flex">
          <Link href="/marketplace" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-blue-50">
            <Search size={15} />
            Marketplace
          </Link>
          {user && (
            <Link
              href={user.role === "ADMIN" ? "/dashboard/admin" : user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor"}
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-blue-50"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {!user && (
            <Link href="/login" className="secondary-btn text-sm">
              Sign In
            </Link>
          )}
          {user && (
            <>
              <span className="hidden items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-800 md:flex">
                {user.role === "ADMIN" ? <ShieldCheck size={14} /> : null}
                {user.email}
              </span>
              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
