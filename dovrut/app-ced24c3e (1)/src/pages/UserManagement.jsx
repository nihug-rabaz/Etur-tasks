import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Users } from 'lucide-react';

const ROLE_LABELS = {
  admin: 'מנהל',
  user: 'חפ"ש',
};

const CUSTOM_ROLE_LABELS = {
  none: 'ללא',
  approver: 'מאשר',
};

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listUsers', {});
      return res.data.users || [];
    },
    enabled: !!currentUser,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await base44.functions.invoke('updateUserRole', { userId: id, data });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'ההרשאה עודכנה בהצלחה' });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה בעדכון ההרשאה',
        description: error?.message || 'אירעה שגיאה',
        variant: 'destructive',
      });
    },
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-text-muted">טוען...</p>
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-text-muted">אין לך הרשאה לצפות בדף זה</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-surface-2">
            <Users className="w-5 h-5 text-text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-text-primary">ניהול משתמשים</h1>
            <p className="text-sm text-text-muted">שינוי הרשאות משתמשים במערכת</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-text-muted">טוען...</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{user.full_name}</p>
                      <p className="text-sm text-text-muted truncate">{user.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Role */}
                      <div className="flex flex-col gap-1 items-end">
                        <p className="text-xs text-text-muted">תפקיד</p>
                        <Select
                          value={user.role || 'user'}
                          onValueChange={(val) => updateMutation.mutate({ id: user.id, data: { role: val } })}
                          disabled={user.id === currentUser?.id || updateMutation.isPending}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">חפ"ש</SelectItem>
                            <SelectItem value="admin">מנהל</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Custom Role */}
                      <div className="flex flex-col gap-1 items-end">
                        <p className="text-xs text-text-muted">הרשאה מיוחדת</p>
                        <Select
                          value={user.custom_role || 'none'}
                          onValueChange={(val) =>
                            updateMutation.mutate({ id: user.id, data: { custom_role: val === 'none' ? null : val } })
                          }
                          disabled={user.id === currentUser?.id || updateMutation.isPending}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">ללא</SelectItem>
                            <SelectItem value="approver">מאשר</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}