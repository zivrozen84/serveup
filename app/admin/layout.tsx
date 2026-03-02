import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <div data-admin className="min-h-screen bg-[#0a0b10] text-white">
      {session ? (
        <AdminShell userRole={session.user?.role ?? ""}>{children}</AdminShell>
      ) : (
        <div className="min-h-screen">{children}</div>
      )}
    </div>
  );
}
