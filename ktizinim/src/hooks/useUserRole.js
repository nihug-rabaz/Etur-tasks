import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export function useUserRole() {
  const { user } = useAuth();
  const [appRole, setAppRole] = useState(null);
  const [approved, setApproved] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    if (user.role === 'admin') {
      setAppRole('admin');
      setApproved(true);
      return;
    }

    const fetchRole = () => {
      base44.entities.User.get(user.id)
        .then(u => {
          setAppRole(u?.app_role || 'evaluator');
          setApproved(u?.approved === true);
        })
        .catch(() => {
          setAppRole('evaluator');
          setApproved(false);
        });
    };

    fetchRole();
    // Poll every 8 seconds so approval change takes effect quickly
    const interval = setInterval(fetchRole, 8000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const effectiveRole = appRole || 'evaluator';
  const isAdmin = effectiveRole === 'admin' || user?.role === 'admin';
  const isRamad = effectiveRole === 'ramad' || isAdmin;
  const isApproved = approved === true || user?.role === 'admin';
  const loading = appRole === null && !!user;

  return { appRole: effectiveRole, isAdmin, isRamad, isApproved, loading };
}