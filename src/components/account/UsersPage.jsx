import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, Copy, Eye, EyeOff, KeyRound, Mail, MessageCircle, Pencil, Phone, Plus,
  RefreshCw, Search, ShieldCheck, UserPlus, Users, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MIN_PASSWORD_LENGTH } from '@/utils/auth';
import { CLASS_LEVELS } from '@/utils/results';
import { initialsOf } from './ProfileMenu';
import { Field, inputCls } from './ProfilePage';

const ROLES = {
  admin: { label: 'Admin', badge: 'bg-violet-100 text-violet-700', avatar: 'bg-violet-600', text: 'Manages everything: students, fees, results, classes and users.' },
  teacher: { label: 'Teacher', badge: 'bg-sky-100 text-sky-700', avatar: 'bg-sky-600', text: 'Sees and manages only the classes assigned to them in the Teachers tab.' },
  parent: { label: 'Parent', badge: 'bg-amber-100 text-amber-700', avatar: 'bg-amber-500', text: "Sees their own children's attendance, fees, homework and results." },
  student: { label: 'Student', badge: 'bg-emerald-100 text-emerald-700', avatar: 'bg-emerald-600', text: 'Sees their own attendance, homework and results.' },
};
const FILTERS = [
  { id: 'staff', label: 'Admins & teachers', match: u => u.role === 'admin' || u.role === 'teacher' },
  { id: 'admin', label: 'Admins', match: u => u.role === 'admin' },
  { id: 'teacher', label: 'Teachers', match: u => u.role === 'teacher' },
  { id: 'parent', label: 'Parents', match: u => u.role === 'parent' },
  { id: 'student', label: 'Students', match: u => u.role === 'student' },
  { id: 'all', label: 'Everyone', match: () => true },
];

const MISSING_SQL = 'Run supabase_user_management.sql in Supabase first.';
const explain = (error) => (
  error?.code === 'PGRST202' || /admin_(list|create|update|set)_user/.test(error?.message || '')
    ? MISSING_SQL
    : error?.message || String(error)
);

const lastSeen = (iso) => {
  if (!iso) return 'Never signed in';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Signed in today';
  if (days === 1) return 'Signed in yesterday';
  if (days < 30) return `Signed in ${days} days ago`;
  return `Last signed in ${new Date(iso).toLocaleDateString('en-IN')}`;
};

const makePassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
};

const Badge = ({ className, children }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}>{children}</span>
);

const Sheet = ({ open, onClose, title, children, footer }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          role="dialog"
          aria-label={title}
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h3 className="text-lg font-bold text-stone-900">{title}</h3>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-stone-400 hover:bg-stone-100" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex gap-2 border-t border-stone-100 bg-stone-50/60 px-5 py-3">{footer}</div>}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const PasswordInput = ({ value, onChange, onGenerate }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          className={`${inputCls} pr-10 font-mono`}
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <button type="button" onClick={() => { onGenerate(); setShow(true); }} className="rounded-xl bg-stone-100 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-200">Generate</button>
    </div>
  );
};

// Login details to hand over after creating an account or setting a password.
const Handover = ({ name, email, password }) => {
  const text = `Assalamu alaikum ${name},\nYour RMS Madrasa login:\nWebsite: ${window.location.origin} (tap Login)\nEmail: ${email}\nPassword: ${password}\nYou can change the password after signing in (profile menu → My profile).`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the text and copy it instead.');
    }
  };
  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-bold text-emerald-900">Send these login details to {name}</p>
      <pre className="whitespace-pre-wrap break-all rounded-xl bg-white p-3 font-mono text-xs text-stone-700">{text}</pre>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:brightness-95">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>
    </div>
  );
};

// ─── Add a user ───────────────────────────────────────────────────────────────

const emptyNew = { full_name: '', email: '', phone: '', password: '', role: 'admin', subject: '', classes: [] };

