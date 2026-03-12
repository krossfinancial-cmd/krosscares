import Link from "next/link";
import { LayoutDashboard, Search, ShieldCheck } from "lucide-react";
import { getCurrentUser, getSessionIdentity, getSessionToken } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import { isDatabaseUnavailableError } from "@/lib/database-errors";
import { LogoutButton } from "@/components/logout-button";

export async function AppHeader() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  const sessionToken = await getSessionToken();
  const sessionIdentity = await getSessionIdentity();

  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }

    console.error("Header auth lookup failed because the database is unavailable.", error);
  }

  const isAuthenticated = Boolean(user || sessionToken);
  const effectiveRole = user?.role || sessionIdentity?.role || null;
  const effectiveEmail = user?.email || sessionIdentity?.email || "Signed in";
  const dashboardHref =
    effectiveRole === "ADMIN" ? "/dashboard/admin" : effectiveRole === "DEALER" ? "/dashboard/dealer" : effectiveRole === "REALTOR" ? "/dashboard/realtor" : "/dashboard";

  return (
    <header className="glass sticky top-0 z-50 border-b border-blue-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:py-3">
        <div className="flex min-w-0 items-center">
          <Link href="/" className="flex items-center" aria-label="Kross Concepts home">
            <BrandLogo variant="mark" className="h-12 w-auto md:hidden" priority />
            <BrandLogo variant="full" className="hidden h-20 w-auto object-contain md:block" priority />
          </Link>
        </div>

        <nav className="hidden items-center gap-4 text-sm font-medium text-blue-900 md:flex">
          {!isAuthenticated ? (
            <>
              <Link href="/#how-it-works" className="rounded-lg px-3 py-2 hover:bg-blue-50">
                How It Works
              </Link>
              <Link href="/#benefits" className="rounded-lg px-3 py-2 hover:bg-blue-50">
                Benefits
              </Link>
              <Link href="/#pricing" className="rounded-lg px-3 py-2 hover:bg-blue-50">
                Pricing
              </Link>
              <Link href="/#faq" className="rounded-lg px-3 py-2 hover:bg-blue-50">
                FAQ
              </Link>
            </>
          ) : (
            <Link href="/marketplace" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-blue-50">
              <Search size={15} />
              Marketplace
            </Link>
          )}
          {isAuthenticated ? (
            <Link href={dashboardHref} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-blue-50">
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          {!isAuthenticated && (
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
          {isAuthenticated && (
            <>
              <span className="hidden items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-800 md:flex">
                {effectiveRole === "ADMIN" ? <ShieldCheck size={14} /> : null}
                {effectiveEmail}
              </span>
              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
