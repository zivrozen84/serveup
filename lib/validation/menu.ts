import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "שם קטגוריה חובה"),
  sortOrder: z.number().int().min(0),
});

export const dishSchema = z.object({
  title: z.string().min(1, "שם מנה חובה"),
  description: z.string().nullish(),
  allergens: z.string().nullish(),
  priceCents: z.number().int().min(0, "מחיר לא תקין"),
  sortOrder: z.number().int().min(0),
  imageUrl: z.string().nullish(),
});

export const tableSchema = z.object({
  tableNumber: z.number().int().positive("מספר שולחן חובה"),
  description: z.string().optional(),
});
