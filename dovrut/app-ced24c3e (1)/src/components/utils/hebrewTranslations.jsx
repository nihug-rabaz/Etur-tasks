// תרגומים לעברית עבור שדות ועכים

export const fieldNamesHebrew = {
  // Basic fields
  name: 'שם',
  details: 'פירוט',
  type: 'סוג',
  
  // Article/Interview fields
  interviewees: 'מרואיינים',
  media_outlet: 'כלי תקשורת',
  needs_briefing: 'צריך תידרוך',
  work_status_article: 'סטטוס עבודה',
  
  // Social media fields
  content_type: 'סוג תוכן',
  draft_text: 'טקסט טיוטה',
  draft_images: 'תמונות',
  draft_videos: 'סרטונים',
  partners: 'שותפים',
  work_status_social: 'סטטוס עבודה',
  
  // Approval fields
  approval_track: 'מסלול אישורים',
  approval_status: 'סטטוס אישור',
  
  // Project fields
  status: 'סטטוס',
  description: 'תיאור',
  target_audiences: 'קהלי יעד',
};

export const statusValuesHebrew = {
  // Concept types
  article_interview: 'כתבה / ראיון',
  social_media: 'רשתות חברתיות',
  
  // Project statuses
  active: 'פעיל',
  completed: 'הסתיים',
  on_hold: 'בהשהיה',
  
  // Article work statuses
  planning: 'בתכנון',
  production: 'בהפקה',
  waiting_approvals: 'מחכה לאישורים',
  waiting_spokesperson: 'מחכה לאישור דו״ץ',
  waiting_publish: 'ממתין לפרסום',
  published: 'פורסם',
  
  // Social media work statuses
  waiting_approval: 'ממתין לאישור',
  
  // Content types
  carousel: 'קרוסלה',
  video: 'סרטון',
  image: 'תמונה',
  reels: 'רילס',
  text: 'טקסט',
  
  // Approval statuses
  waiting_spokesperson_officer: 'מחכה לאישור קצין דוברות',
  waiting_location_positioning: 'מחכה לאישור רמ״ד איתור ומיצוב',
  waiting_deputy_commander: 'מחכה לאישור רמ״ט',
  waiting_chief_rabbi: 'מחכה לאישור רבצ״ר',
  waiting_branch_head: 'מחכה לאישור רע״ן',
  waiting_command_rabbi: 'מחכה לאישור רב פיקוד',
  waiting_branch_head_deputy: 'מחכה לאישור רע״ן + רמ״ח',
  approved: 'אושר',
  
  // Approval tracks
  track_1: 'מסלול 1',
  track_2: 'מסלול 2',
  
  // Boolean values
  true: 'כן',
  false: 'לא',
};

export const actionTypesHebrew = {
  created: 'יצר',
  updated: 'עדכן',
  status_changed: 'שינה סטטוס',
  approval_changed: 'שינה אישור',
  deleted: 'מחק',
};

export function translateFieldName(fieldName) {
  return fieldNamesHebrew[fieldName] || fieldName;
}

export function translateValue(value) {
  if (value === null || value === undefined || value === '') return '';
  
  // Handle arrays
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const arr = JSON.parse(value);
      return arr.join(', ');
    } catch {
      return value;
    }
  }
  
  // Handle known values
  return statusValuesHebrew[value] || value;
}

export function translateActionType(actionType) {
  return actionTypesHebrew[actionType] || actionType;
}