const AddUserSheet = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState(emptyNew);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => { if (open) { setForm({ ...emptyNew, password: makePassword() }); setCreated(null); } }, [open]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    if (form.password.length < MIN_PASSWORD_LENGTH) { toast.error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters`); return; }
    if (form.role === 'teacher' && !form.subject.trim()) { toast.error('Enter the subject they teach'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_create_user', {
        p_email: form.email.trim(),
        p_password: form.password,
        p_full_name: form.full_name.trim(),
        p_role: form.role,
        p_phone: form.phone.trim() || null,
      });
      if (error) throw error;

      if (form.role === 'teacher') {
        // Teachers find their classes through the Teachers list (matched by email).
        const { error: tcError } = await supabase.from('teacher_contacts').insert([{
          full_name: form.full_name.trim(), subject: form.subject.trim(), phone: form.phone.trim() || null, email: form.email.trim().toLowerCase(),
        }]);
        if (tcError) toast.error('Login created, but adding to the Teachers list failed: ' + tcError.message);
        else if (form.classes.length) {
          const { error: ctError } = await supabase.from('class_teachers').upsert(
            form.classes.map(c => ({ class_level: c, teacher_name: form.full_name.trim() })),
            { onConflict: 'class_level' }
          );
          if (ctError) toast.error('Login created, but assigning classes failed: ' + ctError.message);
        }
      }

      toast.success(`${form.full_name.trim()} can now sign in as ${ROLES[form.role].label.toLowerCase()}`);
      setCreated({ name: form.full_name.trim(), email: form.email.trim().toLowerCase(), password: form.password });
      onCreated?.();
    } catch (err) {
      toast.error('Could not create the user: ' + explain(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={created ? 'User created' : 'Add a user'}
      footer={created ? (
        <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Done</button>
      ) : (
        <>
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200">Cancel</button>
          <button type="submit" form="add-user-form" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create login
          </button>
        </>
      )}
    >
      {created ? (
        <Handover {...created} />
      ) : (
        <form id="add-user-form" onSubmit={submit} className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-stone-700">Role</span>
            <div className="grid grid-cols-2 gap-2">
              {['admin', 'teacher'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`rounded-2xl border p-3 text-left transition ${form.role === r ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30' : 'border-stone-200 hover:border-stone-300'}`}
                >
                  <p className="text-sm font-bold text-stone-900">{ROLES[r].label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-stone-500">{ROLES[r].text}</p>
                </button>
              ))}
            </div>
          </div>
          <Field label="Full name *">
            <input className={inputCls} value={form.full_name} onChange={set('full_name')} placeholder="e.g. Ustadh Ahmed Ali" required />
          </Field>
          <Field label="Email (used to sign in) *">
            <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" required autoComplete="off" />
          </Field>
          <Field label="Phone">
            <input className={inputCls} type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" />
          </Field>
          <Field label="Password *" hint="They can change it after signing in.">
            <PasswordInput value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} onGenerate={() => setForm(f => ({ ...f, password: makePassword() }))} />
          </Field>
          {form.role === 'teacher' && (
            <>
              <Field label="Subject *">
                <input className={inputCls} value={form.subject} onChange={set('subject')} placeholder="e.g. Quran Memorization" />
              </Field>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-stone-700">Classes</span>
                <div className="flex flex-wrap gap-1.5">
                  {CLASS_LEVELS.map(c => {
                    const on = form.classes.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, classes: on ? f.classes.filter(x => x !== c) : [...f.classes, c] }))}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-stone-400">A class already assigned to someone else moves to this teacher. You can change classes later in the Teachers tab.</p>
              </div>
            </>
          )}
        </form>
      )}
    </Sheet>
  );
};

// ─── Edit a user ──────────────────────────────────────────────────────────────

const EditUserSheet = ({ user, me, onClose, onSaved }) => {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [handover, setHandover] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name || '', phone: user.phone || '', role: user.role, status: user.status || 'approved' });
      setPassword('');
      setHandover(null);
    }
  }, [user]);

  if (!user || !form) return <Sheet open={false} onClose={onClose} title="" />;

  const isMe = user.id === me?.id;
  const hasPhone = Object.prototype.hasOwnProperty.call(user, 'phone');
  const roleChanged = form.role !== user.role;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc('admin_update_user', {
      p_user: user.id,
      p_full_name: form.full_name.trim() || null,
      p_phone: hasPhone ? form.phone.trim() : null,
      p_role: isMe ? null : form.role,
      p_status: isMe ? null : form.status,
    });
    setSaving(false);
    if (error) { toast.error('Could not save: ' + explain(error)); return; }
    toast.success('Saved');
    onSaved?.();
    onClose();
  };

  const setNewPassword = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) { toast.error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters`); return; }
    setPwSaving(true);
    const { error } = await supabase.rpc('admin_set_user_password', { p_user: user.id, p_password: password });
    setPwSaving(false);
    if (error) { toast.error('Could not set the password: ' + explain(error)); return; }
    toast.success('Password changed');
    setHandover({ name: form.full_name.trim() || user.full_name, email: user.email, password });
    setPassword('');
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={isMe ? 'Your account' : `Edit ${user.full_name || 'user'}`}
      footer={(
        <>
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200">Cancel</button>
          <button type="submit" form="edit-user-form" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
          </button>
        </>
      )}
    >
      <form id="edit-user-form" onSubmit={save} className="space-y-4">
        <p className="flex items-center gap-1.5 text-sm text-stone-500"><Mail className="h-4 w-4" /> {user.email || 'No email'}</p>
        <Field label="Full name">
          <input className={inputCls} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </Field>
        {hasPhone && (
          <Field label="Phone">
            <input className={inputCls} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </Field>
        )}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Role</span>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ROLES).map(([r, info]) => (
              <button
                key={r}
                type="button"
                disabled={isMe}
                onClick={() => setForm(f => ({ ...f, role: r }))}
                className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${form.role === r ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}
              >
                {info.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-stone-500">{ROLES[form.role]?.text}</p>
          {isMe && <p className="mt-1.5 text-xs text-amber-700">You can't change your own role or access. Another admin can.</p>}
          {!isMe && roleChanged && form.role === 'admin' && user.role === 'teacher' && (
            <p className="mt-1.5 rounded-xl bg-sky-50 p-2.5 text-xs text-sky-800">
              They keep their place in the Teachers list and stay class teacher of their classes. As an admin they can also open every other class.
            </p>
          )}
          {!isMe && roleChanged && form.role === 'teacher' && (
            <p className="mt-1.5 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800">
              A teacher only sees classes assigned to them in the Teachers tab. Make sure they're in the Teachers list with this same email ({user.email}).
            </p>
          )}
        </div>
        {!isMe && (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-stone-700">Access</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'approved', label: 'Active', text: 'Can sign in and use the app' },
                { id: 'rejected', label: 'Deactivated', text: 'Blocked; their data is kept' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, status: s.id }))}
                  className={`rounded-xl border px-3 py-2 text-left transition ${form.status === s.id ? (s.id === 'approved' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30' : 'border-red-400 bg-red-50 ring-2 ring-red-400/30') : 'border-stone-200 hover:border-stone-300'}`}
                >
                  <p className="text-sm font-semibold text-stone-900">{s.label}</p>
                  <p className="text-[11px] text-stone-500">{s.text}</p>
                </button>
              ))}
            </div>
            {form.status === 'pending' && <p className="mt-1.5 text-xs text-amber-700">This account is waiting for approval. Choose Active to approve it.</p>}
          </div>
        )}
      </form>

      {!isMe && user.has_login && (
        <div className="space-y-2 rounded-2xl border border-stone-200 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-stone-900"><KeyRound className="h-4 w-4 text-stone-400" /> Set a new password</p>
          <p className="text-xs text-stone-500">For someone who forgot their password. Their old password stops working.</p>
          <PasswordInput value={password} onChange={setPassword} onGenerate={() => setPassword(makePassword())} />
          <button type="button" onClick={setNewPassword} disabled={pwSaving || !password} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {pwSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Set password
          </button>
          {handover && <Handover {...handover} />}
        </div>
      )}
    </Sheet>
  );
};

