# אפיון מלא — מערכת ניהול פרויקטים וקונספטים — מדור דוברות

> מסמך זה מתעד את כל המערכת: מטרה, סטאק, מודל נתונים, רצף עסקי, עמודים, לוגיקת אישורים, פונקציות backend, אילוצים והערות קריטיות. 
> מיועד להיות מוזן לכלי AI נוסף שיצטרך להבין או להרחיב את המערכת.

---

## 1. רקע ומטרה

המערכת משמשת את **מדור הדוברות** (גוף צבאי/דתי-צבאי) לניהול פרויקטים תקשורתיים וקונספטים תוכן (כתבות, ראיונות, פוסטים לרשתות חברתיות). היא מאפשרת:
- ניהול פרויקטים וקונספטים תחתיהם.
- מעקב אחר סטטוס עבודה (planning → production → publish).
- **ציר אישורים היררכי** רב-שלבי (רמ״ח/רמ״ט/רבצ״ר → אושר) שתלוי בתחום (domain) של הקונספט.
- חיפוש חדשות חיצוני (Google Custom Search) לצורך תיעוד והתראה.
- ניהול משתמשים והרשאות (admin / user / approver).
- שליחת תזכורות WhatsApp למאשרים (באמצעות פתיחת wa.me).

המערכת כולה **עברית בלבד (RTL)**. כל הטקסטים ב-UI, שמות השדות בלוג, ותצוגות ה-label/description הם בעברית.

---

## 2. סטאק טכנולוגי

- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui (Radix) + lucide-react.
- **State/Data fetching**: @tanstack/react-query v5 (שמות queryKey מבוססי-מערך, invalidations ידניים אחרי mutations).
- **Routing**: react-router-dom v6 (`BrowserRouter`, `Routes`, `Route`), פרמטרים ב-querystring (`?id=`).
- **Animations**: framer-motion.
- **Forms**: לא react-hook-form — הטפסים כתובים ידנית עם `useState` (ConceptForm, ProjectForm, ApproverManagement).
- **Backend-as-a-Service**: Base44 — SDK מאותחל ב-`@/api/base44Client` כ-`base44`.
  - ישויות (entities) ניגשות דרך `base44.entities.<Name>.list/filter/get/create/update/delete/...`
  - אינטגרציות (Core) דרך `base44.integrations.Core.UploadFile/InvokeLLM/...`
  - פונקציות backend דרך `base44.functions.invoke(name, payload)` → מחזיר `{data}`.
  - Auth: `base44.auth.me()`, `base44.auth.updateMe(data)`, `base44.auth.logout()`, `base44.auth.redirectToLogin()`.
  - `base44.asServiceRole.entities.<Name>.<op>` — עוקף RLS ומשמש בפונקציות backend.
- **Backend functions**: קבצי `entry.ts` תחת `base44/functions/<name>/` — Deno + `@base44/sdk`, רצים על runtime עם משתני סביבה (`Deno.env.get(...)`).
- **App router**: `src/App.jsx` + `src/pages.config.js`. **חשוב**: דף חדש לא נרשם אוטומטית ב-`pages.config` — יש להוסיף `<Route>` מפורש ב-`App.jsx`.
- **Build/symbol convention**: import alias `@/` ל-`src/`. **אסור** להשתמש ב-`require` או `module.exports` בפרונטאנד (ESM בלבד). ה backend כן משתמש ב-`npm:` imports (Deno).

---

## 3. מודל נתונים (ישויות)

כל ישות מכילה שדות מובנים: `id`, `created_date`, `updated_date`, `created_by_id`. אין להגדיר אותם בסכמה. שדה `created_by` מופיע ב-UI אבל בפועל נשמר כ-`created_by_id`.

### 3.1 Project
```jsonc
{
  "name":"Project",
  "type":"object",
  "properties":{
    "name":{"type":"string"},
    "description":{"type":"string"},
    "target_audiences":{"type":"array","items":{"type":"string"}},
    "status":{"type":"string","enum":["active","completed","on_hold"],"default":"active"}
  },
  "required":["name"]
}
```
שדות נוספים מובנים: `id`, `created_date`, `updated_date`, `created_by_id`.

