import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import { Resend } from 'resend';

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const isVercel = process.env.VERCEL === '1';
const checkoutEnabled = process.env.CHECKOUT_ENABLED === 'true';
const mockCheckoutEnabled = !isProd && process.env.ALLOW_MOCK_CHECKOUT === 'true';
const turnstileRequired = isProd || process.env.TURNSTILE_REQUIRED === 'true';
const port = 3000;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ADMIN_AUDIO_BUCKET = 'admin-story-audio';
const ADMIN_COOKIE = 'cozy_admin_session';
const MAX_WAV_BYTES = 25 * 1024 * 1024;
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const US_TIMEZONES = new Set([
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu'
]);

const signupAttempts = new Map<string, number[]>();
const isRateLimited = (key: string, limit: number, windowMs: number) => {
  const now = Date.now();
  const recent = (signupAttempts.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= limit) {
    signupAttempts.set(key, recent);
    return true;
  }
  recent.push(now);
  signupAttempts.set(key, recent);
  return false;
};

const parseCookies = (req: Request) => Object.fromEntries(
  (req.header('cookie') || '')
    .split(';')
    .map(part => part.trim().split('='))
    .filter(([key, value]) => Boolean(key && value))
    .map(([key, ...value]) => [key, decodeURIComponent(value.join('='))])
);

const base64Url = (value: string | Buffer) => Buffer.from(value).toString('base64url');
const sessionSignature = (payload: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(payload).digest('base64url');

const createAdminSession = (email: string, secret: string) => {
  const payload = base64Url(JSON.stringify({
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: crypto.randomBytes(16).toString('hex')
  }));
  return `${payload}.${sessionSignature(payload, secret)}`;
};

const getAdminSession = (req: Request) => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const token = parseCookies(req)[ADMIN_COOKIE];
  if (!secret || secret.length < 32 || !expectedEmail || !token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expectedSignature = sessionSignature(payload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string; exp?: number };
    if (parsed.email !== expectedEmail || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const requireAdmin = (req: Request, res: Response, next: () => void) => {
  if (!getAdminSession(req)) {
    res.status(401).json({ error: 'Admin login required.' });
    return;
  }
  next();
};

const isSameOrigin = (req: Request) => {
  const origin = req.header('origin');
  if (!origin) return !isProd;
  const configuredOrigin = process.env.APP_URL?.replace(/\/$/, '');
  const forwardedProtocol = req.header('x-forwarded-proto')?.split(',')[0]?.trim();
  const requestOrigin = `${forwardedProtocol || req.protocol}://${req.get('host')}`;
  return origin === configuredOrigin || origin === requestOrigin;
};

const verifyScryptPassword = (password: unknown, encodedHash: string | undefined) => {
  if (typeof password !== 'string' || password.length < 8 || password.length > 200 || !encodedHash) return false;
  const [algorithm, saltEncoded, hashEncoded] = encodedHash.split('$');
  if (algorithm !== 'scrypt' || !saltEncoded || !hashEncoded) return false;
  try {
    const expected = Buffer.from(hashEncoded, 'base64url');
    if (expected.length !== 64) return false;
    const actual = crypto.scryptSync(password, Buffer.from(saltEncoded, 'base64url'), expected.length);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character] || character));

const getClientIp = (req: Request) => {
  const forwarded = req.header('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.ip || 'unknown';
};

const verifyTurnstile = async (token: unknown, remoteIp: string) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return !turnstileRequired;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
      signal: controller.signal
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean; action?: string };
    return result.success === true && (!result.action || result.action === 'free_story_signup');
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

// Initialize clients conditionally to prevent startup crashes if keys are missing
let supabase: any = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// PayPal Configuration
const getPayPalApiUrl = () => {
  return process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
};

const getPayPalAccessToken = async (): Promise<string | null> => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const response = await fetch(`${getPayPalApiUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      console.error('Failed to get PayPal access token:', await response.text());
      return null;
    }
    
    const data: any = await response.json();
    return data.access_token;
  } catch (err) {
    console.error('PayPal OAuth request failed:', err);
    return null;
  }
};

const isValidEmail = (value: unknown): value is string => {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
};

const isValidDeliveryTime = (value: unknown): value is string => {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
};

const isValidTimezone = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const cleanText = (value: unknown, fallback: string, maxLength = 250): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
};

const normalizeChildren = (children: unknown): ChildDetail[] => {
  if (!Array.isArray(children) || children.length === 0 || children.length > 5) {
    throw new Error('Please provide between 1 and 5 child profiles.');
  }

  return children.map((child, index) => {
    if (!child || typeof child !== 'object') {
      throw new Error(`Child #${index + 1} is invalid.`);
    }

    const record = child as Record<string, unknown>;
    const nickname = cleanText(record.nickname || record.name, '', 80);
    const gender = cleanText(record.gender, '', 20);
    const birthday = cleanText(record.birthday, '', 20);

    if (!nickname) throw new Error(`Child #${index + 1} nickname is required.`);
    if (!['female', 'male', 'other'].includes(gender)) throw new Error(`Child #${index + 1} gender is invalid.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) throw new Error(`Child #${index + 1} birthday is invalid.`);

    const birthDate = new Date(`${birthday}T00:00:00Z`);
    const now = new Date();
    const earliest = new Date(Date.UTC(now.getUTCFullYear() - 20, now.getUTCMonth(), now.getUTCDate()));
    if (Number.isNaN(birthDate.getTime()) || birthDate > now || birthDate < earliest) {
      throw new Error(`Child #${index + 1} birthday is outside the allowed range.`);
    }

    return {
      name: nickname,
      nickname,
      gender,
      birthday
    };
  });
};

