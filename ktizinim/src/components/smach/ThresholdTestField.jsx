import React from 'react';
import { Input } from '@/components/ui/input';

// Part A — threshold test field (עבר / לא עבר + additional datum).
// inputType: 'score' (1-100), 'time' (free text), 'count' (integer).
export default function ThresholdTestField({ title, inputType, inputLabel, pass, onPass, value, onValue }) {
  const valuePlaceholder = inputType === 'score' ? '—' : inputType === 'count' ? '0' : '';
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <h3 className="font-bold text-primary mb-4">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPass('pass')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              pass === 'pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            עבר
          </button>
          <button
            type="button"
            onClick={() => onPass('fail')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              pass === 'fail' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            לא עבר
          </button>
        </div>
        <div className="flex items-center gap-2">
          {inputType === 'time' ? (
            <>
              <span className="text-sm text-slate-400">{inputLabel || 'זמן ריצה:'}</span>
              <Input
                value={value}
                onChange={(e) => onValue(e.target.value)}
                placeholder="לדוגמה 8:30"
                className="w-28 text-center"
              />
            </>
          ) : (
            <>
              <span className="text-sm text-slate-400">{inputLabel || (inputType === 'score' ? 'ציון 1–100' : '')}</span>
              <Input
                type="number"
                min={inputType === 'score' ? 1 : 0}
                max={inputType === 'score' ? 100 : undefined}
                value={value}
                onChange={(e) => onValue(e.target.value === '' ? '' : e.target.value)}
                placeholder={valuePlaceholder}
                className="w-24 text-center font-bold"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}