### 3.2 Concept (הישות המרכזית)
```jsonc
{
  "name":"Concept",
  "type":"object",
  "properties":{
    "name":{"type":"string"},
    "project_id":{"type":"string"},
    "type":{"type":"string","enum":["article_interview","social_media"]},
    "domain":{"type":"string","enum":["kashrut","halacha","reut","tipuch","lehaka","zuq","masan","agam_hachsharot","logistic","field"]},
    "interviewees":{"type":"array","items":{"type":"string"}},
    "media_outlet":{"type":"string"},
    "needs_briefing":{"type":"boolean","default":false},
    "link":{"type":"string"},
    "details":{"type":"string"},
    "notes":{"type":"string"},
    "work_status_article":{"type":"string","enum":["planning","production","waiting_approvals","waiting_spokesperson","waiting_publish","published"],"default":"planning"},
    "content_type":{"type":"string","enum":["carousel","video","image","reels","text"]},
    "draft_text":{"type":"string"},
    "draft_images":{"type":"array","items":{"type":"string"}},
    "draft_videos":{"type":"array","items":{"type":"string"}},
    "partners":{"type":"array","items":{"type":"string"}},
    "work_status_social":{"type":"string","enum":["planning","production","waiting_approval","waiting_publish","published"],"default":"planning"},
    "approval_status":{"type":"string","enum":["waiting_spokesperson_officer","waiting_branch_head","waiting_deputy_commander","waiting_chief_rabbi","waiting_command_rabbi","approved"],"default":"waiting_spokesperson_officer"},
    "rejection_reason":{"type":"string"},
    "rejected_at_step":{"type":"string"},
    "last_rejection_date":{"type":"string","format":"date-time"}
  },
  "required":["name","project_id","type"]
}
```

**חשוב — הבדלים בין סוגי קונספט**:
- `type === "article_interview"` — משתמש ב-`work_status_article`, מקבל `interviewees`, `media_outlet`, `needs_briefing`, `domain`, ועובר **ציר אישורים** (`approval_status`).
- `type === "social_media"` — משתמש ב-`work_status_social`, מקבל `content_type`, `draft_text`, `draft_images`, `draft_videos`, `partners`. **לא** עובר ציר אישורים. `ConceptForm` מוחק שדות לא רלוונטיים לפני שליחה.

### 3.3 ActivityLog
```jsonc
{
  "name":"ActivityLog",
  "properties":{
    "concept_id":{"type":"string"},
    "project_id":{"type":"string"},
    "action_type":{"type":"string","enum":["created","updated","status_changed","approval_changed","deleted"]},
    "field_changed":{"type":"string"},
    "old_value":{"type":"string"},
    "new_value":{"type":"string"},
    "details":{"type":"string"},
    "user_name":{"type":"string"},
    "user_email":{"type":"string"}
  },
  "required":["action_type","user_name"]
}
```
נכתב בשתי דרכים:
- מהקליינט `ConceptDetails` — בעת עדכון שדות (עושה `bulkCreate` של שורות לכל שדה שהשתנה).
- מפונקציית `updateConceptApproval` — בעת אישור/דחייה (`user_name: 'System'`).

### 3.4 User (מובנה על ידי Base44)
שדות מובנים: `id`, `created_date`, `updated_date`, `full_name`, `email`, `role` ('admin'|'user').
שדה מותאם: 
```jsonc
{
  "custom_role":{"type":"string","enum":["approver"]}
}
```
- אין RLS מותאם כרגע — ברירת המחדל של Base44: רק admin יכול לעדכן/למחוק משתמשים אחרים.
- **אין ליצור User דרך ה-SDK** — יש להזמין משתמשים עם `base44.users.inviteUser(email, role)`.
- כדי לעדכן `role`/`custom_role` למשתמש אחר **חובה** לעבור דרך פונקציית ה-backend `updateUserRole` (כי ה-SDK הקליינטי חוסם זאת: "you are not authorized to change user").
- שדות נוספים שמוחזרים מ-`listUsers`: `disabled`, `is_verified`, `force_password_reset`, `collaborator_role`, `_app_role`, `approvers`.

