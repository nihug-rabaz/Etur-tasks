import React from 'react';
import { Check, Clock } from 'lucide-react';

const colorMap = {
  'planning': 'bg-green-500',
  'production': 'bg-green-500',
  'waiting_approvals': 'bg-blue-500',
  'waiting_spokesperson': 'bg-blue-500',
  'waiting_approval': 'bg-blue-500',
  'waiting_publish': 'bg-gray-400',
  'published': 'bg-gray-400',
};

export default function StatusTimeline({ isArticle, currentStatus, onStatusChange, isLoading }) {
  const articleStatuses = [
    { value: 'planning', label: 'בתכנון' },
    { value: 'production', label: 'בהפקה' },
    { value: 'waiting_approvals', label: 'מחכה לאישורים' },
    { value: 'waiting_spokesperson', label: 'מחכה לאישור דו״ץ' },
    { value: 'waiting_publish', label: 'ממתין לפרסום' },
    { value: 'published', label: 'פורסם' },
  ];

  const socialStatuses = [
    { value: 'planning', label: 'בתכנון' },
    { value: 'production', label: 'בהפקה' },
    { value: 'waiting_approval', label: 'ממתין לאישור' },
    { value: 'waiting_publish', label: 'ממתין לפרסום' },
    { value: 'published', label: 'פורסם' },
  ];

  const statuses = isArticle ? articleStatuses : socialStatuses;
  const currentIndex = statuses.findIndex(s => s.value === currentStatus);
  const reversedStatuses = [...statuses].reverse();

  return (
    <div className="w-full p-6">
      <div className="relative px-4">
        {/* Light line connecting circles */}
        <div className="absolute top-6 right-0 left-0 h-1 bg-gray-300"></div>
        
        {/* Timeline items */}
        <div className="relative flex flex-row-reverse justify-between gap-2">
          {reversedStatuses.map((status, reverseIndex) => {
            const originalIndex = statuses.length - 1 - reverseIndex;
            const isCompleted = originalIndex < currentIndex;
            const isCurrent = originalIndex === currentIndex;
            const bgColor = colorMap[status.value] || 'bg-gray-400';
            
            return (
              <button
                key={status.value}
                onClick={() => onStatusChange(status.value)}
                disabled={isLoading}
                className="relative z-10 flex flex-col items-center gap-3 group cursor-pointer transition-all"
              >
                {/* Circle */}
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all transform group-hover:scale-110 ${
                    isCompleted
                      ? `bg-green-500 border-green-600`
                      : `bg-gray-400 border-gray-500`
                  }`}
                >
                  {isCompleted && <Check className="w-5 h-5 text-white" />}
                  {isCurrent && <Clock className="w-5 h-5 text-white" />}
                </div>
                
                {/* Label */}
                <span
                  className={`text-xs font-semibold text-center max-w-[80px] transition-all ${
                    isCompleted
                      ? 'text-green-600'
                      : 'text-gray-500 group-hover:text-gray-700'
                  }`}
                >
                  {status.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}