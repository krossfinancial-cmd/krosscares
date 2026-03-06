type SearchParams = Promise<{ zip?: string }>;

export default async function WaitlistPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const zip = params.zip || "";

  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-blue-950">Join ZIP Waitlist</h1>
        <p className="mt-2 text-sm text-blue-900/70">
          If the territory becomes available, we notify waitlisted prospects in order.
        </p>

        <form action="/api/waitlist" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="zipCode" value={zip} />
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-900">ZIP Code</label>
            <input
              defaultValue={zip}
              name="zipCodeDisplay"
              disabled
              className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-900">Name</label>
            <input name="name" required className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-900">Email</label>
            <input name="email" type="email" required className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-900">Phone</label>
            <input name="phone" required className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-900">Business Type</label>
            <select name="businessType" className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950">
              <option value="realtor">Realtor</option>
            </select>
          </div>
          <button className="primary-btn w-full" type="submit">
            Join Waitlist
          </button>
        </form>
      </div>
    </div>
  );
}
