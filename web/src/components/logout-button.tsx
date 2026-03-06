"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  const onClick = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  };

  return (
    <button onClick={onClick} className="secondary-btn flex items-center gap-2 text-sm">
      <LogOut size={14} />
      Logout
    </button>
  );
}
