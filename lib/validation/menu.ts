import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "שם קטגוריה חובה"),
  sortOrder: z.number().int().min(0),
});

export const dishSchema = z.object({
  title: z.string().min(1, "שם מנה חובה"),
  description: z.string().nullish(),
  allergens: z.string().nullish(),
  priceCents: z.coerce.number().min(0, "מחיר לא תקין").transform((v) => Math.max(0, Math.round(v))),
  sortOrder: z.number().int().min(0).optional(),
  imageUrl: z.string().nullish(),
});

export const tableSchema = z.object({
  tableNumber: z.number().int().positive("מספר שולחן חובה").optional(),
  description: z.string().optional(),
  label: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  positionX: z.number().min(0).max(100).optional(),
  positionY: z.number().min(0).max(100).optional(),
  shape: z.enum(["circle", "rectangle", "door"]).optional(),
});

export const tableUpdateSchema = z.object({
  label: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  positionX: z.number().min(0).max(100).optional(),
  positionY: z.number().min(0).max(100).optional(),
  shape: z.enum(["circle", "rectangle", "door"]).optional(),
});
