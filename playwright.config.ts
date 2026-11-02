import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  workers: 1,
  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: {
        headless: false,
        trace: 'off',
      },
    },
  ],
});
