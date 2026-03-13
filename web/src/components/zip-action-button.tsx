"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ZipActionButtonProps = {
  zipId: string;
  zipCode: string;
  vertical: "REALTOR" | "DEALER";
  dashboardPath: "/dashboard/realtor" | "/dashboard/dealer";
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";
  assignedClientId: string | null;
  currentClientId: string | null;
};

export function ZipActionButton({
  zipId,
  zipCode,
  vertical,
  dashboardPath,
  status,
  assignedClientId,
  currentClientId,
}: ZipActionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const isReservedByCurrentUser = status === "RESERVED" && !!currentClientId && assignedClientId === currentClientId;

  const reserve = async () => {
    setLoading(true);
    const response = await fetch("/api/zips/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zipId }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      if (payload.redirect) {
        router.push(payload.redirect);
        return;
      }
      alert(payload.error || "Unable to reserve ZIP.");
      return;
    }

    setShowSuccessModal(true);
    router.refresh();
  };

  const successModal = showSuccessModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/45 px-4">
      <div className="card w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-blue-950">Territory Reserved</h2>
        <p className="mt-3 text-sm leading-6 text-blue-900/80">
          ZIP {zipCode} is now reserved for your account. A KC agent will contact you within 24 hours to complete next steps.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="secondary-btn text-sm"
            onClick={() => setShowSuccessModal(false)}
          >
            Close
          </button>
          <button
            type="button"
            className="primary-btn text-sm"
            onClick={() => {
              setShowSuccessModal(false);
              router.push(`${dashboardPath}/territories`);
            }}
          >
            View Territories
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (isReservedByCurrentUser) {
    return (
      <>
        <button className="secondary-btn cursor-default text-xs" disabled>
          Reserved For You
        </button>
        {successModal}
      </>
    );
  }

  if (status !== "AVAILABLE") {
    return (
      <button className="secondary-btn text-xs" onClick={() => router.push(`/waitlist?zip=${zipCode}&vertical=${vertical}`)}>
        Join Waitlist
      </button>
    );
  }

  return (
    <>
      <button onClick={reserve} className="primary-btn text-xs" disabled={loading}>
        {loading ? "Reserving..." : "Claim Territory"}
      </button>
      {successModal}
    </>
  );
}
