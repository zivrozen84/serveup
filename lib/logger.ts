/**
 * לוגר שמדפיס לקונסול ובאופציה שולח ל-Discord (אם מוגדר DISCORD_WEBHOOK_URL).
 * שימוש: import { log, error, warn } from "@/lib/logger";
 */

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

/** סימן RTL (Unicode) – מגדיר שורה כבעברית/ימין־לשמאל בתצוגת Discord */
const RTL_MARK = "\u200F";

type LogLevel = "info" | "warn" | "error";

async function sendToDiscord(level: LogLevel, message: string, details?: string) {
  if (!DISCORD_WEBHOOK_URL?.trim()) return;
  const color =
    level === "error" ? 0xdc2626 : level === "warn" ? 0xf59e0b : 0x3b82f6;
  const title = level === "error" ? "🔴 שגיאה" : level === "warn" ? "🟡 אזהרה" : "🔵 לוג";
  const desc = message.length > 4096 ? message.slice(0, 4093) + "…" : message;
  const body: { content?: string; embeds?: Array<Record<string, unknown>> } = {
    embeds: [
      {
        title: RTL_MARK + title,
        description: RTL_MARK + desc,
        color,
        timestamp: new Date().toISOString(),
        ...(details && {
          fields: [{ name: RTL_MARK + "פרטים", value: RTL_MARK + (details.length > 1024 ? details.slice(0, 1021) + "…" : details) }],
        }),
      },
    ],
  };
  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn("שליחה ל-Discord נכשלה:", res.status, await res.text());
    }
  } catch (e) {
    console.warn("שגיאה בשליחה ל-Discord:", e);
  }
}

function toMessage(args: unknown[]): string {
  return args
    .map((a) => (typeof a === "object" && a !== null ? JSON.stringify(a, null, 0) : String(a)))
    .join(" ");
}

/** שליחה ל-Discord ללא חסימה (fire-and-forget) */
function enqueueDiscord(level: LogLevel, message: string, details?: string) {
  void sendToDiscord(level, message, details);
}

export function log(...args: unknown[]) {
  const msg = toMessage(args);
  console.log(...args);
  enqueueDiscord("info", msg);
}

export function warn(...args: unknown[]) {
  const msg = toMessage(args);
  console.warn(...args);
  enqueueDiscord("warn", msg);
}

export function error(...args: unknown[]) {
  const msg = toMessage(args);
  console.error(...args);
  const err = args.find((a): a is Error => a instanceof Error);
  const details = err?.stack;
  enqueueDiscord("error", msg, details);
}
