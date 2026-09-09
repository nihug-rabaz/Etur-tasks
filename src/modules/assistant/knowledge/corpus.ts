export const platformKnowledge = `# סקירת הפלטפורמה

פלטפורמת המדור (Etur) מאחדת כמה מודולים תחת מעטפת אחת:

- **ניהול משימות** (\`/dashboard\`) — משימות, פרויקטים, לו״ז
- **דוברות** (\`/dovrut\`) — קמפיינים, אייטמים, אישורים
- **קצינים / אגם** (\`/agam\`) — מיון לקורס קציני דת
- **מלש״בים** (\`/malshabim\`) — ראיונות ותיקי מועמדים
- **נגדים** (\`/nagadim\`) — איתור ושיבוץ נגדים

הניווט בין מודולים מופיע בראש המסך. תפריט צד משתנה לפי המודול הפעיל והרשאות המשתמש.

תפקידים נפוצים: \`admin\` (מנהל מודול/פלטפורמה), \`user\`, \`viewer\`, \`approver\`, \`ramad\`.

העוזר "לא נייהוז" מיועד לרמד/מנהל לפיקוח על כלל המדור: ניווט, חיפוש מועמדים ישירות בדאטה בייס (\`search_domain_candidates\` / \`get_domain_candidate\`), סיכומים וביצוע פעולות (\`list_actions\` / \`api_mutate\`) עם אותן הרשאות כמו המשתמש, ואישור לפני שינויים. אין להשתמש ב-\`api_get\` לרשימות מועמדים מלאות.
`;

export const tasksKnowledge = `# מודול משימות

מזהה: \`tasks\`
כניסה: \`/dashboard\`

מסכים מרכזיים:
- \`/dashboard\` — ראשי / סקירה
- \`/tasks/active\` — משימות פעילות
- \`/tasks/upcoming\` — לוח זמנים ופגישות
- \`/tasks/archive\` — ארכיון
- \`/projects/[id]\` — פרטי פרויקט
- \`/admin/users\` — משתמשי מערכת (אדמין)
- \`/admin/settings\` — הגדרות מערכת (אדמין)

אפשר לפתוח משימה עם דיפ־לינק: \`/dashboard?task=<id>\`.

חיפוש משימות/פרויקטים זמין דרך כלי \`search_tasks\`.
`;

export const dovrutKnowledge = `# מודול דוברות

מזהה: \`dovrut\`
כניסה: \`/dovrut\`

מסכים מרכזיים:
- \`/dovrut\` — ראשי
- \`/dovrut/campaigns\` — קמפיינים
- \`/dovrut/projects\` — פרויקטים
- \`/dovrut/items\` — אייטמים
- \`/dovrut/approvals\` — ציר אישורים
- \`/dovrut/news\` — חדשות
- \`/dovrut/admin/users\` — משתמשי מודול
- \`/dovrut/admin/approvers\` — מאשרים

תפקידים: admin / user / viewer / approver.
יש שיפור ניסוח AI לדוברות (נפרד מהעוזר הכללי).
`;

export const agamKnowledge = `# מודול קצינים (אגם)

מזהה: \`agam\`
כניסה: \`/agam\`

מסכים מרכזיים:
- \`/agam\` — ראשי
- \`/agam/cycles\` — מחזורים
- \`/agam/candidates\` — מועמדים
- \`/agam/candidates/archive\` — ארכיון (admin/ramad)
- \`/agam/admin\` — ניהול שאלון/קריטריונים
- \`/agam/admin/users\` — משתמשים

תפקידים: admin / user / ramad / viewer.
תהליך מיון: שאלון, הערכות, סמ״ח והחלטה.
`;

export const malshabimKnowledge = `# מודול מלש״בים

מזהה: \`malshabim\`
כניסה: \`/malshabim\`

מסכים מרכזיים:
- \`/malshabim\` — רשימת מועמדים וסינון
- \`/malshabim/interview\` — אשף ראיון
- \`/malshabim/board\` — לוח לפי סטטוס
- \`/malshabim/statistics\` — סטטיסטיקה
- \`/malshabim/candidates/[id]\` — תיק מועמד
- \`/malshabim/admin/approvals\` — אישורי מנהל
- \`/malshabim/admin/users\` — משתמשי מודול

תפקידים: admin / user / viewer.
`;

export const nagadimKnowledge = `# מודול נגדים

מזהה: \`nagadim\`
כניסה: \`/nagadim\`

מסכים מרכזיים:
- \`/nagadim\` — ראשי / מדדים
- \`/nagadim/active\` — איתור פעיל לפי שלבים
- \`/nagadim/positions\` — תקנים ושיבוץ
- \`/nagadim/gaps\` — פערים
- \`/nagadim/admin/users\` — משתמשי מודול

תפקידים: admin / user / viewer.
`;