---

## 4. אימות, תפקידים והרשאות

### 4.1 תפקידים
- `role = "admin"` — גישה מלאה: יצירת/עריכת/מחיקת פרויקטים, קונספטים, מחיקת קונספטים, שינוי סטטוס אישור, ניהול משתמשים, ניהול מאשרים.
- `role = "user"` — חפ״ש. יכול לצפות, ליצור קונספטים, לערוך קונספטים, אבל **לא** יכול למחוק או לשנות approval_status.
- `custom_role = "approver"` — מאשר חיצוני שרואה רק את עמוד `ConceptApproval`. ה-Layout מבצע redirect אוטומטי ל-`ConceptApproval` אם המשתמש הוא approver ושמו בעמוד אחר.

### 4.2 תבנית הניווט (src/Layout.jsx)
- ה-navItems מחושבים לפי ה-user:
  - `custom_role === 'approver'` → רק "אישור קונספטים".
  - אחרת: דשבורד, פרויקטים, קונספטים, חיפוש חדשות, ניהול משתמשים (admin-only), ניהול מאשרים (admin-only).
- `useEffect` ב-Layout מבצע redirect ישירות ל-`ConceptApproval` אם approver נמצא בעמוד אחר.

### 4.3 Auth flow
- `AuthProvider` ב-`src/lib/AuthContext.jsx`: טוען public settings מ-`/api/apps/public/...`, אח״כ `base44.auth.me()`.
- מצבים: `isLoadingAuth`, `isLoadingPublicSettings`, `authError` (`auth_required` / `user_not_registered` / `unknown`).
- `UserNotRegisteredError` — דף שמוצג למשתמש לא רשום.
- אין login page ידני — הפלטפורמה מספקת אותו.

### 4.4 RLS
- **לא מוגדר RLS מותאם** באף ישות נכון לעכשיו. המערכת מסתמכת על ברירת המחדל של Base44.
- ⚠️ לפני הוספת הגבלות גישה יש לטעון את `get_capability_guide("rls")` ולפעול לפיו.

---

## 5. רצף עסקי — ציר האישורים (Approval Flow)

ציר האישורים תלוי ב-`domain` של הקונספט (כש-`type === "article_interview"`). מוגדר **בשני מקומות שצריכים להישאר מסונכרנים**:
1. קליינט: `src/components/ui/ApprovalTimeline.jsx` (`domainFlows`).
2. Backend: `base44/functions/updateConceptApproval/entry.ts` (`domainFlows`).

### 5.1 מפת תחומים → סדר שלבים
| domain | שלבים |
|---|---|
| `kashrut`, `halacha`, `reut` | `waiting_branch_head` → `waiting_deputy_commander` → `waiting_chief_rabbi` → `approved` |
| `tipuch`, `lehaka`, `zuq`, `masan`, `agam_hachsharot`, `logistic`, `field` | `waiting_deputy_commander` → `waiting_chief_rabbi` → `approved` |

- `waiting_spokesperson_officer` **מופיע בסכמה כברירת מחדל**, אבל בפועל `ConceptForm` מציב ערך התחלתי לפי ה-`domain`:
  - תחומים kashrut/halacha/reut → `waiting_branch_head`.
  - שאר תחומים → `waiting_deputy_commander`.

### 5.2 אישור / דחייה
- האישור/דחייה נעשה **דרך פונקציית backend** `updateConceptApproval`, **לא** ישירות דרך `Concept.update`.
- קלט: `{ conceptId, action: 'approve'|'reject', approvalStep, rejectionReason? }`.
- `approvalStep` חייב להתאים ל-`approval_status` הנוכחי — אחרת שגיאת "Approval step mismatch".
- **approve**: מקדם לשלב הבא ב-flow, או משאיר ב-`approved` אם כבר בסוף.
- **reject**: מאפס ל-ברירת המחדל הראשונה של ה-flow, מציב `work_status_article='planning'`, שומר `rejection_reason`, `rejected_at_step`, `last_rejection_date`, ומייצר ActivityLog עם `details`.

