import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "ADMIN" ? "/dashboard/admin" : user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-blue-950">Sign In</h1>
        <p className="mt-2 text-sm text-blue-900/70">Use seeded accounts to test realtor and admin flows.</p>

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

        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-xs text-blue-800">
          <p className="font-semibold">Demo Credentials</p>
          <p className="mt-1">Admin: admin@krosscares.local / Admin#2026!</p>
          <p>Realtor: realtor@krosscares.local / Realtor#2026!</p>
          <p>Dealer: dealer@krosscares.local / Dealer#2026!</p>
        </div>

        <Link href="/marketplace" className="mt-5 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900">
          Back to marketplace
        </Link>
      </div>
    </div>
  );
}
