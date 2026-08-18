import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, Clock3, FileAudio, Loader2, LockKeyhole, LogOut, Mail, Moon, RefreshCw, Send, ShieldCheck, Upload } from 'lucide-react';

const MAX_WAV_BYTES = 25 * 1024 * 1024;
const TIMEZONES = [
  ['America/New_York', 'Eastern Time (New York)'],
  ['America/Chicago', 'Central Time (Chicago)'],
  ['America/Denver', 'Mountain Time (Denver)'],
  ['America/Phoenix', 'Mountain Standard Time (Phoenix)'],
  ['America/Los_Angeles', 'Pacific Time (Los Angeles)'],
  ['America/Anchorage', 'Alaska Time (Anchorage)'],
  ['Pacific/Honolulu', 'Hawaii Time (Honolulu)']
] as const;

type DeliveryLog = {
  id: string;
  recipient_email: string;
  subject: string;
  client_local_time: string;
  client_timezone: string;
  resend_email_id: string | null;
  status: 'scheduling' | 'scheduled' | 'delivered' | 'delayed' | 'bounced' | 'failed';
  error_message: string | null;
  updated_at: string;
};

type ScheduleReceipt = {
  success: boolean;
  recipient: string;
  clientLocalTime: string;
  timezone: string;
  scheduledAtUtc: string;
  resendEmailId: string;
  status: string;
};

const statusStyles: Record<string, string> = {
  scheduling: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
  scheduled: 'border-indigo-300/40 bg-indigo-300/10 text-indigo-100',
  delivered: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100',
  delayed: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
  bounced: 'border-rose-300/40 bg-rose-300/10 text-rose-100',
  failed: 'border-rose-300/40 bg-rose-300/10 text-rose-100'
};

const apiJson = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data as T;
};

