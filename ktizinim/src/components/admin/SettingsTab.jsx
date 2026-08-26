import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Check } from "lucide-react";

export default function SettingsTab() {
  const { settings, loading, reload } = useOrgSettings();
  const [unitName, setUnitName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setUnitName(settings.unit_name || '');
      setLogoUrl(settings.logo_url || '');
    }
  }, [settings]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogoUrl(file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    if (settings?.id) {
      await base44.entities.OrgSettings.update(settings.id, { unit_name: unitName, logo_url: logoUrl });
    } else {
      await base44.entities.OrgSettings.create({ unit_name: unitName, logo_url: logoUrl });
    }
    setSaving(false);
    reload();
  };

  if (loading) return <div className="text-center py-8 text-slate-400">טוען...</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-lg">
      <h3 className="font-bold mb-4">הגדרות מדור</h3>

      <div className="space-y-4">
        <div>
          <Label className="text-xs mb-1 block">לוגו המדור</Label>
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="לוגו" className="w-16 h-16 object-contain rounded-xl border border-slate-100" />
            )}
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-input hover:bg-slate-50">
                <Upload className="w-4 h-4" /> {uploading ? 'מעלה...' : 'העלה קובץ לוגו'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1 block">שם היחידה/המדור</Label>
          <Input value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="מדור איתור" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Check className="w-4 h-4" /> {saving ? 'שומר...' : 'שמור הגדרות'}
        </Button>
      </div>
    </div>
  );
}