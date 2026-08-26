import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check } from "lucide-react";
import CriteriaRow from "./CriteriaRow";

const EMPTY = { name: '', key: '', bullets: '', weight: 0, sort_order: 0, is_active: true };

export default function CriteriaTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ ...EMPTY });

  const load = () => {
    base44.entities.DayEvaluationCriterion.list()
      .then(list => { setItems(list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))); setLoading(false); });
  };
  useEffect(load, []);

  const handleSave = async (form) => {
    await base44.entities.DayEvaluationCriterion.update(form.id, form);
    load();
  };
  const handleDelete = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק קריטריון זה?')) return;
    await base44.entities.DayEvaluationCriterion.delete(id);
    load();
  };
  const addNew = async () => {
    if (!newItem.name || !newItem.key) return;
    await base44.entities.DayEvaluationCriterion.create(newItem);
    setNewItem({ ...EMPTY });
    setAdding(false);
    load();
  };

  if (loading) return <div className="text-center py-8 text-slate-400">טוען...</div>;

  const totalWeight = items.filter(i => i.is_active).reduce((s, i) => s + (Number(i.weight) || 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-slate-500">
          {items.length} קריטריונים · סה"כ משקל פעיל: {totalWeight}%
          {totalWeight !== 100 && <span className="text-amber-600"> (מומלץ שיסתכם ל-100%)</span>}
        </span>
        <Button onClick={() => setAdding(a => !a)} className="gap-1.5"><Plus className="w-4 h-4" />הוסף קריטריון</Button>
      </div>

      {adding && (
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 mb-4">
          <h3 className="font-bold mb-4 text-sm">קריטריון חדש</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Label className="text-xs mb-1 block">שם הקריטריון *</Label><Input value={newItem.name} onChange={e => setNewItem(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">מפתח ייחודי *</Label><Input value={newItem.key} onChange={e => setNewItem(f => ({ ...f, key: e.target.value }))} /></div>
            <div className="col-span-2"><Label className="text-xs mb-1 block">מילות מפתח מנחות</Label><Input value={newItem.bullets} onChange={e => setNewItem(f => ({ ...f, bullets: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">משקל (%)</Label><Input type="number" value={newItem.weight} onChange={e => setNewItem(f => ({ ...f, weight: Number(e.target.value) }))} /></div>
            <div><Label className="text-xs mb-1 block">סדר הצגה</Label><Input type="number" value={newItem.sort_order} onChange={e => setNewItem(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addNew} className="gap-1"><Check className="w-3.5 h-3.5" />הוסף</Button>
            <Button variant="outline" onClick={() => setAdding(false)}>ביטול</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500">שם</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500">מפתח</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-slate-500">משקל</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-slate-500">פעיל</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400">אין קריטריונים</td></tr>}
            {items.map(item => <CriteriaRow key={item.id} item={item} onSave={handleSave} onDelete={handleDelete} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}