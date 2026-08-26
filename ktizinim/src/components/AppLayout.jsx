import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Settings, LogOut, Menu, X, Shield } from 'lucide-react';
import PendingApproval from '@/components/PendingApproval';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { isAdmin, isApproved, loading } = useUserRole();
  const { settings } = useOrgSettings();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'דשבורד', icon: LayoutDashboard },
    { path: '/candidates', label: 'מועמדים', icon: Users },
    ...(isAdmin ? [{ path: '/admin', label: 'ניהול', icon: Settings }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  // Show pending approval screen if user is not approved
  if (!loading && !isApproved) {
    return <PendingApproval />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-body">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="לוגו" className="w-9 h-9 object-contain rounded-xl" />
            ) : (
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div className="hidden sm:block">
              <div className="font-display font-bold text-primary text-sm leading-tight">{settings?.unit_name || 'מדור איתור'}</div>
              <div className="text-xs text-slate-400">ניהול מועמדים לקורס קציני דת</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:block text-sm text-slate-600 max-w-32 truncate">{user?.full_name}</span>
            <Button variant="ghost" size="icon" onClick={() => logout('/')} title="התנתקות">
              <LogOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
            {navItems.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(item.path) ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <item.icon className="w-4 h-4" /> {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}