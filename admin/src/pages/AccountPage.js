import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import {
  updateProfileApi,
  changePasswordApi,
  getTwoFactorApi,
  startTwoFactorSetupApi,
  enableTwoFactorApi,
  disableTwoFactorApi,
  regenerateRecoveryCodesApi,
} from '../services/authService';
import Modal from '../components/common/Modal';
import { Button, Card, Field, PageHeader, inputClass } from '../components/common/ui';
import { Pill } from '../components/common/StatusBadge';
import { PasswordInput } from '../components/auth/AuthShell';
import { formatDate } from '../utils/formatters';
import { toast, toastError } from '../utils/toast';

const ADMIN_MIN_PASSWORD = 12;

function RecoveryCodes({ codes, email }) {
  const text = `Kommently admin recovery codes for ${email}\nEach code works once.\n\n${codes.join('\n')}\n`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      toast.success('Recovery codes copied.');
    } catch {
      toast.error('Could not copy. Select the codes and copy them.');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kommently-admin-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 font-mono text-sm text-gray-900">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={copy}>Copy</Button>
        <Button size="sm" onClick={download}>Download</Button>
      </div>
    </div>
  );
}

// Password → scan and confirm → save recovery codes
function SetupDialog({ email, onClose, onEnabled }) {
  const { applySession } = useAuth();
  const [step, setStep] = useState('password');
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await startTwoFactorSetupApi(password);
      setSetup(data);
      setPassword('');
      setStep('scan');
    } catch (err) {
      toastError(err, 'Could not start the setup.');
    }
    setBusy(false);
  };

  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await enableTwoFactorApi(code);
      applySession(data);
      setCodes(data.recoveryCodes);
      setStep('codes');
      onEnabled();
    } catch (err) {
      if (err.response?.data?.code === 'SETUP_EXPIRED') setStep('password');
      toastError(err, 'Could not turn on two-step sign-in.');
    }
    setBusy(false);
  };

  return (
    <Modal isOpen onClose={step === 'codes' ? undefined : onClose} title="Turn on two-step sign-in" size="sm">
      {step === 'password' && (
        <form onSubmit={start} className="space-y-4">
          <p className="text-sm text-gray-500">Confirm it's you before changing how you sign in.</p>
          <Field label="Your password">
            <PasswordInput id="setup-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={busy || !password}>{busy ? 'Checking…' : 'Continue'}</Button>
          </div>
        </form>
      )}

      {step === 'scan' && setup && (
        <form onSubmit={confirm} className="space-y-4">
          <ol className="space-y-1 text-sm text-gray-600">
            <li>1. Open an authenticator app: Google Authenticator, 1Password, Authy or Microsoft Authenticator.</li>
            <li>2. Scan this QR code, or enter the key by hand.</li>
            <li>3. Type the 6-digit code it shows.</li>
          </ol>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 p-4">
            <img src={setup.qr} alt="QR code for your authenticator app" width={180} height={180} className="h-[180px] w-[180px]" />
            <div className="text-center">
              <p className="text-xs text-gray-500">Setup key</p>
              <p className="select-all font-mono text-sm tracking-wider text-gray-900">{setup.secret}</p>
            </div>
          </div>
          <Field label="6-digit code">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              className={`${inputClass} h-10 text-center font-mono text-lg tracking-[0.4em]`}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Turn on'}</Button>
          </div>
        </form>
      )}

      {step === 'codes' && codes && (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Two-step sign-in is on. Other sessions were signed out.</div>
          <p className="text-sm text-gray-600">
            Save these recovery codes somewhere safe, like a password manager. If you lose your phone, each code signs you in once.
            <span className="font-medium text-gray-900"> You won't see them again.</span>
          </p>
          <RecoveryCodes codes={codes} email={email} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
            I saved my recovery codes
          </label>
          <div className="flex justify-end">
            <Button variant="primary" disabled={!saved} onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// Password + current code, then runs `action` (turn off, or new recovery codes)
function ConfirmIdentityDialog({ title, description, confirmLabel, danger, onSubmit, onClose }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(password, code);
    if (!ok) setBusy(false);
  };
  return (
    <Modal isOpen onClose={onClose} title={title} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-500">{description}</p>
        <Field label="Your password">
          <PasswordInput id="confirm-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        <Field label="Code from your app" hint="Or one of your recovery codes.">
          <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" className={`${inputClass} font-mono`} placeholder="123456" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={busy || !password || !code}>{busy ? 'Checking…' : confirmLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

function TwoFactorCard({ user, setupRequested }) {
  const [status, setStatus] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [newCodes, setNewCodes] = useState(null);

  const load = useCallback(() => {
    getTwoFactorApi().then(({ data }) => setStatus(data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  // Arriving from the reminder banner or the 2FA policy opens the setup once
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (status && setupRequested && !status.enabled && !autoOpened) {
      setAutoOpened(true);
      setDialog('setup');
    }
  }, [status, setupRequested, autoOpened]);

  if (!status) return <Card title="Two-step sign-in"><p className="text-sm text-gray-500">Loading…</p></Card>;

  const disable = async (password, code) => {
    try {
      await disableTwoFactorApi(password, code);
      toast.success('Two-step sign-in is off.');
      setDialog(null);
      load();
      return true;
    } catch (err) {
      toastError(err, 'Could not turn it off.');
      return false;
    }
  };

  const regenerate = async (password, code) => {
    try {
      const { data } = await regenerateRecoveryCodesApi(password, code);
      setNewCodes(data.recoveryCodes);
      setDialog(null);
      load();
      return true;
    } catch (err) {
      toastError(err, 'Could not create new codes.');
      return false;
    }
  };

  return (
    <Card
      title="Two-step sign-in"
      description="After your password, sign-in asks for a code from an authenticator app on your phone."
      actions={status.enabled ? <Pill tone="green" dot>On</Pill> : <Pill tone={status.required ? 'red' : 'amber'} dot>Off</Pill>}
    >
      {status.enabled ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            On since {formatDate(status.enabledAt)}.{' '}
            <span className={status.recoveryCodesLeft <= 3 ? 'font-medium text-amber-700' : ''}>
              {status.recoveryCodesLeft} of 10 recovery codes left.
            </span>
          </p>
          {newCodes && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-sm font-medium text-gray-900">Your new recovery codes. The old ones no longer work. Save these now.</p>
              <RecoveryCodes codes={newCodes} email={user.email} />
              <Button size="sm" variant="ghost" onClick={() => setNewCodes(null)}>I saved them</Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialog('codes')}>New recovery codes</Button>
            {!status.required && <Button variant="danger-soft" onClick={() => setDialog('disable')}>Turn off</Button>}
          </div>
          {status.required && <p className="text-xs text-gray-500">Admin accounts must keep two-step sign-in on.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {status.required ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Admin accounts must use two-step sign-in. Turn it on to use the admin panel.
            </div>
          ) : (
            <p className="text-sm text-gray-600">Someone who learns your password still can't sign in without your phone. Strongly recommended for admin accounts.</p>
          )}
          <Button variant="primary" onClick={() => setDialog('setup')}>Turn on two-step sign-in</Button>
        </div>
      )}

      {dialog === 'setup' && <SetupDialog email={user.email} onClose={() => setDialog(null)} onEnabled={load} />}
      {dialog === 'disable' && (
        <ConfirmIdentityDialog
          title="Turn off two-step sign-in?"
          description="Your account will be protected by your password only."
          confirmLabel="Turn off"
          danger
          onSubmit={disable}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'codes' && (
        <ConfirmIdentityDialog
          title="New recovery codes"
          description="Creates 10 new codes. The codes you have now stop working."
          confirmLabel="Create new codes"
          onSubmit={regenerate}
          onClose={() => setDialog(null)}
        />
      )}
    </Card>
  );
}

function ProfileCard({ user }) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState(user.name || '');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfileApi({ name: name.trim() });
      await refreshUser();
      toast.success('Name saved.');
    } catch (err) {
      toastError(err, 'Could not save your name.');
    }
    setBusy(false);
  };
  return (
    <Card title="Profile">
      <form onSubmit={save} className="space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} />
        </Field>
        <Field label="Email" hint="Used to sign in and for password reset links.">
          <input value={user.email} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={busy || !name.trim() || name.trim() === user.name}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const { applySession } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const tooShort = next.length > 0 && next.length < ADMIN_MIN_PASSWORD;
  const mismatch = repeat.length > 0 && next !== repeat;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await changePasswordApi(current, next);
      applySession(data);
      setCurrent(''); setNext(''); setRepeat('');
      toast.success('Password changed. Other sessions were signed out.');
    } catch (err) {
      toastError(err, 'Could not change the password.');
    }
    setBusy(false);
  };

  return (
    <Card title="Password" description={`At least ${ADMIN_MIN_PASSWORD} characters. Changing it signs out every other session.`}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Current password">
          <PasswordInput id="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" hint={tooShort ? `${ADMIN_MIN_PASSWORD - next.length} more characters` : undefined}>
          <PasswordInput id="new-admin-password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Repeat new password" hint={mismatch ? "The passwords don't match yet" : undefined}>
          <PasswordInput id="repeat-admin-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={busy || !current || next.length < ADMIN_MIN_PASSWORD || next !== repeat}>
            {busy ? 'Saving…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function AccountPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  if (!user) return null;
  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="Your account" description="How you sign in to the admin panel." />
      <div className="space-y-6">
        <TwoFactorCard user={user} setupRequested={params.get('setup') === '2fa'} />
        <PasswordCard />
        <ProfileCard user={user} />
      </div>
    </div>
  );
}
