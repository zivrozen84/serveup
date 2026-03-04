"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DishExpansionModal, type DishForExpansion } from "./DishExpansionModal";
import { BottomNavBar } from "./BottomNavBar";

const PHONE_WIDTH = 420;

function formatPrice(cents: number): string {
  const n = cents / 100;
  return n % 1 === 0 ? n.toString() : parseFloat(n.toFixed(2)).toString();
}

interface ParamCategory {
  id: number;
  name: string;
  sortOrder: number;
  minSelections: number;
  maxSelections: number;
  parameters: Array<{ id: number; name: string; sortOrder: number; priceCents: number }>;
}

interface Dish {
  id: number;
  title: string;
  imageUrl: string | null;
  description: string | null;
  allergens: string | null;
  priceCents: number;
  paramCategories?: ParamCategory[];
}

interface Category {
  id: number;
  name: string;
  dishes: Dish[];
}

interface Restaurant {
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
  menuDisplayFormat?: "large" | "small" | "compact" | "imageRight";
  textSize?: number | null;
  fontFamily?: string | null;
}

interface RestaurantMenuProps {
  restaurant: Restaurant;
  categories: Category[];
  /** תצוגה מקדימה – תמיד מסגרת טלפון גם במסך רחב */
  forcePreview?: boolean;
  /** תצוגת לקוח (צפה בתפריט) – אותה תצוגה במסגרת אייפון, עם הרחבת מנה */
  phoneLayout?: boolean;
  /** בתצוגה מקדימה: true = מנהל (כפתורי הוספת פרמטר/קטגוריה), false = לקוח */
  isAdminPreview?: boolean;
  /** מנות באותה מסעדה – להצגה ב"העתק פרמטרים ממנה" (מנהל) */
  otherDishesForCopy?: Array<{ id: number; title: string }>;
  /** רענון אחרי שינוי פרמטרים (מנהל) */
  onParamsUpdated?: () => void;
}

