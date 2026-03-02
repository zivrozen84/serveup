"use client";

import { useState, useRef, useEffect } from "react";

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
  primaryColor: string;
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

  const primaryColor = restaurant.primaryColor || "#c2410c";
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
          className={`relative w-full overflow-hidden shrink-0 ${
            forcePreview ? "h-52 min-h-[208px]" : "h-44 min-h-[176px]"
          }`}
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

        {!forcePreview && (
          <div className="sticky top-0 z-10 shrink-0">
            <div className="flex gap-3 overflow-x-auto py-4 px-5 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: activeCat === cat.id ? primaryColor : "rgba(120,53,15,0.7)",
                    color: "white",
                    border: "2px solid rgba(214,211,209,0.35)",
                    boxShadow: "0 0 0 2px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className="flex-1 min-h-0 flex flex-col relative"
          style={menuBgStyle}
        >
          {forcePreview && (
            <div className="absolute top-4 right-0 left-0 z-10 flex justify-center gap-2 px-4 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-lg"
                  style={{
                    backgroundColor: activeCat === cat.id ? primaryColor : "rgba(0,0,0,0.5)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.3)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
          <div ref={scrollRef} className={`pb-10 px-5 flex-1 ${forcePreview ? "pt-16" : "pt-6"}`}>
            {categories.map((cat) => (
              <section key={cat.id} data-cat={cat.id} className="pt-6">
                <h2 className="text-amber-200 text-sm font-semibold mb-4 px-1">{cat.name}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {(cat.dishes ?? []).map((d) => (
                    <div key={d.id} className="flex flex-col items-center">
                      <div className="w-full aspect-square relative overflow-hidden bg-[#2d2926]">
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
                        <div
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          style={{
                            backgroundImage: "url(/images/מסגרת.png)",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                          }}
                        />
                      </div>
                      <div className="w-full pt-2 text-center space-y-0.5">
                        <h3 className="font-semibold text-amber-100 text-sm leading-tight">{d.title}</h3>
                        {d.description && (
                          <p className="text-xs text-amber-200/80 line-clamp-2">{d.description}</p>
                        )}
                        <p className="font-bold text-base text-amber-50 pt-0.5">₪{formatPrice(d.priceCents)}</p>
                        {d.allergens && (
                          <p className="text-[10px] text-amber-300/80 pt-0.5">{d.allergens}</p>
                        )}
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
