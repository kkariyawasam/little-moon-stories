# Little Moon Stories n8n Delivery Workflow

This workflow sends completed bedtime MP3 stories when their `scheduled_delivery_at` time arrives, then marks each job as sent.

## Required Credentials

- Supabase URL
- Supabase service role key
- Email provider credential, such as SMTP, Gmail, SendGrid, or Resend

Use the Supabase service role key only inside n8n. Do not expose it in the frontend.

## Workflow Schedule

Create a **Schedule Trigger** node:

- Mode: Every minute, or every 5 minutes
- Timezone: UTC is fine because the database stores `scheduled_delivery_at` as `timestamptz`

## Node 1: Get Ready Deliveries

Use an **HTTP Request** node.

- Method: `POST`
- URL: `https://YOUR_PROJECT.supabase.co/rest/v1/rpc/get_ready_story_deliveries`
- Headers:
  - `apikey`: `YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `Authorization`: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `Content-Type`: `application/json`
- Body JSON:

```json
{
  "batch_limit": 25
}
```

This returns rows with:

- `story_job_id`
- `parent_email`
- `storage_bucket`
- `storage_path`
- `mime_type`
- `story_text`

## Node 2: Stop If Empty

Add an **IF** node:

- Condition: response array length is greater than `0`

If false, end the workflow.

## Node 3: Split In Batches

Add **Split In Batches**:

- Batch Size: `1`

This sends one parent email at a time.

## Node 4: Create Signed MP3 URL

Use an **HTTP Request** node.

- Method: `POST`
- URL:

```text
https://YOUR_PROJECT.supabase.co/storage/v1/object/sign/{{$json.storage_bucket}}/{{$json.storage_path}}
```

- Headers:
  - `apikey`: `YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `Authorization`: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `Content-Type`: `application/json`
- Body JSON:

```json
{
  "expiresIn": 604800
}
```

Supabase returns a signed path. Build the final MP3 URL as:

```text
https://YOUR_PROJECT.supabase.co/storage/v1{{$json.signedURL}}
```

If your response field is named `signedUrl` instead of `signedURL`, use that exact field from n8n's output.

## Node 5: Send Email

Use your email provider node.

To:

```text
{{$node["Split In Batches"].json.parent_email}}
```

Subject:

```text
Tonight's Little Moon Story is ready
```

Email body:

```html
<p>Hello,</p>
<p>Tonight's bedtime story is ready.</p>
<p>
  <a href="SIGNED_MP3_URL_HERE">Play tonight's bedtime story</a>
</p>
<p>Sweet dreams,<br/>Little Moon Stories</p>
```

Replace `SIGNED_MP3_URL_HERE` with the expression for the signed URL from Node 4.

## Node 6: Mark Sent

After the email node succeeds, use an **HTTP Request** node.

- Method: `POST`
- URL: `https://YOUR_PROJECT.supabase.co/rest/v1/rpc/mark_story_delivery_sent`
- Headers:
  - `apikey`: `YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `Authorization`: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `Content-Type`: `application/json`
- Body JSON:

```json
{
  "p_story_job_id": "{{$node[\"Split In Batches\"].json.story_job_id}}",
  "p_provider_message_id": "{{$json.id || $json.messageId || null}}"
}
```

## Failure Path: Mark Failed

If the email node fails, connect its error path to an HTTP Request node:

- Method: `POST`
- URL: `https://YOUR_PROJECT.supabase.co/rest/v1/rpc/mark_story_delivery_failed`
- Headers:
  - `apikey`: `YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `Authorization`: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `Content-Type`: `application/json`
- Body JSON:

```json
{
  "p_story_job_id": "{{$node[\"Split In Batches\"].json.story_job_id}}",
  "p_error_message": "{{$json.message || $json.error || 'Email delivery failed'}}"
}
```

## Loop

After `Mark Sent`, connect back to **Split In Batches** to process the next ready story.

