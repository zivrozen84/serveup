"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const OPENING_MESSAGE = "היי, אני אולי אוכל לנסות לך למצוא את המנה שלך! מה אתה אוהב?";
const OPENING_TYPING_MS = 900;

/** הצעות כשעדיין לא נשלחה הודעה – מעודדות לשאול על מנה מסוימת */
const EMPTY_STATE_SUGGESTIONS = [
  "יש מנה מסוימת?",
  "יש מנה מסוימת שאתה אוהב?",
  "מה אתה מחפש לאכול?",
  "מה אתה ממליץ?",
  "יש בלי גלוטן?",
];
const MIN_TYPING_AFTER_SEND_MS = 1200;
const AVATAR_SIZE = 40;

export interface ChatMessage {
  id: string;
  role: "waiter" | "user";
  text: string;
  /** שם מנה להדגשה בתשובה */
  highlightTitle?: string;
  /** מנה מוצעת – כפתור "לעבור" בסוף ההודעה */
  suggestedDishIdForJump?: number;
  /** הודעת שגיאה עם כפתור נסה שוב */
  isErrorWithRetry?: boolean;
  /** טקסט ההודעה של המשתמש לשליחה מחדש (כש־isErrorWithRetry) */
  retryUserText?: string;
}

const MAX_MESSAGE_LENGTH = 50;
const CHAT_STORAGE_KEY = (slug: string) => `serveup-chat-${slug}`;

const YES_PATTERNS = /^(כן|בסדר|יאללה|בטח|מעולה|סגור)(\s+(בבקשה|תודה|קפוץ|תקפיץ|תקפיצי))?\s*[!?.]*$/i;

interface ChatPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** כשמופעל – הצ'אט מרונדר בתוך האב (מסגרת הטלפון) ולא כ־portal ל־body */
  embedInPhone?: boolean;
  /** slug של המסעדה – לחיבור ל־API עם התפריט של המסעדה בלבד */
  restaurantSlug?: string;
  /** כשהלקוח כותב "כן" אחרי שהצענו מנה – קפיצה לדף המנה וסגירת הצ'אט */
  onJumpToDish?: (dishId: number) => void;
}

