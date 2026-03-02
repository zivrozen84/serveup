# איך לגרום לבוט לעבוד – מה לעשות מהצד שלך

מדריך צעד־אחר־צעד: איזה Webhook לחבר, מה להזין ב־Meta, ומה צריך ממך כדי שההחלפת מידע והאימות לפי טלפון יעבדו.

---

## 1. איזה Webhook לחבר

ה־URL שהמערכת חייבת לקבל מ־Meta:

| סביבה | כתובת ה־Webhook |
|--------|------------------|
| **פרודקשן (אתר באינטרנט)** | `https://הדומיין-שלך.com/api/webhooks/whatsapp` |
| **פיתוח מקומי** | צריך URL ציבורי (Meta לא מגיע ל־localhost). לדוגמה: `https://xxxx.ngrok.io/api/webhooks/whatsapp` |

דוגמאות:
- אם האתר על Vercel: `https://serveup.vercel.app/api/webhooks/whatsapp`
- אם אתה מריץ מקומי עם ngrok: `https://abc123.ngrok.io/api/webhooks/whatsapp`

חשוב: חובה **HTTPS**. Meta לא משתמש ב־HTTP.

---

## 2. מה להגדיר ב־Meta (מהצד שלך)

### 2.1 Verify Token (מחרוזת סודית)

- **מה זה:** מחרוזת שאתה בוחר. Meta שולחים אותה ב־GET כדי לאמת שה־URL שייך לך.
- **איפה מגדירים:** ב־**.env** בפרויקט:
  ```env
  WHATSAPP_VERIFY_TOKEN=בחר_מחרוזת_סודית_אקראית
  ```
  למשל: `WHATSAPP_VERIFY_TOKEN=serveup_wa_verify_xyz123`
- **אותו ערך** תזין ב־Meta כשמגדירים את ה־Webhook (שדה "Verify token").

### 2.2 איפה ב־Meta מגדירים את ה־Webhook