### 5.3 קוד אישור (Approval Code)
- פורמט: `${conceptId}:${approvalStep}` — מועתק ל-clipboard דרך כפתור ב-`ApprovalTimeline`.
- מוזן ב-`ConceptApproval` על ידי המאשר. הקליינט מפרק את הקוד ל-`conceptId` ו-`approvalStep` (אופציונלי). אם סופק `approvalStep` ואינו תואם ל-`approval_status` הנוכחי — שגיאת validation נדרשת מהמשתמש.

### 5.4 עמודי אישור נפרדים
- `/approval/branch-head` → `ApprovalBranchHead` (רמ״ח).
- `/approval/deputy-commander` → `ApprovalDeputyCommander` (רמ״ט).
- `/approval/chief-rabbi` → `ApprovalChiefRabbi` (רבצ״ר).
- כל אלה מסננים `Concept.list()` לפי `approval_status` מתאים. לאחר בחירת קונספט מציגים `ConceptApprovalDetails` עם כפתורי approve/reject.
- קיימת גם דרך כניסה נוספת דרך ה-Layout: `/ConceptApproval` — עבור `custom_role === 'approver'`.

### 5.5 אישור ידני על ידי admin (ConceptDetails)
- ב-`ConceptDetails`, admin יכול ללחוץ על שלב ב-`ApprovalTimeline` והקליינט קורא ישירות ל-`Concept.update({ approval_status, rejection_reason: '', rejected_at_step: '' })`. **זה עוקף את הפונקציה** ולא יוצר ActivityLog — התנהגות זו ידועה.
- לא-admin רואה הודעה: "רק מנהל יכול לשנות את סטטוס האישורים".

---

## 6. סטטוסי עבודה (work status)

### 6.1 לכתבה/ראיון (`work_status_article`)
`planning` → `production` → `waiting_approvals` → `waiting_spokesperson` → `waiting_publish` → `published`

### 6.2 לרשתות חברתיות (`work_status_social`)
`planning` → `production` → `waiting_approval` → `waiting_publish` → `published`

- הסטטוס מוצג ב-`StatusTimeline` עם צבעים: ירוק לשלבים שעברו, אפור לשלב הנוכחי והלאה. מסודר RTL (השלב הראשון ימינה).
- שינוי סטטוס מתבצע ב-`ConceptDetails` ישירות דרך `Concept.update` ולא דרך פונקציית backend.

---

## 7. ניווט ועמודים

### 7.1 ראוטים ב-`src/App.jsx`
- `/` → `Dashboard` (mainPage).
- `/<PageKey>` → דרך `pagesConfig` loop (ConceptApproval, ConceptDetails, Concepts, Dashboard, NewsSearch, ProjectDetails, Projects, UserManagement).
- `/approval/branch-head` → `ApprovalBranchHead` (מפורש מחוץ ל-loop).
- `/approval/deputy-commander` → `ApprovalDeputyCommander`.
- `/approval/chief-rabbi` → `ApprovalChiefRabbi`.
- `/approver-management` → `ApproverManagement`.
- `*` → `PageNotFound`.

⚠️ **לדף חדש יש להוסיף `<Route>` מפורש ב-App.jsx** — ה-loop ב-`pagesConfig` לא מכליל דפים חדשים. יש לעטוף את העמוד ב-`LayoutWrapper` שמקבל `currentPageName`.

### 7.2 רשימת עמודים מרכזיים

