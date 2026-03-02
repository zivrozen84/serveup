"use client";

import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Map } from "lucide-react";

interface RestaurantEditChoiceDialogProps {
  restaurantId: number;
  restaurantName: string;
  primaryColor?: string;
  children: React.ReactNode;
}

export function RestaurantEditChoiceDialog({
  restaurantId,
  restaurantName,
  primaryColor = "#37C27D",
  children,
}: RestaurantEditChoiceDialogProps) {
  const router = useRouter();
  const base = `/admin/restaurants/${restaurantId}`;

  function handleEdit() {
    router.push(base);
  }

  function handleMap() {
    router.push(`${base}/map`);
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-xl border border-white/5 bg-[#0e1118] p-6 shadow-xl z-50">
          <Dialog.Title className="text-lg font-semibold mb-2 text-white">
            {restaurantName}
          </Dialog.Title>
          <p className="text-sm text-white/60 mb-6">לאן תרצה להגיע?</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleEdit}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-right"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <Pencil className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">עריכת מסעדה</p>
                <p className="text-xs text-white/60">תפריט, שולחנות, עיצוב, פרטים</p>
              </div>
            </button>
            <button
              onClick={handleMap}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-right"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#4A90E2]"
              >
                <Map className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">מפת מסעדה</p>
                <p className="text-xs text-white/60">מיקום שולחנות, זיהוי ל-NFC</p>
              </div>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
