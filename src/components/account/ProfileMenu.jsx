import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, School, Settings, User, Users } from 'lucide-react';

export const initialsOf = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

/**
 * Avatar button in the dashboard header with the account menu:
 * Profile, Settings, Users (admins only) and Logout.
 */
const ProfileMenu = ({ profile, onNavigate, onLogout, onMyClasses }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [
    onMyClasses && { id: 'my-classes', label: 'My classes', icon: School, hint: 'Class teacher', action: onMyClasses },
    { id: 'profile', label: 'My profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    isAdmin && { id: 'users', label: 'Users', icon: Users, hint: 'Admins & teachers' },
  ].filter(Boolean);

  const go = (item) => { setOpen(false); if (item.action) item.action(); else onNavigate(item.id); };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-2xl py-1.5 pl-1.5 pr-2 transition-colors hover:bg-stone-100 sm:pr-3"
        data-testid="profile-menu-button"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm">
          {initialsOf(profile?.full_name)}
        </span>
        <span className="hidden flex-col items-start sm:flex">
          <span className="max-w-[10rem] truncate text-sm font-bold leading-tight text-stone-900">{profile?.full_name}</span>
          <span className="text-xs capitalize leading-tight text-stone-500">{profile?.role || 'Administrator'}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
          >
            <div className="border-b border-stone-100 px-4 py-3">
              <p className="truncate text-sm font-bold text-stone-900">{profile?.full_name}</p>
              {profile?.email && <p className="truncate text-xs text-stone-500">{profile.email}</p>}
              <p className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{profile?.role}</p>
            </div>
            <div className="p-1.5">
              {items.map(({ id, label, icon: Icon, hint, action }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  onClick={() => go({ id, action })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  <Icon className="h-4 w-4 text-stone-400" />
                  <span className="flex-1">{label}</span>
                  {hint && <span className="text-[10px] font-medium text-stone-400">{hint}</span>}
                </button>
              ))}
            </div>
            <div className="border-t border-stone-100 p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); onLogout(); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                data-testid="admin-logout-button"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
            <p className="border-t border-stone-100 px-4 py-2 text-[10px] text-stone-300" title="App version">v {__APP_VERSION__}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileMenu;
