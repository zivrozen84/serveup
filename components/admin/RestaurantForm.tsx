"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RestaurantFormProps {
  initialData?: {
    id?: number;
    name: string;
    slug: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    city: string;
    primaryColor: string;
    isActive: boolean;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    backgroundUrl?: string | null;
  };
}

export function RestaurantForm({ initialData }: RestaurantFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [ownerName, setOwnerName] = useState(initialData?.ownerName ?? "");
  const [ownerEmail, setOwnerEmail] = useState(initialData?.ownerEmail ?? "");
  const [ownerPhone, setOwnerPhone] = useState(initialData?.ownerPhone ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor ?? "#c2410c");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(initialData?.bannerUrl ?? "");
  const [backgroundUrl, setBackgroundUrl] = useState(initialData?.backgroundUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialData && name) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9\u0590-\u05ff]+/g, "-")
          .replace(/^-|-$/g, "") || ""
      );
    }
  }, [name, initialData]);

  async function handleUpload(field: "logoUrl" | "bannerUrl" | "backgroundUrl", file: File) {
    setUploading(true);
    setError((p) => ({ ...p, [field]: [] }));
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        if (field === "logoUrl") setLogoUrl(data.url);
        if (field === "bannerUrl") setBannerUrl(data.url);
        if (field === "backgroundUrl") setBackgroundUrl(data.url);
      } else setError((p) => ({ ...p, [field]: [data.error || "שגיאה"] }));
    } catch {
      setError((p) => ({ ...p, [field]: ["שגיאה בהעלאה"] }));
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError({});
    const url = initialData?.id ? `/api/admin/restaurants/${initialData.id}` : "/api/admin/restaurants";
    const method = initialData?.id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        ownerName,
        ownerEmail,
        ownerPhone,
        city,
        primaryColor,
        isActive,
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        backgroundUrl: backgroundUrl || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(data.error || { form: [data.message || "שגיאה"] });
    }
  }

  const labels = {
    logoUrl: "לוגו",
    bannerUrl: "באנר",
    backgroundUrl: "רקע תפריט",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {Object.keys(error).length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {Object.entries(error).map(([k, v]) => (
            <div key={k}>{Array.isArray(v) ? v.join(", ") : v}</div>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>שם מסעדה</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>שם בדף (slug)</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="my-restaurant" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>שם בעלים</Label>
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
        </div>
        <div>
          <Label>אימייל</Label>
          <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
        </div>
        <div>
          <Label>טלפון</Label>
          <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} required />
        </div>
        <div>
          <Label>עיר</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <div>
          <Label>צבע ראשי</Label>
          <div className="flex gap-2 items-center mt-1">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 rounded border cursor-pointer"
            />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-28" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="isActive">פעיל</Label>
        </div>
      </div>
      {(["logoUrl", "bannerUrl", "backgroundUrl"] as const).map((field) => (
        <div key={field}>
          <Label>{labels[field]}</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={field === "logoUrl" ? logoUrl : field === "bannerUrl" ? bannerUrl : backgroundUrl}
              onChange={(e) => {
                if (field === "logoUrl") setLogoUrl(e.target.value);
                if (field === "bannerUrl") setBannerUrl(e.target.value);
                if (field === "backgroundUrl") setBackgroundUrl(e.target.value);
              }}
              placeholder="URL או העלאת קובץ"
            />
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(field, f);
                }}
              />
              <span
                className={`inline-flex items-center justify-center h-10 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent ${uploading ? "opacity-50" : ""}`}
              >
                {uploading ? "מעלה..." : "העלה"}
              </span>
            </label>
          </div>
          {error[field] && <p className="text-sm text-destructive mt-1">{error[field][0]}</p>}
        </div>
      ))}
      <Button type="submit" disabled={saving} className="text-white hover:opacity-90" style={{ backgroundColor: "#37C27D" }}>
        {saving ? "שומר..." : initialData?.id ? "עדכן" : "צור מסעדה"}
      </Button>
    </form>
  );
}
