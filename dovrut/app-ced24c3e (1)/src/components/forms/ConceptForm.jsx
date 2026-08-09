import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Upload, FileText, Share2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';

export default function ConceptForm({ concept, projectId, onSubmit, onCancel, isLoading, isAdmin }) {
  const [conceptType, setConceptType] = useState(concept?.type || 'article_interview');
  const [formData, setFormData] = useState({
    name: concept?.name || '',
    project_id: concept?.project_id || projectId,
    type: concept?.type || 'article_interview',
    domain: concept?.domain || '',
    // Article fields
    interviewees: concept?.interviewees || [],
    media_outlet: concept?.media_outlet || '',
    needs_briefing: concept?.needs_briefing || false,
    link: concept?.link || '',
    details: concept?.details || '',
    work_status_article: concept?.work_status_article || 'planning',
    approval_status: concept?.approval_status || '',
    // Social media fields
    content_type: concept?.content_type || '',
    draft_text: concept?.draft_text || '',
    draft_images: concept?.draft_images || [],
    draft_videos: concept?.draft_videos || [],
    partners: concept?.partners || [],
    work_status_social: concept?.work_status_social || 'planning',
  });

  const [newInterviewee, setNewInterviewee] = useState('');
  const [newPartner, setNewPartner] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleAddItem = (field, value, setter) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData({
        ...formData,
        [field]: [...formData[field], value.trim()]
      });
      setter('');
    }
  };

  const handleRemoveItem = (field, item) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter(i => i !== item)
    });
  };

  const handleFileUpload = async (e, field) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      setFormData({
        ...formData,
        [field]: [...formData[field], ...uploadedUrls]
      });
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploading(false);
  };

  const getInitialApprovalStatus = (domain) => {
    const flow1Domains = ['kashrut', 'halacha', 'reut'];
    return flow1Domains.includes(domain) ? 'waiting_branch_head' : 'waiting_deputy_commander';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      type: conceptType,
    };
    // Clean up fields not relevant to the selected type
    if (conceptType === 'article_interview') {
      delete data.content_type;
      delete data.draft_text;
      delete data.draft_images;
      delete data.draft_videos;
      delete data.partners;
      delete data.work_status_social;
      // Set initial approval_status for new concepts based on domain
      if (!concept && data.domain) {
        data.approval_status = getInitialApprovalStatus(data.domain);
      }
    } else {
      delete data.interviewees;
      delete data.media_outlet;
      delete data.needs_briefing;
      delete data.work_status_article;
      delete data.approval_status;
      delete data.domain;
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>סוג קונספט</Label>
        <Tabs value={conceptType} onValueChange={setConceptType} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="article_interview" className="gap-2">
              <FileText className="w-4 h-4" />
              כתבה / ראיון
            </TabsTrigger>
            <TabsTrigger value="social_media" className="gap-2">
              <Share2 className="w-4 h-4" />
              רשתות חברתיות
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">שם הקונספט *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="שם הקונספט"
          required
          className="text-right"
        />
      </div>

      {conceptType === 'article_interview' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="domain">תחום</Label>
            <Select
              value={formData.domain}
              onValueChange={(value) => setFormData({ ...formData, domain: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר תחום" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kashrut">כשרות</SelectItem>
                <SelectItem value="halacha">הלכה</SelectItem>
                <SelectItem value="reut">רעות</SelectItem>
                <SelectItem value="tipuch">טיפו"ח</SelectItem>
                <SelectItem value="lehaka">להקה</SelectItem>
                <SelectItem value="zuq">זו"ק</SelectItem>
                <SelectItem value="masan">משא"ן</SelectItem>
                <SelectItem value="agam_hachsharot">אגם והכשרות</SelectItem>
                <SelectItem value="logistic">לוגיסטיקה</SelectItem>
                <SelectItem value="field">שטח</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>מרואיינים</Label>
            <div className="flex gap-2">
              <Input
                value={newInterviewee}
                onChange={(e) => setNewInterviewee(e.target.value)}
                placeholder="הוסף מרואיין..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('interviewees', newInterviewee, setNewInterviewee))}
                className="text-right"
              />
              <Button type="button" variant="outline" onClick={() => handleAddItem('interviewees', newInterviewee, setNewInterviewee)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.interviewees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.interviewees.map((item, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-2 pl-1 py-1">
                    {item}
                    <button type="button" onClick={() => handleRemoveItem('interviewees', item)} className="hover:bg-slate-200 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="media_outlet">מערכת</Label>
            <Input
              id="media_outlet"
              value={formData.media_outlet}
              onChange={(e) => setFormData({ ...formData, media_outlet: e.target.value })}
              placeholder="שם המערכת"
              className="text-right"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="needs_briefing">צריך לתדרך</Label>
            <Switch
              id="needs_briefing"
              checked={formData.needs_briefing}
              onCheckedChange={(checked) => setFormData({ ...formData, needs_briefing: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="work_status_article">סטטוס עבודה</Label>
            <Select
              value={formData.work_status_article}
              onValueChange={(value) => setFormData({ ...formData, work_status_article: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">בתכנון</SelectItem>
                <SelectItem value="waiting_approvals">מחכה לאישורים</SelectItem>
                <SelectItem value="waiting_spokesperson">מחכה לאישור דו״ץ</SelectItem>
                <SelectItem value="production">בהפקה</SelectItem>
                <SelectItem value="waiting_publish">ממתין לפרסום</SelectItem>
                <SelectItem value="published">פורסם</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="content_type">סוג תוכן</Label>
            <Select
              value={formData.content_type}
              onValueChange={(value) => setFormData({ ...formData, content_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג תוכן" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carousel">קרוסלה</SelectItem>
                <SelectItem value="video">סרטון</SelectItem>
                <SelectItem value="image">תמונה</SelectItem>
                <SelectItem value="reels">רילס</SelectItem>
                <SelectItem value="text">טקסט</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft_text">טיוטה - טקסט</Label>
            <Textarea
              id="draft_text"
              value={formData.draft_text}
              onChange={(e) => setFormData({ ...formData, draft_text: e.target.value })}
              placeholder="טקסט הטיוטה..."
              rows={4}
              className="text-right resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>טיוטה - תמונות</Label>
            <div className="flex flex-wrap gap-2">
              {formData.draft_images.map((url, index) => (
                <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, draft_images: formData.draft_images.filter((_, i) => i !== index) })}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  accept = "image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'draft_images')}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-slate-400" />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>שתפ״ים</Label>
            <div className="flex gap-2">
              <Input
                value={newPartner}
                onChange={(e) => setNewPartner(e.target.value)}
                placeholder="הוסף שתף..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('partners', newPartner, setNewPartner))}
                className="text-right"
              />
              <Button type="button" variant="outline" onClick={() => handleAddItem('partners', newPartner, setNewPartner)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.partners.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.partners.map((item, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-2 pl-1 py-1">
                    {item}
                    <button type="button" onClick={() => handleRemoveItem('partners', item)} className="hover:bg-slate-200 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="work_status_social">סטטוס עבודה</Label>
            <Select
              value={formData.work_status_social}
              onValueChange={(value) => setFormData({ ...formData, work_status_social: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">בתכנון</SelectItem>
                <SelectItem value="production">בהפקה</SelectItem>
                <SelectItem value="waiting_publish">ממתין לפרסום</SelectItem>
                <SelectItem value="waiting_approval">ממתין לאישור</SelectItem>
                <SelectItem value="published">פורסם</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="link">קישור</Label>
        <Input
          id="link"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          placeholder="https://..."
          className="text-right"
          type="url"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">פירוט</Label>
        <Textarea
          id="details"
          value={formData.details}
          onChange={(e) => setFormData({ ...formData, details: e.target.value })}
          placeholder="פירוט נוסף..."
          rows={3}
          className="text-right resize-none"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading || !formData.name || uploading} className="flex-1">
          {isLoading ? 'שומר...' : (concept ? 'עדכן קונספט' : 'צור קונספט')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </form>
  );
}