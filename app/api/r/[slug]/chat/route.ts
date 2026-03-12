import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type DishLike = { title: string; description: string | null; allergens: string | null; priceCents: number };
type CatLike = { name: string; dishes: DishLike[] };
type RestaurantLike = { name: string; categories: CatLike[] };

function buildMenuContext(restaurant: RestaurantLike): string {
  const lines: string[] = [
    `מסעדה: ${restaurant.name}`,
    "",
    "תפריט (קטגוריות ומנות):",
  ];
  for (const cat of restaurant.categories) {
    lines.push(`\n## ${cat.name}`);
    for (const d of cat.dishes) {
      const price = (d.priceCents / 100).toFixed(0);
      const desc = d.description ? ` – ${d.description}` : "";
      const allergens = d.allergens ? ` [אלרגנים: ${d.allergens}]` : "";
      lines.push(`- ${d.title} (₪${price})${desc}${allergens}`);
    }
  }
  return lines.join("\n");
}

// —— מאגר תשובות היועץ (מבוסס כללים) ——
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

/** ברכות – תשובה אחידה: "היי, איך אוכל לעזור?" בוריאציות */
const GREETING_REPLIES = [
  "היי, איך אוכל לעזור?",
  "היי! איך אוכל לעזור?",
  "שלום, איך אוכל לעזור?",
  "היי 🙂 איך אוכל לעזור?",
];

/** כשהבנו שלא – "לא הבנתי, אתה יכול לשאול שוב?" */
const FALLBACK_REPLIES = [
  "לא הבנתי, אתה יכול לשאול שוב?",
  "לא הבנתי. אתה יכול לשאול שוב?",
  "לא הבנתי – תנסה לשאול שוב, למשל מה יש או שם של מנה.",
  "לא ממש הבנתי. אתה יכול לשאול שוב?",
  "לא הבנתי. שאל למשל 'מה יש?' או שם של מנה.",
];

/** תשובות ריק / הודעה קצרה מדי */
const EMPTY_INPUT_REPLIES = [
  "לא הבנתי, אתה יכול לשאול שוב? למשל מה יש או שם של מנה.",
  "כתוב מה תרצה – למשל 'מה יש?' או שם של מנה.",
  "איך אוכל לעזור? כתוב שאלה על התפריט או שם של מנה.",
];

/** מפריד בין תוכן ראשי למשפט CTA (הצגה נפרדת – קטן יותר, מול כפתור עבור) */
const CTA_SEP = "\n\n\n";

/** בונה תשובת המלצה – כותרת פעם אחת, תיאור בלי לחזור על שם המנה; משפט CTA אחרי מפריד */
function buildRecommendationMessage(title: string, description: string | null): string {
  let msg = `לדעתי ${title} מתאים לך!`;
  if (description && description.trim()) {
    let desc = description.trim();
    if (title && desc.toLowerCase().startsWith(title.toLowerCase())) {
      desc = desc.slice(title.length).trim();
      if (desc && !/^(עם|של|ו|־)/.test(desc)) desc = "עם " + desc;
    }
    if (desc) msg += `\nהמנה מורכבת מ${desc}.`;
  }
  msg += `${CTA_SEP}אוכל להקפיץ אותך לשם בלחיצה על עבור או שפשוט תכתוב לי כן.`;
  return msg;
}

/** מילות עזר שלא מחפשים בהן (כדי ש"מה יש עם דג" יחפש רק דג). כולל ברכות. */
const SEARCH_STOP_WORDS = new Set([
  "מה", "יש", "אין", "עם", "איך", "אפשר", "רוצה", "תן", "תגיד", "יש לכם", "יש משהו",
  "משהו", "קצת", "איזה", "איזו", "על", "בשביל", "בשבילי", "לי", "אני", "את", "אתה",
  "היי", "הייי", "שלום", "הי", "אהלן",
  "ממליץ", "תמליץ", "המלצה", "המלץ", "מומלץ", "טעים",
  "אוהב", "אוהבת", "אוהבים", "לאוהב",
]);

/** קטגוריה של משקאות – לא להמליץ עליה */
function isDrinkCategory(categoryName: string): boolean {
  const c = categoryName.toLowerCase();
  return c.includes("שתייה") || c.includes("משקאות") || c.includes("שתיה");
}

