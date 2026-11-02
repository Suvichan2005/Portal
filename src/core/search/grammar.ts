/**
 * Portal Search Grammar & Synchronous Intent Parser
 * Token-aware parsing of @ prefixes, / commands, site-scoped search, and direct URLs.
 */

import { parseDirectUrl, cleanPastedInput } from './url-utils';

export interface ProviderBang {
  prefix: string;
  name: string;
  domain: string;
  urlTemplate: string;
  description: string;
}

export const PROVIDER_BANGS: ProviderBang[] = [
  {
    prefix: 'gh',
    name: 'GitHub',
    domain: 'github.com',
    urlTemplate: 'https://github.com/search?q={q}',
    description: 'Search GitHub repositories, code, and issues',
  },
  {
    prefix: 'yt',
    name: 'YouTube',
    domain: 'youtube.com',
    urlTemplate: 'https://www.youtube.com/results?search_query={q}',
    description: 'Search YouTube videos and music',
  },
  {
    prefix: 'w',
    name: 'Wikipedia',
    domain: 'wikipedia.org',
    urlTemplate: 'https://en.wikipedia.org/wiki/Special:Search?search={q}',
    description: 'Search Wikipedia encyclopedia articles',
  },
  {
    prefix: 'so',
    name: 'Stack Overflow',
    domain: 'stackoverflow.com',
    urlTemplate: 'https://stackoverflow.com/search?q={q}',
    description: 'Search developer questions and solutions',
  },
  {
    prefix: 'r',
    name: 'Reddit',
    domain: 'reddit.com',
    urlTemplate: 'https://www.reddit.com/search/?q={q}',
    description: 'Search Reddit discussions and subreddits',
  },
  {
    prefix: 'npm',
    name: 'npm',
    domain: 'npmjs.com',
    urlTemplate: 'https://www.npmjs.com/search?q={q}',
    description: 'Search JavaScript and Node.js packages',
  },
  {
    prefix: 'm',
    name: 'Google Maps',
    domain: 'google.com',
    urlTemplate: 'https://www.google.com/maps/search/{q}',
    description: 'Search places, addresses, and directions',
  },
  {
    prefix: 'g',
    name: 'Google',
    domain: 'google.com',
    urlTemplate: 'https://www.google.com/search?q={q}',
    description: 'Search the web using Google',
  },
  {
    prefix: 'ddg',
    name: 'DuckDuckGo',
    domain: 'duckduckgo.com',
    urlTemplate: 'https://duckduckgo.com/?q={q}',
    description: 'Search privacy-first with DuckDuckGo',
  },
  {
    prefix: 'x',
    name: 'X (Twitter)',
    domain: 'x.com',
    urlTemplate: 'https://x.com/search?q={q}',
    description: 'Search posts and profiles on X',
  },
];

// Map of domain shortcuts for local site-scoped browsing search
export const SITE_SCOPES: Record<string, { domain: string; name: string }> = {
  chatgpt: { domain: 'chatgpt.com', name: 'ChatGPT' },
  openai: { domain: 'openai.com', name: 'OpenAI' },
  github: { domain: 'github.com', name: 'GitHub' },
  youtube: { domain: 'youtube.com', name: 'YouTube' },
  google: { domain: 'google.com', name: 'Google' },
  docs: { domain: 'docs.google.com', name: 'Google Docs' },
  drive: { domain: 'drive.google.com', name: 'Google Drive' },
  reddit: { domain: 'reddit.com', name: 'Reddit' },
  twitter: { domain: 'x.com', name: 'X / Twitter' },
  figma: { domain: 'figma.com', name: 'Figma' },
  notion: { domain: 'notion.so', name: 'Notion' },
  slack: { domain: 'slack.com', name: 'Slack' },
};

export type FilterScope = 'all' | 'tabs' | 'history' | 'bookmarks' | 'audio' | 'commands' | 'site';

export interface ParsedGrammar {
  scope: FilterScope;
  query: string;
  siteDomain?: string;
  providerBang?: ProviderBang;
  isCommand: boolean;
  commandToken?: string;
}

/**
 * Token-aware grammar parser.
 * Distinguishes @ provider bangs, @ category scopes, @ site-scoped searches, and / commands.
 */
