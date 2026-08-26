import React from "react";
import { Checkbox } from "@/components/ui/checkbox";

export default function ExportFieldGroup({ title, fields, selected, onToggle, onToggleAll }) {
  if (fields.length === 0) return null;
  const allSelected = fields.every(f => selected[f.key]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">{title}</h3>
        <button type="button" onClick={() => onToggleAll(!allSelected)} className="text-xs text-primary hover:underline">
          {allSelected ? 'בטל הכל' : 'בחר הכל'}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {fields.map(f => (
          <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={!!selected[f.key]} onCheckedChange={() => onToggle(f.key)} />
            {f.label}
          </label>
        ))}
      </div>
    </div>
  );
}