"use client";

import { useState, useCallback } from "react";
import { RestaurantForm } from "./RestaurantForm";
import { RestaurantMenu } from "@/components/restaurant/RestaurantMenu";
import { MenuSection } from "./MenuSection";
import { TablesSection } from "./TablesSection";

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
    }>;
  }>;
}

interface RestaurantEditWithPreviewProps {
  menuProps: MenuProps;
  formInitialData: {
    id: number;
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
    frameUrl?: string | null;
    frameVariants?: string | null;
  };
  tables: Array<{ id: number; tableNumber: number; description: string | null }>;
}

export function RestaurantEditWithPreview({
  menuProps,
  formInitialData,
  tables,
}: RestaurantEditWithPreviewProps) {
  const [previewFrameUrl, setPreviewFrameUrl] = useState<string | null>(null);
  const handleFrameChange = useCallback((url: string) => setPreviewFrameUrl(url), []);

  const previewRestaurant = {
    ...menuProps.restaurant,
    frameUrl: previewFrameUrl !== null ? previewFrameUrl : (menuProps.restaurant.frameUrl ?? ""),
  };

  return (
    <div className="flex gap-8 flex-col lg:flex-row">
      <div className="flex-1 min-w-0">
        <RestaurantForm
          initialData={formInitialData}
          onFrameChange={handleFrameChange}
        />
        <div className="mt-12">
          <TablesSection restaurantId={menuProps.restaurant.id} tables={tables} />
        </div>
        <div className="mt-12">
          <MenuSection restaurantId={menuProps.restaurant.id} categories={menuProps.categories} />
        </div>
      </div>
      <div className="lg:w-[440px] shrink-0 sticky top-6">
        <h2 className="text-lg font-semibold mb-4 text-white">תצוגה מקדימה (Preview)</h2>
        <RestaurantMenu
          restaurant={previewRestaurant}
          categories={menuProps.categories}
          forcePreview
        />
      </div>
    </div>
  );
}
