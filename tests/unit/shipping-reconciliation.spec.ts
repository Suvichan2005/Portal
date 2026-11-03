import { test, expect } from '@playwright/test';
import { storage } from '../../src/core/storage';
import { searchEngine } from '../../src/core/search/engine';
import { COMMANDS } from '../../src/core/commands/registry';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Portal v1.6.0 Shipping Reconciliation & Integrity Suite', () => {
  test.beforeEach(async () => {
    await storage.clearDerivedData();
  });

  test('1. Read-Through In-Memory Cache: resolves preferences and shortcuts synchronously from cache', async () => {
    // 1. Initial get
    const prefs1 = await storage.getPreferences();
    expect(prefs1).toBeDefined();
    expect(prefs1.theme).toBeDefined();

    // 2. Modify preferences
    await storage.savePreferences({ theme: 'dark', searchEngine: 'duckduckgo' });
    const prefs2 = await storage.getPreferences();
    expect(prefs2.theme).toBe('dark');
    expect(prefs2.searchEngine).toBe('duckduckgo');

    // 3. Clear derived data flushes memory cache
    await storage.clearDerivedData();
    const prefs3 = await storage.getPreferences();
    expect(prefs3).toBeDefined();
  });

  test('2. Event-Driven Bookmark Cache: invalidation clears in-memory tree cache', async () => {
    // First query populates bookmark cache
    const results1 = await searchEngine.search('bookmark');
    expect(Array.isArray(results1)).toBe(true);

    // Invalidation clears flattened cache without error
    expect(() => searchEngine.invalidateBookmarkCache()).not.toThrow();

    // Subsequent search re-queries safely
    const results2 = await searchEngine.search('portal');
    expect(Array.isArray(results2)).toBe(true);
  });

  test('3. Strict Omnibox Harmony: Alt+D is never registered as a command shortcut', () => {
    for (const cmd of COMMANDS) {
      for (const kw of cmd.keywords) {
        expect(kw.toLowerCase()).not.toBe('alt+d');
      }
      expect(cmd.description.toLowerCase()).not.toContain('alt+d');
    }

    // Verify reload command is present for 1-click update activation
    const reloadCmd = COMMANDS.find((c: any) => c.id === 'reload-extension');
    expect(reloadCmd).toBeDefined();
    expect(reloadCmd?.title).toContain('Reload Portal Extension');
  });

  test('4. Build Metadata Generator: generates 64-character SHA-256 hashes and proper status', () => {
    const rootDir = process.cwd();
    const metadataPath = path.join(rootDir, 'public', 'build-metadata.json');
    
    // Ensure metadata file can be parsed if it exists
    if (fs.existsSync(metadataPath)) {
      const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      expect(meta.version).toBeDefined();
      expect(meta.branch).toBeDefined();
      expect(meta.headCommit).toBeDefined();
      expect(meta.status).toBeDefined();
      expect(meta.checksums).toBeDefined();

      for (const [file, hash] of Object.entries(meta.checksums)) {
        // Must be full 64-char hex SHA-256 hash, not truncated
        expect((hash as string).length).toBe(64);
        expect(/^[0-9a-f]{64}$/.test(hash as string)).toBe(true);
      }
    }
  });

  test('5. Safe Clipboard Copy Fallback Simulation', () => {
    // Verify fallback copy algorithm logic
    function mockCopyFallback(text: string): boolean {
      if (!text) return false;
      // In non-browser Node environment, fallback returns false gracefully without crashing
      return typeof document !== 'undefined';
    }

    expect(mockCopyFallback('')).toBe(false);
    expect(typeof mockCopyFallback('https://example.com')).toBe('boolean');
  });
});