| עמוד | קובץ | תפקיד |
|---|---|---|
| Dashboard | `src/pages/Dashboard.jsx` | סטטיסטיקות (פרויקטים/קונספטים/ממתינים/פורסמו), רשימת פרויקטים מקוצרת, קונספטים אחרונים, יצירת פרויקט (dialog). |
| Projects | `src/pages/Projects.jsx` | כל הפרויקטים עם חיפוש/סינון ויצירה. |
| ProjectDetails | `src/pages/ProjectDetails.jsx` | פרויקט בודד + כל הקונספטים שלו ב-tabs (הכל/כתבות/רשתות). יצירת קונספט (dialog). |
| Concepts | `src/pages/Concepts.jsx` | כל הקונספטים, מסוננים לפי סוג/פרויקט/סטטוס. |
| ConceptDetails | `src/pages/ConceptDetails.jsx` | עמוד עשיר לקונספט: סטטוס + ציר אישורים למאשר (admin) + היסטוריית ActivityLog + קישורים + notes. |
| NewsSearch | `src/pages/NewsSearch.jsx` | חיפוש חדשות Google Custom Search עם סינון תאריכים ועימוד. |
| UserManagement | `src/pages/UserManagement.jsx` | רשימת משתמשים ושינוי `role`/`custom_role` (דרך `updateUserRole`). |
| ApproverManagement | `src/pages/ApproverManagement.jsx` | ניהול מאשרים: טלפון + תבנית הודעה + שליחת WhatsApp (wa.me). |
| ConceptApproval | `src/pages/ConceptApproval.jsx` | חיפוש קונספט לפי קוד, הצגת `ConceptApprovalDetails`. |
| ApprovalBranchHead/DeputyCommander/ChiefRabbi | `src/pages/Approval*.jsx` | סביבות אישור נפרדות לכל דרגה. |

### 7.3 קומפוננטות עיקריות
- `src/Layout.jsx` — RTL glass-styled navbar עם פריטי ניווט מותני תפקיד, dropdown משתמש, mobile sheet.
- `src/components/ConceptApprovalDetails.jsx` — כרטיס פרטי קונספט עבור מאשרים, כולל כפתורי approve/reject + סיבת דחייה.
- `src/components/ApprovalSearchBox.jsx` — שדה קלט לקוד אישור.
- `src/components/concept/StatusTimeline.jsx` — ציר סטטוסי עבודה (אופקי).
- `src/components/ui/ApprovalTimeline.jsx` — ציר אנכי של שלבי אישור.
- `src/components/ui/StatusBadge.jsx` — badge צבעוני לפי סוג סטטוס (status/content/concept/domain).
- `src/components/concepts/ConceptCard.jsx` / `projects/ProjectCard.jsx` — כרטיסי רשימה.
- `src/components/forms/ConceptForm.jsx` / `ProjectForm.jsx` — טפסי יצירה/עריכה.
- `src/components/news/NewsArticleCard.jsx` — כרטיס תוצאת חיפוש חדשות.
- `src/components/utils/hebrewTranslations.jsx` — מיפויי שדות/ערכים/פעולות לעברית עבור ActivityLog.
- `src/lib/AuthContext.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/UserNotRegisteredError.jsx` — auth scaffolding.

---

## 8. פונקציות Backend (`base44/functions/<name>/entry.ts`)

### 8.1 `getConceptForApproval`
- קלט: `{ conceptId }`.
- מחזיר: `{ concept, project }`.
- קורא ישירות ל-`base44.asServiceRole.entities.Concept.filter({ id: conceptId })` (אין בדיקת הרשאה — נגיש לכל מי שמזדהה נכון, כולל approver).
- משמש את `ConceptApproval` להציג קונספט לפי קוד.

### 8.2 `updateConceptApproval`
- קלט: `{ conceptId, action: 'approve'|'reject', approvalStep, rejectionReason? }`.
- לוגיקה:
  1. מוודא ש-`approvalStep === concept.approval_status` (אחרת 400 "Approval step mismatch").
  2. שולף `domain` ובוחר את `domainFlows[domain]`.
  3. **approve**: מקדם לשלב הבא, או מחזיר "already fully approved".
  4. **reject**: מאפס ל-`flow[0]`, מציב `work_status_article='planning'`, `rejection_reason`, `rejected_at_step`, `last_rejection_date`.
  5. כותב ActivityLog (`action_type='approval_changed'`, `user_name='System'`, מצרף `details` עם סיבת דחייה).
- ⚠️ **לא מבוצעת בדיקת admin/approver** — כל מי שמאומת יכול לקרוא. אם רוצים לחייב approver/admin, יש להוסיף בדיקה.