1. היכנס ל־[developers.facebook.com](https://developers.facebook.com) → האפליקציה שלך (Servup).
2. בתפריט: **WhatsApp** → **Configuration** (או **API Setup**).
3. סעיף **Webhook**:
   - **Callback URL:** הכתובת מהטבלה למעלה, למשל  
     `https://הדומיין-שלך.com/api/webhooks/whatsapp`
   - **Verify token:** **בדיוק** אותו ערך ששמת ב־`.env` ב־`WHATSAPP_VERIFY_TOKEN`.
4. שמירה. Meta ישלחו **GET** ל־URL; אם השרת מחזיר את ה־`challenge` – ה־Webhook יאומת ויופיע סימון הצלחה.

### 2.3 הרשמת ה־Webhook ל־Webhooks

- ב־**Configuration** / **Webhook** וודא ש־**Subscribe** מופעל ל־**WhatsApp Business Account** (או למספר הטלפון הרלוונטי), כך ש־**messages** (ואולי **message_echoes**) מסומנים.
- בלי זה ה־POST עם ההודעות לא יגיע ל־URL.

---

## 3. מה צריך ממך כדי להתחיל (החלפת מידע + אימות טלפון)

### 3.1 כבר קיים (אם הוספת קודם)

- **Access Token** – שמור ב־`.env` כ־`WHATSAPP_ACCESS_TOKEN`.
- **מספר טלפון** מאומת ב־API Setup (ואם יש – **Phone number ID**).

### 3.2 מה להעביר / להזין

| נתון | איפה לוקחים | איפה משתמשים |
|------|-------------|--------------|
| **Callback URL** | אתה קובע לפי הדומיין/ngrok (סעיף 1) | שדה "Callback URL" ב־Meta |
| **Verify token** | אתה בוחר, כותב ב־`.env` כ־`WHATSAPP_VERIFY_TOKEN` | שדה "Verify token" ב־Meta |
| **Phone number ID** | ב־Meta: WhatsApp → API Setup → ליד המספר שמופיע | במערכת: כדי לקשר מסעדה למספר הוואטסאפ |

### 3.3 קישור מסעדה למספר וואטסאפ

- ב־API Setup ב־Meta מופיע **Phone number ID** (מספר ארוך, למשל `931643386708884`).
- **מהצד שלך:** לעדכן במערכת (פאנל אדמין או ישירות ב־DB) שבמסעדה הרצויה השדה **whatsappPhoneNumberId** = ה־Phone number ID הזה.
- אחרי שזה שמור, כל הודעה שמגיעה למספר הזה ב־Webhook מזוהה עם המסעדה הזו, והאימות לפי טלפון (רק בעל המסעדה) רץ אוטומטית.

אם אין עדיין בממשק האדמין שדה ל־Phone number ID – אפשר לעדכן ישירות ב־DB:
`UPDATE restaurants SET whatsapp_phone_number_id = '931643386708884' WHERE id = ...;`  
(שם העמודה לפי Prisma: `whatsappPhoneNumberId`.)

### 3.4 טלפון בעל המסעדה (ownerPhone)

- **אימות טלפון:** הבוט משווה את מספר השולח (מה־Webhook) ל־**ownerPhone** של המסעדה שמקושרת ל־Phone number ID.
- **מהצד שלך:** וודא ש־**ownerPhone** במסעדה מוזן ונכון (כולל קידומת מדינה אם רלוונטי, למשל 972…). הבוט מנרמל ספרות ומשווה, אז 050-1234567 ו־972501234567 יתאימו.

---

## 4. סיכום – מה לעשות מהצד שלך

1. **להפעיל שרת** (מקומי או בפרודקשן) ש־`/api/webhooks/whatsapp` זמין.
2. **להגדיר ב־.env:**
   - `WHATSAPP_ACCESS_TOKEN` (כבר קיים)
   - `WHATSAPP_VERIFY_TOKEN=מחרוזת_סודית_שתבחר`
3. **ב־Meta:**
   - **Callback URL** = `https://הדומיין-או-ngrok/api/webhooks/whatsapp`
   - **Verify token** = אותו ערך כמו ב־`.env`.
   - לשמור ולוודא ש־Webhook מסומן כ־Verified.
   - להפעיל Subscribe להודעות (messages) ל־WhatsApp Business Account.
4. **להזין Phone number ID** במסעדה (בפאנל או ב־DB).
5. **לוודא ownerPhone** של המסעדה תואם למספר שממנו בעל המסעדה שולח.

אחרי זה הבוט אמור:
- לאמת את ה־Webhook (GET),
- לקבל הודעות (POST),
- לזהות מסעדה לפי `phone_number_id`,
- לאמת שהשולח = `ownerPhone`,
- להחזיר תפריט פקודות, לינק תפריט, עדכון צבעים וכו'.

---

## 5. פיתוח מקומי (localhost)

- Meta לא קורא ל־`http://localhost:...`.
- **פתרון:** להשתמש ב־**ngrok** (או שירות דומה):
  1. הרץ `ngrok http 3000` (או הפורט של Next.js).
  2. קח את ה־URL שניתן (למשל `https://abc123.ngrok.io`).
  3. הגדר ב־Meta: Callback URL = `https://abc123.ngrok.io/api/webhooks/whatsapp`.
  4. כל פעם ש־ngrok מתחלף (בגרסה חינמית) – לעדכן את ה־URL ב־Meta.

---

## 6. בדיקה מהירה

1. שלח למספר הוואטסאפ העסקי: **תפריט** או **היי**.
2. אמור to come back תשובה עם רשימת פקודות.
3. נסה **צבע ראשי #ff0000** – ואז בדוק בתפריט הציבורי שהצבע השתנה (אם המסעדה מקושרת ל־Phone number ID ו־ownerPhone תואם).

אם משהו לא עובד – לבדוק:
- לוגים של השרת (האם מגיע GET/POST ל־`/api/webhooks/whatsapp`).
- ש־Verify token זהה ב־Meta וב־`.env`.
- ש־Phone number ID שמור במסעדה הנכונה ו־ownerPhone תואם למספר שממנו שולחים.
