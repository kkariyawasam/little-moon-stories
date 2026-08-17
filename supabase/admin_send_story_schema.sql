-- Run this file once in the Supabase SQL Editor for /admin/send-story.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.admin_scheduled_story_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  client_local_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  client_timezone TEXT NOT NULL,
  scheduled_at_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  audio_filename TEXT NOT NULL,
  resend_email_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'scheduling',
  error_message TEXT,
  last_event_type TEXT,
  last_event_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admin_story_email_events (
  svix_id TEXT PRIMARY KEY,
  resend_email_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_scheduled_story_emails_created
  ON public.admin_scheduled_story_emails(created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('admin-story-audio', 'admin-story-audio', false, 26214400, ARRAY['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'])
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.record_admin_story_email_event(
  p_resend_email_id TEXT,
  p_status TEXT,
  p_event_type TEXT,
  p_event_at TIMESTAMP WITH TIME ZONE,
  p_svix_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_svix_id IS NULL OR p_svix_id = '' THEN
    RAISE EXCEPTION 'Missing webhook event ID';
  END IF;

  INSERT INTO public.admin_story_email_events (svix_id, resend_email_id, event_type, event_at)
  VALUES (p_svix_id, p_resend_email_id, p_event_type, p_event_at)
  ON CONFLICT (svix_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.admin_scheduled_story_emails
  SET status = p_status,
      last_event_type = p_event_type,
      last_event_at = p_event_at,
      updated_at = now()
  WHERE resend_email_id = p_resend_email_id
    AND (last_event_at IS NULL OR p_event_at >= last_event_at);
END;
$$;

ALTER TABLE public.admin_scheduled_story_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_story_email_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_scheduled_story_emails FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admin_story_email_events FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_admin_story_email_event(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_story_email_event(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) TO service_role;
