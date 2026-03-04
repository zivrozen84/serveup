"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_FRAMES = [
  "/frames/1.png",
  "/frames/2.png",
  "/frames/3.png",
  "/frames/4.png",
  "/frames/5.png",
  "/frames/6.png",
  "/frames/7.png",
  "/frames/8.png",
  "/frames/9.png",
];
const NO_FRAME = "";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type RestaurantPreviewSnapshot = {
  primaryColor?: string;
  categoryTextColor?: string | null;
  categoryBubbleSecondaryColor?: string | null;
  secondaryColor?: string | null;
  textColor?: string | null;
  descriptionColor?: string | null;
  priceColor?: string | null;
  cartColor?: string | null;
  cartTextColor?: string | null;
  cartBackgroundUrl?: string | null;
  cartBarOverlayOpacity?: number | null;
  cartBarControlsOpacity?: number | null;
  expansionBackdropOpacity?: number | null;
  flyingDiscVisibility?: number | null;
  bottomNavColor?: string | null;
  bottomNavIconColor?: string | null;
  summaryCardColor?: string | null;
  menuDisplayFormat?: string;
  frameUrl?: string | null;
  backgroundUrl?: string | null;
  bannerUrl?: string | null;
};

interface RestaurantFormProps {
  onFrameChange?: (url: string) => void;
  onMenuDisplayFormatChange?: (format: "large" | "small" | "compact" | "imageRight") => void;
  onFormChange?: (data: RestaurantPreviewSnapshot) => void;
  setHasUnsavedChanges?: (value: boolean) => void;
  registerPulseTrigger?: (fn: () => void) => void;
  initialData?: {
    id?: number;
    name: string;
    slug: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    city: string;
    primaryColor: string;
    categoryTextColor?: string | null;
    categoryBubbleSecondaryColor?: string | null;
    secondaryColor?: string | null;
    textColor?: string | null;
    descriptionColor?: string | null;
    priceColor?: string | null;
    cartColor?: string | null;
    cartTextColor?: string | null;
    cartBackgroundUrl?: string | null;
    cartBarOverlayOpacity?: number | null;
    cartBarControlsOpacity?: number | null;
    expansionBackdropOpacity?: number | null;
    bottomNavColor?: string | null;
    bottomNavIconColor?: string | null;
    summaryCardColor?: string | null;
    menuDisplayFormat?: string;
    isActive: boolean;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    backgroundUrl?: string | null;
    frameUrl?: string | null;
    frameVariants?: string | null;
    textSize?: number | null;
    fontFamily?: string | null;
  };
}

