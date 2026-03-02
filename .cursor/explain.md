# מבנה הפרויקט Serveup

## תיקיות ומטרתן

### `/app` – דפי האפליקציה
| קובץ | מטרה |
|------|------|
| `layout.tsx` | Layout ראשי – RTL, עברית, Providers |
| `page.tsx` | דף הבית – קישור להכנסה לאדמין |
| `globals.css` | סגנונות גלובליים, Tailwind, ערכת צבעים |

### `/app/admin` – פאנל ניהול
| קובץ | מטרה |
|------|------|
| `layout.tsx` | Layout של האדמין – AdminShell, רקע כהה |
| `page.tsx` | הפניה ל־/admin/dashboard |
| `login/page.tsx` | התחברות – שם משתמש/אימייל וסיסמה |
| `dashboard/page.tsx` | דשבורד – סטטיסטיקות, מסעדות אחרונות |
| `users/page.tsx` | ניהול משתמשים (רק סופר־אדמין) |
| `settings/page.tsx` | הגדרות (placeholder) |
| `restaurants/page.tsx` | רשימת מסעדות, קישור לעריכה |
| `restaurants/new/page.tsx` | יצירת מסעדה חדשה |
| `restaurants/[id]/page.tsx` | עריכת מסעדה – טופס, שולחנות, תפריט, תצוגה מקדימה |

### `/app/r/[slug]` – תפריט ציבורי
| קובץ | מטרה |
|------|------|
| `page.tsx` | תצוגת תפריט מסעדה לפי slug (לדוגמה /r/my-restaurant) |

### `/app/api` – API
| קובץ | מטרה |
|------|------|
| `auth/[...nextauth]/route.ts` | NextAuth – התחברות |
| `r/[slug]/route.ts` | JSON של מסעדה (לשימוש חיצוני/מובייל) |
| `admin/users/route.ts` | GET, POST משתמשים (רק SUPER_ADMIN) |
| `admin/users/[id]/route.ts` | DELETE משתמש |
| `admin/restaurants/route.ts` | GET, POST מסעדות |
| `admin/restaurants/[id]/route.ts` | GET, PUT, DELETE מסעדה |
| `admin/restaurants/[id]/tables/route.ts` | ניהול שולחנות |
| `admin/restaurants/[id]/categories/route.ts` | ניהול קטגוריות |
| `admin/categories/[id]/route.ts` | מחיקת קטגוריה |
| `admin/categories/[id]/dishes/route.ts` | הוספת מנה |
| `admin/dishes/[id]/route.ts` | עריכה/מחיקת מנה |
| `admin/upload/route.ts` | העלאת תמונות |

### `/components/admin` – קומפוננטות אדמין
| קובץ | מטרה |
|------|------|
| `AdminShell.tsx` | סרגל צד, ניווט, התנתקות |
| `LoginForm.tsx` | טופס התחברות |
| `UsersList.tsx` | רשימת משתמשים, הוספה, מחיקה |
| `RestaurantForm.tsx` | טופס יצירה/עריכת מסעדה |
| `MenuSection.tsx` | קטגוריות ומנות |
| `TablesSection.tsx` | ניהול שולחנות |

### `/components/restaurant` – תפריט ציבורי
| קובץ | מטרה |
|------|------|
| `RestaurantMenu.tsx` | תצוגת תפריט – גם לתצוגה מקדימה (forcePreview) |

### `/components/ui` – רכיבי UI
| קובץ | מטרה |
|------|------|
| `button.tsx` | כפתור |
| `input.tsx` | שדה קלט |
| `label.tsx` | תווית |

### `/lib` – לוגיקה משותפת
| קובץ | מטרה |
|------|------|
| `auth.ts` | הגדרות NextAuth, credentials |
| `prisma.ts` | חיבור Prisma |
| `utils.ts` | פונקציית cn() |
| `ip-check.ts` | בדיקת IP מורשה (localhost מותר) |
| `validation/restaurant.ts` | ולידציית מסעדה (Zod) |
| `validation/menu.ts` | ולידציית קטגוריה, מנה, שולחן |

### `/prisma` – מסד נתונים
| קובץ | מטרה |
|------|------|
| `schema.prisma` | סכמת DB |
| `seed.ts` | סופר־אדמין: zivrozen84@gmail.com / 123654RZ@ |
| `reset-admin.ts` | איפוס סיסמת סופר־אדמין |

### קבצי תצורה
| קובץ | מטרה |
|------|------|
| `next.config.js` | Next.js + serverComponentsExternalPackages ל־next-auth |
| `middleware.ts` | הגנה על /admin (מעבר ל־login) |
| `tailwind.config.ts` | Tailwind |
| `start.cmd` | הפעלת dev server ופתיחת הדפדפן |

---

## הרשאות
- **סופר־אדמין** (zivrozen84@gmail.com): גישה לכל הפאנל, כולל ניהול משתמשים.
- **אדמין**: גישה ל־Dashboard, מסעדות, הגדרות – ללא Users.

## הפעלה
```bash
npm run db:seed    # יצירת/עדכון סופר־אדמין
npm run dev        # או start.cmd
```

---

## הבהרות (הנחיות ל־AI)

- **עברית ואנגלית:** כשכותבים באנגלית (למשל שמות פקודות, משתנים, קוד) – להוסיף שורת רווח (ENTER) לפני הטקסט באנגלית, כדי שלא יתערבב עם העברית.

- **שמור בגיט:** כשהמשתמש אומר "שמור בגיט" או "שמור בגיט ובמחשב" – להריץ תמיד את שלוש הפקודות:
  1. `git add .`
  2. `git commit -m "..."` (הודעה מתאימה לפי השינויים)
  3. `git push`
