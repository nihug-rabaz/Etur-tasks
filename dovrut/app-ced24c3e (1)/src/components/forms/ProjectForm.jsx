import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ProjectForm({ project, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'active',
    target_audiences: project?.target_audiences || [],
  });
  const [newAudience, setNewAudience] = useState('');

  const handleAddAudience = () => {
    if (newAudience.trim() && !formData.target_audiences.includes(newAudience.trim())) {
      setFormData({
        ...formData,
        target_audiences: [...formData.target_audiences, newAudience.trim()]
      });
      setNewAudience('');
    }
  };

  const handleRemoveAudience = (audience) => {
    setFormData({
      ...formData,
      target_audiences: formData.target_audiences.filter(a => a !== audience)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">שם הפרויקט *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="לדוגמה: חגי תשרי"
          required
          className="text-right"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">תיאור</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="תיאור כללי של הפרויקט..."
          rows={3}
          className="text-right resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">סטטוס</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">פעיל</SelectItem>
            <SelectItem value="completed">הסתיים</SelectItem>
            <SelectItem value="on_hold">בהשהיה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>קהלי יעד</Label>
        <div className="flex gap-2">
          <Input
            value={newAudience}
            onChange={(e) => setNewAudience(e.target.value)}
            placeholder="הוסף קהל יעד..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAudience())}
            className="text-right"
          />
          <Button type="button" variant="outline" onClick={handleAddAudience}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.target_audiences.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.target_audiences.map((audience, index) => (
              <Badge key={index} variant="secondary" className="gap-1 pr-2 pl-1 py-1">
                {audience}
                <button
                  type="button"
                  onClick={() => handleRemoveAudience(audience)}
                  className="hover:bg-slate-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading || !formData.name} className="flex-1">
          {isLoading ? 'שומר...' : (project ? 'עדכן פרויקט' : 'צור פרויקט')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </form>
  );
}