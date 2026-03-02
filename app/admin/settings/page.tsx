import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-white">הגדרות</h1>
      <p className="text-white/60">הגדרות כלליות, IP whitelist, וכו׳</p>
    </div>
  );
}
