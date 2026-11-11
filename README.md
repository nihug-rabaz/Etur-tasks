# Etur-tasks

מערכת ניהול מודולרית של **nihug-rabaz** (שם החבילה בפרויקט: `etur1`) — אפליקציית ווב בעברית לניהול משימות ולמודולי משנה (מלש״בים, נגדים, דוברות, קצינים).

## מה יש במערכת

| מודול | נתיב ראשי | תפקיד |
|--------|-----------|--------|
| **משימות** (`tasks`) | `/dashboard`, משימות, פרויקטים, אדמין | ניהול משימות שוטף |
| **מלש״בים** (`malshabim`) | `/malshabim` | מועמדים, ראיונות, המתנה, לוח, סטטיסטיקות |
| **נגדים** (`nagadim`) | `/nagadim` | צינור מועמדים, תפקידים, פערים |
| **דוברות** (`dovrut`) | `/dovrut` | קמפיינים, פריטים, פניות, אישורים, חדשות |
| **קצינים** (`agam`) | `/agam` | מחזורים, מועמדים, פורטל מועמד, שאלונים |

בנוסף:

- **עוזר** (`assistant`) — סוכן פנימי
- **משימה לפיתוח** (`dev-feedback`) — דיווח באג/בקשת פיתוח עם צילום מסך, סימון על לוח, ואישור הרב קובי לפני Jira

רישום המודולים: `src/shared/modules/registry.ts`.

---

## משימה לפיתוח (Jira + הרב קובי)

זרימה עדכנית:

1. משתמש פותח **משימה לפיתוח** מהכותרת (FAB).
2. בוחר **מודול** (מלש״בים / דוברות / קצינים / נגדים) — יש **הצעה אוטומטית לפי החלון** הפתוח, עם אפשרות לשנות ידנית.
3. אפשר לצלם מסך ולסמן על **לוח מלא** (עט, צורות, טקסט עם תיבה W/H, מספרים, הסתרה, וכו׳).
4. **משתמש רגיל** → המשימה נשמרת ב־DB בלבד (`dev_feedback_pending`) — **לא נוצר כרטיס ב־Jira**.
5. **הרב קובי** רואה תור ממתינים ויכול:
   - להוסיף **הערה**
   - **לדחות** (בלי Jira)
   - **לאשר** → רק אז נפתח כרטיס ב־Jira ETUR, עם שיבוץ ו־SLA
6. אם **הרב קובי עצמו** פותח משימה → עוברת **ישר** לצוות הפיתוח ב־Jira.
7. **SLA:** 4 ימי עסקים (א׳–ה׳, שעון ירושלים) מחושבים מ־**תאריך האישור** (או מפתיחה ישירה של קובי), לא מתאריך הדיווח הראשוני.
8. שיבוץ אחרי אישור:
   - מלש״בים / נגדים / דוברות → **ליעד**
   - קצינים (וגם ברירת מחדל אחרת) → **זוהר**

קבצים מרכזיים:

- UI: `src/components/dev-feedback/`
- לוגיקה: `src/modules/dev-feedback/`
- API: `src/app/api/dev-feedback/`
- Jira: `src/services/jira.service.ts`
- טבלאות: `supabase/migrations/0060_dev_feedback_pending.sql`

---

## טכנולוגיות

