import React, { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, RefreshCw, Save, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MIN_PASSWORD_LENGTH, setCachedProfile } from '@/utils/auth';
import { initialsOf } from './ProfileMenu';

export const inputCls = 'w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-500';
export const Card = ({ title, icon: Icon, children, footer }) => (
  <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
      {Icon && <Icon className="h-4 w-4 text-emerald-600" />}
      <h3 className="font-bold text-stone-900">{title}</h3>
    </div>
    <div className="space-y-4 p-5">{children}</div>
    {footer && <div className="flex justify-end border-t border-stone-100 bg-stone-50/60 px-5 py-3">{footer}</div>}
  </section>
);
export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
  </label>
);

/** The signed-in person's own details and password. */
const ProfilePage = ({ profile, onProfileChange }) => {
  const hasPhone = profile && Object.prototype.hasOwnProperty.call(profile, 'phone');
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone: profile?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const detailsChanged = form.full_name.trim() !== (profile?.full_name || '')
    || (hasPhone && form.phone.trim() !== (profile?.phone || ''));

  const saveDetails = async (e) => {
    e.preventDefault();
    const full_name = form.full_name.trim();
    if (!full_name) { toast.error('Enter your name'); return; }
    setSaving(true);
    const changes = { full_name, ...(hasPhone ? { phone: form.phone.trim() || null } : {}) };
    const { error } = await supabase.from('profiles').update(changes).eq('id', profile.id);
    setSaving(false);
    if (error) { toast.error('Could not save: ' + error.message); return; }
    const next = { ...profile, ...changes };
    setCachedProfile(next);
    onProfileChange?.(next);
    toast.success('Profile saved');
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.next.length < MIN_PASSWORD_LENGTH) { toast.error(`Use at least ${MIN_PASSWORD_LENGTH} characters`); return; }
    if (pw.next !== pw.confirm) { toast.error('The two passwords do not match'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setPwSaving(false);
    if (error) { toast.error('Could not change password: ' + error.message); return; }
    setPw({ next: '', confirm: '' });
    toast.success('Password changed. Use the new password next time you sign in.');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white shadow">
          {initialsOf(profile?.full_name)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-stone-900">{profile?.full_name}</h2>
          <p className="text-sm capitalize text-stone-500">{profile?.role}{profile?.email ? ` · ${profile.email}` : ''}</p>
        </div>
      </div>

      <form onSubmit={saveDetails}>
        <Card
          title="Your details"
          icon={User}
          footer={(
            <button type="submit" disabled={saving || !detailsChanged} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          )}
        >
          <Field label="Full name">
            <input className={inputCls} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          </Field>
          {hasPhone && (
            <Field label="Phone">
              <input className={inputCls} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
            </Field>
          )}
          <Field label="Email (sign-in)" hint="Your sign-in email can't be changed here.">
            <input className={inputCls} value={profile?.email || ''} disabled />
          </Field>
        </Card>
      </form>

      <form onSubmit={savePassword}>
        <Card
          title="Change password"
          icon={KeyRound}
          footer={(
            <button type="submit" disabled={pwSaving || !pw.next} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {pwSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Change password
            </button>
          )}
        >
          <Field label="New password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
            <input className={inputCls} type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
          </Field>
          <Field label="Confirm new password">
            <input className={inputCls} type="password" autoComplete="new-password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
          </Field>
        </Card>
      </form>
    </div>
  );
};

export default ProfilePage;
