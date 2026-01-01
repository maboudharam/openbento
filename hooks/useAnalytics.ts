import { useEffect, useRef, useCallback } from 'react';

export interface AnalyticsConfig {
  enabled?: boolean;
  supabaseUrl?: string;
  anonKey?: string;
  siteId: string;
}

interface TrackEventPayload {
  site_id: string;
  event_type: string;
  visitor_id: string;
  session_id: string;
  page_url: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  user_agent: string;
  language: string;
  screen_w: number | null;
  screen_h: number | null;
  viewport_w: number | null;
  viewport_h: number | null;
  timezone: string | null;
  block_id?: string | null;
  destination_url?: string | null;
  block_title?: string | null;
  duration_seconds?: number;
  scroll_depth?: number;
  engaged?: boolean;
}

// Generate unique visitor ID (persisted in localStorage)
const getVisitorId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('_ob_vid');
  if (!id) {
    id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('_ob_vid', id);
  }
  return id;
};

export const useAnalytics = (config: AnalyticsConfig | undefined) => {
  const sessionStartRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const sessionIdRef = useRef<string>(sessionStartRef.current.toString(36));

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPercent);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track event to Supabase
  const trackEvent = useCallback(
    async (eventType: string, extra: Partial<TrackEventPayload> = {}) => {
      if (!config?.enabled || !config?.supabaseUrl || !config?.anonKey) return;

      try {
        const utm = new URLSearchParams(window.location.search);
        const payload: TrackEventPayload = {
          site_id: config.siteId,
          event_type: eventType,
          visitor_id: getVisitorId(),
          session_id: sessionIdRef.current,
          page_url: window.location.href,
          referrer: document.referrer || null,
          utm_source: utm.get('utm_source') || null,
          utm_medium: utm.get('utm_medium') || null,
          utm_campaign: utm.get('utm_campaign') || null,
          utm_term: utm.get('utm_term') || null,
          utm_content: utm.get('utm_content') || null,
          user_agent: navigator.userAgent,
          language: navigator.language,
          screen_w: window.screen?.width || null,
          screen_h: window.screen?.height || null,
          viewport_w: window.innerWidth || null,
          viewport_h: window.innerHeight || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
          ...extra,
        };

        const endpoint = `${config.supabaseUrl.replace(/\/+$/, '')}/rest/v1/openbento_analytics_events`;
        const headers = {
          'Content-Type': 'application/json',
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Prefer: 'return=minimal',
        };

        fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      } catch (_) {
        // Silently fail
      }
    },
    [config]
  );

  // Track page view on mount
  useEffect(() => {
    if (!config?.enabled) return;
    trackEvent('page_view');
  }, [config?.enabled, trackEvent]);

  // Track session end on unmount/visibility change
  useEffect(() => {
    if (!config?.enabled) return;

    const trackSessionEnd = () => {
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      trackEvent('session_end', {
        duration_seconds: duration,
        scroll_depth: maxScrollRef.current,
        engaged: duration > 10 && maxScrollRef.current > 25,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackSessionEnd();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', trackSessionEnd);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', trackSessionEnd);
    };
  }, [config?.enabled, trackEvent]);

  // Track click on a block
  const trackClick = useCallback(
    (blockId: string, destinationUrl?: string, blockTitle?: string) => {
      trackEvent('click', {
        block_id: blockId,
        destination_url: destinationUrl || null,
        block_title: blockTitle || null,
      });
    },
    [trackEvent]
  );

  return { trackClick, trackEvent };
};

export default useAnalytics;
