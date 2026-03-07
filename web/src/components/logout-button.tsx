import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button type="submit" className="secondary-btn flex items-center gap-2 text-sm">
        <LogOut size={14} />
        Logout
      </button>
    </form>
  );
}
