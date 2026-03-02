"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

const FONT_OPTIONS = [
  { value: "", label: "ברירת מחדל" },
  { value: "Heebo", label: "Heebo" },
  { value: "Assistant", label: "Assistant" },
  { value: "Rubik", label: "Rubik" },
  { value: "David Libre", label: "David Libre" },
  { value: "Arial", label: "Arial" },
] as const;

const TEXT_SIZE_STEPS = [12, 14, 16, 18, 20, 22, 24];

interface TextSettingsSectionProps {
  restaurantId: number;
  textSize: number;
  fontFamily: string | null;
  onTextSizeChange: (v: number) => void;
  onFontFamilyChange: (v: string | null) => void;
}

export function TextSettingsSection({
  restaurantId,
  textSize,
  fontFamily,
  onTextSizeChange,
  onFontFamilyChange,
}: TextSettingsSectionProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function saveTextSettings(payload: { textSize?: number; fontFamily?: string | null }) {
    if (!restaurantId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) router.refresh();
      setSaving(false);
    } catch {
      setSaving(false);
    }
  }

  function handleTextSizeChange(value: number) {
    onTextSizeChange(value);
    saveTextSettings({ textSize: value });
  }

  function handleFontChange(value: string) {
    const v = value || null;
    onFontFamilyChange(v);
    saveTextSettings({ fontFamily: v });
  }

  const sizeIndex = TEXT_SIZE_STEPS.indexOf(textSize);
  const clampedSize = sizeIndex >= 0 ? textSize : 16;

  return (
    <div className="mt-6 p-4 rounded-lg bg-[#1A1D21] border border-white/5">
      <h3 className="text-sm font-semibold mb-4 text-white">שינוי טקסט</h3>
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-white/70 block mb-2">גודל טקסט: {clampedSize}px</Label>
          <div className="flex gap-1 items-center">
            <input
              type="range"
              min={0}
              max={TEXT_SIZE_STEPS.length - 1}
              step={1}
              value={sizeIndex >= 0 ? sizeIndex : 3}
              onChange={(e) => handleTextSizeChange(TEXT_SIZE_STEPS[Number(e.target.value)] ?? 16)}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#37C27D]"
            />
            <span className="text-xs text-white/50 w-8 text-left">{clampedSize}</span>
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-white/40">
            <span>12</span>
            <span>24</span>
          </div>
        </div>
        <div>
          <Label className="text-xs text-white block mb-2">פונט</Label>
          <select
            value={fontFamily ?? ""}
            onChange={(e) => handleFontChange(e.target.value)}
            disabled={saving}
            className="w-full h-9 px-3 rounded-md bg-[#0d2137] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#37C27D]/50 [&_option]:bg-white [&_option]:text-[#0d2137]"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value || "default"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {saving && <p className="text-xs text-white/50">שומר...</p>}
      </div>
    </div>
  );
}
