import { z } from "zod";

export const restaurantSchema = z.object({
  name: z.string().min(1, "שם חובה"),
  slug: z.string().min(1, "שם בדף חובה").regex(/^[a-z0-9-]+$/, "רק אותיות אנגלית קטנות, מספרים ומקף"),
  ownerName: z.string().min(1, "שם בעלים חובה"),
  ownerEmail: z.string().email("אימייל לא תקין"),
  ownerPhone: z.string().min(1, "טלפון חובה"),
  city: z.string().min(1, "עיר חובה"),
  primaryColor: z.string().nullish().transform((v) => v ?? "#c2410c"),
  categoryTextColor: z.string().nullish(),
  secondaryColor: z.string().nullish(),
  textColor: z.string().nullish(),
  descriptionColor: z.string().nullish(),
  priceColor: z.string().nullish(),
  cartColor: z.string().nullish(),
  cartTextColor: z.string().nullish(),
  cartBackgroundUrl: z.string().nullish().transform((v) => (v === "" ? null : v)),
  cartBarOverlayOpacity: z.coerce.number().min(0).max(100).optional(),
  cartBarControlsOpacity: z.coerce.number().min(0).max(100).optional(),
  bottomNavColor: z.string().nullish(),
  bottomNavIconColor: z.string().nullish(),
  isActive: z.boolean().default(true),
  logoUrl: z.string().nullish(),
  bannerUrl: z.string().nullish(),
  backgroundUrl: z.string().nullish(),
  frameUrl: z.string().nullish(),
  frameVariants: z.string().nullish(),
  menuDisplayFormat: z.enum(["large", "small", "compact", "imageRight"]).default("large"),
  textSize: z.number().int().min(10).max(32).optional(),
  fontFamily: z.string().nullish(),
});

export type RestaurantInput = z.infer<typeof restaurantSchema>;
