import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 90; // 90 days
const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 100;

type StoryDelivery = {
  story_job_id: string;
  subscriber_id: number;
  parent_email: string;
  story_date: string;
  scheduled_delivery_at: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  story_text: string | null;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });

const getBatchSize = async (req: Request) => {
  try {
    const body = await req.json();
    const requested = Number(body?.batch_size);
    if (!Number.isFinite(requested)) return DEFAULT_BATCH_SIZE;
    return Math.min(Math.max(Math.floor(requested), 1), MAX_BATCH_SIZE);
  } catch {
    return DEFAULT_BATCH_SIZE;
  }
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const buildEmailHtml = (signedUrl: string) => `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;">
    <p>Hello,</p>
    <p>Tonight's personalized bedtime audio story is ready.</p>
    <p>
      <a href="${escapeHtml(signedUrl)}"
         style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Listen to tonight's story
      </a>
    </p>
    <p>Sweet dreams,<br/>Cozy Kid Tales</p>
  </div>
`;

const sendEmail = async (delivery: StoryDelivery, signedUrl: string) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM') || 'Cozy Kid Tales <stories@cozykidtales.com>',
      to: delivery.parent_email,
      subject: 'Your bedtime story is ready',
      html: buildEmailHtml(signedUrl),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Resend failed with status ${response.status}`);
  }

  return data?.id || data?.messageId || null;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase environment variables are missing.');
    return json({ error: 'Function configuration is incomplete.' }, 500);
  }

  const batchSize = await getBatchSize(req);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: deliveries, error: claimError } = await supabase.rpc('claim_ready_story_deliveries', {
    batch_size: batchSize,
  });

  if (claimError) {
    console.error('Unable to claim deliveries:', claimError);
    return json({ error: 'Unable to claim story deliveries.' }, 500);
  }

  const claimed = (deliveries || []) as StoryDelivery[];
  const results = {
    ok: true,
    claimed: claimed.length,
    sent: 0,
    failed: 0,
  };

  for (const delivery of claimed) {
    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(delivery.storage_bucket)
        .createSignedUrl(delivery.storage_path, SIGNED_URL_EXPIRES_IN_SECONDS);

      if (signedError || !signedData?.signedUrl) {
        throw new Error(signedError?.message || 'Unable to create signed audio URL.');
      }

      const providerMessageId = await sendEmail(delivery, signedData.signedUrl);

      const { error: sentError } = await supabase.rpc('mark_story_delivery_sent', {
        p_story_job_id: delivery.story_job_id,
        p_provider_message_id: providerMessageId,
      });

      if (sentError) {
        throw new Error(sentError.message);
      }

      results.sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Story delivery failed.';
      console.error(`Delivery failed for ${delivery.story_job_id}:`, message);

      const { error: failedError } = await supabase.rpc('mark_story_delivery_failed', {
        p_story_job_id: delivery.story_job_id,
        p_error_message: message,
      });

      if (failedError) {
        console.error(`Unable to mark delivery failed for ${delivery.story_job_id}:`, failedError);
      }

      results.failed += 1;
    }
  }

  return json(results);
});