### 8.3 `searchNews`
- קלט: `{ q, dateFilter, startDate?, endDate?, start }`.
- משתמש ב-`GOOGLE_CUSTOM_SEARCH_API` ו-`GOOGLE_CUSTOM_SEARCH_ENGINE_ID` (secrets מוגדרים באפליקציה).
- פורמט שאילתה: עוטף את ה-query ב-`"..."` (exact phrase) + `exactTerms`.
- פרמטרים: `gl=il`, `hl=iw`, `num=10`, `start` (עמוד 1–9, max 91).
- תאריכים: קבועים (`day`/`week`/`lastWeek`/`month`/`year` → `dateRestrict`), או `custom` (`sort=date:r:YYYYMMDD:YYYYMMDD`).
- post-processing: regex exact-phrase match על `title`/`snippet` כדי לסנן תוצאות False Positive.
- פלט: `{ articles[], totalResults, query, hasNextPage, nextStartIndex, currentStart }`.
- `article` shape: `{ id, title, description, url, publishedAt, source, imageUrl }`.

### 8.4 `listUsers`
- בודק `role==='admin'`, אחרת 403.
- מחזיר `{ users: [...] }` דרך `base44.asServiceRole.entities.User.list()`.

### 8.5 `updateUserRole`
- קלט: `{ userId, data }`.
- בודק `role==='admin'` וגם ש-`userId !== currentUser.id` (אסור לשנות את עצמך).
- קורא ל-`base44.asServiceRole.entities.User.update(userId, data)`.
- מאפשר לעקוף את המגבלה המובנית של Base44 על עדכון `role`/`custom_role` מהקליינט.
- ה-UI ב-`UserManagement` קורא לו דרך `base44.functions.invoke('updateUserRole', ...)`, עם toast הצלחה/שגיאה.

---

## 9. אינטגרציות (Core)

- `base44.integrations.Core.UploadFile({ file })` — מחזיר `{ file_url }`. משמש ב-`ConceptForm` להעלאת תמונות (`draft_images`).
- `base44.integrations.Core.InvokeLLM` — עדיין לא בשימוש באפליקציה.
- `SendEmail` — שולח אימייל רק למשתמשים **רשומים** באפליקציה.

---

## 10. שליחת תזכורות WhatsApp (ApproverManagement)

- הגדרות נשמרות על ה-User עצמו: `base44.auth.updateMe({ approvers })`.
- מבנה `approvers`:
  ```js
  {
    branch_head: { name: 'רמ״ח', phone: '', message: '' },
    deputy_commander: { name: 'רמ״ט', phone: '', message: '' },
    chief_rabbi: { name: 'רבצ״ר', phone: '', message: '' }
  }
  ```
- כפתור "הוסף קישור של הסביבה להודעה" — מוסיף URL מותאם לכל תפקיד לתוך תבנית ההודעה:
  - `https://dovrut.rabaz-idf.com/approval/branch-head`
  - `https://dovrut.rabaz-idf.com/approval/deputy-commander`
  - `https://dovrut.rabaz-idf.com/approval/chief-rabbi`
- שליחה: פותח חלון `https://wa.me/${phone}?text=${encodeURIComponent(message)}` בלשונית חדשה. **לא** API — תלוי ב-WhatsApp Web של המשתמש. חייב `phone` ו-`message`.
- ההגדרות מוסתרות מאחורי כפתור gear (Settings). ברירת המחדל — מצב "שליחה" בלבד.

---

## 11. תצוגה ויזואלית ו-UX

- **RTL** הושם בכל עמוד (`dir="rtl"`) ובכל דיאלוג/Alert.
- סגנון: "glassmorphism" — `backdrop-blur-xl bg-white/60`, צללים רכים, gradients עדינים (slate/blue/purple).
- תגיות סטטוס צבעוניות מרוכזות ב-`StatusBadge.jsx`. **לא להוסיף badge ידני** — להשתמש ב-`StatusBadge`.
- States: loading באמצעות `animate-pulse` (Tailwind) או `<Loader2 className="animate-spin" />`, ריק באמצעות כרטיס dashed עם אייקון.
- `framer-motion` — אנימציות כניסה (opacity/y), hover y-(-4).
- `date-fns` `format` לתאריכים — dd/MM/yyyy ו- HH:mm.
- `createPageUrl('PageName?id=...')` — כל הלינקים הפנימיים עוברים דרכו (מ-`@/utils`).

