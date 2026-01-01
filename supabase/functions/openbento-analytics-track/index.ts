import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-openbento-site',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type TrackPayload = {
  siteId: string;
  event: 'page_view' | 'click';
  blockId?: string;
  destinationUrl?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  language?: string;
  screenW?: number;
  screenH?: number;
};

const clampText = (value: unknown, maxLen: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
};

const clampInt = (value: unknown, maxAbs: number): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  if (Math.abs(n) > maxAbs) return null;
  return n;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  let payload: TrackPayload;
  try {
    payload = (await req.json()) as TrackPayload;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const siteId = clampText(payload.siteId, 128);
  if (!siteId) return json({ error: 'Missing siteId' }, 400);

  const event = payload.event === 'page_view' || payload.event === 'click' ? payload.event : null;
  if (!event) return json({ error: 'Invalid event' }, 400);

  const blockId = event === 'click' ? clampText(payload.blockId, 128) : null;
  const destinationUrl = event === 'click' ? clampText(payload.destinationUrl, 2048) : null;

  const pageUrl = clampText(payload.pageUrl, 2048);
  const referrer = clampText(payload.referrer, 2048);
  const userAgent = clampText(req.headers.get('user-agent'), 512);
  const language =
    clampText(payload.language, 32) ??
    clampText(req.headers.get('accept-language')?.split(',')[0], 32);

  const screenW = clampInt(payload.screenW, 100_000);
  const screenH = clampInt(payload.screenH, 100_000);

  const utm = payload.utm ?? {};
  const utm_source = clampText(utm.source, 128);
  const utm_medium = clampText(utm.medium, 128);
  const utm_campaign = clampText(utm.campaign, 128);
  const utm_term = clampText(utm.term, 128);
  const utm_content = clampText(utm.content, 128);

  const { error } = await supabase.from('openbento_analytics_events').insert({
    site_id: siteId,
    event_type: event,
    block_id: blockId,
    destination_url: destinationUrl,
    page_url: pageUrl,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    user_agent: userAgent,
    language,
    screen_w: screenW,
    screen_h: screenH,
  });

  if (error) return json({ error: 'Insert failed' }, 500);
  return json({ ok: true });
});
