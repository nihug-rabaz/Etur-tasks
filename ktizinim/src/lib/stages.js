import { Star, CalendarCheck, Award, FileText, Gavel } from 'lucide-react';
import DaySelectionStage from '@/components/stages/DaySelectionStage';
import PreparationDayStage from '@/components/stages/PreparationDayStage';
import SmachStage from '@/components/stages/SmachStage';
import DocumentsStage from '@/components/stages/DocumentsStage';
import FinalDecisionStage from '@/components/stages/FinalDecisionStage';

// Modular stage registry. To add a new stage in the future, add an entry here
// plus a matching component — no other changes required.
export const STAGES = [
  {
    key: 'day_selection',
    name: 'יום המיונים',
    description: 'ריאיונות והערכות יום מיונים',
    icon: Star,
    colorClass: 'bg-blue-100 text-blue-600',
    component: DaySelectionStage,
    requiredRole: null,
  },
  {
    key: 'preparation_day',
    name: 'היום המכין',
    description: 'הערכת היום המכין — מקראות ישראל, העברת שיחה, דינמיקות חברתיות והתרשמות כללית',
    icon: CalendarCheck,
    colorClass: 'bg-purple-100 text-purple-600',
    component: PreparationDayStage,
    requiredRole: null,
  },
  {
    key: 'smach',
    name: 'סמ"ח',
    description: 'הערכת סמ"ח — מבחני סף, הערכה מקצועית, ציון משוקלל והחלטה',
    icon: Award,
    colorClass: 'bg-cyan-100 text-cyan-600',
    component: SmachStage,
    requiredRole: null,
  },
  {
    key: 'documents',
    name: 'מסמכים',
    description: 'ניהול מסמכי המועמד',
    icon: FileText,
    colorClass: 'bg-amber-100 text-amber-600',
    component: DocumentsStage,
    requiredRole: null,
  },
  {
    key: 'final_decision',
    name: 'החלטה סופית',
    description: 'החלטת מעבר ודוח סופי',
    icon: Gavel,
    colorClass: 'bg-emerald-100 text-emerald-600',
    component: FinalDecisionStage,
    requiredRole: 'ramad',
  },
];

export function getStage(key) {
  return STAGES.find((s) => s.key === key);
}