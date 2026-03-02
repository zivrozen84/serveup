import { z } from "zod";

export const restaurantSchema = z.object({
  name: z.string().min(1, "שם חובה"),
  slug: z.string().min(1, "שם בדף חובה").regex(/^[a-z0-9-]+$/, "רק אותיות אנגלית קטנות, מספרים ומקף"),
  ownerName: z.string().min(1, "שם בעלים חובה"),
  ownerEmail: z.string().email("אימייל לא תקין"),
  ownerPhone: z.string().min(1, "טלפון חובה"),
  city: z.string().min(1, "עיר חובה"),
  primaryColor: z.string().default("#c2410c"),
  isActive: z.boolean().default(true),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  backgroundUrl: z.string().optional(),
});

export type RestaurantInput = z.infer<typeof restaurantSchema>;