| שכבה | בחירה |
|------|--------|
| Framework | **Next.js 16** (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, Lucide, Sonner |
| Auth | **NextAuth** + Google OAuth |
| Database | **Neon** (Postgres) — SQL ב־`supabase/migrations/` |
| קבצים | **Vercel Blob** (כשיש `BLOB_READ_WRITE_TOKEN`) |
| אינטגרציות | Jira Cloud REST, OneSignal, Telegram, (אופציונלי) Gemini/OpenAI לעוזר |
| Deploy | GitHub Actions → Vercel production (`nihug-rabaz/platform-workflows`) |

> יש חבילות `@supabase/*` ועוזרי לקוח תחת `src/lib/supabase/`, אבל **האימות בפועל הוא NextAuth**, וה־DB בזמן ריצה הוא Neon.

---

## מבנה הריפו

```
src/
  app/                 # App Router — דפים + API routes
  modules/             # מודולי מוצר (tasks, malshabim, nagadim, dovrut, agam, …)
  components/          # UI משותף (כולל app-shell, dev-feedback)
  services/            # שירותי תשתית (jira, notifications, authz, …)
  shared/              # registry מודולים, תפקידי מודול
  lib/                 # env, neon, auth-options, …
supabase/migrations/   # היסטוריית סכמה (מספרי מיגרציה)
.github/workflows/     # Deploy Production + Apply DB Migrations
scripts/               # כלי Neon / bootstrap
```

הערות:

- תיקיות כמו `ktizinim/` או עותקי `dovrut/` ישנים **אינן** חלק מ־`appModules` של האפליקציה הראשית.
- לפני שינויי Next.js — לקרוא את המדריכים תחת `node_modules/next/dist/docs/` (יש שבירות API בגרסה הזו). ראו גם `AGENTS.md`.

---

## הרצה מקומית

דרישות: Node.js מתאים ל־Next 16, משתני סביבה (לפחות DB + Auth).

```bash
npm install
npm run dev
```

פתיחה: [http://localhost:3000](http://localhost:3000)

סקריפטים:

| פקודה | תיאור |
|--------|--------|
| `npm run dev` | שרת פיתוח |
| `npm run build` | בנייה לפרודקשן |
| `npm run start` | הרצת build |
| `npm run lint` | ESLint |

קבצי env נטענים דרך `src/lib/env.ts` (למשל `.env.local`). **אין** `.env.example` בריפו — אין להכניס סודות לגיט.

### משתני סביבה עיקריים (שמות בלבד)

**חובה בסיסי**

- `DATABASE_URL`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**משימה לפיתוח / Jira**

- `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`
- `JIRA_ADMIN_ACCOUNT_ID`
- `JIRA_KOBI_EMAIL` (מי מורשה לאשר בתור)
- `JIRA_LIAD_ACCOUNT_ID` / `JIRA_LIAD_EMAIL`
- `JIRA_ZOHAR_ACCOUNT_ID` / `JIRA_ZOHAR_EMAIL`
- `BLOB_READ_WRITE_TOKEN` (אופציונלי — צירופים)

**אחרים לפי פיצ׳ר**

- OneSignal, Telegram, Cron (`CRON_SECRET`), מפתחות AI לעוזר, חיפוש/סיגנל לדוברות — לפי הקוד תחת `src/lib` ו־`src/services`

---

## Deploy לפרודקשן

1. Push / מיזוג ל־`main` (או `workflow_dispatch`).
2. Workflow **Deploy Production** (`.github/workflows/deploy-production.yml`) מריץ מטריצה מ־`VERCEL_DEPLOY_TARGETS` עם `VERCEL_TOKEN` דרך `platform-workflows@v1`.
3. מיגרציות DB: workflow נפרד **Apply DB Migrations** (ידני) מול Neon.

אין לסמוך על Vercel Git Integration כנתיב פרודקשן הראשי של הארגון — ה־deploy עובר ב־GitHub Actions.

Crons ב־`vercel.json` (תזכורות, דוברות lifecycle/news).

---

## תרומה וכללי עבודה

- קומיטים: זהות אנושית בלבד (לא Cursor Agent) — בדרך כלל `liad07`.
- לא להכניס `.env*` / טוקנים לגיט.
- שינויים במודול — לשמור על שכבות `modules/` + API דק ב־`app/api/`.
- אחרי שינוי התנהגות: build / בדיקה ידנית במסך הרלוונטי.

---

## רישיון

פרטי (`private: true` ב־`package.json`) — שימוש פנימי בארגון.
