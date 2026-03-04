# מבנה הפרויקט Serveup – מפורט

## תיקיות ומטרתן

### `/app` – דפי האפליקציה
| קובץ | מטרה |
|------|------|
| `layout.tsx` | Layout ראשי – RTL, עברית, Providers (SessionProvider וכו'). |
| `page.tsx` | דף הבית – קישור להכנסה לאדמין. |
| `globals.css` | סגנונות גלובליים, Tailwind, משתני צבע, אנימציות (modal-slide), scrollbar-hide, menu-scalable. |

### `/app/admin` – פאנל ניהול
| קובץ | מטרה |
|------|------|
| `layout.tsx` | Layout של האדמין – עטיפה ב־UnsavedChangesProvider, AdminShell (סרגל ימני), רקע כהה. |
| `page.tsx` | הפניה ל־/admin/dashboard. |
| `login/page.tsx` | דף התחברות – שם משתמש/אימייל וסיסמה (LoginForm). |
| `dashboard/page.tsx` | דשבורד – סטטיסטיקות, מסעדות אחרונות. |
| `users/page.tsx` | ניהול משתמשים – רק לסופר־אדמין (UsersList). |
| `settings/page.tsx` | הגדרות – כרגע placeholder. |
| `restaurants/page.tsx` | רשימת מסעדות, קישור לעריכה ולמפת שולחנות. |
| `restaurants/new/page.tsx` | יצירת מסעדה חדשה – RestaurantForm בלי תצוגה מקדימה. |
| `restaurants/[id]/page.tsx` | עריכת מסעדה – RestaurantEditWithPreview (טופס + תצוגה מקדימה + MenuSection), קישורים ל"מפת מסעדה" ו"צפה בתפריט". |
| `restaurants/[id]/map/page.tsx` | מפת שולחנות – RestaurantMapEditor. |

### `/app/r/[slug]` – תפריט ציבורי
| קובץ | מטרה |
|------|------|
| `page.tsx` | תצוגת תפריט מסעדה לפי slug – טעינה מ־Prisma, העברת restaurant + categories ל־RestaurantMenu עם phoneLayout. |
| `layout.tsx` | Layout ייעודי ל־/r אם קיים. |

### `/app/api` – API
| קובץ | מטרה |
|------|------|
| `auth/[...nextauth]/route.ts` | NextAuth – התחברות (credentials). |
| `r/[slug]/route.ts` | GET – JSON של מסעדה פעילה לפי slug (לשימוש חיצוני/מובייל). |
| `admin/users/route.ts` | GET, POST משתמשים (רק SUPER_ADMIN). |
| `admin/users/[id]/route.ts` | DELETE משתמש. |
| `admin/restaurants/route.ts` | GET, POST מסעדות (כולל שדות צבעים, opacity, expansionBackdropOpacity). |
| `admin/restaurants/[id]/route.ts` | GET, PUT, DELETE מסעדה. |
| `admin/restaurants/[id]/tables/route.ts` | ניהול שולחנות. |
| `admin/restaurants/[id]/categories/route.ts` | ניהול קטגוריות. |
| `admin/categories/[id]/route.ts` | מחיקת קטגוריה. |
| `admin/categories/[id]/dishes/route.ts` | הוספת מנה. |
| `admin/dishes/[id]/route.ts` | עריכה/מחיקת מנה. |
| `admin/dishes/[id]/copy-parameters/route.ts` | העתקת פרמטרים ממנה למנה (מנהל). |
| `admin/upload/route.ts` | העלאת תמונות. |
| `admin/restaurants/[id]/frame/route.ts` | PATCH מסגרת (frameUrl, frameVariants) אם קיים. |

### `/components/admin` – קומפוננטות אדמין
| קובץ | מטרה |
|------|------|
| `AdminShell.tsx` | סרגל צד ימני (ניווט: Dashboard, מסעדות, משתמשים, הגדרות), התנתקות. מטפל ב־hasUnsavedChanges – לחיצה על ניווט כשיש שינויים לא שמורים מפעילה triggerPulse (גלילה + הדגשת כפתור שמור) ולא עוברת דף. |
| `LoginForm.tsx` | טופס התחברות. |
| `UsersList.tsx` | רשימת משתמשים, הוספה, מחיקה. |
| `RestaurantForm.tsx` | טופס יצירה/עריכת מסעדה – שם, slug, בעלים, צבעים (כולל קטגוריות בועות, עגלה, עיגולים), נראות הוסף עגלה, נראות רקע הרחבה, תצוגת מנות, מסגרת, באנר, רקע תפריט, רקע תפריט עגלה, כפתורי שמור וביטול. מעדכן תצוגה מקדימה live (onFormChange). רישום ל־UnsavedChanges (setHasUnsavedChanges, registerPulseTrigger). |
| `RestaurantEditWithPreview.tsx` | עמודה שמאל: RestaurantForm + MenuSection. עמודה ימין: תצוגה מקדימה – מתג מצב מנהל/לקוח, RestaurantMenu (forcePreview), TextSettingsSection. merg את liveFormData עם menuProps.restaurant ל־previewRestaurant. |
| `MenuSection.tsx` | קטגוריות ומנות – הוספת קטגוריה, מנות, פרמטרים. |
| `TablesSection.tsx` | ניהול שולחנות. |
| `TextSettingsSection.tsx` | גודל טקסט ופונט – סליידר ומבחר פונט, מעדכן תצוגה מקדימה (previewTextSize, previewFontFamily). |
| `RestaurantMapEditor.tsx` | עריכת מפת שולחנות. |
| `RestaurantEditChoiceDialog.tsx` | דיאלוג בחירה אם קיים. |

### `/components/restaurant` – תפריט ציבורי ותצוגה מקדימה
| קובץ | מטרה |
|------|------|
| `RestaurantMenu.tsx` | תצוגת תפריט – רולטת קטגוריות, מנות (פורמט large/small/compact/imageRight), גלילה, לחיצה על מנה לפתיחת הרחבה (DishExpansionModal). משמש גם בתצוגה מקדימה (forcePreview) עם isAdminPreview. מעביר צבעים, expansionBackdropOpacity, cartBarControlsOpacity וכו' ל־BottomNavBar ו־DishExpansionModal. |
| `BottomNavBar.tsx` | שלושה עיגולים: **מלצר** (אייקון איש עומד), **עגלה**, **צ'אט**. החלקה למטה – 23% נראות; למעלה – עיגולי צד מורמים. אפקט לחיצה (scale + brightness). במצב חבוי – לחיצה על עיגול מחזירה בהחלקה בלי להפעיל פעולה. Callbacks: onBellClick (מלצר), onCartClick, onChatClick. |
| `DishExpansionModal.tsx` | מודאל הרחבת מנה – תמונה, כותרת, תיאור, פרמטרים, מחיר, הוסף לעגלה, כמות. בתצוגה מקדימה (embedInPhone): modal=false, ביטול scroll lock, onPointerDownOutside רק מחוץ ל־overlay (לחיצה בפאנל לא סוגרת). נראות רקע הרחבה שולטת בהשחרה על רקע תפריט עגלה. |

### `/components/ui` – רכיבי UI
| קובץ | מטרה |
|------|------|
| `button.tsx` | כפתור (forwardRef, variant, size). |
| `input.tsx` | שדה קלט. |
| `label.tsx` | תווית. |

### `/components` – שורש
| קובץ | מטרה |
|------|------|
| `providers.tsx` | SessionProvider וכו' אם קיים. |

### `/lib` – לוגיקה משותפת
| קובץ | מטרה |
|------|------|
| `auth.ts` | הגדרות NextAuth, credentials. |
| `prisma.ts` | חיבור Prisma. |
| `utils.ts` | פונקציית cn(). |
| `ip-check.ts` | בדיקת IP מורשה (localhost מותר). |
| `validation/restaurant.ts` | ולידציית מסעדה (Zod) – כולל expansionBackdropOpacity, cartBarControlsOpacity וכו'. |
| `validation/menu.ts` | ולידציית קטגוריה, מנה, שולחן. |
| `UnsavedChangesContext.tsx` | Context: hasUnsavedChanges, setHasUnsavedChanges, registerPulseCallback, triggerPulse. משמש בעריכת מסעדה – חסימת ניווט והדגשת שמור. |

### `/prisma` – מסד נתונים
| קובץ | מטרה |
|------|------|
| `schema.prisma` | סכמת DB – AdminUser, AllowedIP, LoginLog, Restaurant (כולל צבעים, textSize, fontFamily, expansionBackdropOpacity, bottomNavColor וכו'), Table, Category, Dish, paramCategories, parameters. |
| `seed.ts` | סופר־אדמין: zivrozen84@gmail.com / 123654RZ@ |
| `reset-admin.ts` | איפוס סיסמת סופר־אדמין. |

### קבצי תצורה
| קובץ | מטרה |
|------|------|
| `next.config.js` | Next.js + serverComponentsExternalPackages ל־next-auth. |
| `middleware.ts` | הגנה על /admin – מעבר ל־login. |
| `tailwind.config.ts` | Tailwind. |
| `start.cmd` | הפעלת dev server ופתיחת הדפדפן. |

---

## תצוגה מקדימה וצפה בתפריט – אותו קוד

**תצוגה מקדימה** (בדף עריכת מסעדה) ו**צפה בתפריט** (`/r/[slug]`) אמורים להיות **אותו קוד בדיוק** – RestaurantMenu עם אותם props (פורמט, צבעים, הרחבה). כל שינוי בתצוגה המקדימה חייב להתבצע גם בצפה בתפריט, ולהפך.

## מצב מנהל (תצוגה מקדימה)

בדף עריכת מסעדה יש תצוגה מקדימה עם מתג **מצב מנהל** / **מצב לקוח**:

- **מצב מנהל:** תצוגה כמו ללקוח + כפתורי עריכה (חובה/ריבוי, הוספת פרמטר/קטגוריה, העתק/הדבק פרמטרים, עריכת מחיר). שלושת העיגולים בתחתית: **מלצר**, עגלה, צ'אט.
- **מצב לקוח:** רק התצוגה שהלקוח רואה, בלי כפתורי עריכה.

## הרשאות

- **סופר־אדמין:** גישה לכל הפאנל, כולל ניהול משתמשים.
- **אדמין:** Dashboard, מסעדות, הגדרות – ללא Users.

## הפעלה

```bash
npm run db:seed    # יצירת/עדכון סופר־אדמין
npm run dev        # או start.cmd
npx prisma db push # אחרי שינוי סכמה
npx prisma generate
```

---

## מסך והדמיית טלפון – מסך רקע

**מסך רקע** = מהבאנר ולמטה עד לתחתית הטלפון (קטגוריות, מנות, עיגולי ניווט).

**רקע תפריט (תמונה):** תמונה אחת על מסך הרקע, cover, בלי הכפלות.

---

## הרחבה (מודאל הרחבת מנה)

**הרחבה** = המודאל שנפתח בלחיצה על מנה: תמונה, כותרת, תיאור, פרמטרים, מחיר, הוסף לעגלה, כמות.

- **קומפוננטה:** `DishExpansionModal.tsx`
- **רקע ההרחבה:** האזור שמאחורי המודאל – השחרה קבועה 70%.
- **רקע תפריט עגלה:** האזור *בתוך* המודאל מתחת לתמונת המנה – תמונת רקע + שכבת השחרה. הסקאלה **"נראות רקע הרחבה"** שולטת רק בהשחרה הזו: 100% = בלי השחרה, 0% = השחרה מקסימלית.
- **בתצוגה מקדימה:** modal=false, ביטול scroll lock על body, לחיצה בפאנל (מחוץ לתצוגה המקדימה) לא סוגרת את ההרחבה; לחיצה על ההשחרה סוגרת.

---

## שינויים לא שמורים וניווט

- טופס עריכת מסעדה מסמן hasUnsavedChanges לפי השוואה ל־initialData.
- לחיצה על קישור בסרגל (Dashboard, מסעדות וכו') כשיש שינויים לא שמורים: הניווט נחסם, כפתור שמור מודגש (זוהר אדום + הגדלה 140%) והמסך גולל אליו.
- כפתור ביטול מאפס את הטופס לערכים שמורים.

---

## הבהרות (הנחיות ל־AI)

- **עברית ואנגלית:** שורת רווח לפני טקסט באנגלית.
- **שמור בגיט:** `git add .` → `git commit -m "..."` → `git push`

---

## מה עשינו עד עכשיו (סיכום)

- **BottomNavBar:** שלושה עיגולים – **מלצר** (אייקון איש עומד), עגלה, צ'אט. במצב פתוח עיגולי צד מורמים; במצב מוחלק 23% נראות. החלקה חלקה (420ms), במצב חבוי לחיצה מחזירה בהחלקה בלי להפעיל פעולה. Callbacks: onBellClick (מלצר), onCartClick, onChatClick.
- **תצוגה מקדימה live:** צבעים ונראות מתעדכנים בתצוגה בזמן אמת; שמירה רק בלחיצת שמור. כפתור ביטול.
- **נראות רקע הרחבה:** סקאלה בטופס שולטת בהשחרה על רקע תפריט עגלה בהרחבה (100% = גלוי, 0% = מקסימום השחרה).
- **הרחבה בתצוגה מקדימה:** הפאנל והתצוגה לא חופפים – אפשר לגלול בפאנל ולבצע פעולות גם כשההרחבה פתוחה; לחיצה בפאנל לא סוגרת את ההרחבה.
