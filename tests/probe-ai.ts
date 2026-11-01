import { chromium } from '@playwright/test';

async function probeAI() {
  console.log('--- Probing Chrome Built-in AI / Prompt API ---');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chromium',
    args: [
      '--enable-features=PromptAPIForGeminiNano,OptimizationGuideOnDeviceModel',
      '--optimization-guide-on-device-model-execution-override',
    ],
  });

  const page = await browser.newPage();
  await page.goto('about:blank');

  const probe = await page.evaluate(async () => {
    const results: any = {};
    // Check global LanguageModel (standard Chrome modern API)
    if (typeof (window as any).LanguageModel !== 'undefined') {
      results.hasGlobalLanguageModel = true;
      try {
        results.availability = await (window as any).LanguageModel.availability();
      } catch (e: any) {
        results.availabilityError = e.message;
      }
    } else {
      results.hasGlobalLanguageModel = false;
    }

    // Check window.ai (Chrome origin trial / preview API)
    if (typeof (window as any).ai !== 'undefined') {
      results.hasWindowAi = true;
      try {
        if ((window as any).ai.languageModel) {
          results.windowAiCapabilities = await (window as any).ai.languageModel.capabilities();
        }
      } catch (e: any) {
        results.windowAiError = e.message;
      }
    } else {
      results.hasWindowAi = false;
    }

    return results;
  });

  console.log('Probe results in Chrome:', probe);
  await browser.close();
  return probe;
}

probeAI().catch(console.error);