export function parseGrammar(rawInput: string): ParsedGrammar {
  const input = rawInput.trim();
  if (!input) {
    return { scope: 'all', query: '', isCommand: false };
  }

  // 1. Browser Commands: Starts with "/"
  if (input.startsWith('/')) {
    const withoutSlash = input.slice(1).trim();
    const parts = withoutSlash.split(/\s+/);
    return {
      scope: 'commands',
      query: withoutSlash,
      isCommand: true,
      commandToken: parts[0]?.toLowerCase() || '',
    };
  }

  // 2. "@" Prefix Grammar
  if (input.startsWith('@')) {
    const withoutAt = input.slice(1).trim();
    const spaceIdx = withoutAt.search(/\s/);
    const token = (spaceIdx === -1 ? withoutAt : withoutAt.slice(0, spaceIdx)).toLowerCase();
    const rest = spaceIdx === -1 ? '' : withoutAt.slice(spaceIdx).trim();

    // 2a. System category scopes:
    if (token === 'tabs' || token === 'tab') {
      return { scope: 'tabs', query: rest, isCommand: false };
    }
    if (token === 'history' || token === 'hist') {
      return { scope: 'history', query: rest, isCommand: false };
    }
    if (token === 'bookmarks' || token === 'bookmark' || token === 'bm') {
      return { scope: 'bookmarks', query: rest, isCommand: false };
    }
    if (token === 'audio' || token === 'sound' || token === 'music') {
      return { scope: 'audio', query: rest, isCommand: false };
    }

    // 2b. Provider web search bangs: e.g. "@gh react", "@yt lofi", "@w quantum"
    const bang = PROVIDER_BANGS.find((b) => b.prefix.toLowerCase() === token);
    if (bang) {
      return {
        scope: 'all',
        query: rest,
        providerBang: bang,
        isCommand: false,
      };
    }

    // 2c. Known site-scoped local browsing search: e.g. "@chatgpt flowmate", "@github portal"
    if (SITE_SCOPES[token]) {
      return {
        scope: 'site',
        query: rest,
        siteDomain: SITE_SCOPES[token].domain,
        isCommand: false,
      };
    }

    // 2d. Generic site-scoped search if token has a domain pattern e.g. "@sub.domain.com query"
    if (token.includes('.')) {
      return {
        scope: 'site',
        query: rest,
        siteDomain: token,
        isCommand: false,
      };
    }

    // Fallback: If user just typed "@" or an unknown prefix with a space, treat as open tabs search
    return {
      scope: 'tabs',
      query: withoutAt,
      isCommand: false,
    };
  }

  // 3. Legacy "!" prefix support for backward compatibility: e.g. "!gh react"
  if (input.startsWith('!')) {
    const withoutExcl = input.slice(1).trim();
    const spaceIdx = withoutExcl.search(/\s/);
    const token = (spaceIdx === -1 ? withoutExcl : withoutExcl.slice(0, spaceIdx)).toLowerCase();
    const rest = spaceIdx === -1 ? '' : withoutExcl.slice(spaceIdx).trim();

    const bang = PROVIDER_BANGS.find((b) => b.prefix.toLowerCase() === token);
    if (bang) {
      return {
        scope: 'all',
        query: rest,
        providerBang: bang,
        isCommand: false,
      };
    }
  }

  // 4. Legacy "#" or "*" bookmarks prefix
  if (input.startsWith('#') || input.startsWith('*')) {
    return {
      scope: 'bookmarks',
      query: input.slice(1).trim(),
      isCommand: false,
    };
  }

  // Default: general search
  return {
    scope: 'all',
    query: input,
    isCommand: false,
  };
}

export type IntentType =
  | 'navigate_url'
  | 'provider_search'
  | 'command'
  | 'scoped_search'
  | 'web_search_fallback';

export interface SynchronousIntent {
  type: IntentType;
  targetUrl: string;
  displayTitle: string;
  description: string;
  badge: string;
  commandId?: string;
  scope?: FilterScope;
}

/**
 * Resolves the immediate synchronous intent from the current input string.
 * This runs in <1ms and ALWAYS determines what Enter will do even before async search returns.
 */
export function resolveSynchronousIntent(
  rawInput: string,
  preferredSearchEngine: string = 'google',
): SynchronousIntent {
  const cleaned = cleanPastedInput(rawInput);
  if (!cleaned) {
    return {
      type: 'web_search_fallback',
      targetUrl: '',
      displayTitle: '',
      description: '',
      badge: 'SEARCH',
    };
  }

  // 1. Direct URL Match (highest priority — pasted URLs NEVER search Google!)
  const directMatch = parseDirectUrl(cleaned);
  if (directMatch.isUrl) {
    return {
      type: 'navigate_url',
      targetUrl: directMatch.normalizedUrl,
      displayTitle: directMatch.displayTitle,
      description: directMatch.normalizedUrl,
      badge: 'NAVIGATE',
    };
  }

  // 2. Grammar Parsing (@ providers, @ scopes, / commands)
  const grammar = parseGrammar(cleaned);

  if (grammar.providerBang) {
    const q = grammar.query;
    const url = q ? grammar.providerBang.urlTemplate.replace('{q}', encodeURIComponent(q)) : `https://${grammar.providerBang.domain}`;
    return {
      type: 'provider_search',
      targetUrl: url,
      displayTitle: q ? `Search ${grammar.providerBang.name} for "${q}"` : `Open ${grammar.providerBang.name}`,
      description: `${grammar.providerBang.description} • Opens in new tab`,
      badge: `@${grammar.providerBang.prefix.toUpperCase()}`,
    };
  }

  if (grammar.isCommand) {
    return {
      type: 'command',
      targetUrl: '',
      displayTitle: `Run command /${grammar.query}`,
      description: 'Browser command execution',
      badge: 'COMMAND',
    };
  }

  if (grammar.scope !== 'all') {
    return {
      type: 'scoped_search',
      targetUrl: '',
      displayTitle: `Filter by @${grammar.scope}: ${grammar.query}`,
      description: `Filtering ${grammar.scope}`,
      badge: `@${grammar.scope.toUpperCase()}`,
      scope: grammar.scope,
    };
  }

  // 3. Web Search Fallback
  const q = cleaned;
  const searchUrl =
    preferredSearchEngine === 'duckduckgo'
      ? `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
      : preferredSearchEngine === 'bing'
        ? `https://www.bing.com/search?q=${encodeURIComponent(q)}`
        : `https://www.google.com/search?q=${encodeURIComponent(q)}`;

  const engineName = preferredSearchEngine === 'duckduckgo' ? 'DuckDuckGo' : preferredSearchEngine === 'bing' ? 'Bing' : 'Google';

  return {
    type: 'web_search_fallback',
    targetUrl: searchUrl,
    displayTitle: `Search ${engineName} for "${q}"`,
    description: `Web search • Opens in new tab`,
    badge: 'SEARCH',
  };
}
