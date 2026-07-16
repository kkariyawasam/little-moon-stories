import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const expectedCronSecret = Deno.env.get('CRON_SECRET');
  const suppliedCronSecret = req.headers.get('x-cron-secret');

  if (!expectedCronSecret || suppliedCronSecret !== expectedCronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase environment variables are missing.');
    return json({ error: 'Function configuration is incomplete.' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.rpc('enqueue_tomorrow_story_jobs');

  if (error) {
    console.error('Unable to create story jobs:', error);
    return json({ error: 'Unable to create story jobs.' }, 500);
  }

  return json({
    ok: true,
    inserted_count: data,
  });
});
