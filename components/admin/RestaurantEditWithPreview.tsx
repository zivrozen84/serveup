"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RestaurantForm } from "./RestaurantForm";
import { RestaurantMenu } from "@/components/restaurant/RestaurantMenu";
import { MenuSection } from "./MenuSection";
import { TextSettingsSection } from "./TextSettingsSection";

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
    secondaryColor?: string | null;
    textColor?: string | null;
    descriptionColor?: string | null;
    priceColor?: string | null;
    cartColor?: string | null;
    cartTextColor?: string | null;
    cartBackgroundUrl?: string | null;
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
    secondaryColor?: string | null;
    textColor?: string | null;
    descriptionColor?: string | null;
    priceColor?: string | null;
    cartColor?: string | null;
    cartTextColor?: string | null;
    cartBackgroundUrl?: string | null;
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
  const [previewFrameUrl, setPreviewFrameUrl] = useState<string | null>(null);
  const [previewMenuFormat, setPreviewMenuFormat] = useState<"large" | "small" | "compact" | "imageRight">(
    (menuProps.restaurant.menuDisplayFormat as "large" | "small" | "compact" | "imageRight") ?? "large"
  );
  const [previewTextSize, setPreviewTextSize] = useState<number | null>(null);
  const [previewFontFamily, setPreviewFontFamily] = useState<string | null | undefined>(undefined);
  const [isAdminPreview, setIsAdminPreview] = useState(true);
  const handleFrameChange = useCallback((url: string) => setPreviewFrameUrl(url), []);
  const handleMenuFormatChange = useCallback((format: "large" | "small" | "compact" | "imageRight") => {
    setPreviewMenuFormat(format);
    onMenuDisplayFormatChange?.(format);
  }, [onMenuDisplayFormatChange]);

  const previewRestaurant = {
    ...menuProps.restaurant,
    cartColor: menuProps.restaurant.cartColor ?? menuProps.restaurant.primaryColor,
    cartTextColor: menuProps.restaurant.cartTextColor ?? "#ffffff",
    cartBackgroundUrl: menuProps.restaurant.cartBackgroundUrl ?? null,
    bottomNavColor: menuProps.restaurant.bottomNavColor ?? null,
    bottomNavIconColor: menuProps.restaurant.bottomNavIconColor ?? null,
    frameUrl: previewFrameUrl !== null ? previewFrameUrl : (menuProps.restaurant.frameUrl ?? ""),
    menuDisplayFormat: previewMenuFormat,
    textSize: previewTextSize ?? menuProps.restaurant.textSize ?? 16,
    fontFamily: previewFontFamily !== undefined ? previewFontFamily : (menuProps.restaurant.fontFamily ?? null),
  };

  return (
    <div className="flex gap-8 flex-col lg:flex-row">
      <div className="flex-1 min-w-0">
        <RestaurantForm
          initialData={formInitialData}
          onFrameChange={handleFrameChange}
          onMenuDisplayFormatChange={handleMenuFormatChange}
        />
        <div className="mt-12">
          <MenuSection restaurantId={menuProps.restaurant.id} categories={menuProps.categories} />
        </div>
      </div>
      <div className="w-full max-w-[420px] lg:w-[420px] shrink-0 sticky top-6 flex flex-col items-center">
        <div className="flex flex-col gap-3 mb-4 w-full">
          <h2 className="text-lg font-semibold text-white">תצוגה מקדימה (Preview)</h2>
          <div className="flex rounded-xl overflow-hidden border border-white/20 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setIsAdminPreview(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${isAdminPreview ? "bg-emerald-600 text-white shadow" : "text-white/70 hover:bg-white/10"}`}
            >
              מצב מנהל
            </button>
            <button
              type="button"
              onClick={() => setIsAdminPreview(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${!isAdminPreview ? "bg-sky-600 text-white shadow" : "text-white/70 hover:bg-white/10"}`}
            >
              מצב לקוח
            </button>
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
