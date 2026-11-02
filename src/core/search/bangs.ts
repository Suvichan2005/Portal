export interface BangDefinition {
  prefix: string;
  name: string;
  urlTemplate: string;
  description: string;
  domain: string;
}

export const POPULAR_BANGS: BangDefinition[] = [
  {
    prefix: 'gh',
    name: 'GitHub',
    urlTemplate: 'https://github.com/search?q={q}',
    description: 'Search GitHub repositories, code, and issues',
    domain: 'github.com',
  },
  {
    prefix: 'yt',
    name: 'YouTube',
    urlTemplate: 'https://www.youtube.com/results?search_query={q}',
    description: 'Search YouTube videos and channels',
    domain: 'youtube.com',
  },
  {
    prefix: 'g',
    name: 'Google',
    urlTemplate: 'https://www.google.com/search?q={q}',
    description: 'Search with Google',
    domain: 'google.com',
  },
  {
    prefix: 'w',
    name: 'Wikipedia',
    urlTemplate: 'https://en.wikipedia.org/wiki/Special:Search?search={q}',
    description: 'Search Wikipedia encyclopedia',
    domain: 'wikipedia.org',
  },
  {
    prefix: 'so',
    name: 'Stack Overflow',
    urlTemplate: 'https://stackoverflow.com/search?q={q}',
    description: 'Search developer questions on Stack Overflow',
    domain: 'stackoverflow.com',
  },
  {
    prefix: 'r',
    name: 'Reddit',
    urlTemplate: 'https://www.reddit.com/search/?q={q}',
    description: 'Search communities and posts on Reddit',
    domain: 'reddit.com',
  },
  {
    prefix: 'npm',
    name: 'npm',
    urlTemplate: 'https://www.npmjs.com/search?q={q}',
    description: 'Search JavaScript and TypeScript npm packages',
    domain: 'npmjs.com',
  },
  {
    prefix: 'mdn',
    name: 'MDN',
    urlTemplate: 'https://developer.mozilla.org/en-US/search?q={q}',
    description: 'Search MDN Web Docs for web APIs & CSS',
    domain: 'developer.mozilla.org',
  },
  {
    prefix: 'm',
    name: 'Google Maps',
    urlTemplate: 'https://www.google.com/maps/search/{q}',
    description: 'Search locations and places on Google Maps',
    domain: 'maps.google.com',
  },
  {
    prefix: 'x',
    name: 'X (Twitter)',
    urlTemplate: 'https://x.com/search?q={q}',
    description: 'Search posts and profiles on X',
    domain: 'x.com',
  },
  {
    prefix: 'ddg',
    name: 'DuckDuckGo',
    urlTemplate: 'https://duckduckgo.com/?q={q}',
    description: 'Search privacy-first with DuckDuckGo',
    domain: 'duckduckgo.com',
  },
  {
    prefix: 'caniuse',
    name: 'Can I Use',
    urlTemplate: 'https://caniuse.com/?search={q}',
    description: 'Browser support tables for modern HTML5/CSS/JS',
    domain: 'caniuse.com',
  },
];

export interface MatchedBang {
  bang: BangDefinition;
  searchQuery: string;
  hasQuery: boolean;
}

/**
 * Parses an input string for search bang syntax (e.g., "!gh react", "!yt lofi", "!w quantum", or just "!gh").
 */
export function matchBang(input: string): MatchedBang | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('!')) return null;

  // Split bang token from remainder of query
  const firstSpaceIdx = trimmed.indexOf(' ');
  const bangToken = (firstSpaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, firstSpaceIdx)).toLowerCase();
  const remainder = firstSpaceIdx === -1 ? '' : trimmed.slice(firstSpaceIdx + 1).trim();

  const found = POPULAR_BANGS.find((b) => b.prefix.toLowerCase() === bangToken);
  if (found) {
    return {
      bang: found,
      searchQuery: remainder,
      hasQuery: remainder.length > 0,
    };
  }

  return null;
}

/**
 * Returns bangs matching a partial prefix (e.g. typing "!" or "!g" to discover bangs).
 */
export function findMatchingBangs(partial: string): BangDefinition[] {
  const clean = partial.startsWith('!') ? partial.slice(1).toLowerCase().trim() : partial.toLowerCase().trim();
  if (!clean) return POPULAR_BANGS.slice(0, 8);
  return POPULAR_BANGS.filter((b) => b.prefix.toLowerCase().startsWith(clean) || b.name.toLowerCase().includes(clean));
}
