"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const OPENING_MESSAGE = "היי, אני צ'אטי, אני יכול לעזור לך לבחור מה לאכול, מה אתה אוהב או לא רוצה במנה שלך?";
const TYPING_DURATION_MS = 2200;
const AVATAR_SIZE = 40;

export interface ChatMessage {
  id: string;
  role: "waiter" | "user";
  text: string;
}

interface ChatPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** כשמופעל – הצ'אט מרונדר בתוך האב (מסגרת הטלפון) ולא כ־portal ל־body */
  embedInPhone?: boolean;
  /** slug של המסעדה – לחיבור ל־API עם התפריט של המסעדה בלבד */
  restaurantSlug?: string;
}

export function ChatPopup({ open, onOpenChange, embedInPhone, restaurantSlug }: ChatPopupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [openingShown, setOpeningShown] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setMessages([]);
    setOpeningShown(false);
    setIsTyping(true);
    const t = setTimeout(() => {
      setIsTyping(false);
      setOpeningShown(true);
      setMessages((prev) => [
        ...prev,
        { id: "opening", role: "waiter", text: OPENING_MESSAGE },
      ]);
    }, TYPING_DURATION_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    if (!restaurantSlug) {
      setMessages((prev) => [
        ...prev,
        { id: `waiter-${Date.now()}`, role: "waiter", text: "לא הוגדר חיבור ליועץ. נסה שוב מאוחר יותר." },
      ]);
      return;
    }

    setIsTyping(true);
    try {
      const apiMessages = messages
        .filter((m) => m.role === "waiter" || m.role === "user")
        .map((m) => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.text }));
      apiMessages.push({ role: "user", content: text });

      const res = await fetch(`/api/r/${encodeURIComponent(restaurantSlug)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: `waiter-err-${Date.now()}`, role: "waiter", text: data.error || "שגיאה בשליחת ההודעה. נסה שוב." },
        ]);
        return;
      }

      const reply = typeof data.message === "string" ? data.message : "";
      setMessages((prev) => [
        ...prev,
        { id: `waiter-${Date.now()}`, role: "waiter", text: reply || "לא התקבלה תשובה." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `waiter-err-${Date.now()}`, role: "waiter", text: "שגיאה בתקשורת. נסה שוב." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!open) return null;
  if (embedInPhone) {
    return (
      <>
        <div
          className="absolute inset-0 z-[150] bg-black/50"
          aria-hidden
          onClick={() => onOpenChange(false)}
        />
        <div
          className="absolute inset-0 z-[151] flex items-stretch justify-center pointer-events-none"
          role="dialog"
          aria-label="צ'אט"
        >
          <div
            className="pointer-events-auto w-full flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden bg-[#1a1d24] border border-white/10 shadow-2xl m-2"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0e1118]">
              <span className="text-white font-medium">היועץ שלך לאוכל</span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="סגור"
              >
                ✕
              </button>
            </div>
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide min-h-0"
            >
              {isTyping && (
                <div className="flex justify-start gap-2 items-end">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center">
                    <img src="/מלצר.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-white/10 text-white/90 flex gap-1 items-center">
                    <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              {messages.map((msg) =>
                msg.role === "waiter" ? (
                  <div key={msg.id} className="flex justify-start gap-2 items-end">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center">
                      <img src="/מלצר.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-white/10 text-white/90 text-sm max-w-[85%]">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex justify-end gap-2 items-end">
                    <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-emerald-600/80 text-white text-sm max-w-[85%]">
                      {msg.text}
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center">
                      <img src="/לקוח.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                    </div>
                  </div>
                )
              )}
            </div>
            <div className="shrink-0 p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="כתוב הודעה..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                dir="rtl"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
              >
                שלח
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[150] bg-black/50"
        aria-hidden
        onClick={() => onOpenChange(false)}
      />
      <div
        className="fixed inset-0 z-[151] flex items-end justify-center p-0 sm:p-4 sm:items-center pointer-events-none"
        role="dialog"
        aria-label="צ'אט"
      >
        <div
          className="pointer-events-auto w-full max-w-md h-[85vh] max-h-[600px] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col bg-[#1a1d24] border border-white/10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0e1118]">
            <span className="text-white font-medium">היועץ שלך לאוכל</span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="סגור"
            >
              ✕
            </button>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
          >
            {isTyping && (
              <div className="flex justify-start gap-2 items-end">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center">
                  <img src="/מלצר.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                </div>
                <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-white/10 text-white/90 flex gap-1 items-center">
                  <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {messages.map((msg) =>
              msg.role === "waiter" ? (
                <div key={msg.id} className="flex justify-start gap-2 items-end">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center">
                    <img src="/מלצר.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-white/10 text-white/90 text-sm max-w-[85%]">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-end gap-2 items-end">
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-emerald-600/80 text-white text-sm max-w-[85%]">
                    {msg.text}
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center">
                    <img src="/לקוח.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                  </div>
                </div>
              )
            )}
          </div>

          <div className="shrink-0 p-3 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="כתוב הודעה..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
              dir="rtl"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
            >
              שלח
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