export function ChatPopup({ open, onOpenChange, embedInPhone, restaurantSlug, onJumpToDish }: ChatPopupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [openingShown, setOpeningShown] = useState(false);
  const [pendingJumpDishId, setPendingJumpDishId] = useState<number | null>(null);
  const [pendingJumpDishTitle, setPendingJumpDishTitle] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingStartedAtRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    setPendingJumpDishId(null);
    setPendingJumpDishTitle(null);
    const focusTimer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100);
    return () => clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPendingJumpDishId(null);
    setPendingJumpDishTitle(null);
    if (restaurantSlug?.trim() && typeof sessionStorage !== "undefined") {
      try {
        const raw = sessionStorage.getItem(CHAT_STORAGE_KEY(restaurantSlug.trim()));
        const stored = raw ? (JSON.parse(raw) as ChatMessage[]) : null;
        if (Array.isArray(stored) && stored.length > 0) {
          setMessages(stored);
          setOpeningShown(true);
          return;
        }
      } catch {
        /* ignore */
      }
    }
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
    }, OPENING_TYPING_MS);
    return () => clearTimeout(t);
  }, [open, restaurantSlug]);

  useEffect(() => {
    if (!restaurantSlug?.trim() || typeof sessionStorage === "undefined" || messages.length === 0) return;
    try {
      const toSave = messages.map(({ id, role, text, highlightTitle, suggestedDishIdForJump }) => ({
        id,
        role,
        text,
        ...(highlightTitle != null ? { highlightTitle } : {}),
        ...(suggestedDishIdForJump != null ? { suggestedDishIdForJump } : {}),
      }));
      sessionStorage.setItem(CHAT_STORAGE_KEY(restaurantSlug.trim()), JSON.stringify(toSave));
    } catch {
      /* ignore */
    }
  }, [restaurantSlug, messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const sendApiRequest = async (userText: string, currentMessages: ChatMessage[]) => {
    const apiMessages = currentMessages
      .filter((m) => m.role === "waiter" || m.role === "user")
      .map((m) => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.text }));
    apiMessages.push({ role: "user", content: userText });

    const res = await fetch(`/api/r/${encodeURIComponent(restaurantSlug!)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  const handleRetry = async (errorMsgId: string, retryUserText: string) => {
    const withoutError = messages.filter((m) => m.id !== errorMsgId);
    setMessages(withoutError);
    setIsTyping(true);
    typingStartedAtRef.current = Date.now();
    try {
      const { res, data } = await sendApiRequest(retryUserText, withoutError);
      const showReply = (replyText: string, suggestedTitle?: string, suggestedDishId?: number) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `waiter-${Date.now()}`,
            role: "waiter",
            text: replyText,
            ...(suggestedTitle ? { highlightTitle: suggestedTitle } : {}),
            ...(suggestedDishId != null ? { suggestedDishIdForJump: suggestedDishId } : {}),
          },
        ]);
        setIsTyping(false);
      };
      if (!res.ok) {
        const remain = Math.max(0, MIN_TYPING_AFTER_SEND_MS - (Date.now() - typingStartedAtRef.current));
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `waiter-err-${Date.now()}`,
              role: "waiter",
              text: "שגיאה בתקשורת. נסה שוב.",
              isErrorWithRetry: true,
              retryUserText,
            },
          ]);
          setIsTyping(false);
        }, remain);
        return;
      }
      const reply = typeof data.message === "string" ? data.message : "";
      if (typeof data.suggestedDishId === "number") setPendingJumpDishId(data.suggestedDishId);
      if (typeof data.suggestedDishTitle === "string") setPendingJumpDishTitle(data.suggestedDishTitle);
      const remain = Math.max(0, MIN_TYPING_AFTER_SEND_MS - (Date.now() - typingStartedAtRef.current));
      setTimeout(() => showReply(reply || "לא התקבלה תשובה.", data.suggestedDishTitle, data.suggestedDishId), remain);
    } catch {
      const remain = Math.max(0, MIN_TYPING_AFTER_SEND_MS - (Date.now() - typingStartedAtRef.current));
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `waiter-err-${Date.now()}`,
            role: "waiter",
            text: "שגיאה בתקשורת. נסה שוב.",
            isErrorWithRetry: true,
            retryUserText,
          },
        ]);
        setIsTyping(false);
      }, remain);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;
    setInputValue("");
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    if (pendingJumpDishId !== null && YES_PATTERNS.test(text) && onJumpToDish) {
      onJumpToDish(pendingJumpDishId);
      setPendingJumpDishId(null);
      const jumpText = pendingJumpDishTitle ? `מקפיץ אותך ל־${pendingJumpDishTitle}!` : "מקפיץ אותך!";
      setPendingJumpDishTitle(null);
      setMessages((prev) => [...prev, { id: `waiter-jump-${Date.now()}`, role: "waiter", text: jumpText }]);
      setTimeout(() => onOpenChange(false), 300);
      return;
    }

    if (!restaurantSlug) {
      setMessages((prev) => [
        ...prev,
        { id: `waiter-${Date.now()}`, role: "waiter", text: "לא הוגדר חיבור ליועץ. נסה שוב מאוחר יותר." },
      ]);
      return;
    }

    setIsTyping(true);
    typingStartedAtRef.current = Date.now();
    try {
      const { res, data } = await sendApiRequest(text, nextMessages);

      const showReply = (replyText: string, suggestedTitle?: string, suggestedDishId?: number) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `waiter-${Date.now()}`,
            role: "waiter",
            text: replyText,
            ...(suggestedTitle ? { highlightTitle: suggestedTitle } : {}),
            ...(suggestedDishId != null ? { suggestedDishIdForJump: suggestedDishId } : {}),
          },
        ]);
        setIsTyping(false);
      };

      if (!res.ok) {
        const remain = Math.max(0, MIN_TYPING_AFTER_SEND_MS - (Date.now() - typingStartedAtRef.current));
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `waiter-err-${Date.now()}`,
              role: "waiter",
              text: "שגיאה בתקשורת. נסה שוב.",
              isErrorWithRetry: true,
              retryUserText: text,
            },
          ]);
          setIsTyping(false);
        }, remain);
        return;
      }

      const reply = typeof data.message === "string" ? data.message : "";
      if (typeof data.suggestedDishId === "number") setPendingJumpDishId(data.suggestedDishId);
      if (typeof data.suggestedDishTitle === "string") setPendingJumpDishTitle(data.suggestedDishTitle);
      const remain = Math.max(0, MIN_TYPING_AFTER_SEND_MS - (Date.now() - typingStartedAtRef.current));
      setTimeout(() => showReply(reply || "לא התקבלה תשובה.", data.suggestedDishTitle, data.suggestedDishId), remain);
    } catch {
      const remain = Math.max(0, MIN_TYPING_AFTER_SEND_MS - (Date.now() - typingStartedAtRef.current));
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `waiter-err-${Date.now()}`,
            role: "waiter",
            text: "שגיאה בתקשורת. נסה שוב.",
            isErrorWithRetry: true,
            retryUserText: text,
          },
        ]);
        setIsTyping(false);
      }, remain);
    }
  };

  const doJumpToDish = (dishId: number, title?: string | null) => {
    if (!onJumpToDish) return;
    onJumpToDish(dishId);
    setPendingJumpDishId(null);
    setPendingJumpDishTitle(null);
    const jumpText = title ? `מקפיץ אותך ל־${title}!` : "מקפיץ אותך!";
    setMessages((prev) => [...prev, { id: `waiter-jump-${Date.now()}`, role: "waiter", text: jumpText }]);
    setTimeout(() => onOpenChange(false), 300);
  };

  const handleJumpClick = () => {
    if (pendingJumpDishId == null) return;
    doJumpToDish(pendingJumpDishId, pendingJumpDishTitle);
  };

  const handleJumpFromMessage = (dishId: number, title?: string | null) => {
    doJumpToDish(dishId, title);
  };

  const CTA_SEP = "\n\n\n";

  function renderWaiterText(msg: ChatMessage, textOverride?: string) {
    const text = textOverride ?? msg.text;
    if (msg.highlightTitle && text.includes(msg.highlightTitle)) {
      const parts = text.split(msg.highlightTitle);
      return (
        <>
          {parts.map((p, i) => (
            <span key={i}>
              {p}
              {i < parts.length - 1 ? (
                <span className="font-semibold text-amber-300">{msg.highlightTitle}</span>
              ) : null}
            </span>
          ))}
        </>
      );
    }
    return text;
  }

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
              role="log"
              aria-live="polite"
              aria-label="הודעות הצ'אט"
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide min-h-0"
            >
              {messages.map((msg) =>
                msg.role === "waiter" ? (
                  <div key={msg.id} className="flex justify-end gap-2 items-end">
                    <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-white/10 text-white/90 text-sm max-w-[85%]">
                      {(() => {
                        const hasCta = msg.suggestedDishIdForJump != null && msg.text.includes(CTA_SEP);
                        const [mainText, ctaText] = hasCta ? msg.text.split(CTA_SEP) : [msg.text, null];
                        return (
                          <>
                            {renderWaiterText(msg, mainText)}
                            {msg.suggestedDishIdForJump != null && onJumpToDish && (
                              ctaText ? (
                                <div className="mt-4 text-xs text-white/80">
                                  {ctaText.includes("עבור") ? (
                                    <>
                                      {ctaText.split("עבור")[0]}
                                      <button
                                        type="button"
                                        onClick={() => handleJumpFromMessage(msg.suggestedDishIdForJump!, msg.highlightTitle)}
                                        className="animate-chat-jump-fade inline-flex align-middle mx-1 px-2 py-1 rounded font-bold text-white bg-amber-500 hover:bg-amber-400 transition-colors shrink-0 motion-reduce:animate-none"
                                        aria-label="עבור למנה בתפריט"
                                      >
                                        עבור
                                      </button>
                                      {ctaText.split("עבור")[1]}
                                    </>
                                  ) : (
                                    <>
                                      {ctaText}
                                      <button
                                        type="button"
                                        onClick={() => handleJumpFromMessage(msg.suggestedDishIdForJump!, msg.highlightTitle)}
                                        className="animate-chat-jump-fade inline-flex align-middle mr-1 px-2 py-1 rounded font-bold text-white bg-amber-500 hover:bg-amber-400 transition-colors shrink-0 motion-reduce:animate-none"
                                        aria-label="עבור למנה בתפריט"
                                      >
                                        עבור
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className="mr-1">
                                  {" "}
                                  <button
                                    type="button"
                                    onClick={() => handleJumpFromMessage(msg.suggestedDishIdForJump!, msg.highlightTitle)}
                                    className="text-xs font-bold px-1.5 py-0.5 rounded bg-transparent text-amber-400 hover:text-amber-300 align-baseline"
                                    aria-label="עבור למנה בתפריט"
                                  >
                                    עבור
                                  </button>
                                </span>
                              )
                            )}
                          </>
                        );
                      })()}
                      {msg.isErrorWithRetry && msg.retryUserText != null && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => handleRetry(msg.id, msg.retryUserText!)}
                            className="text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30"
                            aria-label="נסה לשלוח שוב"
                          >
                            נסה שוב
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center" aria-hidden>
                      <img src="/מלצר.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex justify-start gap-2 items-end">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center" aria-hidden>
                      <img src="/לקוח.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-emerald-600/80 text-white text-sm max-w-[85%]">
                      {msg.text}
                    </div>
                  </div>
                )
              )}
              {isTyping && (
                <div className="flex justify-end gap-2 items-end" aria-live="polite" aria-label="היועץ מקליד">
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-white/10 text-white/90 flex gap-1 items-center">
                    <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce motion-reduce:animate-none" style={{ animationDelay: "0ms" }} />
                    <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce motion-reduce:animate-none" style={{ animationDelay: "150ms" }} />
                    <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce motion-reduce:animate-none" style={{ animationDelay: "300ms" }} />
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center">
                    <img src="/מלצר.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                  </div>
                </div>
              )}
              {!isTyping && messages.every((m) => m.role !== "user") && messages.length > 0 && (
                <div className="pt-2 pb-1 flex flex-col gap-2 items-center" aria-label="הצעות לשאלה">
                  <p className="text-xs text-white/50">למשל:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {EMPTY_STATE_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInputValue(s.slice(0, MAX_MESSAGE_LENGTH))}
                        className="px-3 py-1.5 rounded-full text-xs bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors border border-white/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0 p-3 border-t border-white/10 flex flex-col gap-2">
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex flex-col gap-0.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="כתוב הודעה..."
                    maxLength={MAX_MESSAGE_LENGTH}
                    className="px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm w-full"
                    dir="rtl"
                    aria-label="הודעתך לצ'אט או שאלה על התפריט"
                    autoComplete="off"
                  />
                  <span className="text-[10px] text-white/40 text-left" dir="ltr" aria-hidden>
                    {inputValue.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping || inputValue.length > MAX_MESSAGE_LENGTH}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors shrink-0 motion-reduce:transition-none"
                  aria-label={isTyping ? "שולח הודעה" : "שלח הודעה"}
                >
                  {isTyping ? "שולח..." : "שלח"}
                </button>
              </div>
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
            role="log"
            aria-live="polite"
            aria-label="הודעות הצ'אט"
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
          >
            {messages.map((msg) =>
              msg.role === "waiter" ? (
                <div key={msg.id} className="flex justify-end gap-2 items-end">
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-white/10 text-white/90 text-sm max-w-[85%]">
                    {(() => {
                      const hasCta = msg.suggestedDishIdForJump != null && msg.text.includes(CTA_SEP);
                      const [mainText, ctaText] = hasCta ? msg.text.split(CTA_SEP) : [msg.text, null];
                      return (
                        <>
                          {renderWaiterText(msg, mainText)}
                          {msg.suggestedDishIdForJump != null && onJumpToDish && (
                            ctaText ? (
                              <div className="mt-4 text-xs text-white/80">
                                {ctaText.includes("עבור") ? (
                                  <>
                                    {ctaText.split("עבור")[0]}
                                    <button
                                      type="button"
                                      onClick={() => handleJumpFromMessage(msg.suggestedDishIdForJump!, msg.highlightTitle)}
                                      className="animate-chat-jump-fade inline-flex align-middle mx-1 px-2 py-1 rounded font-bold text-white bg-amber-500 hover:bg-amber-400 transition-colors shrink-0 motion-reduce:animate-none"
                                      aria-label="עבור למנה בתפריט"
                                    >
                                      עבור
                                    </button>
                                    {ctaText.split("עבור")[1]}
                                  </>
                                ) : (
                                  <>
                                    {ctaText}
                                    <button
                                      type="button"
                                      onClick={() => handleJumpFromMessage(msg.suggestedDishIdForJump!, msg.highlightTitle)}
                                      className="animate-chat-jump-fade inline-flex align-middle mr-1 px-2 py-1 rounded font-bold text-white bg-amber-500 hover:bg-amber-400 transition-colors shrink-0 motion-reduce:animate-none"
                                      aria-label="עבור למנה בתפריט"
                                    >
                                      עבור
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="mr-1">
                                {" "}
                                <button
                                  type="button"
                                  onClick={() => handleJumpFromMessage(msg.suggestedDishIdForJump!, msg.highlightTitle)}
                                  className="text-xs font-bold px-1.5 py-0.5 rounded bg-transparent text-amber-400 hover:text-amber-300 align-baseline"
                                  aria-label="עבור למנה בתפריט"
                                >
                                  עבור
                                </button>
                              </span>
                            )
                          )}
                        </>
                      );
                    })()}
                    {msg.isErrorWithRetry && msg.retryUserText != null && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleRetry(msg.id, msg.retryUserText!)}
                          className="text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30"
                          aria-label="נסה לשלוח שוב"
                        >
                          נסה שוב
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center" aria-hidden>
                    <img src="/מלצר.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-start gap-2 items-end">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center" aria-hidden>
                    <img src="/לקוח.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-emerald-600/80 text-white text-sm max-w-[85%]">
                    {msg.text}
                  </div>
                </div>
              )
            )}
            {isTyping && (
              <div className="flex justify-end gap-2 items-end" aria-live="polite" aria-label="היועץ מקליד">
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-white/10 text-white/90 flex gap-1 items-center">
                  <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce motion-reduce:animate-none" style={{ animationDelay: "0ms" }} />
                  <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce motion-reduce:animate-none" style={{ animationDelay: "150ms" }} />
                  <span className="typing-dot w-2 h-2 rounded-full bg-white/70 animate-bounce motion-reduce:animate-none" style={{ animationDelay: "300ms" }} />
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20 bg-stone-700 flex items-center justify-center">
                  <img src="/מלצר.png" alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} className="object-cover" />
                </div>
              </div>
            )}
            {!isTyping && messages.every((m) => m.role !== "user") && messages.length > 0 && (
              <div className="pt-2 pb-1 flex flex-col gap-2 items-center" aria-label="הצעות לשאלה">
                <p className="text-xs text-white/50">למשל:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {EMPTY_STATE_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInputValue(s.slice(0, MAX_MESSAGE_LENGTH))}
                      className="px-3 py-1.5 rounded-full text-xs bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors border border-white/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 p-3 border-t border-white/10 flex flex-col gap-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1 flex flex-col gap-0.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="כתוב הודעה..."
                  maxLength={MAX_MESSAGE_LENGTH}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm w-full"
                  dir="rtl"
                  aria-label="הודעתך לצ'אט או שאלה על התפריט"
                  autoComplete="off"
                />
                <span className="text-[10px] text-white/40 text-left" dir="ltr" aria-hidden>
                  {inputValue.length}/{MAX_MESSAGE_LENGTH}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping || inputValue.length > MAX_MESSAGE_LENGTH}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors shrink-0 motion-reduce:transition-none"
                aria-label={isTyping ? "שולח הודעה" : "שלח הודעה"}
              >
                {isTyping ? "שולח..." : "שלח"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
