import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PendingApproval() {
  const { logout, user } = useAuth();
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-body">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">ממתין לאישור</h2>
        <p className="text-slate-500 text-sm mb-2">שלום {user?.full_name || ''},</p>
        <p className="text-slate-500 text-sm mb-6">
          חשבונך נרשם בהצלחה, אך טרם אושר על ידי מנהל המערכת.
          לאחר האישור תוכל להיכנס למערכת.
        </p>
        <Button variant="outline" onClick={() => logout('/')} className="gap-2">
          <LogOut className="w-4 h-4" /> התנתק
        </Button>
      </div>
    </div>
  );
}