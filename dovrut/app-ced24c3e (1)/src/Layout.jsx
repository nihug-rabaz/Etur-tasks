import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, Folder, FileText, Menu, LogOut, Newspaper, Users, X } from 'lucide-react';

const getNavItemsForRole = (user) => {
  if (user?.custom_role === 'approver') {
    return [{ name: 'אישור קונספטים', href: 'ConceptApproval', description: 'אישור לפי קוד', icon: FileText }];
  }
  return [
    { name: 'דשבורד', href: 'Dashboard', description: 'סקירה כללית', icon: Home },
    { name: 'פרויקטים', href: 'Projects', description: 'כל הפרויקטים', icon: Folder },
    { name: 'קונספטים', href: 'Concepts', description: 'כל הקונספטים', icon: FileText },
    { name: 'חיפוש חדשות', href: 'NewsSearch', description: 'סריקת חדשות', icon: Newspaper },
    { name: 'ניהול משתמשים', href: 'UserManagement', description: 'הרשאות ותפקידים', icon: Users, adminOnly: true },
    { name: 'ניהול מאשרים', href: 'approver-management', description: 'תזכורות WhatsApp', icon: Users, adminOnly: true },
  ];
};

const pageLabels = {
  Dashboard: 'דשבורד',
  Projects: 'פרויקטים',
  ProjectDetails: 'פרטי פרויקט',
  Concepts: 'קונספטים',
  ConceptDetails: 'פרטי קונספט',
  NewsSearch: 'חיפוש חדשות',
  UserManagement: 'ניהול משתמשים',
  ConceptApproval: 'אישור קונספטים',
  'approver-management': 'ניהול מאשרים',
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      if (userData?.custom_role === 'approver' && currentPageName !== 'ConceptApproval') {
        window.location.href = createPageUrl('ConceptApproval');
      }
    }).catch(() => {});
  }, [currentPageName]);

  useEffect(() => {
    closeMenu();
  }, [currentPageName, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen, closeMenu]);

  const navItems = user
    ? getNavItemsForRole(user).filter((item) => !item.adminOnly || user?.role === 'admin')
    : [];
  const isActive = (pageName) => currentPageName === pageName;
  const breadcrumb = pageLabels[currentPageName] || currentPageName;

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-text-primary" dir="rtl">
      <div
        role="presentation"
        onClick={closeMenu}
        className={`fixed inset-0 z-[60] bg-[#020617]/55 backdrop-blur-sm transition-opacity duration-300 ${
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="app-side-menu"
        aria-hidden={!menuOpen}
        className={`side-panel fixed inset-y-0 right-0 z-[65] flex w-[min(420px,88vw)] flex-col overflow-hidden text-text-primary shadow-[-30px_0_60px_-20px_rgba(22,24,29,0.25)] transition-transform duration-500 ease-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-purple/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent-cyan/12 blur-3xl" />
        </div>

        <div className="relative flex h-full flex-col gap-6 px-7 pb-7 pt-20">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.32em] text-accent-primary">ניווט מהיר</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-text-primary">לאן בא לנו לקפוץ?</h2>
          </div>

          <nav className="flex-1 overflow-y-auto pr-1">
            <ul className="flex flex-col gap-2">
              {navItems.map((item, index) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      to={createPageUrl(item.href)}
                      onClick={closeMenu}
                      className={`group flex items-center justify-between gap-4 rounded-2xl px-4 py-3 transition ${
                        active
                          ? 'bg-accent-primary text-white shadow-[0_12px_28px_-12px_rgba(139,92,246,0.6)]'
                          : 'bg-surface-2 text-text-secondary hover:-translate-y-0.5 hover:bg-accent-primary/10 hover:text-accent-primary'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold tabular-nums ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-surface-1 text-text-muted group-hover:text-accent-primary'
                          }`}
                        >
                          {Icon ? <Icon className="h-4 w-4" /> : String(index + 1).padStart(2, '0')}
                        </span>
                        <span>
                          <span className="block text-sm font-bold">{item.name}</span>
                          {item.description && (
                            <span className={`block text-xs ${active ? 'text-white/80' : 'text-text-muted'}`}>
                              {item.description}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {user && (
            <div className="mt-auto space-y-3 border-t border-transparent pt-4">
              <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-accent-primary text-sm font-bold text-white">
                    {user.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-primary">{user.full_name}</p>
                  <p className="text-xs text-text-muted">
                    {user.custom_role === 'approver' ? 'מאשר' : user.role === 'admin' ? 'מנהל' : 'חפ״ש'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger/10"
              >
                <LogOut className="h-4 w-4" />
                התנתקות
              </button>
            </div>
          )}
        </div>
      </aside>

      <header className="topbar sticky top-0 z-50 w-full px-3 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="app-side-menu"
            aria-label={menuOpen ? 'סגירת תפריט' : 'פתיחת תפריט'}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent-primary px-3 py-2 text-xs font-semibold text-white shadow-accent-glow transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:px-4 sm:text-sm"
          >
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <Menu
                size={16}
                className={`absolute transition-all duration-300 ${
                  menuOpen ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
                }`}
              />
              <X
                size={16}
                className={`absolute transition-all duration-300 ${
                  menuOpen ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'
                }`}
              />
            </span>
            <span className="hidden tracking-wide sm:inline">{menuOpen ? 'סגירה' : 'תפריט'}</span>
          </button>

          <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto" aria-label="מיקום נוכחי">
            <Link
              to={createPageUrl('Dashboard')}
              className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold text-text-primary transition hover:bg-accent-primary/12 hover:text-accent-primary sm:text-sm"
            >
              מערכת דוברות
            </Link>
            {currentPageName && currentPageName !== 'Dashboard' && (
              <>
                <span className="text-text-muted">/</span>
                <span className="truncate rounded-full bg-accent-primary/10 px-3 py-1.5 text-xs font-bold text-accent-primary sm:text-sm">
                  {breadcrumb}
                </span>
              </>
            )}
          </nav>

          {user && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="text-left">
                <p className="text-sm font-bold text-text-primary">{user.full_name}</p>
                <p className="text-xs text-text-muted">
                  {user.custom_role === 'approver' ? 'מאשר' : user.role === 'admin' ? 'מנהל' : 'חפ״ש'}
                </p>
              </div>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-accent-primary text-sm font-bold text-white">
                  {user.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>
    </div>
  );
}
