"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, UtensilsCrossed, Users, Settings } from "lucide-react";

const allNav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/restaurants", label: "מסעדות", icon: UtensilsCrossed },
  { href: "/admin/users", label: "משתמשים", icon: Users, superAdminOnly: true },
  { href: "/admin/settings", label: "הגדרות", icon: Settings },
];

export function AdminShell({ children, userRole }: { children: React.ReactNode; userRole?: string }) {
  const pathname = usePathname();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const nav = allNav.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <div className="min-h-screen bg-[#0a0b10]">
      <aside className="w-64 shrink-0 flex flex-col bg-[#0e1118] border-l border-white/5 fixed right-0 top-0 h-full">
        <div className="p-4 border-b border-white/5">
          <p className="text-[10px] text-white/40 mb-2">// י ו י ו י ו</p>
          {isSuperAdmin && (
            <p className="text-xs text-white/60 mb-2">SUPER-ADMIN // v1.0</p>
          )}
          <Link href="/admin" className="font-bold text-lg text-white">
            Serveup
          </Link>
        </div>
        <nav className="flex-1 p-3">
          {nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? "bg-[#2F7C73] text-white"
                    : "text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            התנתק
          </button>
          <p className="text-xs text-muted-foreground mt-3">SERVEUP v1.0</p>
        </div>
      </aside>
      <main className="mr-64 p-6 min-h-screen text-white">{children}</main>
    </div>
  );
}