---

## 12. לוגיקה לדוגמה — מחזור חיים של קונספט

1. נוצר ב-`ProjectDetails` → `ConceptForm` עם `type=article_interview`, `domain=kashrut`.
2. הטופס קובע `approval_status='waiting_branch_head'` ו-`work_status_article='planning'`, מוחק שדות social.
3. הקונספט נשמר. ה-`ConceptCard` מציג badges: סוג, work_status, approval_status.
4. ב-`ConceptDetails` משנים `work_status_article` על ידי לחיצה על `StatusTimeline` (ישירות `Concept.update`).
5. admin לוחץ על עיגול ב-`ApprovalTimeline` → `Concept.update({ approval_status: nextStep })`.
6. כש-`approval_status === 'waiting_deputy_commander'`, הקונספט מופיע אוטומטית בעמוד `/approval/deputy-commander`.
7. המאשר פותח את הקונספט, לוחץ "אשר" → נקראת `updateConceptApproval` → עובר ל-`waiting_chief_rabbi`.
8. רבצ״ר מאשר → `approved`.
9. במקרה של דחייה: `approval_status` חוזר ל-`waiting_branch_head` (או `waiting_deputy_commander` לפי ה-flow), `work_status_article='planning'`, `rejection_reason` ו-`rejected_at_step` נשמרים, ActivityLog נוצר.
10. ב-`ConceptDetails` ההיסטוריה מוצגת לאחר לחיצה על "הצג" — מתורגמת דרך `hebrewTranslations.jsx`.

---

## 13. הערות קריטיות לכלי AI שמתעסק בלוגיקה

1. **סנכרון ציר אישורים**: כל שינוי ב-`domainFlows` חייב להיעשות **גם** ב-`ApprovalTimeline.jsx` **וגם** ב-`updateConceptApproval/entry.ts`. אחרת ייווצר פער בין מה שה-UI מציג למה שה-backend מאפשר.
2. **לא לעדכן `role`/`custom_role` דרך `base44.entities.User.update`** מהקליינט — זה ייכשל עם "you are not authorized to change user". חובה לעבור דרך פונקציית `updateUserRole`.
3. **לא למחוק/לעדכן משתמש עם שאילתה ריקה** מ-`asServiceRole` — ברירת המחדל פתוחה.
4. **`asServiceRole`** עוקף RLS — להשתמש רק בתוך פונקציות backend, אף פעם לא בקליינט.
5. **יצירת דף חדש דורשת** הוספת `<Route>` מפורש ב-`src/App.jsx` + עטיפה ב-`LayoutWrapper` שמקבל `currentPageName`. ה-loop ב-`pagesConfig` לא מכליל דפים חדשים.
6. **עדכון ישות User מתוך פונקציית backend** עובד רק עם `asServiceRole`. אין לעדכן מהקליינט ישירות.
7. **`ConceptForm` מוחק שדות לא רלוונטיים** לפני שליחה (לפי `type`). שדה חדש שמוסיפים צריך להיכנס ל-`delete` המתאים או לא להישלח.
8. **`approver` (custom_role)** נדרש redirect ב-Layout — אם יורדים ממנו ולא מעדכנים את ה-Layout, הוא יראה עמודים שלא מיועדים לו.
9. **WhatsApp** — לא שולח דרך API, רק פותח `wa.me`. לא ניתן לאמת שליחה מהשרת.
10. **searchNews** regex post-filter רגיש למקריות — אם חיפוש מחזיר פחות מדי תוצאות, כדאי לבדוק את ה-regex. ה-`"..."` נוסף אוטומטית; לא להוסיף עוד מרכאות בקליינט.
11. **ActivityLog** נכתב משני מקורות (קליינט + backend) עם שמות user שונים — הקליינט כותב `user.full_name`, ה-backend כותב `'System'`. אין לאחד בלי לתכנן migration.
12. **מחיקת קונספט** — מופיעה רק ב-`ConceptDetails` ל-admin. לא קיימת מחיקת פרויקט עם קונספטים יתומים — הקונספטים יישארו ב-DB ללא פרויקט.
13. **`ConceptDetails` → `update` ישירות** (לא דרך פונקציה). כל שינוי סטטוס/קישור/notes נכתב ישירות וגם מייצר ActivityLog ידני מהקליינט. אין שרת ביניים — כל אחריות ה-logging על הקוד ב-`ConceptDetails`.
14. **`approval_status` ידני של admin** ב-`ConceptDetails` עוקף את `updateConceptApproval` ולא יוצר ActivityLog מסודר. אם רוצים logging אחיד — להעביר את הלוגיקה לפונקציה.
15. **פורמט קוד אישור** — `${conceptId}:${approvalStep}`. כל שינוי של הפורמט דורש עדכון ב-`ApprovalTimeline` (כפתור copy) וב-`ConceptApproval` (פרסור).

