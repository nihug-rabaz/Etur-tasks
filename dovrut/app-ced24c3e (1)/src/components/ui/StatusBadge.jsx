import React from 'react';
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  active: { label: 'פעיל', className: 'bg-success/15 text-success' },
  completed: { label: 'הסתיים', className: 'bg-surface-2 text-text-secondary' },
  on_hold: { label: 'בהשהיה', className: 'bg-warning/15 text-warning' },

  planning: { label: 'בתכנון', className: 'bg-surface-2 text-text-secondary' },
  production: { label: 'בהפקה', className: 'bg-accent-cyan/15 text-accent-cyan' },
  waiting_approvals: { label: 'מחכה לאישורים', className: 'bg-warning/15 text-warning' },
  waiting_spokesperson: { label: 'מחכה לאישור דו״ץ', className: 'bg-accent-orange/15 text-accent-orange' },
  waiting_publish: { label: 'ממתין לפרסום', className: 'bg-accent-primary/15 text-accent-primary' },
  published: { label: 'פורסם', className: 'bg-success/15 text-success' },

  waiting_approval: { label: 'ממתין לאישור', className: 'bg-warning/15 text-warning' },

  waiting_spokesperson_officer: { label: 'מחכה לאישור קצין דוברות', className: 'bg-accent-cyan/15 text-accent-cyan' },
  waiting_deputy_commander: { label: 'מחכה לאישור רמ״ט', className: 'bg-accent-primary/15 text-accent-primary' },
  waiting_chief_rabbi: { label: 'מחכה לאישור רבצ״ר', className: 'bg-accent-purple/15 text-accent-purple' },
  waiting_branch_head: { label: 'מחכה לאישור רע״ן / רת״ח', className: 'bg-accent-primary/15 text-accent-primary' },
  waiting_command_rabbi: { label: 'מחכה לאישור רב פיקוד', className: 'bg-accent-purple/15 text-accent-purple' },
  approved: { label: 'אושר', className: 'bg-success/15 text-success' },
};

const contentTypeConfig = {
  carousel: { label: 'קרוסלה', className: 'bg-accent-orange/15 text-accent-orange' },
  video: { label: 'סרטון', className: 'bg-danger/15 text-danger' },
  image: { label: 'תמונה', className: 'bg-accent-cyan/15 text-accent-cyan' },
  reels: { label: 'רילס', className: 'bg-accent-primary/15 text-accent-primary' },
  text: { label: 'טקסט', className: 'bg-surface-2 text-text-secondary' },
};

const conceptTypeConfig = {
  article_interview: { label: 'כתבה / ראיון', className: 'bg-accent-cyan/15 text-accent-cyan' },
  social_media: { label: 'רשתות חברתיות', className: 'bg-accent-orange/15 text-accent-orange' },
};

const domainConfig = {
  kashrut: { label: 'כשרות', className: 'bg-accent-primary/15 text-accent-primary' },
  halacha: { label: 'הלכה', className: 'bg-accent-purple/15 text-accent-purple' },
  reut: { label: 'רעות', className: 'bg-accent-cyan/15 text-accent-cyan' },
  tipuch: { label: 'טיפו"ח', className: 'bg-accent-cyan/15 text-accent-cyan' },
  lehaka: { label: 'להקה', className: 'bg-accent-orange/15 text-accent-orange' },
  zuq: { label: 'זו"ק', className: 'bg-success/15 text-success' },
  masan: { label: 'משא"ן', className: 'bg-warning/15 text-warning' },
  agam_hachsharot: { label: 'אגם והכשרות', className: 'bg-accent-cyan/15 text-accent-cyan' },
  logistic: { label: 'לוגיסטיקה', className: 'bg-accent-orange/15 text-accent-orange' },
  field: { label: 'שטח', className: 'bg-success/15 text-success' },
};

export default function StatusBadge({ status, type = 'status' }) {
  let config;

  if (type === 'content') {
    config = contentTypeConfig[status];
  } else if (type === 'concept') {
    config = conceptTypeConfig[status];
  } else if (type === 'domain') {
    config = domainConfig[status];
  } else {
    config = statusConfig[status];
  }

  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={`${config.className} rounded-full border-0 px-3 py-1 text-xs font-bold shadow-none`}
    >
      {config.label}
    </Badge>
  );
}
