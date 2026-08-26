import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Pencil, Trash2 } from "lucide-react";

export default function CriteriaRow({ item, onSave, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ ...item });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setEdit(false);
  };

  if (!edit) return (
    <tr className="border-b border-slate-50 hover:bg-slate-50 transition">
      <td className="px-3 py-2.5 text-sm font-medium">{item.name}</td>
      <td className="px-3 py-2.5 text-xs text-slate-500">{item.key}</td>
      <td className="px-3 py-2.5 text-sm text-center">{item.weight || 0}%</td>
      <td className="px-3 py-2.5 text-center">
        <span className={`text-xs px-2 py-0.5 rounded-full ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
          {item.is_active ? 'פעיל' : 'מושבת'}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setEdit(true)}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-rose-500" onClick={() => onDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </td>
    </tr>
  );

  return (
    <tr className="bg-blue-50 border-b border-blue-100">
      <td colSpan={5} className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><Label className="text-xs mb-1 block">שם הקריטריון</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">מפתח ייחודי</Label><Input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} /></div>
          <div className="col-span-2"><Label className="text-xs mb-1 block">מילות מפתח מנחות</Label><Input value={form.bullets || ''} onChange={e => setForm(f => ({ ...f, bullets: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">משקל (%)</Label><Input type="number" value={form.weight || 0} onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))} /></div>
          <div><Label className="text-xs mb-1 block">סדר הצגה</Label><Input type="number" value={form.sort_order || 0} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-primary" /> פעיל
          </label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving} className="gap-1"><Check className="w-3.5 h-3.5" />{saving ? 'שומר...' : 'שמור'}</Button>
          <Button size="sm" variant="outline" onClick={() => setEdit(false)} className="gap-1"><X className="w-3.5 h-3.5" />ביטול</Button>
        </div>
      </td>
    </tr>
  );
}