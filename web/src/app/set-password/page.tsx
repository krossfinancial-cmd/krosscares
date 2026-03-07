import Link from "next/link";
import { getValidPasswordSetupToken } from "@/lib/password-setup";

type SearchParams = Promise<{
  token?: string;
  error?: string;
}>;

function getErrorMessage(code?: string) {
  if (!code) return null;
  if (code === "invalid-token") return "This password setup link is invalid or expired.";
  if (code === "password-mismatch") return "Passwords do not match.";
  if (code === "password-too-short") return "Password must be at least 8 characters.";
  return decodeURIComponent(code);
}

export default async function SetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = params.token?.trim() || "";
  const error = getErrorMessage(params.error);

  if (!token) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-blue-950">Set Your Password</h1>
          <p className="mt-3 text-sm text-blue-900/70">Missing setup token. Use the link from your email invite.</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  const validToken = await getValidPasswordSetupToken(token);

  if (!validToken) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-blue-950">Set Your Password</h1>
          <p className="mt-3 text-sm text-rose-700">This password setup link is invalid or expired.</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-blue-950">Set Your Password</h1>
        <p className="mt-2 text-sm text-blue-900/70">
          Welcome {validToken.user.fullName}. Create your password to access your dashboard.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <form action="/api/auth/set-password" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-900" htmlFor="password">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-900" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950"
              placeholder="Re-enter password"
            />
          </div>
          <button className="primary-btn w-full" type="submit">
            Save Password
          </button>
        </form>
      </div>
    </div>
  );
}
