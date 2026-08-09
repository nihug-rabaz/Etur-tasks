import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Settings, Link2, ArrowRight } from 'lucide-react';

const ApproverManagement = () => {
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [approvers, setApprovers] = useState({
    branch_head: { name: 'רמ״ח', phone: '', message: '' },
    deputy_commander: { name: 'רמ״ט', phone: '', message: '' },
    chief_rabbi: { name: 'רבצ״ר', phone: '', message: '' }
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      // Load saved approvers from user data if exists
      if (userData?.approvers) {
        setApprovers(userData.approvers);
      }
    });
  }, []);

  const handleApproverChange = (key, field, value) => {
    setApprovers(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const getApprovalLink = (key) => {
    const links = {
      branch_head: 'https://dovrut.rabaz-idf.com/approval/branch-head',
      deputy_commander: 'https://dovrut.rabaz-idf.com/approval/deputy-commander',
      chief_rabbi: 'https://dovrut.rabaz-idf.com/approval/chief-rabbi'
    };
    return links[key];
  };

  const handleAddLink = (key, field) => {
    const url = getApprovalLink(key);
    const currentValue = approvers[key][field];
    const newValue = currentValue ? `${currentValue}\n${url}` : url;
    handleApproverChange(key, field, newValue);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ approvers });
    } catch (error) {
      console.error('Error saving approvers:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const sendWhatsApp = (phone, message) => {
    if (!phone || !message) {
      alert('אנא מלא מספר טלפון והודעה');
      return;
    }
    
    // Open WhatsApp Web with pre-filled message
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!user || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-text-secondary">אין לך הרשאות לגישה לעמוד זה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
              <ArrowRight className="w-4 h-4 ml-2" />
              חזור לעמוד הבית
            </Button>
          </Link>
          <h1 className="text-3xl font-black text-text-primary">ניהול מאשרים</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {showSettings ? (
          // Settings View
          <div className="space-y-6">
            {Object.entries(approvers).map(([key, approver]) => (
              <Card key={key} className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{approver.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      מספר טלפון (עם קוד מדינה, למשל: +972541234567)
                    </label>
                    <Input
                      type="tel"
                      placeholder="+972541234567"
                      value={approver.phone}
                      onChange={(e) => handleApproverChange(key, 'phone', e.target.value)}
                      className="text-right"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-text-secondary">
                        ההודעה
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddLink(key, 'message')}
                        className="text-accent-cyan hover:text-accent-cyan h-auto p-1"
                      >
                        <Link2 className="w-4 h-4 ml-1" />
                        הוסף קישור של הסביבה להודעה
                      </Button>
                    </div>
                    <Textarea
                      placeholder="כתוב את ההודעה שתישלח ב-WhatsApp"
                      value={approver.message}
                      onChange={(e) => handleApproverChange(key, 'message', e.target.value)}
                      className="text-right min-h-[100px]"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              className="w-full mt-6  text-white h-11"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'שומר...' : 'שמור הגדרות'}
            </Button>
          </div>
        ) : (
          // Send View
          <div className="space-y-4">
            {Object.entries(approvers).map(([key, approver]) => (
              <Button
                key={key}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
                onClick={() => sendWhatsApp(approver.phone, approver.message)}
              >
                <MessageCircle className="w-5 h-5 ml-2" />
                שלח תזכורת WhatsApp ל{approver.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApproverManagement;