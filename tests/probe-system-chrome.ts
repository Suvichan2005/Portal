import { chromium } from '@playwright/test';

async function probeSystemChromeAvailability() {
  console.log('--- Probing System Google Chrome LanguageModel.availability() ---');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--enable-features=PromptAPIForGeminiNano,OptimizationGuideOnDeviceModel',
      '--enable-blink-features=PromptAPIForGeminiNano',
    ],
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
        if (typeof (window as any).LanguageModel.params === 'function') {
          res.params = await (window as any).LanguageModel.params();
        }
      } catch (e: any) {
        res.paramsError = e.message;
      }
    }
    return res;
  });

  console.log('System Chrome LanguageModel availability result:', probe);
  await browser.close();
}

probeSystemChromeAvailability().catch(console.error);
