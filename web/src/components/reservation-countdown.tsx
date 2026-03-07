"use client";

import { useEffect, useMemo, useState } from "react";

type ReservationCountdownProps = {
  expiresAtIso: string;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ReservationCountdown({ expiresAtIso }: ReservationCountdownProps) {
  const expiresAtMs = useMemo(() => new Date(expiresAtIso).getTime(), [expiresAtIso]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
  const expired = remainingSeconds <= 0;

  const tone = expired
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : remainingSeconds > 180
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : remainingSeconds > 60
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">Checkout Hold Timer</p>
      <p className="mt-1 text-2xl font-bold">{expired ? "00:00" : formatTime(remainingSeconds)}</p>
      <p className="mt-2 text-xs">
        {expired
          ? "Reservation expired. Return to marketplace to reclaim this ZIP if it is still available."
          : "Complete checkout before the timer ends or this ZIP can be released back to marketplace."}
      </p>
    </div>
  );
}
