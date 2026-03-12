import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function buildMenuContext(restaurant: { name: string; categories: Array<{ name: string; dishes: Array<{ title: string; description: string | null; allergens: string | null; priceCents: number }> }> }): string {
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  if (!openai) {
    return NextResponse.json(
      { error: "שירות הצ'אט לא מוגדר (OPENAI_API_KEY)" },
      { status: 503 }
    );
  }

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
    return NextResponse.json(
      { error: "שגיאה בתקשורת עם שירות הייעוץ" },
      { status: 502 }
    );
  }
}
