"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RestaurantForm, type RestaurantPreviewSnapshot } from "./RestaurantForm";
import { RestaurantMenu } from "@/components/restaurant/RestaurantMenu";
import { MenuSection } from "./MenuSection";
import { TextSettingsSection } from "./TextSettingsSection";
import { useUnsavedChanges } from "@/lib/UnsavedChangesContext";

interface MenuProps {
  restaurant: {
    id: number;
    name: string;
    slug: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    backgroundUrl: string | null;
    frameUrl: string | null;
    primaryColor: string;
    categoryTextColor?: string | null;
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
    menuDisplayFormat?: string;
    textSize?: number | null;
    fontFamily?: string | null;
  };
  categories: Array<{
    id: number;
    name: string;
    dishes: Array<{
      id: number;
      title: string;
      imageUrl: string | null;
      description: string | null;
      allergens: string | null;
      priceCents: number;
      paramCategories?: Array<{
        id: number;
        name: string;
        sortOrder: number;
        minSelections: number;
        maxSelections: number;
        parameters: Array<{ id: number; name: string; sortOrder: number; priceCents: number }>;
      }>;
    }>;
  }>;
}

interface RestaurantEditWithPreviewProps {
  menuProps: MenuProps;
  onMenuDisplayFormatChange?: (format: "large" | "compact") => void;
  formInitialData: {
    id: number;
    name: string;
    slug: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    city: string;
    primaryColor: string;
    categoryTextColor?: string | null;
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

export function RestaurantEditWithPreview({
  menuProps,
  formInitialData,
  onMenuDisplayFormatChange,
}: RestaurantEditWithPreviewProps) {
  const router = useRouter();
  const { setHasUnsavedChanges, registerPulseCallback } = useUnsavedChanges();
  const pulseTriggerRef = useRef<() => void>(() => {});

  const [liveFormData, setLiveFormData] = useState<RestaurantPreviewSnapshot | null>(null);
  const [previewFrameUrl, setPreviewFrameUrl] = useState<string | null>(null);
  const [previewMenuFormat, setPreviewMenuFormat] = useState<"large" | "small" | "compact" | "imageRight">(
    (menuProps.restaurant.menuDisplayFormat as "large" | "small" | "compact" | "imageRight") ?? "large"
  );
  const [previewTextSize, setPreviewTextSize] = useState<number | null>(null);
  const [previewFontFamily, setPreviewFontFamily] = useState<string | null | undefined>(undefined);
  const [isAdminPreview, setIsAdminPreview] = useState(true);
  const [clientOrderLink, setClientOrderLink] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);

  useEffect(() => {
    registerPulseCallback(() => pulseTriggerRef.current?.());
    return () => {
      registerPulseCallback(null);
      setHasUnsavedChanges(false);
    };
  }, [registerPulseCallback, setHasUnsavedChanges]);

  const handleFrameChange = useCallback((url: string) => setPreviewFrameUrl(url), []);
  const handleMenuFormatChange = useCallback((format: "large" | "small" | "compact" | "imageRight") => {
    setPreviewMenuFormat(format);
    onMenuDisplayFormatChange?.(format);
  }, [onMenuDisplayFormatChange]);
  const handleFormChange = useCallback((data: RestaurantPreviewSnapshot) => setLiveFormData(data), []);

  const handleCreateClientLink = useCallback(async () => {
    const slug = menuProps.restaurant.slug;
    setCreatingLink(true);
    setClientOrderLink(null);
    try {
      const res = await fetch(`/api/r/${slug}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setClientOrderLink(null);
        setCreatingLink(false);
        return;
      }
      const url = typeof window !== "undefined"
        ? `${window.location.origin}/r/${slug}/order/${data.token}`
        : "";
      setClientOrderLink(url);
      if (url) window.open(url, "_blank");
    } finally {
      setCreatingLink(false);
    }
  }, [menuProps.restaurant.slug]);

  const baseRestaurant = {
    ...menuProps.restaurant,
    categoryTextColor: menuProps.restaurant.categoryTextColor ?? null,
    cartColor: menuProps.restaurant.cartColor ?? menuProps.restaurant.primaryColor,
    cartTextColor: menuProps.restaurant.cartTextColor ?? "#ffffff",
    cartBackgroundUrl: menuProps.restaurant.cartBackgroundUrl ?? null,
    cartBarOverlayOpacity: menuProps.restaurant.cartBarOverlayOpacity ?? null,
    cartBarControlsOpacity: menuProps.restaurant.cartBarControlsOpacity ?? null,
    expansionBackdropOpacity: menuProps.restaurant.expansionBackdropOpacity ?? null,
    bottomNavColor: menuProps.restaurant.bottomNavColor ?? null,
    bottomNavIconColor: menuProps.restaurant.bottomNavIconColor ?? null,
    frameUrl: previewFrameUrl !== null ? previewFrameUrl : (menuProps.restaurant.frameUrl ?? ""),
    menuDisplayFormat: previewMenuFormat,
    textSize: previewTextSize ?? menuProps.restaurant.textSize ?? 16,
    fontFamily: previewFontFamily !== undefined ? previewFontFamily : (menuProps.restaurant.fontFamily ?? null),
  };
  const previewRestaurant = liveFormData
    ? { ...baseRestaurant, ...liveFormData }
    : baseRestaurant;

  return (
    <div className="flex gap-8 flex-col lg:flex-row">
      <div className="flex-1 min-w-0">
        <RestaurantForm
          initialData={formInitialData}
          onFrameChange={handleFrameChange}
          onMenuDisplayFormatChange={handleMenuFormatChange}
          onFormChange={handleFormChange}
          setHasUnsavedChanges={setHasUnsavedChanges}
          registerPulseTrigger={(fn) => { pulseTriggerRef.current = fn; }}
        />
        <div className="mt-12">
          <MenuSection restaurantId={menuProps.restaurant.id} categories={menuProps.categories} />
        </div>
      </div>
      <div className="w-full max-w-[420px] lg:w-[420px] shrink-0 sticky top-6 flex flex-col items-center lg:mr-12">
        <div className="flex flex-col gap-3 mb-4 w-full">
          <h2 className="text-lg font-semibold text-white text-center">תצוגה מקדימה</h2>
          <div className="flex flex-col gap-2">
            <div className="flex rounded-xl overflow-hidden border border-white/20 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setIsAdminPreview(true)}
                className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${isAdminPreview ? "bg-emerald-600 text-white shadow" : "text-white/70 hover:bg-white/10"}`}
              >
                מצב מנהל
              </button>
              <button
                type="button"
                onClick={() => setIsAdminPreview(false)}
                className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${!isAdminPreview ? "bg-sky-600 text-white shadow" : "text-white/70 hover:bg-white/10"}`}
              >
                מצב לקוח
              </button>
            </div>
            <button
              type="button"
              onClick={handleCreateClientLink}
              disabled={creatingLink}
              className="w-full py-2.5 px-4 rounded-xl border border-sky-500/50 bg-sky-500/20 text-sky-300 text-sm font-medium hover:bg-sky-500/30 disabled:opacity-50 transition-colors"
            >
              {creatingLink ? "יוצר לינק..." : "צור לינק לקוח"}
            </button>
            {clientOrderLink && (
              <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm">
                <p className="text-white/70 mb-1">לינק נפתח בחלון חדש. יופיע גם ב״טרמינלים פעילים״.</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={clientOrderLink}
                    className="flex-1 min-w-0 rounded bg-black/30 px-2 py-1.5 text-white/90 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(clientOrderLink)}
                    className="shrink-0 py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 text-white text-xs"
                  >
                    העתק
                  </button>
                  <a
                    href={clientOrderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 py-1.5 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs"
                  >
                    פתח שוב
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        <RestaurantMenu
          restaurant={previewRestaurant}
          categories={menuProps.categories}
          forcePreview
          isAdminPreview={isAdminPreview}
          otherDishesForCopy={menuProps.categories.flatMap((c) => c.dishes.map((d) => ({ id: d.id, title: d.title })))}
          onParamsUpdated={() => router.refresh()}
        />
        <TextSettingsSection
          restaurantId={menuProps.restaurant.id}
          textSize={previewRestaurant.textSize ?? 16}
          fontFamily={previewRestaurant.fontFamily ?? null}
          onTextSizeChange={setPreviewTextSize}
          onFontFamilyChange={setPreviewFontFamily}
        />
      </div>
    </div>
  );
}
