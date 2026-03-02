"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

interface User {
  id: number;
  username: string | null;
  email: string | null;
  role: string;
  createdAt: string;
}

function formatDate(d: string) {
  const date = new Date(d);
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

function roleLabel(role: string) {
  return role === "SUPER_ADMIN" ? "סופר אדמין" : "אדמין";
}

export function UsersList({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [dialogOpen, setDialogOpen] = useState(false);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() && !email.trim()) return;
    if (!password || password.length < 6) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username || undefined, email: email || undefined, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((p) => [data, ...p]);
        setUsername("");
        setEmail("");
        setPassword("");
        setDialogOpen(false);
      } else {
        alert(data.error || "שגיאה");
      }
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("למחוק משתמש?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers((p) => p.filter((u) => u.id !== id));
  }

  if (loading) return <p className="text-white/70">טוען...</p>;

  return (
    <div>
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Trigger asChild>
          <Button className="mb-6 h-11 px-6 rounded-lg text-white font-medium hover:opacity-90" style={{ backgroundColor: "#37C27D" }}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף משתמש
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-xl border border-white/5 bg-[#0e1118] p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold mb-4">הוסף משתמש</Dialog.Title>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-sm block mb-1 text-white/80">שם משתמש</label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="bg-[#1A1D21] border-white/10" />
              </div>
              <div>
                <label className="text-sm block mb-1 text-white/80">אימייל</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="bg-[#1A1D21] border-white/10" />
              </div>
              <div>
                <label className="text-sm block mb-1 text-white/80">סיסמה</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="מינימום 6 תווים" className="bg-[#1A1D21] border-white/10" />
              </div>
              <div>
                <label className="text-sm block mb-1 text-white/80">תפקיד</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#1A1D21] px-3 text-white"
                >
                  <option value="ADMIN">אדמין</option>
                  <option value="SUPER_ADMIN">סופר אדמין</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={addLoading} className="hover:opacity-90" style={{ backgroundColor: "#37C27D" }}>
                  הוסף
                </Button>
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">ביטול</Button>
                </Dialog.Close>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="space-y-0 divide-y divide-border">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-4 py-4"
          >
            {String(u.id) !== currentUserId ? (
              <button
                type="button"
                onClick={() => handleDelete(u.id)}
                className="p-2 rounded bg-red-600/90 hover:bg-red-600 text-white shrink-0 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-10 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white">{u.username || u.email}</p>
              <p className="text-sm text-white/60">{roleLabel(u.role)} • נוצר {formatDate(u.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
