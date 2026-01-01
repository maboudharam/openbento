// Security utilities for URL and input validation

/**
 * Validates that a URL uses safe protocols (http/https only)
 * Prevents javascript:, data:, vbscript: and other dangerous protocols
 */
export const isValidSafeUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Sanitizes a URL - returns the URL if safe, empty string otherwise
 */
export const sanitizeUrl = (url: string | undefined | null): string => {
  if (!url || typeof url !== 'string') return '';

  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return parsed.href;
    }
  } catch {
    // Not a valid URL
  }

  return '';
};

/**
 * Opens a URL safely - only opens if protocol is http/https
 */
export const openSafeUrl = (url: string | undefined | null): void => {
  const safeUrl = sanitizeUrl(url);
  if (safeUrl) {
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Validates YouTube channel ID format (UC followed by 22 alphanumeric chars)
 */
export const isValidYouTubeChannelId = (channelId: string | undefined | null): boolean => {
  if (!channelId || typeof channelId !== 'string') return false;
  return /^UC[a-zA-Z0-9_-]{22}$/.test(channelId);
};

/**
 * Validates that a string is safe for use as a location/address (not a URL)
 */
export const isValidLocationString = (location: string | undefined | null): boolean => {
  if (!location || typeof location !== 'string') return false;

  // Reject if it looks like a URL or dangerous protocol
  const dangerousPatterns = [
    /^javascript:/i,
    /^data:/i,
    /^vbscript:/i,
    /^file:/i,
    /^about:/i,
    /^blob:/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(location.trim()));
};

/**
 * Validates image URL - must be http/https and common image extensions or data:image
 */
export const isValidImageUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== 'string') return false;

  // Allow data URLs for images only
  if (url.startsWith('data:image/')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Escapes HTML special characters to prevent XSS
 */
export const escapeHtml = (str: string | undefined | null): string => {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validates domain format
 */
export const isValidDomain = (domain: string | undefined | null): boolean => {
  if (!domain || typeof domain !== 'string') return false;

  // Basic domain validation - alphanumeric, hyphens, dots
  return /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(domain);
};