export default function AdminSendStory() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('Your Cozy Bedtime Story');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('19:30');
  const [timezone, setTimezone] = useState('America/New_York');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ScheduleReceipt | null>(null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const minimumDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await apiJson<{ emails: DeliveryLog[] }>('/api/admin/story-email-logs');
      setLogs(data.emails);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message === 'Admin login required.') setAuthenticated(false);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    const robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobots = robotsMeta?.content;
    document.title = 'Story Delivery Admin | Cozy Kid Tales';
    if (robotsMeta) robotsMeta.content = 'noindex,nofollow,noarchive';

    apiJson<{ authenticated: boolean; email?: string }>('/api/admin/session')
      .then(data => {
        setAuthenticated(data.authenticated);
        if (data.email) setAdminEmail(data.email);
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingSession(false));

    return () => {
      document.title = previousTitle;
      if (robotsMeta && previousRobots !== undefined) robotsMeta.content = previousRobots;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    void loadLogs();
    const interval = window.setInterval(() => void loadLogs(), 30000);
    return () => window.clearInterval(interval);
  }, [authenticated, loadLogs]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiJson('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: adminEmail, password }) });
      setAuthenticated(true);
      setPassword('');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to log in.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await apiJson('/api/admin/logout', { method: 'POST', body: '{}' }).catch(() => undefined);
    setAuthenticated(false);
    setLogs([]);
    setReceipt(null);
  };

  const chooseAudio = (file: File | null) => {
    setError('');
    if (!file) {
      setAudioFile(null);
      return;
    }
    if (!/\.wav$/i.test(file.name) || !['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'].includes(file.type) || file.size > MAX_WAV_BYTES || file.size === 0) {
      setAudioFile(null);
      setError('Choose a WAV file no larger than 25 MB.');
      return;
    }
    setAudioFile(file);
  };

  const scheduleStory = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setReceipt(null);
    if (!audioFile) {
      setError('Choose a WAV file first.');
      return;
    }
    if (!deliveryDate || !deliveryTime) {
      setError('Choose the client delivery date and time.');
      return;
    }

    setBusy(true);
    let uploadedPath = '';
    try {
      const upload = await apiJson<{
        bucket: string; path: string; token: string; supabaseUrl: string; supabaseAnonKey: string;
      }>('/api/admin/audio-upload-url', {
        method: 'POST',
        body: JSON.stringify({ filename: audioFile.name, contentType: audioFile.type, size: audioFile.size })
      });
      uploadedPath = upload.path;

      const uploadClient = createClient(upload.supabaseUrl, upload.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { error: uploadError } = await uploadClient.storage
        .from(upload.bucket)
        .uploadToSignedUrl(upload.path, upload.token, audioFile, { contentType: 'audio/wav' });
      if (uploadError) throw new Error(`Audio upload failed: ${uploadError.message}`);

      const result = await apiJson<ScheduleReceipt>('/api/admin/schedule-story', {
        method: 'POST',
        body: JSON.stringify({
          recipient,
          subject,
          localDateTime: `${deliveryDate}T${deliveryTime}`,
          timezone,
          audioPath: upload.path,
          filename: audioFile.name
        })
      });
      setReceipt(result);
      setRecipient('');
      setAudioFile(null);
      setDeliveryDate('');
      uploadedPath = '';
      await loadLogs();
    } catch (scheduleError) {
      if (uploadedPath) {
        await apiJson('/api/admin/delete-audio', { method: 'POST', body: JSON.stringify({ audioPath: uploadedPath }) }).catch(() => undefined);
      }
      setError(scheduleError instanceof Error ? scheduleError.message : 'Unable to schedule the story.');
    } finally {
      setBusy(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-[#091136] text-white grid place-items-center"><Loader2 className="animate-spin text-amber-300" /></div>;
  }

  return (
    <main className="min-h-screen bg-[#091136] text-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 text-white">
            <img src="/cozy-kid-tales-icon.svg" alt="" className="h-11 w-11 rounded-xl" />
            <div><span className="block font-kids text-2xl leading-none">Little Moon Stories</span><span className="text-[10px] uppercase tracking-widest text-indigo-200">Private delivery desk</span></div>
          </a>
          {authenticated && <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-indigo-300/25 px-3 py-2 text-xs font-bold text-indigo-100 hover:border-amber-300/50"><LogOut size={15} /> Log out</button>}
        </header>

        {!authenticated ? (
          <section className="mx-auto max-w-md rounded-xl border border-indigo-300/25 bg-[#070b25] p-5 sm:p-7 shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-300/10 text-amber-300"><LockKeyhole /></div>
            <h1 className="font-kids text-3xl text-white">Admin sign in</h1>
            <p className="mt-1 text-sm text-slate-300">This page is restricted to the story administrator.</p>
            <form onSubmit={login} className="mt-6 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-200">Admin email<input type="email" required autoComplete="username" value={adminEmail} onChange={event => setAdminEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-indigo-300/25 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-300" /></label>
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-200">Password<input type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-indigo-300/25 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-300" /></label>
              {error && <p role="alert" className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p>}
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-bold text-slate-950 hover:bg-amber-200 disabled:opacity-60">{busy ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />} Sign in securely</button>
            </form>
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-indigo-300/25 bg-[#070b25] p-4 sm:p-6 shadow-2xl">
              <div className="mb-5"><span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Secure scheduler</span><h1 className="mt-1 font-kids text-3xl text-white sm:text-4xl">Schedule a bedtime story</h1><p className="mt-1 text-sm text-slate-300">The selected client time is converted to UTC before Resend schedules delivery.</p></div>
              <form onSubmit={scheduleStory} className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-200 sm:col-span-1">Recipient email<div className="relative mt-1.5"><Mail className="absolute left-3 top-3 text-indigo-300" size={18} /><input type="email" required value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="parent@example.com" className="w-full rounded-xl border border-indigo-300/25 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-amber-300" /></div></label>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-200 sm:col-span-1">Subject<input required maxLength={200} value={subject} onChange={event => setSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-indigo-300/25 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-300" /></label>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-200 sm:col-span-2">WAV story file<span className="mt-1.5 flex min-h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-indigo-300/35 bg-indigo-300/5 px-4 text-center hover:border-amber-300/60"><input type="file" accept=".wav,audio/wav,audio/x-wav" required className="sr-only" onChange={event => chooseAudio(event.target.files?.[0] || null)} /><span className="flex flex-col items-center gap-1 text-sm normal-case tracking-normal text-slate-200">{audioFile ? <><FileAudio className="text-amber-300" /><strong>{audioFile.name}</strong><span className="text-xs text-slate-400">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</span></> : <><Upload className="text-indigo-300" /><strong>Choose a WAV file</strong><span className="text-xs text-slate-400">Maximum 25 MB</span></>}</span></span></label>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-200">Client delivery date<input type="date" required min={minimumDate} value={deliveryDate} onChange={event => setDeliveryDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-indigo-300/25 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-300" /></label>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-200">Client delivery time<input type="time" required value={deliveryTime} onChange={event => setDeliveryTime(event.target.value)} className="mt-1.5 w-full rounded-xl border border-indigo-300/25 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-300" /></label>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-200 sm:col-span-2">Client U.S. time zone<select required value={timezone} onChange={event => setTimezone(event.target.value)} className="mt-1.5 w-full rounded-xl border border-indigo-300/25 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-amber-300">{TIMEZONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                {error && <p role="alert" className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100 sm:col-span-2">{error}</p>}
                <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-bold text-slate-950 hover:bg-amber-200 disabled:opacity-60 sm:col-span-2">{busy ? <><Loader2 className="animate-spin" size={18} /> Uploading and scheduling...</> : <><Send size={18} /> Schedule Email</>}</button>
              </form>
            </section>

            {receipt && <section className="mt-5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4 sm:p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" /><div><h2 className="font-bold text-emerald-100">Successfully scheduled</h2><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-400">Recipient</dt><dd className="break-all">{receipt.recipient}</dd></div><div><dt className="text-xs text-slate-400">Client-local time</dt><dd>{receipt.clientLocalTime}</dd></div><div><dt className="text-xs text-slate-400">Time zone</dt><dd>{receipt.timezone}</dd></div><div><dt className="text-xs text-slate-400">Resend email ID</dt><dd className="break-all font-mono text-xs">{receipt.resendEmailId}</dd></div></dl></div></div></section>}

            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between"><div><h2 className="font-kids text-2xl text-white">Delivery activity</h2><p className="text-xs text-slate-400">Updated from verified Resend webhooks.</p></div><button type="button" onClick={() => void loadLogs()} disabled={loadingLogs} title="Refresh delivery activity" className="rounded-lg border border-indigo-300/25 p-2 text-indigo-100 hover:border-amber-300/50"><RefreshCw size={17} className={loadingLogs ? 'animate-spin' : ''} /></button></div>
              <div className="space-y-3">{logs.length === 0 ? <div className="rounded-xl border border-indigo-300/20 bg-[#070b25] p-5 text-sm text-slate-400">No scheduled emails yet.</div> : logs.map(log => <article key={log.id} className="rounded-xl border border-indigo-300/20 bg-[#070b25] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-white">{log.subject}</h3><p className="mt-0.5 break-all text-sm text-slate-300">{log.recipient_email}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[log.status] || statusStyles.scheduling}`}>{log.status}</span></div><div className="mt-3 grid gap-2 border-t border-indigo-300/10 pt-3 text-xs text-slate-300 sm:grid-cols-2"><span className="flex items-center gap-2"><Clock3 size={14} className="text-indigo-300" />{log.client_local_time.replace('T', ' ')} · {log.client_timezone}</span><span className="flex items-center gap-2 break-all font-mono"><Moon size={14} className="text-amber-300" />{log.resend_email_id || 'Waiting for Resend ID'}</span></div>{log.error_message && <p className="mt-2 text-xs text-rose-200">{log.error_message}</p>}</article>)}</div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
