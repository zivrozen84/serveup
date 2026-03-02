# חיבור לוגים ל-Discord

המערכת יכולה לשלוח לוגים (שגיאות, אזהרות, הודעות) לערוץ Discord באמצעות **Webhook**.

---

## 1. יצירת Webhook בשרת Discord

1. בשרת Discord: **הגדרות ערוץ** (למשל #לוגים) → **Integrations** → **Webhooks**.
2. **New Webhook** – תן שם (למשל "Serveup Logs"), בחר את הערוץ.
3. **Copy Webhook URL** – כתובת בצורה:
   `https://discord.com/api/webhooks/123456789/abcdef...`

---

## 2. הגדרה בפרויקט

ב־**.env** הוסף (או עדכן):

```env
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/ה-ID/ה-Token"
```

אם המשתנה לא מוגדר או ריק – הלוגר רק מדפיס לקונסול, ולא שולח ל-Discord.

---

## 3. איפה הלוגים נשלחים

| סוג        | מתי נשלח ל-Discord |
|-----------|---------------------|
| **error** | שגיאות (למשל עדכון מנה נכשל) – Embed אדום עם פרטים. |
| **warn**  | אזהרות (למשל ניסיון התחברות מ-IP לא מורשה). |
| **log**   | הודעות כלליות (אם משתמשים ב־`log()` מהלוגר). |

הלוגר נמצא ב־`lib/logger.ts`. שימוש:

```ts
import { log, warn, error } from "@/lib/logger";

log("הודעה רגילה");
warn("אזהרה");
error("שגיאה", err);  // err אופציונלי – אם יש Error, ה-stack יישלח ל-Discord
```

כל קריאה גם מדפיסה לקונסול וגם שולחת ל-Discord (אם `DISCORD_WEBHOOK_URL` מוגדר). השליחה ל-Discord אינה חוסמת את האפליקציה.

---

## 4. אבטחה

- **אל תשתף** את כתובת ה-Webhook ולא תעלה אותה ל-Git (היא ב-.env שממוסגר ב-.gitignore).
- אם ה-Webhook דלף – מחק אותו ב-Discord וצור חדש, ועדכן את `.env`.
