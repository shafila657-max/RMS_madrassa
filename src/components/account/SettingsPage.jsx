import React, { useState } from 'react';
import { toast } from 'sonner';
import { Hash, LogOut, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { clearCachedProfile } from '@/utils/auth';
import { checkForAppUpdate } from '@/utils/appUpdates';
import RegistrationSettingsModal from '@/components/results/RegistrationSettingsModal';
import { Card } from './ProfilePage';

const Row = ({ title, text, children }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-stone-900">{title}</p>
      <p className="text-xs text-stone-500">{text}</p>
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const buttonCls = 'inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200 disabled:opacity-50 sm:w-auto';

const SettingsPage = ({ profile, onSignedOut }) => {
  const isAdmin = profile?.role === 'admin';
  const [checking, setChecking] = useState(false);
  const [showRegSettings, setShowRegSettings] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const checkUpdates = async () => {
    setChecking(true);
    try {
      const outcome = await checkForAppUpdate();
      if (outcome === 'found') toast.success('A new version is downloading. You will be asked to update in a moment.');
      else if (outcome === 'latest') toast.success('You are on the latest version.');
      else toast('Updates are checked automatically when the app is installed or opened from the website.');
    } catch {
      toast.error('Could not check for updates. Are you online?');
    } finally {
      setChecking(false);
    }
  };

  const signOutEverywhere = async () => {
    if (!window.confirm('Sign out on every phone and computer, including this one?')) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setSigningOut(false);
    if (error) { toast.error('Could not sign out everywhere: ' + error.message); return; }
    clearCachedProfile();
    onSignedOut?.();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Settings</h2>
        <p className="text-sm text-stone-500">App and account settings.</p>
      </div>

      {isAdmin && (
        <Card title="Madrasa" icon={Hash}>
          <Row title="Registration number format" text="How new students' registration numbers look, e.g. RMS-2026-0001.">
            <button type="button" onClick={() => setShowRegSettings(true)} className={buttonCls}>Change format</button>
          </Row>
        </Card>
      )}

      <Card title="App" icon={Smartphone}>
        <Row title={`Version ${__APP_VERSION__}`} text="Installed apps update themselves. Check now if you were told about a fix.">
          <button type="button" onClick={checkUpdates} disabled={checking} className={buttonCls}>
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} /> Check for updates
          </button>
        </Row>
      </Card>

      <Card title="Security" icon={ShieldCheck}>
        <Row title="Sign out on all devices" text="Use this if you signed in on a phone or computer that isn't yours, or lost a device.">
          <button type="button" onClick={signOutEverywhere} disabled={signingOut} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 sm:w-auto">
            <LogOut className="h-4 w-4" /> Sign out everywhere
          </button>
        </Row>
      </Card>

      {isAdmin && <RegistrationSettingsModal open={showRegSettings} onClose={() => setShowRegSettings(false)} />}
    </div>
  );
};

export default SettingsPage;
