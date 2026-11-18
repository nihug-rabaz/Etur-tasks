# AI Software Factory — Etur-tasks (פיילוט)

> נוצר: 18.11.2026  
> מקור: סיכום חקירת org `nihug-rabaz` + Etur (הועבר מ־workspace אומ״ץ בטעות).  
> **להמשיך לעבוד מכאן — מריפו Etur-tasks — לא מ־ometz.**

## פסק דין

Etur הוא **הפיילוט הנכון** ל־AI Software Factory בארגון — לא כי הוא המפעל עצמו, אלא כי יש בו לולאה חיה:

```
דיווח (FAB) → שער קובי → Jira ETUR + SLA → פיתוח (Cursor) → Deploy Actions → (חסר: סגירה אוטומטית)
```

| מימד | מצב |
|------|-----|
| לולאת מוצר / ביקוש (control plane) | חזק — PASS |
| מפעל קוד (execution plane) | חלש — FAIL עד שלבים 4–6 |
| בשלות org כללית | ~45–55% · שלב ~3/5 |
| Deploy בארגון | ~103 ריפו עם deploy · ~3 עם CI |

**אסטרטגיה:** להוכיח לולאה סגורה ב־Etur → אחר כך לחלץ packages. **לא** fork של המונוליט כתבנית ארגון.

---

## גבול סוכנים (קשיח)

| סוכן | תפקיד | לא עושה |
|------|--------|---------|
| **לא נייהוז** (`src/modules/assistant/`) | סוכן **מוצר** — חיפוש, ניווט, API עם אישור | לא פותח PR, לא סוגר טיקטי פיתוח בקוד |
| **סוכן קוד (factory)** | קורא טיקט Jira + `AGENTS.md` → branch → PR | לא מחליף את העוזר בפרוד |

אל תחברו את העוזר לנתיב ה־PR.

---

## Acceptance criteria לפיילוט

| AC | הגדרה | מצב |
|----|--------|-----|
| AC1 Intake | דיווח → `dev_feedback_pending` בלי Jira | PASS (מוצר) |
| AC2 Approve | אישור קובי → Jira / דחייה בלי Jira | PASS (מוצר) |
| AC3 Dev handoff | טיקט מאושר → agent → PR עם מזהה טיקט | FAIL |
| AC4 Ship | merge → deploy חי + SHA | PASS תשתית / חסר קישור factory |
| AC5 Close loop | אחרי ship → Done + ראיות בטיקט | FAIL |
| AC6 Repeatable | שתי לולאות מלאות בלי הירואיות | FAIL |

הצלחה = שרשרת IDs מבוקרת ב־15 דקות: pending → Jira → PR → deploy SHA → done.

---

## 7 השלבים

### 1 — אמנה + גבול סוכנים
- **אצלנו:** לולאת מוצר ברורה; `AGENTS.md` = stub Next.
- **אמור:** אמנה כתובה (קובץ זה) + `AGENTS.md` לסוכן קוד; איסור חיבור עוזר→PR.
- **עבודה:** לשכתב `AGENTS.md` · תוויות `agent-pilot` · מדדי הצלחה.

### 2 — שער איכות על PR (CI)
- **אצלנו:** רק Deploy + Migrations.
- **אמור:** כל PR ל־`main` עובר lint (+ build אם יציב).
- **עבודה:** workflow `pull_request` · branch protection.

### 3 — חוזה טיקט לסוכן
- **אצלנו:** Jira אחרי אישור; בלי brief יציב לסוכן.
- **אמור:** מודול · AC · repro/צרופות · assignee · `agent-pilot` · Ready.
- **עבודה:** תבנית ב־`create-jira` / תיאור סטנדרטי.

### 4 — סוכן קוד → PR (עם אדם)
- **אצלנו:** Cursor ידני אחרי Jira.
- **אמור:** טיקט → draft PR; אדם סוקר וממזג; בלי auto-merge.
- **עבודה:** runner (Cursor SDK / Cloud / סקריפט) · לוג ticket↔PR.

### 5 — נתיב Ship נעול
- **אצלנו:** `platform-workflows@v1` עובד.
- **אמור:** merge פיילוט → SHA/URL כראיית ship.
- **עבודה:** אימות targets · צ׳קליסט CI→merge→Actions.

### 6 — סגירת לולאה
- **אצלנו:** Jira נשאר פתוח ידנית.
- **אמור:** deploy success → תגובה + Done.
- **עבודה:** Action/webhook קטן · override בכשל.

### 7 — חזרתיות
- **אצלנו:** הירואיות חד־פעמית.
- **אמור:** N≥2 לולאות · runbook · רשימת extract later (בלי fork).
- **עבודה:** טיקט שני E2E · מדידת זמנים.

**נתיב קריטי:** `1 → 2 → 3 → 4 → 5 → 6 → 7`  
שלב 4 תלוי ב־1+2+3. שלב 7 תלוי בלולאה סגורה.

---

## סלייס ראשון (שבועיים)

1. שלב 1 — אמנה + `AGENTS.md`
2. שלב 2 — CI על PR
3. שלב 3 — תבנית טיקט + label
4. Spike שלב 4 — PR אחד מסוכן (בלי auto-close)

**יציאה:** CI חובה · PR אחד מקושר לטיקט · העוזר לא נגע.

---

## מה לחלץ אחר כך (לא עכשיו)

1. `@nihug/assistant-kit` — SSE, tools, confirm, audit  
2. `@nihug/dev-feedback` — FAB, pending, Jira SLA  
3. `@nihug/app-modules` — registry + roles  
4. workflow stubs — כבר org-standard  

**לא לחלץ כ־template:** מודולי malshabim/agam/dovrut/nagadim, `ktizinim/`, סקריפטי migration-tmp.

---

## מחוץ לסcope עד אחרי שלב 7

- ריפקטור מודולי מוצר  
- סטנדרטיזציה ל־~100 ריפו  
- AutoJira (מומלץ אחר כך)  
- צי סוכנים headless מלא  
- שינוי `platform-workflows`  

---

## קבצים רלוונטיים בריפו

| נושא | נתיב |
|------|------|
| Dev-feedback | `src/modules/dev-feedback/` · `src/components/dev-feedback/` |
| עוזר מוצר | `src/modules/assistant/` |
| Registry | `src/shared/modules/registry.ts` |
| Jira | `src/services/jira.service.ts` |
| Deploy | `.github/workflows/deploy-production.yml` |
| Migrations | `.github/workflows/apply-db-migrations.yml` |
| Create Jira (Actions) | `.github/workflows/create-dev-jira.yml` (ב־GitHub; ייתכן שלא מסונכרן מקומית) |

---

## Canvas ב־Cursor (ויזואלי)

בפרויקט Cursor של Etur (לא בגיט):

- `canvases/ai-software-factory-maturity.canvas.tsx` — בשלות org  
- `canvases/etur-factory-pilot.canvas.tsx` — פיילוט + AC  
- `canvases/etur-factory-7-stages.canvas.tsx` — מפת 7 השלבים  

נתיב דיסק טיפוסי:

`C:\Users\liad0\.cursor\projects\c-Users-liad0-OneDrive-Documents-code-Etur-tasks\canvases\`