const enqueueSignupStoryJob = async (subscriberId: unknown) => {
  if (!supabase) return;

  const numericSubscriberId = Number(subscriberId);
  if (!Number.isInteger(numericSubscriberId)) return;

  const { data, error } = await supabase.rpc('enqueue_signup_story_job', {
    p_subscriber_id: numericSubscriberId
  });

  if (error) {
    console.error('Unable to enqueue same-day signup story job:', error);
    return;
  }

  if (data) {
    console.log(`Same-day signup story job created: ${data}`);
  } else {
    console.log(`No same-day signup story job needed for subscriber ${numericSubscriberId}.`);
  }
};

// Memory database fallback for easy previewing when keys are not set
interface ChildDetail {
  name: string;
  nickname: string;
  gender: string;
  birthday: string;
}

interface Subscriber {
  id: string;
  parent_email: string;
  child_names: string;
  age_range: '3-5' | '6-8';
  delivery_time: string;
  timezone: string;
  preferred_theme: string;
  favorite_hobby: string;
  favorite_animal: string;
  plan_type: 'monthly' | 'free_trial';
  payment_status: number; // 0 for unpaid, 1 for paid
  package_end_date: string | null;
  payment_provider_order_id?: string;
  created_at: string;
  children_list?: ChildDetail[];
}

