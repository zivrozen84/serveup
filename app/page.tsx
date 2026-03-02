import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 p-6">
      <h1 className="text-3xl font-bold text-amber-100 mb-6">Serveup</h1>
      <p className="text-amber-200/80 mb-8">תפריט מסעדות</p>
      <div className="flex gap-4">
        <Link
          href="/admin"
          className="px-6 py-3 rounded-lg bg-amber-700 text-white font-medium hover:bg-amber-600 transition-colors"
        >
          כניסת אדמין
        </Link>
      </div>
      <p className="text-amber-600/80 text-sm mt-6">zivrozen84@gmail.com</p>
    </div>
  );
}
