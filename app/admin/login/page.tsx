import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/admin/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="rounded-xl border border-white/5 bg-[#0e1118] p-8 shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">כניסת אדמין</h1>
        <LoginForm />
      </div>
    </div>
  );
}