const mockSubscribers: Subscriber[] = [
  {
    id: '1',
    parent_email: 'parent.demo@example.com',
    child_names: 'Mia',
    age_range: '3-5',
    delivery_time: '19:30',
    timezone: 'America/New_York',
    preferred_theme: 'Friendship & Nature',
    favorite_hobby: 'reading',
    favorite_animal: 'elephant',
    plan_type: 'monthly',
    payment_status: 1,
    package_end_date: new Date(Date.now() + 3600000 * 24 * 29).toISOString(),
    payment_provider_order_id: 'cs_mock_paid123',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: '2',
    parent_email: 'family.demo@example.com',
    child_names: 'Noah',
    age_range: '6-8',
    delivery_time: '20:15',
    timezone: 'America/Los_Angeles',
    preferred_theme: 'magic space adventures',
    favorite_hobby: 'drawing',
    favorite_animal: 'dolphin',
    plan_type: 'monthly',
    payment_status: 1,
    package_end_date: new Date(Date.now() + 3600000 * 24 * 28).toISOString(),
    payment_provider_order_id: 'cs_mock_paid456',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

app.disable('x-powered-by');

app.use((req: Request, res: Response, next) => {
  if (isProd) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; media-src 'self' blob:; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://vitals.vercel-insights.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
    );
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

// Webhook verification must receive the exact raw bytes sent by Resend.
app.post('/api/admin/resend-webhook', express.raw({ type: 'application/json', limit: '256kb' }), async (req: Request, res: Response): Promise<void> => {
  if (!resend || !process.env.RESEND_WEBHOOK_SECRET || !supabase) {
    res.status(503).json({ error: 'Webhook handling is not configured.' });
    return;
  }

  try {
    const event = resend.webhooks.verify({
      payload: Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body),
      headers: {
        id: req.header('svix-id') || '',
        timestamp: req.header('svix-timestamp') || '',
        signature: req.header('svix-signature') || ''
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET
    }) as { type?: string; created_at?: string; data?: { email_id?: string } };

    const statusByEvent: Record<string, string> = {
      'email.sent': 'scheduled',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'delayed',
      'email.bounced': 'bounced',
      'email.failed': 'failed'
    };
    const emailId = event.data?.email_id;
    const status = event.type ? statusByEvent[event.type] : undefined;

    if (emailId && status) {
      const { error } = await supabase.rpc('record_admin_story_email_event', {
        p_resend_email_id: emailId,
        p_status: status,
        p_event_type: event.type,
        p_event_at: event.created_at || new Date().toISOString(),
        p_svix_id: req.header('svix-id') || null
      });
      if (error) throw error;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Rejected Resend webhook:', error);
    res.status(400).json({ error: 'Invalid webhook.' });
  }
});

// JSON parsing for standard routes. Keep this small because signup payloads are tiny.
app.use(express.json({ limit: '25kb' }));

app.post('/api/admin/login', async (req: Request, res: Response): Promise<void> => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: 'Invalid request origin.' });
    return;
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(`admin-login:${clientIp}`, 5, 15 * 60 * 1000)) {
    res.setHeader('Retry-After', '900');
    res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
    return;
  }

  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const providedEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const passwordMatches = verifyScryptPassword(req.body?.password, process.env.ADMIN_PASSWORD_HASH);
  const emailMatches = Boolean(configuredEmail && providedEmail && configuredEmail === providedEmail);

  if (!emailMatches || !passwordMatches || !process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32) {
    await new Promise(resolve => setTimeout(resolve, 350));
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const session = createAdminSession(configuredEmail!, process.env.ADMIN_SESSION_SECRET);
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${encodeURIComponent(session)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Strict${isProd ? '; Secure' : ''}`);
  res.json({ authenticated: true, email: configuredEmail });
});

app.get('/api/admin/session', (req: Request, res: Response) => {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, email: session.email });
});

app.post('/api/admin/logout', requireAdmin, (req: Request, res: Response) => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: 'Invalid request origin.' });
    return;
  }
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${isProd ? '; Secure' : ''}`);
  res.json({ authenticated: false });
});

app.post('/api/admin/audio-upload-url', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: 'Invalid request origin.' });
    return;
  }
  if (!supabase || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    res.status(503).json({ error: 'Private upload is not configured.' });
    return;
  }

  const { filename, contentType, size } = req.body || {};
  if (typeof filename !== 'string' || !/\.wav$/i.test(filename) || !['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'].includes(contentType) || !Number.isInteger(size) || size <= 0 || size > MAX_WAV_BYTES) {
    res.status(400).json({ error: 'Choose one WAV file no larger than 25 MB.' });
    return;
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFilename}`;
  const { data, error } = await supabase.storage.from(ADMIN_AUDIO_BUCKET).createSignedUploadUrl(objectPath);
  if (error || !data?.token) {
    console.error('Unable to create admin audio upload URL:', error);
    res.status(500).json({ error: 'Unable to prepare the secure audio upload.' });
    return;
  }

  res.json({
    bucket: ADMIN_AUDIO_BUCKET,
    path: objectPath,
    token: data.token,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

app.post('/api/admin/delete-audio', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: 'Invalid request origin.' });
    return;
  }
  if (!supabase || typeof req.body?.audioPath !== 'string' || !/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]+-[^/]+\.wav$/i.test(req.body.audioPath)) {
    res.status(400).json({ error: 'Invalid private audio path.' });
    return;
  }
  const { error } = await supabase.storage.from(ADMIN_AUDIO_BUCKET).remove([req.body.audioPath]);
  if (error) {
    res.status(500).json({ error: 'Unable to remove the private upload.' });
    return;
  }
  res.json({ removed: true });
});

app.post('/api/admin/schedule-story', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: 'Invalid request origin.' });
    return;
  }
  if (!supabase || !resend) {
    res.status(503).json({ error: 'Email scheduling is not fully configured.' });
    return;
  }

  const recipient = typeof req.body?.recipient === 'string' ? req.body.recipient.trim().toLowerCase() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const localDateTime = typeof req.body?.localDateTime === 'string' ? req.body.localDateTime : '';
  const timezone = typeof req.body?.timezone === 'string' ? req.body.timezone : '';
  const audioPath = typeof req.body?.audioPath === 'string' ? req.body.audioPath : '';
  const originalFilename = typeof req.body?.filename === 'string' ? req.body.filename : 'bedtime-story.wav';

  if (!isValidEmail(recipient) || !subject || subject.length > 200 || !US_TIMEZONES.has(timezone) || !audioPath || !/\.wav$/i.test(originalFilename)) {
    res.status(400).json({ error: 'Please check the recipient, subject, WAV file, date, time, and U.S. time zone.' });
    return;
  }

  const clientTime = DateTime.fromISO(localDateTime, { zone: timezone });
  const now = DateTime.utc();
  if (!clientTime.isValid || clientTime.toUTC() <= now.plus({ minutes: 1 }) || clientTime.toUTC() > now.plus({ days: 30 })) {
    res.status(400).json({ error: 'Delivery must be at least 1 minute from now and no more than 30 days ahead.' });
    return;
  }

  const scheduledAt = clientTime.toUTC().toISO();
  if (!scheduledAt) {
    res.status(400).json({ error: 'Unable to convert the selected delivery time.' });
    return;
  }

  const { data: audioBlob, error: downloadError } = await supabase.storage.from(ADMIN_AUDIO_BUCKET).download(audioPath);
  if (downloadError || !audioBlob || audioBlob.size <= 0 || audioBlob.size > MAX_WAV_BYTES || !['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'].includes(audioBlob.type)) {
    res.status(400).json({ error: 'The private WAV upload is missing or invalid. Please upload it again.' });
    return;
  }

  const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
  const hasWavHeader = audioBuffer.length >= 12
    && audioBuffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && audioBuffer.subarray(8, 12).toString('ascii') === 'WAVE';
  if (!hasWavHeader) {
    await supabase.storage.from(ADMIN_AUDIO_BUCKET).remove([audioPath]);
    res.status(400).json({ error: 'The uploaded file does not contain valid WAV audio.' });
    return;
  }

  const scheduleId = crypto.randomUUID();
  const { error: insertError } = await supabase.from('admin_scheduled_story_emails').insert({
    id: scheduleId,
    recipient_email: recipient,
    subject,
    client_local_time: clientTime.toISO({ includeOffset: false }),
    client_timezone: timezone,
    scheduled_at_utc: scheduledAt,
    audio_filename: originalFilename.slice(-160),
    status: 'scheduling'
  });
  if (insertError) {
    console.error('Unable to create admin email log:', insertError);
    res.status(500).json({ error: 'Unable to create the delivery log.' });
    return;
  }

  try {
    const result = await resend.emails.send({
      from: 'Little Moon Stories <stories@cozykidtales.com>',
      to: [recipient],
      subject,
      html: `<div style="font-family:Arial,sans-serif;color:#172554"><h2>${escapeHtml(subject)}</h2><p>Your personalized bedtime story is attached as a WAV file.</p><p>Warmly,<br>Little Moon Stories</p></div>`,
      attachments: [{ filename: originalFilename.slice(-160), content: audioBuffer }],
      scheduledAt,
      tags: [{ name: 'schedule_id', value: scheduleId }]
    }, { idempotencyKey: `admin-story/${scheduleId}` });
    if (result.error || !result.data?.id) throw new Error(result.error?.message || 'Resend did not return an email ID.');

    const { error: updateError } = await supabase.from('admin_scheduled_story_emails').update({
      resend_email_id: result.data.id,
      status: 'scheduled',
      updated_at: new Date().toISOString()
    }).eq('id', scheduleId);
    if (updateError) console.error('Email scheduled but log update failed:', updateError);

    await supabase.storage.from(ADMIN_AUDIO_BUCKET).remove([audioPath]);
    res.json({
      success: true,
      recipient,
      clientLocalTime: clientTime.toFormat("MMM d, yyyy 'at' h:mm a"),
      timezone,
      scheduledAtUtc: scheduledAt,
      resendEmailId: result.data.id,
      status: 'scheduled'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to schedule the email.';
    await supabase.from('admin_scheduled_story_emails').update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('id', scheduleId);
    await supabase.storage.from(ADMIN_AUDIO_BUCKET).remove([audioPath]);
    console.error('Resend scheduling failed:', error);
    res.status(502).json({ error: message });
  }
});

app.get('/api/admin/story-email-logs', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  if (!supabase) {
    res.status(503).json({ error: 'Delivery logs are not configured.' });
    return;
  }
  const { data, error } = await supabase
    .from('admin_scheduled_story_emails')
    .select('id,recipient_email,subject,client_local_time,client_timezone,scheduled_at_utc,resend_email_id,status,error_message,updated_at')
    .order('created_at', { ascending: false })
    .limit(25);
  if (error) {
    res.status(500).json({ error: 'Unable to load delivery logs.' });
    return;
  }
  res.json({ emails: data || [] });
});

// API endpoints
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    checkoutEnabled,
    registrationConfigured: Boolean(supabase),
    turnstileRequired,
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null
  });
});

// Subscriber action endpoint (Signup + optional payment handler)
app.post('/api/subscribe', async (req: Request, res: Response): Promise<void> => {
  const {
    parent_email,
    child_names,
    children_list,
    age_range,
    delivery_time,
    timezone,
    preferred_theme,
    favorite_hobby,
    favorite_animal
  } = req.body;

  if (isProd && !supabase) {
    res.status(503).json({ error: 'Registration is temporarily unavailable.' });
    return;
  }

  if (!parent_email || !child_names) {
    res.status(400).json({ error: 'Parent email and child name are required.' });
    return;
  }

  if (turnstileRequired && (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY)) {
    res.status(503).json({ error: 'Registration security is not configured.' });
    return;
  }

  const clientIp = getClientIp(req);
  const normalizedEmailForLimit = typeof parent_email === 'string' ? parent_email.trim().toLowerCase() : 'invalid';
  if (isRateLimited(`ip:${clientIp}`, 5, 15 * 60 * 1000)) {
    res.setHeader('Retry-After', '900');
    res.status(429).json({ error: 'Too many story requests. Please try again later.' });
    return;
  }

  if (!(await verifyTurnstile(req.body.turnstile_token, clientIp))) {
    res.status(400).json({ error: 'Security check failed. Please refresh the page and try again.' });
    return;
  }

  if (isRateLimited(`email:${normalizedEmailForLimit}`, 3, 24 * 60 * 60 * 1000)) {
    res.setHeader('Retry-After', '86400');
    res.status(429).json({ error: 'Too many story requests. Please try again later.' });
    return;
  }

  let normalizedChildren: ChildDetail[];
  try {
    if (!isValidEmail(parent_email)) throw new Error('Please provide a valid parent email.');
    if (age_range && !['3-5', '6-8'].includes(age_range)) throw new Error('Age range is invalid.');
    if (!isValidDeliveryTime(delivery_time)) throw new Error('Delivery time must use HH:mm format.');
    if (!isValidTimezone(timezone)) throw new Error('Timezone is invalid.');
    normalizedChildren = normalizeChildren(children_list);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid signup details.' });
    return;
  }

  let tempSubId = `sub_temp_${Date.now().toString(36)}`;
  const requestedPlan = req.body.plan_type === 'free_trial' ? 'free_trial' : 'monthly';
  const expiresAt = requestedPlan === 'monthly'
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

    const newSub: Subscriber = {
    id: '', // Will be updated as soon as DB generates the SERIAL/IDENTITY id starting from 1
    parent_email: parent_email.trim().toLowerCase(),
    child_names: cleanText(child_names, normalizedChildren.map(c => c.nickname).join(' & '), 250),
    children_list: normalizedChildren,
    age_range: age_range || '3-5',
    delivery_time,
    timezone,
    preferred_theme: cleanText(preferred_theme, 'Adventure', 250),
    favorite_hobby: cleanText(favorite_hobby, 'reading', 250),
    favorite_animal: cleanText(favorite_animal, 'elephant', 250),
    plan_type: requestedPlan,
    payment_status: 0,
    package_end_date: expiresAt,
    created_at: new Date().toISOString()
  };

  try {
    let finalSubscriberId: string = tempSubId;

    // 1. Save to database
    if (supabase) {
      if (requestedPlan === 'free_trial') {
        const { data: existingFreeTrial, error: lookupError } = await supabase
          .from('subscribers')
          .select('id')
          .eq('parent_email', newSub.parent_email)
          .eq('plan_type', 'free_trial')
          .limit(1);

        if (lookupError) throw lookupError;
        if (existingFreeTrial?.length) {
          res.status(409).json({ error: 'A free story has already been requested with this email address.' });
          return;
        }
      }

      // Note: We let Supabase/PostgreSQL generate the auto-incrementing integer key (starting from 1)
      const { data, error } = await supabase
        .from('subscribers')
        .insert([{
          parent_email: newSub.parent_email,
          age_range: newSub.age_range,
          delivery_time: newSub.delivery_time,
          timezone: newSub.timezone,
          preferred_theme: newSub.preferred_theme,
          favorite_hobby: newSub.favorite_hobby,
          favorite_animal: newSub.favorite_animal,
          plan_type: newSub.plan_type,
          payment_status: newSub.payment_status,
          package_end_date: newSub.package_end_date,
          created_at: newSub.created_at
        }])
        .select('id');

      if (error) {
        if (error.code === '23505' && requestedPlan === 'free_trial') {
          res.status(409).json({ error: 'A free story has already been requested with this email address.' });
          return;
        }
        console.error('Supabase insert error:', error);
        throw error;
      }

      if (data && data[0]) {
        finalSubscriberId = String(data[0].id);
        newSub.id = finalSubscriberId;
      } else {
        throw new Error('Supabase failed to return an auto-incrementing ID.');
      }

      // Also insert detailed child profiles into the separate children table!
      if (newSub.children_list && newSub.children_list.length > 0) {
        const childrenPayload = newSub.children_list.map((c: any) => ({
          subscriber_id: parseInt(finalSubscriberId, 10),
          nickname: c.name || c.nickname,
          gender: c.gender,
          birthday: c.birthday
        }));

        const { error: childError } = await supabase
          .from('children')
          .insert(childrenPayload);

        if (childError) {
          console.error('Supabase children insert error:', childError);
          await supabase.from('subscribers').delete().eq('id', finalSubscriberId);
          throw new Error('Unable to save child profiles.');
        }
      }
    } else {
      // Mock DB: auto-generate integer IDs starting from 1
      const nextId = mockSubscribers.length > 0
        ? Math.max(...mockSubscribers.map(s => {
            const numeric = parseInt(String(s.id).replace(/\D/g, ''), 10);
            return isNaN(numeric) ? 0 : numeric;
          })) + 1
        : 1;

      finalSubscriberId = String(nextId);
      newSub.id = finalSubscriberId;
      mockSubscribers.push(newSub);
    }

    // 2. If checkout is not enabled yet, stop after saving the registration.
    // The plan stays unpaid until a real payment flow updates payment_status to 1.
    if (requestedPlan === 'free_trial' || !checkoutEnabled || req.body.register_only === true) {
      res.json({
        registered: true,
        subscriberId: finalSubscriberId,
        planType: requestedPlan,
        paymentStatus: 'unpaid'
      });
      return;
    }

    // 3. PayPal Integration
    {
      const redirectBase = process.env.APP_URL || `http://localhost:${port}`;
      const accessToken = await getPayPalAccessToken();
      
      if (accessToken) {
        try {
          const resPayPal = await fetch(`${getPayPalApiUrl()}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              intent: 'CAPTURE',
              purchase_units: [
                {
                  reference_id: finalSubscriberId,
                  description: 'Cozy Kid Tales - Premium Personalized Subscription (1 Month)',
                  amount: {
                    currency_code: 'USD',
                    value: '9.00'
                  }
                }
              ],
              application_context: {
                brand_name: 'Cozy Kid Tales',
                landing_page: 'BILLING',
                user_action: 'PAY_NOW',
                return_url: `${redirectBase}/api/paypal-checkout-success?sub_id=${finalSubscriberId}`,
                cancel_url: `${redirectBase}/?checkout_cancelled=true`
              }
            })
          });

          if (!resPayPal.ok) {
            const errBody = await resPayPal.text();
            console.error('PayPal Order creation failed API response:', errBody);
            throw new Error(`PayPal Order creation failed: ${errBody}`);
          }

          const payPalOrder: any = await resPayPal.json();
          const approveLink = payPalOrder.links?.find((l: any) => l.rel === 'approve')?.href;

          if (!approveLink) {
            throw new Error('No approval link returned from PayPal.');
          }

          // Save token/orderId locally or in DB
          if (supabase) {
            const { error: orderSaveError } = await supabase
              .from('subscribers')
              .update({ payment_provider_order_id: payPalOrder.id })
              .eq('id', finalSubscriberId);
            if (orderSaveError) {
              console.error('Unable to save PayPal order ID:', orderSaveError);
              throw new Error('Unable to associate checkout with the story plan.');
            }
          } else {
            newSub.payment_provider_order_id = payPalOrder.id;
          }

          res.json({
            checkoutSessionUrl: approveLink,
            subscriberId: finalSubscriberId,
            planType: 'monthly',
            isMock: false
          });
        } catch (payPayPalErr: any) {
          console.error('PayPal api failed or got rate-limited. Falling back to simulation.', payPayPalErr);
          if (!mockCheckoutEnabled) {
            res.status(502).json({ error: 'Unable to start checkout. Please try again later.' });
            return;
          }
          const mockRedirectUrl = `/api/mock-checkout-success?session_id=pay_mock_${finalSubscriberId}&sub_id=${finalSubscriberId}`;
          res.json({
            checkoutSessionUrl: mockRedirectUrl,
            subscriberId: finalSubscriberId,
            planType: 'monthly',
            isMock: true
          });
        }
      } else {
        if (!mockCheckoutEnabled) {
          res.status(503).json({ error: 'Checkout is not configured yet.' });
          return;
        }
        // Fallback: Create simulated mock PayPal checkout URL for local developer sandbox
        const mockRedirectUrl = `/api/mock-checkout-success?session_id=pay_mock_${finalSubscriberId}&sub_id=${finalSubscriberId}`;
        res.json({
          checkoutSessionUrl: mockRedirectUrl,
          subscriberId: finalSubscriberId,
          planType: 'monthly',
          isMock: true
        });
      }
    }
  } catch (err: any) {
    console.error('Subscription creation failed:', err);
    res.status(500).json({ error: 'Unable to create your story plan right now. Please try again later.' });
  }
});

// Callback route to capture PayPal checkout order and finalize subscription
app.get('/api/paypal-checkout-success', async (req: Request, res: Response): Promise<void> => {
  if (!checkoutEnabled) {
    res.redirect(`/?checkout_cancelled=true`);
    return;
  }

  const { token, sub_id } = req.query; // token is PayPal's checkout order ID when returning
  const port = 3000;
  const redirectBase = process.env.APP_URL || `http://localhost:${port}`;

  if (!token || !sub_id) {
    res.redirect(`/?checkout_cancelled=true`);
    return;
  }

  const paidExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      console.error('PayPal capture blocked because PayPal credentials are not configured.');
      res.redirect(`/?checkout_cancelled=true`);
      return;
    }

    if (supabase) {
      const { data: pendingSubscriber, error: pendingLookupError } = await supabase
        .from('subscribers')
        .select('id')
        .eq('id', sub_id)
        .eq('plan_type', 'monthly')
        .eq('payment_status', 0)
        .eq('payment_provider_order_id', token)
        .maybeSingle();

      if (pendingLookupError || !pendingSubscriber) {
        console.error('PayPal callback did not match a pending monthly plan.');
        res.redirect(`/?checkout_cancelled=true`);
        return;
      }
    }

    // Capture PayPal order
    const captureRes = await fetch(`${getPayPalApiUrl()}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!captureRes.ok) {
      console.error('PayPal Order capture failed:', await captureRes.text());
      res.redirect(`/?checkout_cancelled=true`);
      return;
    }

    const captureData: any = await captureRes.json();
    const referenceId = captureData.purchase_units?.[0]?.reference_id;
    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const capturedAmount = capture?.amount;
    const paymentIsValid = captureData.status === 'COMPLETED'
      && capture?.status === 'COMPLETED'
      && capturedAmount?.currency_code === 'USD'
      && capturedAmount?.value === '9.00';

    if (String(referenceId) !== String(sub_id) || !paymentIsValid) {
      console.error('PayPal capture verification failed.', {
        referenceMatches: String(referenceId) === String(sub_id),
        orderStatus: captureData.status,
        captureStatus: capture?.status,
        currency: capturedAmount?.currency_code,
        amount: capturedAmount?.value
      });
      res.redirect(`/?checkout_cancelled=true`);
      return;
    }

    console.log(`PayPal capture successful for order ${token}`);

    // Now update database subscriber payment_status
    if (supabase) {
      const { data: activatedSubscriber, error } = await supabase
        .from('subscribers')
        .update({ 
          payment_status: 1, 
          payment_provider_order_id: token as string,
          package_end_date: paidExpiryDate,
          plan_type: 'monthly'
        })
        .eq('id', sub_id)
        .eq('payment_provider_order_id', token)
        .eq('payment_status', 0)
        .select('id')
        .maybeSingle();
      if (error) console.error('Supabase update error:', error);
      if (!error && activatedSubscriber) await enqueueSignupStoryJob(sub_id);
      if (!error && !activatedSubscriber) {
        console.error('PayPal payment was captured, but no pending subscriber was activated.');
        res.redirect(`/?checkout_cancelled=true`);
        return;
      }
    }

    const sub = mockSubscribers.find(s => s.id === sub_id);
    if (sub) {
      sub.payment_status = 1;
      sub.payment_provider_order_id = token as string;
      sub.package_end_date = paidExpiryDate;
      sub.plan_type = 'monthly';
    }

    res.redirect(`/?checkout_success=true&sub_id=${sub_id}`);
  } catch (err) {
    console.error('PayPal capture callback error:', err);
    res.redirect(`/?checkout_cancelled=true`);
  }
});

// Helper route to simulate successful checkout redirection & mock webhook effect
app.get('/api/mock-checkout-success', async (req: Request, res: Response): Promise<void> => {
  if (!mockCheckoutEnabled) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { session_id, sub_id } = req.query;

  const paidExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Let's mark the payment_status of this mockup subscriber as 1!
  if (sub_id) {
    if (supabase) {
      const { error } = await supabase
        .from('subscribers')
        .update({ 
          payment_status: 1, 
          payment_provider_order_id: session_id as string,
          package_end_date: paidExpiryDate,
          plan_type: 'monthly'
        })
        .eq('id', sub_id);
      if (error) console.error('Supabase mock update error:', error);
      if (!error) await enqueueSignupStoryJob(sub_id);
    }

    const sub = mockSubscribers.find(s => s.id === sub_id);
    if (sub) {
      sub.payment_status = 1;
      sub.payment_provider_order_id = session_id as string;
      sub.package_end_date = paidExpiryDate;
      sub.plan_type = 'monthly';
    }
  }

  res.redirect(`/?checkout_success=true&sub_id=${sub_id || ''}`);
});

export default app;

// Serve frontend build static files in production or hook up Vite middleware in development
async function startServer() {
  if (!isProd) {
    console.log('Configuring Vite Development Middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`Production environment detected. Serving static assets from ${distPath}`);
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Start Server
  app.listen(port, '0.0.0.0', () => {
    console.log(`Cozy Kid Tales fullstack server running at http://localhost:${port}`);
  });
}

if (!isVercel) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}