export function RestaurantMenu({ restaurant, categories, forcePreview, phoneLayout = false, isAdminPreview = false, otherDishesForCopy, onParamsUpdated }: RestaurantMenuProps) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? null);
  const [expansionDish, setExpansionDish] = useState<DishForExpansion | null>(null);
  const [pressedDishId, setPressedDishId] = useState<number | null>(null);
  const [copiedParamSourceDishId, setCopiedParamSourceDishId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isJumpingRef = useRef(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (forcePreview || phoneLayout) return;
    const check = () => setIsNarrow(window.innerWidth < 500);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [forcePreview, phoneLayout]);

  const showPhoneFrame = forcePreview || phoneLayout || !isNarrow;
  const canExpandDish = forcePreview || phoneLayout;

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const catEl = el.querySelector(`[data-cat="${activeCat}"]`);
    if (catEl) catEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeCat]);

  useEffect(() => {
    if (!expansionDish) return;
    const flat = categories.flatMap((c) => c.dishes);
    const found = flat.find((d) => d.id === expansionDish.id);
    if (found && (found.paramCategories?.length !== expansionDish.paramCategories?.length || found.paramCategories?.[0]?.id !== expansionDish.paramCategories?.[0]?.id)) {
      setExpansionDish({ ...found, paramCategories: found.paramCategories ?? [] });
    }
  }, [categories]);

  // רולטה אינסופית – התחלה במרכז, קפיצה כשנכנסים לשליש שמאלי או ימני
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || categories.length === 0) return;
    const setWidth = el.scrollWidth / 3;
    el.scrollTo({ left: setWidth, behavior: "auto" });
  }, [categories]);

  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el || isJumpingRef.current || categories.length === 0) return;
    const setWidth = el.scrollWidth / 3;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const threshold = 60;
    const maxScroll = scrollWidth - clientWidth;

    const inLeftThird = scrollLeft < setWidth * 0.5;
    const inRightThird = scrollLeft > setWidth * 2.5;
    const nearEnd = maxScroll > 0 && scrollLeft >= maxScroll - threshold;

    if (inLeftThird) {
      isJumpingRef.current = true;
      el.scrollLeft = scrollLeft + setWidth;
      requestAnimationFrame(() => { isJumpingRef.current = false; });
    } else if (inRightThird || nearEnd) {
      isJumpingRef.current = true;
      el.scrollLeft = scrollLeft - setWidth;
      requestAnimationFrame(() => { isJumpingRef.current = false; });
    }
  }, [categories.length]);

  const dragRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const didDragRef = useRef(false);

  const handleCarouselPointerDown = useCallback((e: React.PointerEvent) => {
    if (carouselRef.current) {
      dragRef.current = { x: e.clientX, scrollLeft: carouselRef.current.scrollLeft };
      didDragRef.current = false;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }, []);

  const handleCarouselPointerMove = useCallback((e: React.PointerEvent) => {
    const el = carouselRef.current;
    if (!el || !dragRef.current) return;
    const dx = dragRef.current.x - e.clientX;
    if (Math.abs(dx) > 4) didDragRef.current = true;
    el.scrollLeft = dragRef.current.scrollLeft + dx;
    dragRef.current = { x: e.clientX, scrollLeft: el.scrollLeft };
  }, []);

  const handleCarouselPointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
  }, []);

  const handleCategoryClick = useCallback((catId: number) => {
    if (didDragRef.current) return;
    setActiveCat(catId);
  }, []);

  const primaryColor = restaurant.primaryColor || "#c2410c";
  const categoryTextColor = restaurant.categoryTextColor || restaurant.secondaryColor || "#fbbf24";
  const secondaryColor = restaurant.secondaryColor || "#fbbf24";
  const textColor = restaurant.textColor || "#fef3c7";
  const descriptionColor = restaurant.descriptionColor || "#fde68a";
  const priceColor = restaurant.priceColor || "#fffbeb";
  const cartColor = restaurant.cartColor || primaryColor;
  const cartTextColor = restaurant.cartTextColor || "#ffffff";
  const cartBackgroundUrl = restaurant.cartBackgroundUrl || null;
  const cartBarOverlayOpacity = restaurant.cartBarOverlayOpacity ?? 45;
  const cartBarControlsOpacity = restaurant.cartBarControlsOpacity ?? 100;
  const expansionBackdropOpacity = restaurant.expansionBackdropOpacity ?? 70;
  const bottomNavFillColor = restaurant.bottomNavColor || cartColor;
  const bottomNavIconColor = restaurant.bottomNavIconColor || "#ffffff";

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    const t = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(t);
  }, []);
  const hasBg = !!restaurant.backgroundUrl;
  const displayFormat = restaurant.menuDisplayFormat ?? "large";
  const baseFontSize = restaurant.textSize ?? 16;
  const fontFamily = restaurant.fontFamily || "inherit";
  const contentStyle: React.CSSProperties = {
    backgroundColor: hasBg ? "transparent" : "#1c1917",
    ["--menu-base" as string]: `${baseFontSize}px`,
    fontFamily,
  };
  /** רקע סטטי למסך הטלפון – מוצג רק באזור הנראה, לא גולל עם המוצרים */
  const staticBgStyle: React.CSSProperties | null = hasBg
    ? {
        backgroundImage: `url(${restaurant.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : null;

  const menuBgStyle = !hasBg ? { backgroundColor: "#1c1917" as const } : undefined;

  const content = (
    <div className="min-h-screen min-h-[100dvh] relative flex flex-col menu-scalable" dir="rtl" style={contentStyle}>
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className={`relative w-full overflow-hidden shrink-0 ${restaurant.bannerUrl ? "aspect-[1170/500] min-h-[140px]" : "h-52 min-h-[208px]"}`}
          style={{ backgroundColor: primaryColor }}
        >
          {restaurant.bannerUrl ? (
            <img
              src={restaurant.bannerUrl}
              alt={restaurant.name}
              className="absolute inset-0 w-full h-full object-cover object-center block"
              loading="eager"
            />
          ) : restaurant.logoUrl ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="w-20 h-20 rounded-full border-4 border-white/40 object-cover"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <h1 className="text-xl font-bold text-white drop-shadow-lg">{restaurant.name}</h1>
            </div>
          )}
        </div>

        <div
          className="flex-1 min-h-0 flex flex-col relative overflow-visible min-h-[60vh]"
          style={menuBgStyle ?? { background: "transparent" }}
        >
          <div className="absolute top-4 right-0 left-0 z-10 px-2 overflow-visible">
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              onPointerDown={handleCarouselPointerDown}
              onPointerMove={handleCarouselPointerMove}
              onPointerUp={handleCarouselPointerUp}
              onPointerLeave={handleCarouselPointerUp}
              dir="ltr"
              className="flex gap-3 overflow-x-auto scrollbar-hide carousel-smooth pb-2 -mb-2 cursor-grab active:cursor-grabbing"
            >
              {[...categories, ...categories, ...categories].map((cat, idx) => (
                <button
                  key={`${cat.id}-${idx}`}
                  onClick={() => handleCategoryClick(cat.id)}
                  className="shrink-0 px-5 py-2.5 rounded-full menu-text-base font-bold transition-colors shadow-lg whitespace-nowrap"
                  style={{
                    backgroundColor: activeCat === cat.id ? primaryColor : "rgba(0,0,0,0.5)",
                    color: categoryTextColor,
                    border: "1px solid rgba(255,255,255,0.3)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div ref={scrollRef} className="pb-10 px-5 flex-1 pt-16">
            {categories.map((cat) => (
              <section key={cat.id} data-cat={cat.id} className="pt-6">
                <h2
                  className="menu-text-lg font-bold mb-4 px-1 relative z-[1]"
                  style={{
                    color: secondaryColor,
                    textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)",
                  }}
                >
                  {cat.name}
                </h2>
                {displayFormat === "large" ? (
                  <div className="grid grid-cols-2 gap-4">
                    {(cat.dishes ?? []).map((d) => (
                      <div key={d.id} className="flex flex-col items-center">
                        <div
                          role={canExpandDish ? "button" : undefined}
                          tabIndex={canExpandDish ? 0 : undefined}
                          onClick={canExpandDish ? () => setExpansionDish({ ...d, paramCategories: d.paramCategories ?? [] }) : undefined}
                          onPointerDown={canExpandDish ? () => setPressedDishId(d.id) : undefined}
                          onPointerUp={canExpandDish ? () => setPressedDishId(null) : undefined}
                          onPointerLeave={canExpandDish ? () => setPressedDishId(null) : undefined}
                          className={`w-full flex flex-col items-center overflow-hidden rounded-lg relative transition-transform duration-150 select-none ${canExpandDish ? "cursor-pointer active:outline-none" : ""} ${pressedDishId === d.id ? "scale-90" : ""}`}
                        >
                          {canExpandDish && (
                            <div className={`absolute inset-0 rounded-lg bg-black/40 transition-opacity duration-150 pointer-events-none z-10 ${pressedDishId === d.id ? "opacity-100" : "opacity-0"}`} />
                          )}
                          <div className="w-full aspect-square relative overflow-hidden bg-[#2d2926] rounded-t-lg">
                            {d.imageUrl ? (
                              <img
                                src={d.imageUrl}
                                alt={d.title}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: primaryColor + "40" }}
                              >
                                <span className="text-4xl text-white/50">?</span>
                              </div>
                            )}
                            {restaurant.frameUrl && (
                              <div
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                style={{
                                  backgroundImage: `url(${restaurant.frameUrl})`,
                                  backgroundSize: "111% 111%",
                                  backgroundPosition: "center",
                                  backgroundRepeat: "no-repeat",
                                }}
                              />
                            )}
                          </div>
                          <div className="w-full pt-2 text-center space-y-0.5 rounded-b-lg relative z-[1]">
                            <h3 className="font-semibold menu-text-sm leading-tight" style={{ color: textColor }}>{d.title}</h3>
                            <p className="font-bold menu-text-base -mt-1" style={{ color: priceColor }}>₪{formatPrice(d.priceCents)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : displayFormat === "small" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(cat.dishes ?? []).map((d) => (
                      <div key={d.id} className="flex flex-col items-center">
                        <div
                          role={canExpandDish ? "button" : undefined}
                          tabIndex={canExpandDish ? 0 : undefined}
                          onClick={canExpandDish ? () => setExpansionDish({ ...d, paramCategories: d.paramCategories ?? [] }) : undefined}
                          onPointerDown={canExpandDish ? () => setPressedDishId(d.id) : undefined}
                          onPointerUp={canExpandDish ? () => setPressedDishId(null) : undefined}
                          onPointerLeave={canExpandDish ? () => setPressedDishId(null) : undefined}
                          className={`w-full flex flex-col items-center overflow-hidden rounded-lg relative transition-transform duration-150 select-none ${canExpandDish ? "cursor-pointer active:outline-none" : ""} ${pressedDishId === d.id ? "scale-90" : ""}`}
                        >
                          {canExpandDish && (
                            <div className={`absolute inset-0 rounded-lg bg-black/40 transition-opacity duration-150 pointer-events-none z-10 ${pressedDishId === d.id ? "opacity-100" : "opacity-0"}`} />
                          )}
                          <div className="w-full aspect-square relative overflow-hidden bg-[#2d2926] rounded-t-lg">
                            {d.imageUrl ? (
                              <img
                                src={d.imageUrl}
                                alt={d.title}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: primaryColor + "40" }}
                              >
                                <span className="text-2xl text-white/50">?</span>
                              </div>
                            )}
                            {restaurant.frameUrl && (
                              <div
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                style={{
                                  backgroundImage: `url(${restaurant.frameUrl})`,
                                  backgroundSize: "111% 111%",
                                  backgroundPosition: "center",
                                  backgroundRepeat: "no-repeat",
                                }}
                              />
                            )}
                          </div>
                          <div className="w-full pt-1 text-center space-y-0 rounded-b-lg relative z-[1]">
                            <h3 className="font-semibold menu-text-xs leading-tight line-clamp-2" style={{ color: textColor }}>{d.title}</h3>
                            <p className="font-bold menu-text-sm -mt-0.5" style={{ color: priceColor }}>₪{formatPrice(d.priceCents)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : displayFormat === "compact" ? (
                  <div className="flex flex-col">
                    {(cat.dishes ?? []).map((d) => (
                      <div
                        key={d.id}
                        className="py-3 border-b-2 border-white/20 last:border-b-0"
                      >
                        <div
                          role={canExpandDish ? "button" : undefined}
                          tabIndex={canExpandDish ? 0 : undefined}
                          onClick={canExpandDish ? () => setExpansionDish({ ...d, paramCategories: d.paramCategories ?? [] }) : undefined}
                          onPointerDown={canExpandDish ? () => setPressedDishId(d.id) : undefined}
                          onPointerUp={canExpandDish ? () => setPressedDishId(null) : undefined}
                          onPointerLeave={canExpandDish ? () => setPressedDishId(null) : undefined}
                          onKeyDown={canExpandDish ? (e) => e.key === "Enter" && setExpansionDish({ ...d, paramCategories: d.paramCategories ?? [] }) : undefined}
                          className={`flex gap-3 items-start flex-row-reverse rounded-lg overflow-hidden relative transition-transform duration-150 ${canExpandDish ? "cursor-pointer" : ""} ${pressedDishId === d.id ? "scale-[0.97]" : ""}`}
                        >
                          {canExpandDish && (
                            <div className={`absolute inset-0 rounded-lg bg-black/40 transition-opacity duration-150 pointer-events-none z-10 ${pressedDishId === d.id ? "opacity-100" : "opacity-0"}`} />
                          )}
                          <div className="w-20 h-20 shrink-0 aspect-square relative overflow-hidden bg-[#2d2926] rounded-lg">
                            {d.imageUrl ? (
                              <img
                                src={d.imageUrl}
                                alt={d.title}
                                className="absolute inset-0 w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 w-full h-full flex items-center justify-center rounded-lg"
                                style={{ backgroundColor: primaryColor + "40" }}
                              >
                                <span className="text-xl text-white/50">?</span>
                              </div>
                            )}
                            {restaurant.frameUrl && (
                              <div
                                className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
                                style={{
                                  backgroundImage: `url(${restaurant.frameUrl})`,
                                  backgroundSize: "111% 111%",
                                  backgroundPosition: "center",
                                  backgroundRepeat: "no-repeat",
                                }}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 pt-0.5 relative z-[1]">
                            <h3 className="font-semibold menu-text-sm leading-tight" style={{ color: textColor }}>{d.title}</h3>
                            {d.description && (
                              <p className="menu-text-xs leading-snug line-clamp-2" style={{ color: descriptionColor }}>{d.description}</p>
                            )}
                            <p className="font-bold menu-text-sm" style={{ color: priceColor }}>₪{formatPrice(d.priceCents)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {(cat.dishes ?? []).map((d) => (
                      <div
                        key={d.id}
                        className="py-3 border-b-2 border-white/20 last:border-b-0"
                      >
                        <div
                          role={canExpandDish ? "button" : undefined}
                          tabIndex={canExpandDish ? 0 : undefined}
                          onClick={canExpandDish ? () => setExpansionDish({ ...d, paramCategories: d.paramCategories ?? [] }) : undefined}
                          onPointerDown={canExpandDish ? () => setPressedDishId(d.id) : undefined}
                          onPointerUp={canExpandDish ? () => setPressedDishId(null) : undefined}
                          onPointerLeave={canExpandDish ? () => setPressedDishId(null) : undefined}
                          onKeyDown={canExpandDish ? (e) => e.key === "Enter" && setExpansionDish({ ...d, paramCategories: d.paramCategories ?? [] }) : undefined}
                          className={`flex gap-3 items-start flex-row-reverse rounded-lg overflow-hidden relative transition-transform duration-150 ${canExpandDish ? "cursor-pointer" : ""} ${pressedDishId === d.id ? "scale-[0.97]" : ""}`}
                        >
                          {canExpandDish && (
                            <div className={`absolute inset-0 rounded-lg bg-black/40 transition-opacity duration-150 pointer-events-none z-10 ${pressedDishId === d.id ? "opacity-100" : "opacity-0"}`} />
                          )}
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-between min-h-[88px] text-left relative z-[1]">
                            <div>
                              <h3 className="font-semibold menu-text-sm leading-tight" style={{ color: textColor }}>{d.title}</h3>
                              {d.description && (
                                <p className="menu-text-xs leading-snug line-clamp-2 mt-0.5" style={{ color: descriptionColor }}>{d.description}</p>
                              )}
                            </div>
                            <p className="font-bold menu-text-sm mt-1" style={{ color: priceColor }}>₪{formatPrice(d.priceCents)}</p>
                          </div>
                          <div className="w-20 h-20 shrink-0 aspect-square relative overflow-hidden bg-[#2d2926] rounded-lg">
                            {d.imageUrl ? (
                              <img
                                src={d.imageUrl}
                                alt={d.title}
                                className="absolute inset-0 w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 w-full h-full flex items-center justify-center rounded-lg"
                                style={{ backgroundColor: primaryColor + "40" }}
                              >
                                <span className="text-xl text-white/50">?</span>
                              </div>
                            )}
                            {restaurant.frameUrl && (
                              <div
                                className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
                                style={{
                                  backgroundImage: `url(${restaurant.frameUrl})`,
                                  backgroundSize: "111% 111%",
                                  backgroundPosition: "center",
                                  backgroundRepeat: "no-repeat",
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const phoneContainerClass = "relative overflow-hidden bg-black rounded-[2rem]";
  const phoneContainerStyle = { width: PHONE_WIDTH, maxWidth: "100%" };

  return (
    <>
      {toastMessage && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-lg bg-stone-800 text-white text-sm shadow-lg border border-white/20 animate-in fade-in duration-200"
          role="status"
        >
          {toastMessage}
        </div>
      )}
      {!showPhoneFrame ? (
        <div className="min-h-screen flex justify-center bg-stone-900">
          <div style={{ ...phoneContainerStyle, maxHeight: "min(100vh, 100dvh)" }} className="relative overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 relative flex flex-col">
              {staticBgStyle && <div className="absolute inset-0 z-0" style={staticBgStyle} aria-hidden />}
              <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide pb-20">{content}</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pointer-events-none [&>*]:pointer-events-auto">
              <BottomNavBar fillColor={bottomNavFillColor} iconColor={bottomNavIconColor} visible />
            </div>
            {expansionDish && canExpandDish && (
              <DishExpansionModal
                open={!!expansionDish}
                onOpenChange={(open) => !open && setExpansionDish(null)}
                dish={expansionDish}
                primaryColor={primaryColor}
                priceColor={priceColor}
                textColor={textColor}
                descriptionColor={descriptionColor}
                cartColor={cartColor}
                cartTextColor={cartTextColor}
                cartBackgroundUrl={cartBackgroundUrl}
                cartBarOverlayOpacity={cartBarOverlayOpacity}
                cartBarControlsOpacity={cartBarControlsOpacity}
                expansionBackdropOpacity={expansionBackdropOpacity}
                isAdminMode={isAdminPreview}
                embedInPhone
                copiedParamSourceDishId={copiedParamSourceDishId}
                onCopyParams={() => {
                  setCopiedParamSourceDishId(expansionDish.id);
                  showToast("פרמטרים הועתקו");
                }}
                onPasteParams={async () => {
                  if (!copiedParamSourceDishId || copiedParamSourceDishId === expansionDish.id) return;
                  const res = await fetch(`/api/admin/dishes/${expansionDish.id}/copy-parameters`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sourceDishId: copiedParamSourceDishId }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setExpansionDish((prev) => (prev && prev.id === data.id ? { ...prev, paramCategories: data.paramCategories ?? [] } : prev));
                    showToast("פרמטרים הודבקו");
                    onParamsUpdated?.();
                  } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.error || "שגיאה בהדבקת פרמטרים");
                  }
                }}
                canPasteParams={!!copiedParamSourceDishId && copiedParamSourceDishId !== expansionDish.id}
                onParamsUpdated={onParamsUpdated}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-stone-900">
          <div
            className="rounded-[2.5rem] bg-black p-2 shadow-2xl"
            style={phoneContainerStyle}
          >
            <div className={`${phoneContainerClass} flex flex-col relative`} style={{ maxHeight: "min(90vh, 700px)" }}>
              <div className="h-6 bg-black flex justify-center shrink-0">
                <div className="w-24 h-4 bg-stone-900 rounded-full" />
              </div>
              <div className="flex-1 min-h-0 relative flex flex-col">
                {staticBgStyle && <div className="absolute inset-0 z-0" style={staticBgStyle} aria-hidden />}
                <div className="relative z-10 overflow-y-auto scrollbar-hide flex-1 min-h-0 overflow-x-hidden pb-20">
                  {content}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pointer-events-none [&>*]:pointer-events-auto">
                <BottomNavBar fillColor={bottomNavFillColor} iconColor={bottomNavIconColor} visible />
              </div>
              {expansionDish && canExpandDish && (
                <DishExpansionModal
                  open={!!expansionDish}
                  onOpenChange={(open) => !open && setExpansionDish(null)}
                  dish={expansionDish}
                  primaryColor={primaryColor}
                  priceColor={priceColor}
                  textColor={textColor}
                descriptionColor={descriptionColor}
                cartColor={cartColor}
                cartTextColor={cartTextColor}
                cartBackgroundUrl={cartBackgroundUrl}
                cartBarOverlayOpacity={cartBarOverlayOpacity}
                cartBarControlsOpacity={cartBarControlsOpacity}
                expansionBackdropOpacity={expansionBackdropOpacity}
                isAdminMode={isAdminPreview}
                embedInPhone
                copiedParamSourceDishId={copiedParamSourceDishId}
                onCopyParams={() => {
                  setCopiedParamSourceDishId(expansionDish.id);
                  showToast("פרמטרים הועתקו");
                }}
                onPasteParams={async () => {
                  if (!copiedParamSourceDishId || copiedParamSourceDishId === expansionDish.id) return;
                  const res = await fetch(`/api/admin/dishes/${expansionDish.id}/copy-parameters`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sourceDishId: copiedParamSourceDishId }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setExpansionDish((prev) => (prev && prev.id === data.id ? { ...prev, paramCategories: data.paramCategories ?? [] } : prev));
                      showToast("פרמטרים הודבקו");
                      onParamsUpdated?.();
                    } else {
                      const data = await res.json().catch(() => ({}));
                      alert(data.error || "שגיאה בהדבקת פרמטרים");
                    }
                  }}
                  canPasteParams={!!copiedParamSourceDishId && copiedParamSourceDishId !== expansionDish.id}
                  onParamsUpdated={onParamsUpdated}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
