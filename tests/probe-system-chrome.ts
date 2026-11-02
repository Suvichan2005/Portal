import { chromium } from '@playwright/test';

async function probeSystemChromeAvailability() {
  console.log('--- Probing System Google Chrome LanguageModel.availability() WITHOUT FLAGS ---');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const page = await browser.newPage();
  await page.goto('chrome://version');

  const probe = await page.evaluate(async () => {
    const res: any = {};
    if (typeof (window as any).LanguageModel !== 'undefined') {
      try {
        res.availability = await (window as any).LanguageModel.availability();
      } catch (e: any) {
        res.availabilityError = e.message;
      }
      try {
        await (window as any).LanguageModel.create();
      } catch (e: any) {
        res.createError = e.message;
      }
    }
    return res;
  });

  console.log('System Chrome LanguageModel availability result:', probe);
  await browser.close();
}

probeSystemChromeAvailability().catch(console.error);