/** הסרת סימני פיסוק מקצה המילה – כדי ש"המבורגר?" יתאים ל"המבורגר" בתפריט */
function normalizeWord(w: string): string {
  return w.replace(/[?!.,;:]+$/, "").replace(/^[?!.,;:]+/, "").trim();
}

type AdvisorResult = { message: string; suggestedDishId?: number; suggestedDishTitle?: string };

/** מחלץ שם מנה מההודעה הקודמת של היועץ (ניסוח ישן או "לדעתי X מתאים לך") */
function extractSuggestedDishTitleFromMessage(msg: string): string | null {
  const mNew = msg.match(/לדעתי\s+([^!]+?)\s+מתאים/);
  if (mNew) return mNew[1].trim();
  const m = msg.match(/(?:ממליץ על|על)\s*([^.]+?)(?:\s*\.|תכתוב|$)/);
  if (m) return m[1].trim();
  const m2 = msg.match(/(?:ילך טוב|מתאים)[^.]*?([^.]+?)(?:\s*\.|תכתוב|$)/);
  if (m2) return m2[1].trim();
  return null;
}

/** יועץ מבוסס כללים – חינמי, תמידי, רק על מאגר התפריט. מעדיף מנות מסומנות בכוכב (featured) אלא אם נמצאה מילת מפתח. */
function ruleBasedAdvisor(
  restaurant: { name: string; categories: Array<{ name: string; dishes: Array<{ id: number; title: string; description: string | null; priceCents: number; featured?: boolean }> }> },
  userMessage: string,
  options?: { lastAssistantMessage?: string }
): AdvisorResult {
  const raw = userMessage.trim();
  const text = raw.toLowerCase();
  const lastAssistant = options?.lastAssistantMessage?.trim() ?? "";
  const allDishes: { id: number; title: string; description: string | null; priceCents: number; categoryName: string; featured: boolean }[] = [];
  for (const cat of restaurant.categories) {
    for (const d of cat.dishes) {
      allDishes.push({
        id: d.id,
        title: d.title,
        description: d.description,
        priceCents: d.priceCents,
        categoryName: cat.name,
        featured: (d as { featured?: boolean }).featured ?? false,
      });
    }
  }

  const foodDishes = allDishes.filter((d) => !isDrinkCategory(d.categoryName));
  const featuredDishes = foodDishes.filter((d) => d.featured);
  /** מנה מומלצת – מעדיף מנות בכוכב. אופציונלי: להוציא מנה לפי שם */
  const pickRecommended = (excludeTitle?: string | null): (typeof allDishes)[0] | undefined => {
    const exclude = excludeTitle?.trim().toLowerCase();
    const filteredFood = exclude ? foodDishes.filter((d) => d.title.toLowerCase() !== exclude) : foodDishes;
    const filteredFeatured = exclude ? featuredDishes.filter((d) => d.title.toLowerCase() !== exclude) : featuredDishes;
    if (filteredFeatured.length > 0) return filteredFeatured[Math.floor(Math.random() * filteredFeatured.length)];
    return filteredFood[0];
  };

  const priceStr = (cents: number) => `₪${(cents / 100).toFixed(0)}`;
  const matchIn = (s: string | null, words: string[]) => s && words.some((w) => s.includes(w));

  if (!text) return { message: pick(EMPTY_INPUT_REPLIES) };

  // —— ברכות: היי, שלום, מה קורה וכו' (השלם שורה או מתחיל בברכה – בלי \\b כי עברית) ——
  const greetingMatch = text.match(/^(היי|הייי|שלום|היייי|מה קורה|מה נשמע|מה שלומך|מה איתך|בוקר טוב|ערב טוב|אהלן|הי)(\s*[!?.]*)?$/);
  const startsWithGreeting = /^(היי|הייי|שלום|הי)\s+/.test(text);
  if (greetingMatch || startsWithGreeting) {
    return { message: pick(GREETING_REPLIES) };
  }

  // —— כן/לא בלי הקשר – לא לפרש כחיפוש מנה ——
  if (/^(כן|לא|בסדר|אוקיי|בטח|מעולה|סגור|יאללה)\s*[!?.]*$/i.test(text)) {
    return { message: "איך אוכל לעזור? תגיד מה תרצה – למשל איזו מנה מעניינת אותך." };
  }

  // —— "לא אוהב" / "משהו אחר" אחרי המלצה – מציע מנה חלופית ——
  const dislikePattern = /(לא אוהב|לא מתאים|משהו אחר|לא בא לי|אחרת|אחר\b|לא רוצה את זה|תן משהו אחר)/i;
  if (dislikePattern.test(text) && lastAssistant && (lastAssistant.includes("ממליץ") || lastAssistant.includes("לדעתי") || lastAssistant.includes("תכתוב"))) {
    const prevTitle = extractSuggestedDishTitleFromMessage(lastAssistant);
    const other = pickRecommended(prevTitle);
    if (other) {
      const msg = `אה, אתה לא אוהב את המנה הזאת? ${buildRecommendationMessage(other.title, other.description)}`;
      return { message: msg, suggestedDishId: other.id, suggestedDishTitle: other.title };
    }
    const fallback = foodDishes.find((d) => !prevTitle || d.title.toLowerCase() !== prevTitle.toLowerCase());
    if (fallback) {
      const msg = `אה, אתה לא אוהב את המנה הזאת? ${buildRecommendationMessage(fallback.title, fallback.description)}`;
      return { message: msg, suggestedDishId: fallback.id, suggestedDishTitle: fallback.title };
    }
    return { message: "אין עוד מנות להציע כרגע. רוצה לראות את התפריט?" };
  }

  // —— מה יש / תפריט (בלי מחירים, תמציתי) ——
  if (/\b(מה יש|תפריט|מה מוגש|רשימת מנות|מה אפשר|מה אוכלים|מה מומלץ)\b/.test(text)) {
    const foodCats = restaurant.categories.filter((c) => !isDrinkCategory(c.name));
    const parts = foodCats.map((c) => `${c.name}: ${c.dishes.map((d) => d.title).join(", ")}`);
    return { message: `בתפריט שלנו:\n${parts.join("\n")}\n\nרוצה פרטים על מנה מסוימת?` };
  }

  // —— בקשת המלצה: "מה אתה ממליץ", "המלצה", "כדאי", "חושב" וכו' – פלט: "אני ממליץ על (מנה). תכתוב כן ואקפיץ אותך לשם." ——
  const recommendationKeywords = /(ממליץ|המלצה|המלצות|כדאי|חושב|תמליץ|המלץ|מה מומלץ|מה אתה ממליץ|מה תמליץ|מה טעים|טעים)/i;
  if (recommendationKeywords.test(text)) {
    const recommended = pickRecommended();
    if (recommended) {
      const msg = buildRecommendationMessage(recommended.title, recommended.description);
      return { message: msg, suggestedDishId: recommended.id, suggestedDishTitle: recommended.title };
    }
    const foodCats = restaurant.categories.filter((c) => !isDrinkCategory(c.name));
    const firstDish = foodCats[0]?.dishes[0];
    if (firstDish) {
      const d = firstDish as { id: number; title: string; description?: string | null };
      const msg = buildRecommendationMessage(d.title, d.description ?? null);
      return { message: msg, suggestedDishId: d.id, suggestedDishTitle: d.title };
    }
    return { message: "רוצה לראות את התפריט? תגיד מה אתה אוהב ואתאים לך מנה." };
  }

  // —— מחיר / כמה עולה ——
  if (/\b(מחיר|מחירים|כמה עולה|כמה עולות|מחירון|מה המחיר)\b/.test(text)) {
    const sample = allDishes.slice(0, 5).map((d) => `${d.title} ${priceStr(d.priceCents)}`).join(", ");
    if (allDishes.length <= 8) {
      const full = allDishes.map((d) => `${d.title} ${priceStr(d.priceCents)}`).join(", ");
      return { message: `המחירים: ${full}.` };
    }
    return { message: `המחירים בתפריט – לדוגמה: ${sample}. רוצה מחיר של מנה ספציפית?` };
  }

  // —— חיפוש מנה ספציפית (רק מילים תוכן, מנורמלות בלי סימני פיסוק) ——
  const rawWords = text.split(/\s+/).filter((w) => w.length > 1);
  const searchWords = rawWords
    .map((w) => normalizeWord(w))
    .filter((w) => w.length > 0 && !SEARCH_STOP_WORDS.has(w));
  const queryForDisplay = searchWords.length > 0 ? searchWords.join(" ") : normalizeWord(rawWords[0] ?? "כזה");

  const allMatches = searchWords.length > 0
    ? allDishes.filter((d) => {
        const combined = `${d.title} ${d.description ?? ""}`.toLowerCase();
        return searchWords.some((w) => combined.includes(w));
      })
    : [];

  const matches = allMatches.filter((d) => !isDrinkCategory(d.categoryName));
  const matchesInclDrinks = allMatches;

  if (matches.length > 0) {
    const combined = (d: (typeof matches)[0]) => `${d.title} ${d.description ?? ""}`.toLowerCase();
    const score = (d: (typeof matches)[0]) => searchWords.filter((w) => combined(d).includes(w)).length;
    const suggested = [...matches].sort((a, b) => {
      if (a.featured !== b.featured) return b.featured ? 1 : -1;
      return score(b) - score(a);
    })[0];
    const msg = buildRecommendationMessage(suggested.title, suggested.description);
    return { message: msg, suggestedDishId: suggested.id, suggestedDishTitle: suggested.title };
  }

  if (matchesInclDrinks.length > 0) {
    const onlyDrinks = matchesInclDrinks.filter((d) => isDrinkCategory(d.categoryName));
    if (onlyDrinks.length === matchesInclDrinks.length) {
      return { message: "לא הבנתי אותך, אתה יכול לשאול שוב או לכתוב דברים שאתה אוהב ואני אנסה לחפש." };
    }
  }

  // —— ללא בשר / צמחוני / טבעוני (בלי מחירים, בלי משקאות) ——
  if (matchIn(text, ["ללא בשר", "בלי בשר", "צמחוני", "טבעוני", "vegetarian", "vegan", "סלט", "ירקות"])) {
    const veg = allDishes.filter((d) => {
      if (isDrinkCategory(d.categoryName)) return false;
      const t = `${d.title} ${d.description ?? ""}`.toLowerCase();
      return t.includes("סלט") || t.includes("ירק") || t.includes("טבעוני") || t.includes("צמחוני") || (!t.includes("בשר") && !t.includes("סטייק") && !t.includes("המבורגר"));
    });
    if (veg.length > 0) {
      const list = veg.slice(0, 2).map((d) => d.title).join(" או ");
      return { message: `מנות שמתאימות: ${list}.${veg.length > 2 ? " יש עוד בתפריט." : ""}` };
    }
    return { message: "כרגע אין בתפריט מנות שסומנו כצמחוניות. אפשר לשאול על מנה ספציפית ואענה לפי התיאור." };
  }

  // —— אלרגנים ——
  if (matchIn(text, ["אלרג", "אלרגני", "גלוטן", "לקטוז", "בוטנים"])) {
    const withAllergens = allDishes.filter((d) => d.description && text.split(/\s+/).some((w) => (d.description ?? "").toLowerCase().includes(w)));
    if (withAllergens.length > 0) {
      const list = withAllergens.map((d) => `${d.title} – ${d.description ?? ""}`).slice(0, 3).join("; ");
      return { message: `לגבי אלרגנים, יש לנו: ${list}. לפרטים מלאים מומלץ להזכיר למלצר.` };
    }
    return { message: "התיאור של כל מנה בתפריט. אם צריכים להתחשב באלרגיה ספציפית – תגידו למלצר." };
  }

  // —— שאלות בסיסיות: מי אתה, מה זה, עזרה ——
  if (/\b(מי אתה|מה אתה|מי זה|מה זה הצ'אט|איך זה עובד|עזרה|help)\b/.test(text)) {
    return { message: pick([
      `אני היועץ של ${restaurant.name}. עוזר לבחור מהתפריט – אפשר לשאול מה יש, מחירים, או מנה מסוימת.`,
      `אני כאן לעזור עם התפריט של ${restaurant.name}. שאל מה יש, אם יש מנה מסוימת, או משהו בלי בשר.`,
    ]) };
  }

  // —— תודה / סיום ——
  if (/\b(תודה|תודה רבה|מעולה|בסדר|אוקיי|סגור|ביי|להתראות)\b/.test(text)) {
    return { message: pick([
      "בשמחה! אם תצטרך עוד – אני כאן.",
      "בכיף. רוצה עוד משהו מהתפריט – תכתוב.",
      "בשמחה 🙂",
    ]) };
  }

  // —— הזמנה / מלצר / שירות ——
  if (/\b(הזמנה|להזמין|מלצר|קריאה|קרא למלצר|רוצה להזמין)\b/.test(text)) {
    return { message: pick([
      "ההזמנה מתבצעת דרך התפריט – בוחרים מנות ומוסיפים לעגלה. למלצר יש כפתור נפרד בתחתית.",
      "כדי להזמין – בוחרים מנות ומוסיפים לעגלה. לקרוא למלצר – הכפתור עם האייקון בתחתית.",
    ]) };
  }

  // —— כשרות / שעות / מיקום (לא בתפריט – הפניה למלצר) ——
  if (/\b(כשר|כשרות|שעות|פתוח|נפתח|נסגר|איפה|כתובת|מיקום)\b/.test(text)) {
    return { message: pick([
      "לגבי כשרות, שעות פתיחה או כתובת – מומלץ לשאול את המלצר או לראות בפרטי המסעדה.",
      "אני עוזר עם התפריט והמנות. לשאלות על שעות או מיקום – תפנה למלצר.",
    ]) };
  }

  // —— שאלה קצרה / סימן / לא ברור ——
  if (text.length <= 2 || /^[?\-.!]+$/.test(text)) {
    return { message: pick(FALLBACK_REPLIES) };
  }

  // —— תמיד תשובה: לא התאמנו לשום כוונה ——
  return { message: pick(FALLBACK_REPLIES) };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          dishes: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // יועץ מבוסס כללים – חינמי ותמידי. מופעל כש־CHAT_USE_RULE_BASED=true או כשאין OPENAI_API_KEY
  const useRuleBased =
    process.env.CHAT_USE_RULE_BASED === "true" ||
    process.env.CHAT_USE_RULE_BASED === "1" ||
    !openai;
  if (useRuleBased) {
    const reversed = [...messages].reverse();
    const lastUser = reversed.find((m) => m.role === "user");
    const lastAssistant = reversed.find((m) => m.role === "assistant");
    const query = lastUser?.content?.trim() ?? "";
    const result = ruleBasedAdvisor(restaurant, query, {
      lastAssistantMessage: lastAssistant?.content,
    });
    return NextResponse.json({
      message: result.message,
      suggestedDishId: result.suggestedDishId,
      suggestedDishTitle: result.suggestedDishTitle,
    });
  }

  const menuContext = buildMenuContext(restaurant);

  const systemContent = `אתה היועץ לאוכל של המסעדה "${restaurant.name}". תפקידך לעזור ללקוח לבחור מנות מהתפריט של המסעדה הזו בלבד.

חוקים:
- הצע והזכר רק מנות מהתפריט המצורף. אל תמציא מנות ואל תציע מנות ממסעדות אחרות.
- ענה בעברית בלבד, בסגנון ידידותי וקצר.
- אם הלקוח שואל על מנה שלא בתפריט או על מסעדה אחרת – הסבר בעדינות שאתה יועץ רק לתפריט של ${restaurant.name}.

תפריט המסעדה (רק ממנו מותר להציע):
${menuContext}`;

  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...messages.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 600,
    });

    const choice = completion.choices?.[0];
    const text = choice?.message?.content?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from assistant" },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: text });
  } catch (err) {
    console.error("Chat API error:", err);

    const isDev = process.env.NODE_ENV !== "production";
    let message = "שגיאה בתקשורת עם שירות הייעוץ";
    let status = 502;

    if (err && typeof err === "object") {
      const o = err as { status?: number; message?: string; code?: string };
      if (o.status === 401 || o.code === "invalid_api_key") {
        message = "מפתח API לא תקין. בדוק את OPENAI_API_KEY ב-.env";
        status = 503;
      } else if (o.status === 429) {
        message = "חרגת ממכסת השימוש. נסה שוב מאוחר יותר.";
        status = 503;
      } else if (isDev && o.message) {
        message = `שגיאה: ${String(o.message).slice(0, 120)}`;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