---

## 14. Secrets

- `GOOGLE_CUSTOM_SEARCH_API` — API key ל-Google Custom Search.
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` — מזהה CSE מותאם לאתרי חדשות ישראליים.

---

## 15. השלמים הטכניים

- `src/utils/index.ts`: `createPageUrl(pageName)` = `'/' + pageName.replace(/ /g, '-')`. ⚠️ לא מתחשב ב-querystring — יש להדביק אותו ידנית כשמעבירים פרמטרים.
- `src/lib/NavigationTracker.jsx` — מתעד ניווט משתמש דרך `base44.appLogs.logUserInApp(pageName)`.
- `Authentication`: לא לכתוב Login page — מסופק על ידי הפלטפורמה. רק להשתמש ב-`navigateToLogin()` כשצריך.
- `index.html`: לא נערך — מכיל title ברירת מחדל ו-meta. אם רוצים SEO/Favicon, יש לערוך ידנית.
- `tailwind.config.js` — לא משתמש ב-safelist. לכתוב שמות classes כליטרלים בלבד.
- `src/index.css` — design tokens ב-HSL. יש להשתמש ב-classes מ-tailwind config (`bg-primary`, `text-foreground` וכו') ולא בערכים גולמיים (לא `bg-[#fff]`).

---

## 16. מפת קבצים (עץ מקוצר)

```
src/
  App.jsx                        # router + provider wrappers
  Layout.jsx                     # navbar RTL, user menu, navigation
  index.css                      # design tokens
  pages.config.js                # אוטומטי — לא לערוך ידנית
  pages/
    Dashboard.jsx
    Projects.jsx
    ProjectDetails.jsx
    Concepts.jsx
    ConceptDetails.jsx
    ConceptApproval.jsx
    ApprovalBranchHead.jsx
    ApprovalDeputyCommander.jsx
    ApprovalChiefRabbi.jsx
    NewsSearch.jsx
    UserManagement.jsx
    ApproverManagement.jsx
  components/
    ConceptApprovalDetails.jsx
    ApprovalSearchBox.jsx
    concept/StatusTimeline.jsx
    ui/ApprovalTimeline.jsx
    ui/StatusBadge.jsx
    concepts/ConceptCard.jsx
    projects/ProjectCard.jsx
    forms/ConceptForm.jsx
    forms/ProjectForm.jsx
    news/NewsArticleCard.jsx
    utils/hebrewTranslations.jsx
  lib/
    AuthContext.jsx
    NavigationTracker.jsx
    PageNotFound.jsx
    app-params.js
    query-client.js
  utils/index.ts

base44/
  entities/
    Project.jsonc
    Concept.jsonc
    ActivityLog.jsonc
    User.jsonc
  functions/
    getConceptForApproval/entry.ts
    updateConceptApproval/entry.ts
    searchNews/entry.ts
    listUsers/entry.ts
    updateUserRole/entry.ts
```

---

סוף מסמך.