import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ResultsModal from './ResultsModal';

const inputCls = 'w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

// Same rule as public.format_registration_no() in the database.
const formatPreview = (cfg) => [
  cfg.prefix.trim() || null,
  cfg.include_year ? String(new Date().getFullYear()) : null,
  String(cfg.next_number || 1).padStart(Number(cfg.digits) || 1, '0'),
].filter(Boolean).join(cfg.separator);

const RegistrationSettingsModal = ({ open, onClose }) => {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from('registration_settings').select('*').eq('id', 1).maybeSingle()
      .then(({ data, error }) => {
        if (error) { toast.error('Could not load settings: ' + error.message); return; }
        setCfg(data || { prefix: 'RMS', separator: '-', include_year: true, digits: 4, next_number: 1 });
      });
  }, [open]);

  const handleSave = async () => {
    const digits = Number(cfg.digits);
    const next = Number(cfg.next_number);
    if (!(digits >= 1 && digits <= 10)) { toast.error('Digits must be between 1 and 10'); return; }
    if (!(next >= 1)) { toast.error('Next number must be 1 or more'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('registration_settings').upsert([{
        id: 1,
        prefix: cfg.prefix.trim(),
        separator: cfg.separator,
        include_year: cfg.include_year,
        digits,
        next_number: next,
        updated_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      toast.success('Registration number format saved');
      onClose();
    } catch (err) {
      toast.error('Could not save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResultsModal
      open={open}
      onClose={onClose}
      title="Registration Number Format"
      subtitle="Used automatically for every new student."
      maxWidth="max-w-md"
      footer={cfg && (
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
          </button>
        </div>
      )}
    >
      {!cfg ? (
        <RefreshCw className="mx-auto my-8 h-6 w-6 animate-spin text-emerald-500" />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Next student gets</p>
            <p className="mt-1 font-mono text-2xl font-extrabold text-emerald-900">{formatPreview(cfg)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Prefix</label>
              <input className={inputCls} value={cfg.prefix} maxLength={12} onChange={e => setCfg(c => ({ ...c, prefix: e.target.value.toUpperCase() }))} placeholder="RMS" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Separator</label>
              <select className={`${inputCls} bg-white`} value={cfg.separator} onChange={e => setCfg(c => ({ ...c, separator: e.target.value }))}>
                <option value="-">Dash ( - )</option>
                <option value="/">Slash ( / )</option>
                <option value="">None</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Number of digits</label>
              <input className={inputCls} type="number" min="1" max="10" value={cfg.digits} onChange={e => setCfg(c => ({ ...c, digits: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Next number</label>
              <input className={inputCls} type="number" min="1" value={cfg.next_number} onChange={e => setCfg(c => ({ ...c, next_number: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-2.5 text-sm">
            Include the year
            <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={cfg.include_year} onChange={e => setCfg(c => ({ ...c, include_year: e.target.checked }))} />
          </label>
          <p className="text-xs text-stone-500">
            Existing students keep their numbers. To change one student&apos;s number, open the student in the Students tab.
            Numbers already in use are skipped automatically.
          </p>
        </div>
      )}
    </ResultsModal>
  );
};

export default RegistrationSettingsModal;
