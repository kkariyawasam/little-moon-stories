import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 10;
const STORY_AUDIO_BUCKET = 'story-audio';
const STORY_AUDIO_MIME_TYPE = 'audio/mpeg';

type ChildProfile = {
  nickname?: string;
  gender?: string;
  birthday?: string;
};

type PromptPayload = {
  parent_email?: string;
  age_range?: string;
  preferred_theme?: string;
  favorite_hobby?: string;
  favorite_animal?: string;
  timezone?: string;
  delivery_time?: string;
  children?: ChildProfile[];
};

type StoryGenerationJob = {
  id: string;
  subscriber_id: number;
  story_date: string;
  scheduled_generation_at: string;
  scheduled_delivery_at: string;
  prompt_payload: PromptPayload;
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

const cleanText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const listText = (value: unknown, fallback: string) =>
  cleanText(value, fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ');

const buildStoryPrompt = (job: StoryGenerationJob) => {
  const payload = job.prompt_payload || {};
  const children = Array.isArray(payload.children) ? payload.children : [];
  const childNames = children
    .map((child) => cleanText(child.nickname))
    .filter(Boolean)
    .join(', ') || 'the child';

  return `
Write a warm, original bedtime story for children.

Family details:
- Child name(s): ${childNames}
- Children profile JSON: ${JSON.stringify(children)}
- Age range: ${cleanText(payload.age_range, '3-5')}
- Theme options: ${listText(payload.preferred_theme, 'gentle adventure')}
- Hobby options: ${listText(payload.favorite_hobby, 'reading')}
- Animal options: ${listText(payload.favorite_animal, 'elephant')}

Story requirements:
- Include all child names naturally in one shared story.
- Choose one theme, one hobby, and one animal from the options, then weave them into the story.
- Use calm, kind, child-safe language for age ${cleanText(payload.age_range, '3-5')}.
- Length: 450 to 650 words.
- Tone: warm, motherly, soothing, slow, and bedtime-friendly.
- Include gentle dialogue.
- No scary content, violence, danger, sadness, medical claims, religious claims, or copyrighted characters.
- End with everyone feeling peaceful, sleepy, loved, and ready to rest.
- Return only the story text. No title, markdown, notes, JSON, or bullet points.
`.trim();
};

const extractResponseText = (data: Record<string, any>) => {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const text = data.output
    ?.flatMap((item: any) => item.content || [])
    ?.map((content: any) => content.text || content.output_text || '')
    ?.join('\n')
    ?.trim();

  if (text) return text;
  throw new Error('OpenAI story response did not include text.');
};

const generateStoryText = async (job: StoryGenerationJob) => {
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('STORY_MODEL') || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You write safe, gentle, original bedtime stories for young children. Keep the story calm, nurturing, and screen-free.',
        },
        {
          role: 'user',
          content: buildStoryPrompt(job),
        },
      ],
      temperature: 0.8,
      max_output_tokens: 1400,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI story request failed with status ${response.status}`);
  }

  return extractResponseText(data);
};

const createSpeechAudio = async (storyText: string) => {
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('TTS_MODEL') || 'gpt-4o-mini-tts',
      voice: Deno.env.get('TTS_VOICE') || 'shimmer',
      input: `Read this as a calm, warm bedtime story with slow pacing and gentle pauses.\n\n${storyText}`,
      response_format: 'mp3',
      speed: 0.85,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `OpenAI speech request failed with status ${response.status}`);
  }

  return response.arrayBuffer();
};

const markGenerationFailed = async (
  supabase: ReturnType<typeof createClient>,
  storyJobId: string,
  message: string,
) => {
  const { error } = await supabase.rpc('mark_story_generation_failed', {
    p_story_job_id: storyJobId,
    p_error_message: message.slice(0, 1000),
    p_retry: true,
  });

  if (error) {
    console.error(`Unable to mark generation failed for ${storyJobId}:`, error);
  }
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

  const { data: jobs, error: claimError } = await supabase.rpc('claim_ready_story_generations', {
    batch_size: batchSize,
  });

  if (claimError) {
    console.error('Unable to claim generation jobs:', claimError);
    return json({ error: 'Unable to claim generation jobs.' }, 500);
  }

  const claimed = (jobs || []) as StoryGenerationJob[];
  const results = {
    ok: true,
    claimed: claimed.length,
    generated: 0,
    failed: 0,
  };

  for (const job of claimed) {
    try {
      const storyText = await generateStoryText(job);
      const audio = await createSpeechAudio(storyText);
      const storagePath = `stories/${job.id}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from(STORY_AUDIO_BUCKET)
        .upload(storagePath, audio, {
          contentType: STORY_AUDIO_MIME_TYPE,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: audioRowError } = await supabase
        .from('story_audio')
        .upsert(
          {
            story_job_id: job.id,
            storage_bucket: STORY_AUDIO_BUCKET,
            storage_path: storagePath,
            mime_type: STORY_AUDIO_MIME_TYPE,
            file_size_bytes: audio.byteLength,
          },
          { onConflict: 'story_job_id' },
        );

      if (audioRowError) {
        throw new Error(audioRowError.message);
      }

      const { error: readyError } = await supabase
        .from('story_jobs')
        .update({
          status: 'ready_to_send',
          story_text: storyText,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', job.id);

      if (readyError) {
        throw new Error(readyError.message);
      }

      results.generated += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Story generation failed.';
      console.error(`Generation failed for ${job.id}:`, message);
      await markGenerationFailed(supabase, job.id, message);
      results.failed += 1;
    }
  }

  return json(results);
});
