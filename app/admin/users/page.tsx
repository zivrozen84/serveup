import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { UsersList } from "@/components/admin/UsersList";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  if (session.user?.role !== "SUPER_ADMIN") redirect("/admin/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-white">משתמשי פאנל</h1>
      <UsersList currentUserId={session.user?.id} />
    </div>
  );
}
