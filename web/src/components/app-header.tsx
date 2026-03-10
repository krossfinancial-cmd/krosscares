import Link from "next/link";
import { LayoutDashboard, Search, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import { isDatabaseUnavailableError } from "@/lib/database-errors";
import { LogoutButton } from "@/components/logout-button";

export async function AppHeader() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;

  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }

    console.error("Header auth lookup failed because the database is unavailable.", error);
  }

  return (
    <header className="glass sticky top-0 z-50 border-b border-blue-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex min-w-0 items-center">
          <Link href="/" className="flex items-center" aria-label="Kross Concepts home">
            <BrandLogo variant="mark" className="h-11 w-auto md:hidden" priority />
            <BrandLogo variant="full" className="hidden h-14 w-auto md:block" priority />
          </Link>
        </div>

        <nav className="hidden items-center gap-4 text-sm font-medium text-blue-900 md:flex">
          {!user ? (
            <>
              <a href="#how-it-works" className="rounded-lg px-3 py-2 hover:bg-blue-50">
                How It Works
              </a>
              <a href="#benefits" className="rounded-lg px-3 py-2 hover:bg-blue-50">
                Benefits
              </a>
              <a href="#pricing" className="rounded-lg px-3 py-2 hover:bg-blue-50">
                Pricing
              </a>
              <a href="#faq" className="rounded-lg px-3 py-2 hover:bg-blue-50">
                FAQ
              </a>
            </>
          ) : (
            <Link href="/marketplace" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-blue-50">
              <Search size={15} />
              Marketplace
            </Link>
          )}
          {user ? (
            <Link
              href={user.role === "ADMIN" ? "/dashboard/admin" : user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor"}
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-blue-50"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          {!user && (
            <>
              <Link href="/marketplace" className="primary-btn hidden text-sm md:inline-flex">
                Check ZIP Availability
              </Link>
              <Link href="/signup" className="secondary-btn hidden text-sm md:inline-flex">
                Create Account
              </Link>
              <Link href="/login" className="secondary-btn text-sm">
                Sign In
              </Link>
            </>
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
