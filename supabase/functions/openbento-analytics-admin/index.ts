import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-openbento-admin-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const expectedToken = Deno.env.get('OPENBENTO_ANALYTICS_ADMIN_TOKEN');
if (!expectedToken) {
  throw new Error('Missing OPENBENTO_ANALYTICS_ADMIN_TOKEN');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const clampText = (value: unknown, maxLen: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
};

const clampInt = (value: unknown, min: number, max: number): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  if (n < min || n > max) return null;
  return n;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getToken = (req: Request): string | null => {
  const headerToken = req.headers.get('x-openbento-admin-token');
  if (headerToken) return headerToken.trim();
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
};

const getDayKey = (iso: string): string => iso.slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const token = getToken(req);
  if (!token || token !== expectedToken) return json({ error: 'Unauthorized' }, 401);

  let siteId: string | null = null;
  let days: number | null = null;

  const url = new URL(req.url);
  siteId = clampText(url.searchParams.get('siteId'), 128);
  const daysParam = url.searchParams.get('days');
  if (daysParam) days = clampInt(Number(daysParam), 1, 365);

  if (req.method === 'POST') {
    try {
      const payload = (await req.json()) as { siteId?: string; days?: number };
      siteId = clampText(payload.siteId ?? siteId, 128);
      days = clampInt(payload.days ?? days, 1, 365) ?? days;
    } catch {
      // ignore body parse errors (query params still work)
    }
  } else if (req.method !== 'GET') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  if (!siteId) return json({ error: 'Missing siteId' }, 400);
  const rangeDays = days ?? 30;
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('openbento_analytics_events')
    .select('created_at,event_type,block_id,destination_url,referrer')
    .eq('site_id', siteId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10_000);

  if (error) return json({ error: 'Query failed' }, 500);

  const events = data ?? [];
  const totals = { pageViews: 0, clicks: 0 };
  const daily = new Map<string, { day: string; pageViews: number; clicks: number }>();
  const destinations = new Map<string, number>();
  const referrers = new Map<string, number>();

  for (const e of events) {
    const day = getDayKey(e.created_at);
    const current = daily.get(day) ?? { day, pageViews: 0, clicks: 0 };

    if (e.event_type === 'page_view') {
      totals.pageViews += 1;
      current.pageViews += 1;

      const r = clampText(e.referrer, 2048);
      if (r) {
        try {
          const host = new URL(r).hostname;
          referrers.set(host, (referrers.get(host) ?? 0) + 1);
        } catch {
          referrers.set(r, (referrers.get(r) ?? 0) + 1);
        }
      }
    } else if (e.event_type === 'click') {
      totals.clicks += 1;
      current.clicks += 1;

      const d = clampText(e.destination_url, 2048) ?? clampText(e.block_id, 128);
      if (d) destinations.set(d, (destinations.get(d) ?? 0) + 1);
    }

    daily.set(day, current);
  }

  const series = Array.from(daily.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
  const topDestinations = Array.from(destinations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, clicks]) => ({ key, clicks }));

  const topReferrers = Array.from(referrers.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([host, pageViews]) => ({ host, pageViews }));

  return json({
    ok: true,
    siteId,
    rangeDays,
    totals,
    series,
    topDestinations,
    topReferrers,
    sampled: events.length >= 10_000,
  });
});
