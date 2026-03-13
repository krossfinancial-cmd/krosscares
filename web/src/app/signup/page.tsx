import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDatabaseUnavailableError } from "@/lib/database-errors";

type SearchParams = Promise<{
  error?: string;
  claimZipId?: string;
  claimZipCode?: string;
  claimVertical?: string;
}>;

function errorMessage(code?: string) {
  if (!code) return null;

  if (code === "email-exists") return "An account with this email already exists.";
  if (code === "rate-limit") return "Too many attempts. Please wait and retry.";
  if (code === "auth-unavailable") return "Account creation is temporarily unavailable. Please try again shortly.";
  if (code === "create-failed") return "We could not create your account. Please try again.";

  return decodeURIComponent(code);
}

function buildClaimQuery(claimZipId?: string, claimZipCode?: string, claimVertical?: string) {
  const query = new URLSearchParams();
  if (claimZipId) query.set("claimZipId", claimZipId);
  if (claimZipCode) query.set("claimZipCode", claimZipCode);
  if (claimVertical) query.set("claimVertical", claimVertical);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;

  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }

    console.error("Signup page auth lookup failed because the database is unavailable.", error);
  }

  if (user) {
    redirect(user.role === "ADMIN" ? "/dashboard/admin" : user.role === "DEALER" ? "/dashboard/dealer" : "/dashboard/realtor");
  }

  const params = await searchParams;
  const error = errorMessage(params.error);
  const claimZipId = params.claimZipId?.trim() || "";
  const claimZipCode = params.claimZipCode?.trim() || "";
  const claimVertical = params.claimVertical?.trim().toUpperCase() === "DEALER" ? "DEALER" : "REALTOR";
  const claimQuery = buildClaimQuery(claimZipId, claimZipCode, claimZipId ? claimVertical : undefined);

  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-blue-950">Create Your Account</h1>
        <p className="mt-2 text-sm text-blue-900/70">
          Set up your realtor or dealer account so you can claim ZIPs and receive routed leads.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}
        {claimZipId ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Create your account to reserve ZIP {claimZipCode || "selected territory"} right after signup.
          </div>
        ) : null}

        <form action="/api/auth/signup" method="post" className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="claimZipId" value={claimZipId} />
          <input type="hidden" name="claimZipCode" value={claimZipCode} />
          <input type="hidden" name="claimVertical" value={claimZipId ? claimVertical : ""} />
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-blue-900">Full Name</span>
            <input
              name="fullName"
              required
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="Jordan Smith"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-blue-900">Email Address</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="you@company.com"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-blue-900">Phone</span>
            <input
              name="phone"
              type="tel"
              required
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="(555) 555-1234"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-blue-900">Business Type</span>
            <select name="vertical" defaultValue={claimZipId ? claimVertical : "REALTOR"} className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950">
              <option value="REALTOR">Realtor</option>
              <option value="DEALER">Car Dealer</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-blue-900">Company Name (optional)</span>
            <input
              name="companyName"
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="Your company"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-blue-900">Password</span>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="At least 8 characters"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-blue-900">Confirm Password</span>
            <input
              name="confirmPassword"
              type="password"
              minLength={8}
              required
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="Re-enter password"
            />
          </label>

          <button className="primary-btn md:col-span-2" type="submit">
            Create Account
          </button>
        </form>

        <p className="mt-4 text-xs text-blue-800/80">
          Your lead routing defaults to your signup email and phone. You can update them during onboarding.
        </p>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/marketplace" className="font-semibold text-blue-700 hover:text-blue-900">
            Back to marketplace
          </Link>
          <Link href={`/login${claimQuery}`} className="font-semibold text-blue-700 hover:text-blue-900">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