export function RestaurantForm({
  initialData,
  onFrameChange,
  onMenuDisplayFormatChange,
  onFormChange,
  setHasUnsavedChanges,
  registerPulseTrigger,
}: RestaurantFormProps) {
  const router = useRouter();
  const updateButtonRef = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [ownerName, setOwnerName] = useState(initialData?.ownerName ?? "");
  const [ownerEmail, setOwnerEmail] = useState(initialData?.ownerEmail ?? "");
  const [ownerPhone, setOwnerPhone] = useState(initialData?.ownerPhone ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor ?? "#c2410c");
  const [categoryTextColor, setCategoryTextColor] = useState(initialData?.categoryTextColor ?? "");
  const [categoryBubbleSecondaryColor, setCategoryBubbleSecondaryColor] = useState(
    initialData?.categoryBubbleSecondaryColor ?? "#5c4033"
  );
  const [secondaryColor, setSecondaryColor] = useState(initialData?.secondaryColor ?? "#fbbf24");
  const [textColor, setTextColor] = useState(initialData?.textColor ?? "#fef3c7");
  const [descriptionColor, setDescriptionColor] = useState(initialData?.descriptionColor ?? "#fde68a");
  const [priceColor, setPriceColor] = useState(initialData?.priceColor ?? "#fffbeb");
  const [cartColor, setCartColor] = useState(initialData?.cartColor ?? initialData?.primaryColor ?? "#c2410c");
  const [cartTextColor, setCartTextColor] = useState(initialData?.cartTextColor ?? "#ffffff");
  const [cartBackgroundUrl, setCartBackgroundUrl] = useState(initialData?.cartBackgroundUrl ?? "");
  const [cartBarOverlayOpacity, setCartBarOverlayOpacity] = useState(initialData?.cartBarOverlayOpacity ?? 45);
  const [cartBarControlsOpacity, setCartBarControlsOpacity] = useState(initialData?.cartBarControlsOpacity ?? 100);
  const [expansionBackdropOpacity, setExpansionBackdropOpacity] = useState(initialData?.expansionBackdropOpacity ?? 70);
  const [flyingDiscVisibility, setFlyingDiscVisibility] = useState(initialData?.flyingDiscVisibility ?? 100);
  const [bottomNavColor, setBottomNavColor] = useState(initialData?.bottomNavColor ?? initialData?.cartColor ?? "");
  const [bottomNavIconColor, setBottomNavIconColor] = useState(initialData?.bottomNavIconColor ?? "#ffffff");
  const [summaryCardColor, setSummaryCardColor] = useState(initialData?.summaryCardColor ?? "#292524");
  const [menuDisplayFormat, setMenuDisplayFormat] = useState<"large" | "small" | "compact" | "imageRight">(
    (initialData?.menuDisplayFormat as "large" | "small" | "compact" | "imageRight") ?? "large"
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [bannerUrl, setBannerUrl] = useState(initialData?.bannerUrl ?? "");
  const [frameUrl, setFrameUrl] = useState(initialData?.frameUrl ?? NO_FRAME);
  const [frameVariants, setFrameVariants] = useState<string[]>(() => {
    try {
      const v = initialData?.frameVariants;
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });
  const [backgroundUrl, setBackgroundUrl] = useState(initialData?.backgroundUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [savingFrame, setSavingFrame] = useState(false);
  const [savingFormat, setSavingFormat] = useState(false);
  const [activeTogglePressed, setActiveTogglePressed] = useState(false);

  useEffect(() => {
    if (onFrameChange) onFrameChange(frameUrl || NO_FRAME);
  }, [frameUrl, onFrameChange]);

  useEffect(() => {
    const fmt = (initialData?.menuDisplayFormat as "large" | "small" | "compact" | "imageRight") ?? "large";
    setMenuDisplayFormat(fmt);
  }, [initialData?.menuDisplayFormat]);

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

  useEffect(() => {
    onFormChange?.({
      primaryColor,
      categoryTextColor: categoryTextColor || null,
      categoryBubbleSecondaryColor: categoryBubbleSecondaryColor || null,
      secondaryColor: secondaryColor || null,
      textColor: textColor || null,
      descriptionColor: descriptionColor || null,
      priceColor: priceColor || null,
      cartColor: cartColor || null,
      cartTextColor: cartTextColor || null,
      cartBackgroundUrl: cartBackgroundUrl || null,
      cartBarOverlayOpacity: cartBarOverlayOpacity,
      cartBarControlsOpacity: cartBarControlsOpacity,
      expansionBackdropOpacity: expansionBackdropOpacity,
      flyingDiscVisibility: flyingDiscVisibility,
      bottomNavColor: bottomNavColor || null,
      bottomNavIconColor: bottomNavIconColor || null,
      summaryCardColor: summaryCardColor || null,
      menuDisplayFormat,
      frameUrl: frameUrl || null,
      backgroundUrl: backgroundUrl || null,
      bannerUrl: bannerUrl || null,
    });
  }, [
    primaryColor,
    categoryTextColor,
    categoryBubbleSecondaryColor,
    secondaryColor,
    textColor,
    descriptionColor,
    priceColor,
    cartColor,
    cartTextColor,
    cartBackgroundUrl,
    cartBarOverlayOpacity,
    cartBarControlsOpacity,
    expansionBackdropOpacity,
    flyingDiscVisibility,
    bottomNavColor,
    bottomNavIconColor,
    summaryCardColor,
    menuDisplayFormat,
    frameUrl,
    backgroundUrl,
    bannerUrl,
    onFormChange,
  ]);

  const isDirty =
    initialData &&
    (name !== initialData.name ||
      slug !== initialData.slug ||
      ownerName !== initialData.ownerName ||
      ownerEmail !== initialData.ownerEmail ||
      ownerPhone !== initialData.ownerPhone ||
      city !== initialData.city ||
      primaryColor !== initialData.primaryColor ||
      (categoryTextColor || "") !== (initialData.categoryTextColor || "") ||
      (categoryBubbleSecondaryColor || "") !== (initialData.categoryBubbleSecondaryColor || "") ||
      (secondaryColor || "") !== (initialData.secondaryColor || "") ||
      (textColor || "") !== (initialData.textColor || "") ||
      (descriptionColor || "") !== (initialData.descriptionColor || "") ||
      (priceColor || "") !== (initialData.priceColor || "") ||
      (cartColor || "") !== (initialData.cartColor || "") ||
      (cartTextColor || "") !== (initialData.cartTextColor || "") ||
      (cartBackgroundUrl || "") !== (initialData.cartBackgroundUrl || "") ||
      cartBarOverlayOpacity !== (initialData.cartBarOverlayOpacity ?? 45) ||
      cartBarControlsOpacity !== (initialData.cartBarControlsOpacity ?? 100) ||
      expansionBackdropOpacity !== (initialData.expansionBackdropOpacity ?? 70) ||
      flyingDiscVisibility !== (initialData.flyingDiscVisibility ?? 100) ||
      (bottomNavColor || "") !== (initialData.bottomNavColor || "") ||
      (bottomNavIconColor || "") !== (initialData.bottomNavIconColor || "") ||
      (summaryCardColor || "") !== (initialData.summaryCardColor || "") ||
      menuDisplayFormat !== (initialData.menuDisplayFormat ?? "large") ||
      isActive !== initialData.isActive ||
      (bannerUrl || "") !== (initialData.bannerUrl || "") ||
      (frameUrl || "") !== (initialData.frameUrl || "") ||
      (backgroundUrl || "") !== (initialData.backgroundUrl || ""));

  useEffect(() => {
    setHasUnsavedChanges?.(!!isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  const runPulseAnimation = useCallback(() => {
    const btn = updateButtonRef.current;
    if (!btn) return;
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    btn.style.transition = "box-shadow 0.3s ease, transform 0.3s ease";
    btn.style.boxShadow = "0 0 24px 4px rgba(239, 68, 68, 0.9)";
    btn.style.transform = "scale(1.4)";
    setTimeout(() => {
      btn.style.boxShadow = "";
      btn.style.transform = "";
    }, 600);
  }, []);

  useEffect(() => {
    registerPulseTrigger?.(runPulseAnimation);
    return () => registerPulseTrigger?.(() => {});
  }, [registerPulseTrigger, runPulseAnimation]);

  async function handleUploadFrame(file: File) {
    setUploading(true);
    setError((p) => ({ ...p, frame: [] }));
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        const nextVariants = [...frameVariants, data.url].slice(-10);
        setFrameVariants(nextVariants);
        if (frameVariants.length === 0 && initialData?.id) {
          setFrameUrl(data.url);
          onFrameChange?.(data.url);
          setSavingFrame(true);
          try {
            const patchRes = await fetch(`/api/admin/restaurants/${initialData.id}/frame`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ frameUrl: data.url, frameVariants: JSON.stringify(nextVariants) }),
            });
            if (patchRes.ok) router.refresh();
            else setError((p) => ({ ...p, frame: ["שגיאה בשמירת מסגרת"] }));
          } catch {
            setError((p) => ({ ...p, frame: ["שגיאה בשמירת מסגרת"] }));
          }
          setSavingFrame(false);
        } else if (frameVariants.length === 0) {
          setFrameUrl(data.url);
          onFrameChange?.(data.url);
        }
      } else setError((p) => ({ ...p, frame: [data.error || "שגיאה"] }));
    } catch {
      setError((p) => ({ ...p, frame: ["שגיאה בהעלאה"] }));
    }
    setUploading(false);
  }

  async function saveRestaurant(payload: Record<string, unknown>) {
    const url = initialData?.id ? `/api/admin/restaurants/${initialData.id}` : "/api/admin/restaurants";
    const method = initialData?.id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: "תגובת שרת לא תקינה" };
      }
    }
    if (res.ok) router.refresh();
    return { ok: res.ok, data };
  }

  async function handleMenuDisplayFormatSelect(format: "large" | "small" | "compact" | "imageRight") {
    setMenuDisplayFormat(format);
    onMenuDisplayFormatChange?.(format);
    if (!initialData?.id) return;
    setSavingFormat(true);
    setError((p) => ({ ...p, menuDisplayFormat: [] }));
    try {
      const res = await fetch(`/api/admin/restaurants/${initialData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuDisplayFormat: format }),
      });
      if (res.ok) router.refresh();
      else {
        const data = await res.json().catch(() => ({}));
        setError((p) => ({ ...p, menuDisplayFormat: [data?.message || "שגיאה בשמירה"] }));
      }
    } catch {
      setError((p) => ({ ...p, menuDisplayFormat: ["שגיאה בשמירה"] }));
    }
    setSavingFormat(false);
  }

  async function handleFrameSelect(url: string) {
    setFrameUrl(url);
    onFrameChange?.(url);
    if (!initialData?.id) return;
    setSavingFrame(true);
    setError((p) => ({ ...p, frame: [] }));
    try {
      const res = await fetch(`/api/admin/restaurants/${initialData.id}/frame`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameUrl: url,
          ...(frameVariants.length > 0 && { frameVariants: JSON.stringify(frameVariants) }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
      } else {
        const errMsg = data?.message || data?.error || `שגיאה ${res.status}`;
        setError((p) => ({ ...p, frame: [errMsg] }));
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "שגיאה בשמירת מסגרת";
      setError((p) => ({ ...p, frame: [errMsg] }));
    }
    setSavingFrame(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError({});
    const { ok, data } = await saveRestaurant({
      name,
      slug,
      ownerName,
      ownerEmail,
      ownerPhone,
      city,
      primaryColor,
      categoryTextColor: categoryTextColor?.trim() || null,
      categoryBubbleSecondaryColor: categoryBubbleSecondaryColor?.trim() || null,
      secondaryColor: secondaryColor || null,
      textColor: textColor || null,
      descriptionColor: descriptionColor || null,
      priceColor: priceColor || null,
      cartColor: cartColor || null,
      cartTextColor: cartTextColor || null,
      cartBackgroundUrl: cartBackgroundUrl?.trim() || null,
      cartBarOverlayOpacity: cartBarOverlayOpacity,
      cartBarControlsOpacity: cartBarControlsOpacity,
      expansionBackdropOpacity: expansionBackdropOpacity,
      flyingDiscVisibility: flyingDiscVisibility,
      bottomNavColor: bottomNavColor?.trim() || null,
      bottomNavIconColor: bottomNavIconColor?.trim() || null,
      summaryCardColor: summaryCardColor?.trim() || null,
      menuDisplayFormat,
      isActive,
      ...(initialData?.id && { logoUrl: initialData.logoUrl ?? null }),
      bannerUrl: bannerUrl || undefined,
      frameUrl: frameUrl || undefined,
      frameVariants: frameVariants.length ? JSON.stringify(frameVariants) : undefined,
      backgroundUrl: backgroundUrl || undefined,
      ...(initialData?.id && {
        textSize: initialData.textSize ?? 16,
        fontFamily: initialData.fontFamily ?? null,
      }),
    });
    setSaving(false);
    if (ok) {
      setHasUnsavedChanges?.(false);
    } else {
      const err = data?.error;
      const normalized: Record<string, string[]> = err?.fieldErrors
        ? { ...err.fieldErrors, ...(err.formErrors?.length ? { form: err.formErrors } : {}) }
        : { form: [typeof err === "string" ? err : data?.message || "שגיאה"] };
      setError(normalized);
    }
  }

  function handleCancel() {
    if (!initialData) return;
    setName(initialData.name);
    setSlug(initialData.slug);
    setOwnerName(initialData.ownerName);
    setOwnerEmail(initialData.ownerEmail);
    setOwnerPhone(initialData.ownerPhone);
    setCity(initialData.city);
    setPrimaryColor(initialData.primaryColor);
    setCategoryTextColor(initialData.categoryTextColor ?? "");
    setCategoryBubbleSecondaryColor(initialData.categoryBubbleSecondaryColor ?? "#5c4033");
    setSecondaryColor(initialData.secondaryColor ?? "#fbbf24");
    setTextColor(initialData.textColor ?? "#fef3c7");
    setDescriptionColor(initialData.descriptionColor ?? "#fde68a");
    setPriceColor(initialData.priceColor ?? "#fffbeb");
    setCartColor(initialData.cartColor ?? initialData.primaryColor ?? "#c2410c");
    setCartTextColor(initialData.cartTextColor ?? "#ffffff");
    setCartBackgroundUrl(initialData.cartBackgroundUrl ?? "");
    setCartBarOverlayOpacity(initialData.cartBarOverlayOpacity ?? 45);
    setCartBarControlsOpacity(initialData.cartBarControlsOpacity ?? 100);
    setExpansionBackdropOpacity(initialData.expansionBackdropOpacity ?? 70);
    setFlyingDiscVisibility(initialData.flyingDiscVisibility ?? 100);
    setBottomNavColor(initialData.bottomNavColor ?? "");
    setBottomNavIconColor(initialData.bottomNavIconColor ?? "#ffffff");
    setSummaryCardColor(initialData.summaryCardColor ?? "#292524");
    setMenuDisplayFormat((initialData.menuDisplayFormat as "large" | "small" | "compact" | "imageRight") ?? "large");
    setIsActive(initialData.isActive);
    setBannerUrl(initialData.bannerUrl ?? "");
    setFrameUrl(initialData.frameUrl ?? NO_FRAME);
    setBackgroundUrl(initialData.backgroundUrl ?? "");
    try {
      const v = initialData.frameVariants;
      setFrameVariants(v ? JSON.parse(v) : []);
    } catch {
      setFrameVariants([]);
    }
    onFrameChange?.(initialData.frameUrl ?? NO_FRAME);
    onMenuDisplayFormatChange?.((initialData.menuDisplayFormat as "large" | "small" | "compact" | "imageRight") ?? "large");
    setError({});
    setHasUnsavedChanges?.(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {Object.keys(error).length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {Object.entries(error).map(([k, v]) => (
            <div key={k}>{Array.isArray(v) ? v.join(", ") : (typeof v === "object" ? JSON.stringify(v) : String(v ?? ""))}</div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-6">
        <button
          type="button"
          onClick={() => {
            setActiveTogglePressed(true);
            setTimeout(() => {
              setIsActive((prev) => !prev);
              setActiveTogglePressed(false);
            }, 100);
          }}
          className={`rounded-xl border-2 border-white/30 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-100 select-none ${
            activeTogglePressed ? "scale-110" : "scale-100"
          } ${isActive ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}
        >
          {isActive ? "פעיל" : "לא פעיל"}
        </button>
      </div>
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
      <div className="flex flex-wrap gap-6 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">קטגוריית בועות ראשי</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">קטגוריית בועות משני</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={categoryBubbleSecondaryColor}
              onChange={(e) => setCategoryBubbleSecondaryColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={categoryBubbleSecondaryColor} onChange={(e) => setCategoryBubbleSecondaryColor(e.target.value)} className="w-20 h-9 text-sm" placeholder="#5c4033" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">טקסט בועות</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={categoryTextColor || "#fbbf24"}
              onChange={(e) => setCategoryTextColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={categoryTextColor} onChange={(e) => setCategoryTextColor(e.target.value)} className="w-20 h-9 text-sm" placeholder="#fbbf24" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">קטגוריית מנה</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">כותרת מנה</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">תיאור</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={descriptionColor}
              onChange={(e) => setDescriptionColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={descriptionColor} onChange={(e) => setDescriptionColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">מחיר</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={priceColor}
              onChange={(e) => setPriceColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={priceColor} onChange={(e) => setPriceColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">הוסף עגלה</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={cartColor}
              onChange={(e) => setCartColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={cartColor} onChange={(e) => setCartColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">טקסט עגלה</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={cartTextColor}
              onChange={(e) => setCartTextColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={cartTextColor} onChange={(e) => setCartTextColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">עיגולים</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={bottomNavColor || cartColor}
              onChange={(e) => setBottomNavColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={bottomNavColor || cartColor} onChange={(e) => setBottomNavColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">אייקון עיגולים</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={bottomNavIconColor}
              onChange={(e) => setBottomNavIconColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={bottomNavIconColor} onChange={(e) => setBottomNavIconColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">כרטיסי סיכום</Label>
          <div className="flex gap-1 items-center">
            <input
              type="color"
              value={summaryCardColor}
              onChange={(e) => setSummaryCardColor(e.target.value)}
              className="h-9 w-10 rounded border cursor-pointer border-white/20"
            />
            <Input value={summaryCardColor} onChange={(e) => setSummaryCardColor(e.target.value)} className="w-20 h-9 text-sm" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">נראות הוסף עגלה</Label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={cartBarControlsOpacity}
              onChange={(e) => setCartBarControlsOpacity(Number(e.target.value))}
              className="w-28 h-2 rounded-lg appearance-none cursor-pointer bg-white/20 accent-[#37C27D]"
            />
            <span className="text-sm text-white/80 w-7 tabular-nums shrink-0">{cartBarControlsOpacity}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">נראות רקע הרחבה</Label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={expansionBackdropOpacity}
              onChange={(e) => setExpansionBackdropOpacity(Number(e.target.value))}
              className="w-28 h-2 rounded-lg appearance-none cursor-pointer bg-white/20 accent-[#37C27D]"
            />
            <span className="text-sm text-white/80 w-7 tabular-nums shrink-0">{expansionBackdropOpacity}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">דיסקית נופלת</Label>
          <button
            type="button"
            onClick={() => setFlyingDiscVisibility((v) => ((v ?? 100) > 0 ? 0 : 100))}
            className={`w-24 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (flyingDiscVisibility ?? 100) > 0 ? "bg-[#37C27D] text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {(flyingDiscVisibility ?? 100) > 0 ? "פעיל" : "לא פעיל"}
          </button>
        </div>
      </div>
      <div>
        <Label className="text-xs mb-2 block">תצוגת מנות בתפריט</Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={savingFormat}
            onClick={() => handleMenuDisplayFormatSelect("large")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              menuDisplayFormat === "large"
                ? "bg-[#37C27D] text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            ריבועים גדולים
          </button>
          <button
            type="button"
            disabled={savingFormat}
            onClick={() => handleMenuDisplayFormatSelect("small")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              menuDisplayFormat === "small"
                ? "bg-[#37C27D] text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            ריבועים קטנים
          </button>
          <button
            type="button"
            disabled={savingFormat}
            onClick={() => handleMenuDisplayFormatSelect("compact")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              menuDisplayFormat === "compact"
                ? "bg-[#37C27D] text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            רשימה ימין
          </button>
          <button
            type="button"
            disabled={savingFormat}
            onClick={() => handleMenuDisplayFormatSelect("imageRight")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              menuDisplayFormat === "imageRight"
                ? "bg-[#37C27D] text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            רשימה שמאל
          </button>
          {savingFormat && <span className="text-xs text-white/60 self-center">שומר...</span>}
        </div>
        {error.menuDisplayFormat?.[0] && <p className="text-sm text-destructive mt-1">{error.menuDisplayFormat[0]}</p>}
      </div>
      <div>
        <Label>מסגרת</Label>
        <div className="flex gap-2 mt-1 items-center flex-wrap">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadFrame(f);
              }}
            />
            <span
              className={`inline-flex items-center justify-center h-10 px-4 text-sm font-medium hover:opacity-80 ${uploading ? "opacity-50" : ""}`}
              style={{ color: "#37C27D" }}
            >
              {uploading ? "מעלה..." : "העלה"}
            </span>
          </label>
          <div className="flex gap-1 flex-wrap items-center">
            <button
              type="button"
              disabled={savingFrame}
              onClick={() => handleFrameSelect(NO_FRAME)}
              className={`px-2 py-1 text-xs rounded border-2 shrink-0 transition-opacity hover:opacity-90 disabled:opacity-50 ${
                !frameUrl ? "border-[#37C27D]" : "border-white/20"
              }`}
            >
              ללא
            </button>
            {[...DEFAULT_FRAMES, ...frameVariants].map((url) => (
              <button
                key={url}
                type="button"
                disabled={savingFrame}
                onClick={() => handleFrameSelect(url)}
                className={`w-6 h-6 rounded overflow-hidden border-2 shrink-0 transition-opacity hover:opacity-90 disabled:opacity-50 ${
                  frameUrl === url ? "border-[#37C27D]" : "border-white/20"
                }`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        {error.frame && <p className="text-sm text-destructive mt-1">{error.frame[0]}</p>}
      </div>
      <div>
        <Label>באנר</Label>
        <Input
          type="url"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full min-w-0"
        />
        {error.bannerUrl && <p className="text-sm text-destructive mt-1">{error.bannerUrl[0]}</p>}
      </div>
      <div>
        <Label>רקע תפריט</Label>
        <Input
          type="url"
          value={backgroundUrl}
          onChange={(e) => setBackgroundUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full min-w-0"
        />
        {error.backgroundUrl && <p className="text-sm text-destructive mt-1">{error.backgroundUrl[0]}</p>}
      </div>
      <div>
        <Label>רקע תפריט עגלה</Label>
        <Input
          type="url"
          value={cartBackgroundUrl}
          onChange={(e) => setCartBackgroundUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full min-w-0"
        />
      </div>
      <div className="flex gap-3 items-center flex-wrap">
        <Button
          ref={updateButtonRef}
          type="submit"
          disabled={saving}
          className="text-white hover:text-white active:text-white hover:opacity-90 transition-transform transition-shadow"
          style={{ backgroundColor: "#37C27D" }}
        >
          {saving ? "שומר..." : initialData?.id ? "שמור" : "צור מסעדה"}
        </Button>
        {initialData?.id && (
          <Button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="bg-red-600 text-white hover:bg-red-500 hover:text-white active:text-white active:bg-red-700 border-0"
          >
            ביטול
          </Button>
        )}
      </div>
    </form>
  );
}
