/**
 * URL Utilities and Direct Navigation Intent Matcher
 * Strictly handles domain patterns, protocols, localhost, IP addresses, and common paste scenarios.
 */

const KNOWN_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
  'io', 'dev', 'app', 'ai', 'co', 'uk', 'ca', 'de', 'fr', 'jp', 'cn', 'in', 'au',
  'me', 'info', 'biz', 'tv', 'cc', 'sh', 'gg', 'tech', 'site', 'online', 'xyz',
  'cloud', 'club', 'space', 'local', 'internal', 'lan'
]);

export interface DirectUrlMatch {
  isUrl: boolean;
  normalizedUrl: string;
  displayTitle: string;
  hostname: string;
}

/**
 * Cleans pasted input by trimming, stripping surrounding quotes, and removing line breaks.
 */
export function cleanPastedInput(input: string): string {
  let cleaned = input.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  // If multiline paste, take the first non-empty line
  if (cleaned.includes('\n')) {
    cleaned = cleaned.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || cleaned;
  }
  return cleaned;
}

/**
 * Determines whether the given query is intended as a direct URL navigation.
 */
export function parseDirectUrl(rawInput: string): DirectUrlMatch {
  const input = cleanPastedInput(rawInput);
  if (!input || input.includes(' ') && !input.startsWith('http://') && !input.startsWith('https://')) {
    // If it has spaces and doesn't start with http(s), it is a search query
    return { isUrl: false, normalizedUrl: '', displayTitle: '', hostname: '' };
  }

  // 1. Explicit Protocol: http://, https://, file:///, chrome://, chrome-extension://
  if (/^(https?|file|chrome|chrome-extension):\/\//i.test(input)) {
    try {
      const u = new URL(input);
      return {
        isUrl: true,
        normalizedUrl: u.href,
        displayTitle: `Navigate to ${u.hostname || input}`,
        hostname: u.hostname || 'link',
      };
    } catch {
      // Invalid URL syntax despite protocol
      return { isUrl: false, normalizedUrl: '', displayTitle: '', hostname: '' };
    }
  }

  // 2. Localhost with optional port and path: e.g. "localhost", "localhost:3000", "localhost:8080/api"
  const localhostMatch = /^localhost(?::(\d+))?(\/.*)?$/i.exec(input);
  if (localhostMatch) {
    const port = localhostMatch[1] ? `:${localhostMatch[1]}` : '';
    const path = localhostMatch[2] || '';
    const fullUrl = `http://localhost${port}${path}`;
    return {
      isUrl: true,
      normalizedUrl: fullUrl,
      displayTitle: `Open ${input}`,
      hostname: 'localhost',
    };
  }

  // 3. IPv4 address with optional port and path: e.g. "127.0.0.1", "192.168.1.1:8080", "10.0.0.1/admin"
  const ipMatch = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?(\/.*)?$/.exec(input);
  if (ipMatch) {
    const parts = ipMatch[1].split('.').map(Number);
    const validIp = parts.every((p) => p >= 0 && p <= 255);
    if (validIp) {
      const port = ipMatch[2] ? `:${ipMatch[2]}` : '';
      const path = ipMatch[3] || '';
      const fullUrl = `http://${ipMatch[1]}${port}${path}`;
      return {
        isUrl: true,
        normalizedUrl: fullUrl,
        displayTitle: `Navigate to ${ipMatch[1]}${port}`,
        hostname: ipMatch[1],
      };
    }
  }

  // 4. Standard Domain with valid TLD or port: e.g. "github.com", "news.ycombinator.com", "vite.dev/guide"
  // Must have at least one dot, no spaces, and a valid TLD or port
  const domainPattern = /^([a-zA-Z0-9-]+\.)+([a-zA-Z]{2,63})(?::(\d+))?(\/.*)?$/;
  const match = domainPattern.exec(input);
  if (match) {
    const tld = match[2].toLowerCase();
    // Verify TLD is known or query has an explicit path / port
    const hasExplicitPathOrPort = !!match[3] || (!!match[4] && match[4].length > 1);
    if (KNOWN_TLDS.has(tld) || hasExplicitPathOrPort || tld.length >= 2) {
      const fullUrl = `https://${input}`;
      try {
        const u = new URL(fullUrl);
        return {
          isUrl: true,
          normalizedUrl: u.href,
          displayTitle: `Navigate to ${u.hostname}`,
          hostname: u.hostname,
        };
      } catch {
        return { isUrl: false, normalizedUrl: '', displayTitle: '', hostname: '' };
      }
    }
  }

  return { isUrl: false, normalizedUrl: '', displayTitle: '', hostname: '' };
}