// ─── Users list ───────────────────────────────────────────────────────────────

const UsersPage = ({ me }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('staff');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) {
      setLoadError(explain(error));
    } else {
      setLoadError('');
      setUsers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.id, users.filter(f.match).length])), [users]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = FILTERS.find(f => f.id === filter)?.match || (() => true);
    const order = { admin: 0, teacher: 1, parent: 2, student: 3 };
    return users
      .filter(match)
      .filter(u => !q || [u.full_name, u.email, u.phone].some(v => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9) || (a.full_name || '').localeCompare(b.full_name || ''));
  }, [users, filter, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Users</h2>
          <p className="text-sm text-stone-500">Everyone who can sign in. Create logins for admins and teachers here.</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} disabled={!!loadError} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add user
        </button>
      </div>

      {loadError && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Could not load users: {loadError}</p>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === f.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'}`}
            >
              {f.label} <span className="opacity-60">{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:ml-auto lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input className={`${inputCls} pl-9`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or phone" />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-500" /></div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-stone-100 bg-white p-12 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-stone-200" />
          <p className="text-sm text-stone-500">{search ? 'Nobody matches your search.' : 'No users here yet.'}</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          {shown.map(u => {
            const role = ROLES[u.role] || { label: u.role || 'Unknown', badge: 'bg-stone-100 text-stone-600', avatar: 'bg-stone-400' };
            const isMe = u.id === me?.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setEditing(u)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-stone-50/80"
              >
                <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${role.avatar} ${u.status === 'rejected' ? 'opacity-40' : ''}`}>
                  {initialsOf(u.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className={`truncate font-semibold ${u.status === 'rejected' ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{u.full_name || 'No name'}</span>
                    {isMe && <Badge className="bg-stone-900 text-white">You</Badge>}
                    <Badge className={role.badge}>{role.label}</Badge>
                    {u.status === 'pending' && <Badge className="bg-amber-100 text-amber-800">Waiting approval</Badge>}
                    {u.status === 'rejected' && <Badge className="bg-red-100 text-red-700">Deactivated</Badge>}
                  </p>
                  <p className="flex flex-wrap gap-x-3 text-xs text-stone-500">
                    {u.email && <span className="truncate">{u.email}</span>}
                    {u.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{u.phone}</span>}
                  </p>
                  <p className="text-[11px] text-stone-400">{lastSeen(u.last_sign_in_at)}</p>
                </div>
                <Pencil className="h-4 w-4 flex-shrink-0 text-stone-300" />
              </button>
            );
          })}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-stone-400">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        There is always at least one admin: the last admin can't be removed or deactivated, and nobody can remove their own admin access.
      </p>

      <AddUserSheet open={adding} onClose={() => setAdding(false)} onCreated={load} />
      <EditUserSheet user={editing} me={me} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  );
};

export default UsersPage;
