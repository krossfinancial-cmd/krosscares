import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDatabaseUnavailableError } from "@/lib/database-errors";

type SearchParams = Promise<{
  error?: string;
  logged_out?: string;
  password_set?: string;
}>;

function errorMessage(code?: string) {
  if (!code) return null;
  if (code === "invalid") return "Invalid email or password.";
  return decodeURIComponent(code);
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;

  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }

    console.error("Login page auth lookup failed because the database is unavailable.", error);
  }

  if (user) {
    redirect(user.role === "ADMIN" ? "/dashboard/admin" : user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor");
  }
  const params = await searchParams;
  const error = errorMessage(params.error);
  const loggedOut = params.logged_out === "1";
  const passwordSet = params.password_set === "1";

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-blue-950">Sign In</h1>
        <p className="mt-2 text-sm text-blue-900/70">Sign in to manage your territories and lead routing.</p>
        {loggedOut ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            You have been logged out.
          </div>
        ) : null}
        {passwordSet ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Password set successfully. You can now sign in.
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-blue-900">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-blue-900">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="********"
            />
          </div>
          <button className="primary-btn w-full" type="submit">
            Continue
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/marketplace" className="font-semibold text-blue-700 hover:text-blue-900">
            Back to marketplace
          </Link>
          <Link href="/signup" className="font-semibold text-blue-700 hover:text-blue-900">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
