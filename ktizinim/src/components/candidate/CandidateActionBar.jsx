import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { User, Star, CalendarCheck, Award, FileText, Gavel } from 'lucide-react';

// Unified 6-button navigation bar shown per candidate row in the management screen.
// Each button opens the relevant module directly in one click. "החלטה סופית" is
// gated to ramad/admin; all others are available to every user.
const NAV_ITEMS = [
  { key: 'profile', label: 'תיק מועמד', icon: User, path: (c) => `/candidate?id=${c.id}`, ramadOnly: false },
  { key: 'day_selection', label: 'יום המיונים', icon: Star, path: (c) => `/evaluation?candidateId=${c.id}`, ramadOnly: false },
  { key: 'preparation_day', label: 'היום המכין', icon: CalendarCheck, path: (c) => `/candidate?id=${c.id}&stage=preparation_day`, ramadOnly: false },
  { key: 'smach', label: 'סמ"ח', icon: Award, path: (c) => `/candidate?id=${c.id}&stage=smach`, ramadOnly: false },
  { key: 'documents', label: 'מסמכים', icon: FileText, path: (c) => `/candidate?id=${c.id}&stage=documents`, ramadOnly: false },
  { key: 'final_decision', label: 'החלטה סופית', icon: Gavel, path: (c) => `/candidate?id=${c.id}&stage=final_decision`, ramadOnly: true },
];

export default function CandidateActionBar({ candidate }) {
  const navigate = useNavigate();
  const { isRamad } = useUserRole();

  return (
    <div className="flex gap-1 flex-wrap">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const disabled = item.ramadOnly && !isRamad;
        return (
          <button
            key={item.key}
            disabled={disabled}
            onClick={() => !disabled && navigate(item.path(candidate))}
            title={disabled ? 'אין הרשאה' : item.label}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              disabled
                ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                : 'bg-slate-100 text-slate-600 hover:bg-primary hover:text-primary-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}