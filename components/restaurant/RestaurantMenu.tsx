"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const PHONE_WIDTH = 420;

function formatPrice(cents: number): string {
  const n = cents / 100;
  return n % 1 === 0 ? n.toString() : parseFloat(n.toFixed(2)).toString();
}

interface Dish {
  id: number;
  title: string;
  imageUrl: string | null;
  description: string | null;
  allergens: string | null;
  priceCents: number;
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
  secondaryColor?: string | null;
  textColor?: string | null;
  descriptionColor?: string | null;
  priceColor?: string | null;
}

interface RestaurantMenuProps {
  restaurant: Restaurant;
  categories: Category[];
  /** תצוגה מקדימה – תמיד מסגרת טלפון גם במסך רחב */
  forcePreview?: boolean;
}

export function RestaurantMenu({ restaurant, categories, forcePreview }: RestaurantMenuProps) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isJumpingRef = useRef(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (forcePreview) return;
    const check = () => setIsNarrow(window.innerWidth < 500);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [forcePreview]);

  const showPhoneFrame = forcePreview || !isNarrow;

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const catEl = el.querySelector(`[data-cat="${activeCat}"]`);
    if (catEl) catEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeCat]);

  // רולטה אינסופית – התחלה במרכז, קפיצה חלקה כשמגיעים לקצה
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
    const { scrollLeft } = el;
    const threshold = Math.min(80, setWidth * 0.15);
    if (scrollLeft < threshold) {
      isJumpingRef.current = true;
      el.scrollTo({ left: scrollLeft + setWidth, behavior: "auto" });
      setTimeout(() => { isJumpingRef.current = false; }, 150);
    } else if (scrollLeft > setWidth * 2 - threshold) {
      isJumpingRef.current = true;
      el.scrollTo({ left: scrollLeft - setWidth, behavior: "auto" });
      setTimeout(() => { isJumpingRef.current = false; }, 150);
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
  const secondaryColor = restaurant.secondaryColor || "#fbbf24";
  const textColor = restaurant.textColor || "#fef3c7";
  const descriptionColor = restaurant.descriptionColor || "#fde68a";
  const priceColor = restaurant.priceColor || "#fffbeb";
  const hasBg = !!restaurant.backgroundUrl;
  const menuBgStyle = hasBg && showPhoneFrame
    ? {
        backgroundImage: `url(${restaurant.backgroundUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
        backgroundColor: "#1c1917",
      }
    : !hasBg
      ? { backgroundColor: "#1c1917" as const }
      : undefined;

  const content = (
    <div className="min-h-screen relative flex flex-col" dir="rtl" style={{ backgroundColor: "#1c1917" }}>
      {hasBg && isNarrow && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={restaurant.backgroundUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center min-w-full min-h-full"
            style={{ width: "100%", height: "100%" }}
            loading="eager"
          />
          <div className="absolute inset-0 bg-[#1c1917]/25" aria-hidden />
        </div>
      )}
      <div className={hasBg && isNarrow ? "relative z-10" : ""}>
        <div
          className="relative w-full overflow-hidden shrink-0 h-52 min-h-[208px]"
          style={{ backgroundColor: primaryColor }}
        >
          {restaurant.bannerUrl ? (
            <img
              src={restaurant.bannerUrl}
              alt={restaurant.name}
              className="absolute inset-0 w-full h-full object-cover"
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
          className="flex-1 min-h-0 flex flex-col relative"
          style={menuBgStyle}
        >
          <div className="absolute top-4 right-0 left-0 z-10 overflow-hidden px-2">
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
                  className="shrink-0 px-5 py-2.5 rounded-full text-base font-bold transition-colors shadow-lg whitespace-nowrap"
                  style={{
                    backgroundColor: activeCat === cat.id ? primaryColor : "rgba(0,0,0,0.5)",
                    color: "white",
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
                <h2 className="text-lg font-bold mb-4 px-1" style={{ color: secondaryColor }}>{cat.name}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {(cat.dishes ?? []).map((d) => (
                    <div key={d.id} className="flex flex-col items-center">
                      <div className="w-full aspect-square relative overflow-visible bg-[#2d2926]">
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
                      <div className="w-full pt-2 text-center space-y-0.5">
                        <h3 className="font-semibold text-sm leading-tight" style={{ color: textColor }}>{d.title}</h3>
                        <p className="font-bold text-base -mt-1" style={{ color: priceColor }}>₪{formatPrice(d.priceCents)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!showPhoneFrame) return <div className="min-h-screen">{content}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-stone-900">
      <div
        className="rounded-[2.5rem] bg-black p-2 shadow-2xl ring-1 ring-stone-700"
        style={{ width: PHONE_WIDTH, maxWidth: "100%" }}
      >
        <div className="rounded-[2rem] overflow-hidden bg-black">
          <div className="h-6 bg-black flex justify-center">
            <div className="w-24 h-4 bg-stone-900 rounded-full" />
          </div>
          <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: "min(90vh, 700px)" }}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
