import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { RestaurantForm } from "@/components/admin/RestaurantForm";

export default async function NewRestaurantPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-white">מסעדה חדשה</h1>
      <RestaurantForm />
    </div>
  );
}
