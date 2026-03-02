import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const GRAPH_API = "https://graph.facebook.com/v21.0";

/** נרמול מספר טלפון להשוואה: רק ספרות, עם 972 אם מתחיל ב-0 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (!digits.startsWith("972")) return "972" + digits;
  return digits;
}

/** שליחת הודעת טקסט ל־WhatsApp */
async function sendWhatsAppText(
  phoneNumberId: string,
  to: string,
  text: string
): Promise<boolean> {
  if (!WHATSAPP_ACCESS_TOKEN) return false;
  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: text },
    }),
  });
  return res.ok;
}

/** תפריט פקודות לבעל המסעדה */
function getMenuText(restaurantName: string): string {
  return [
    `שלום! 👋 זה הבוט של ${restaurantName}.`,
    "",
    "📋 *תפריט פקודות:*",
    "• *היי* / *תפריט* / *עזרה* – הצגת התפריט הזה",
    "• *צבע ראשי #hex* – עדכון צבע ראשי (למשל #c2410c)",
    "• *צבע כותרות #hex* – צבע כותרות קטגוריות",
    "• *קטגוריות* – רשימת קטגוריות",
    "• *לינק תפריט* – קישור לתפריט הציבורי",
    "• *סטטוס* – פרטי המסעדה",
    "",
    "רוב העדכונים (מנות, תמונות, מפה) נעשים מהפאנל במחשב.",
  ].join("\n");
}

/** GET – אימות Webhook על ידי Meta */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !challenge) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  if (token !== WHATSAPP_VERIFY_TOKEN) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/** POST – קבלת הודעות מ־Meta */
export async function POST(request: Request) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    return NextResponse.json({ error: "WhatsApp לא מוגדר" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const entry = (body as { entry?: unknown[] }).entry?.[0];
  const changes = (entry as { changes?: unknown[] })?.changes?.[0];
  const value = (changes as { value?: Record<string, unknown> })?.value;
  if (!value) {
    return NextResponse.json({ ok: true });
  }

  const metadata = value.metadata as { phone_number_id?: string } | undefined;
  const phoneNumberId = metadata?.phone_number_id;
  const messages = value.messages as Array<{ from: string; type?: string; text?: { body?: string } }> | undefined;
  const message = messages?.[0];

  if (!phoneNumberId || !message) {
    return NextResponse.json({ ok: true });
  }

  const from = String(message.from);
  const text = message.type === "text" ? message.text?.body?.trim() ?? "" : "";

  const restaurant = await prisma.restaurant.findFirst({
    where: { whatsappPhoneNumberId: phoneNumberId },
  });

  if (!restaurant) {
    await sendWhatsAppText(
      phoneNumberId,
      from,
      "מסעדה לא מקושרת למספר הזה. פנה למנהל המערכת."
    );
    return NextResponse.json({ ok: true });
  }

  const ownerNormalized = normalizePhone(restaurant.ownerPhone);
  const fromNormalized = normalizePhone(from);
  if (ownerNormalized !== fromNormalized) {
    await sendWhatsAppText(
      phoneNumberId,
      from,
      "אין הרשאה לעדכן מסעדה זו. רק בעל המסעדה (הטלפון הרשום) יכול להשתמש בבוט."
    );
    return NextResponse.json({ ok: true });
  }

  const lower = text.toLowerCase();
  let reply = "";

  if (!text || lower === "היי" || lower === "שלום" || lower === "התחל" || lower === "תפריט" || lower === "עזרה" || lower === "?") {
    reply = getMenuText(restaurant.name);
  } else if (lower === "סטטוס" || lower === "פרטים") {
    reply = [
      `🏪 *${restaurant.name}*`,
      `עיר: ${restaurant.city}`,
      `טלפון רשום: ${restaurant.ownerPhone}`,
      restaurant.isActive ? "סטטוס: פעיל ✅" : "סטטוס: לא פעיל",
    ].join("\n");
  } else if (lower === "לינק תפריט" || lower === "קישור") {
    const base = process.env.NEXTAUTH_URL ?? "https://yoursite.com";
    reply = `🔗 תפריט ציבורי:\n${base}/r/${restaurant.slug}`;
  } else if (lower.startsWith("צבע ראשי ")) {
    const hex = text.slice(9).trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { primaryColor: hex },
      });
      reply = `צבע ראשי עודכן ל־${hex} ✅`;
    } else {
      reply = "נא לשלוח צבע בפורמט #XXXXXX (למשל #c2410c)";
    }
  } else if (lower.startsWith("צבע כותרות ")) {
    const hex = text.slice(12).trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { secondaryColor: hex },
      });
      reply = `צבע כותרות עודכן ל־${hex} ✅`;
    } else {
      reply = "נא לשלוח צבע בפורמט #XXXXXX";
    }
  } else if (lower === "קטגוריות" || lower === "רשימת קטגוריות") {
    const categories = await prisma.category.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { sortOrder: "asc" },
    });
    reply = categories.length
      ? "📂 קטגוריות:\n" + categories.map((c) => `• ${c.name}`).join("\n")
      : "אין עדיין קטגוריות. הוסף מהפאנל.";
  } else {
    reply = "לא הבנתי 😅 כתוב *תפריט* לרשימת פקודות.";
  }

  if (reply) {
    await sendWhatsAppText(phoneNumberId, from, reply);
  }

  return NextResponse.json({ ok: true });
}
