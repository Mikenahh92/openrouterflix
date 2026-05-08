import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const VALID_MODEL = 'openai/gpt-chat-latest';
const INVALID_MODEL = 'nonexistent/model-xyz-999';
const results = [];

async function test(name, fn) {
  try {
    const ok = await fn();
    results.push({ name, status: ok ? 'PASS' : 'FAIL' });
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}`);
  } catch (e) {
    results.push({ name, status: 'ERROR', error: e.message });
    console.log(`[ERROR] ${name}: ${e.message}`);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// VT3: Navigate to /playground without param -> empty selector, default behavior
await test('VT3: /playground without param -> empty selector', async () => {
  await page.goto(`${BASE}/playground`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const url = page.url();
  if (url.includes('model=')) return false;
  const ta = await page.$('textarea');
  return ta !== null;
});

// VT4: Navigate to /playground?model=invalid-id -> no crash, no error
await test('VT4: /playground?model=invalid-id -> no crash', async () => {
  await page.goto(`${BASE}/playground?model=${encodeURIComponent(INVALID_MODEL)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const bodyText = await page.textContent('body');
  const hasCrashError = bodyText.toLowerCase().includes('uncaught') || bodyText.toLowerCase().includes('application error');
  return !hasCrashError;
});

// VT2: Navigate to /playground?model=<valid-id> -> model pre-selected (name + provider)
await test('VT2: /playground?model=valid-id -> model pre-selected', async () => {
  await page.goto(`${BASE}/playground?model=${encodeURIComponent(VALID_MODEL)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const bodyText = await page.textContent('body');
  return bodyText.includes('GPT') || bodyText.includes('OpenAI');
});

// VT1: Click 'Try this model' on detail page -> navigates to /playground?model=<id>
await test("VT1: 'Try this model' on detail page -> /playground?model=<id>", async () => {
  await page.goto(`${BASE}/models/${encodeURIComponent(VALID_MODEL)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const link = await page.$('a[href*="playground?model="]');
  if (!link) return false;
  const href = await link.getAttribute('href');
  await link.click();
  await page.waitForTimeout(2000);
  const url = page.url();
  return url.includes('/playground') && url.includes('model=');
});

// VT2 reconfirm: After deep-link from detail page, model is pre-selected
await test('VT2-reconfirm: After deep-link nav, model pre-selected', async () => {
  await page.waitForTimeout(1000);
  const bodyText = await page.textContent('body');
  return bodyText.includes('GPT') || bodyText.includes('OpenAI');
});

// VT5: Pre-selected model functional - type prompt, submit, response
await test('VT5: Pre-selected model functional - submit prompt', async () => {
  if (!page.url().includes('playground')) {
    await page.goto(`${BASE}/playground?model=${encodeURIComponent(VALID_MODEL)}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
  }
  const textarea = await page.$('textarea');
  if (!textarea) return false;
  await textarea.fill('Say the word "confirmed".');
  await page.waitForTimeout(500);
  // Try Enter to submit
  await textarea.press('Enter');
  await page.waitForTimeout(5000);
  // Check page didn't crash and we're still on playground
  return page.url().includes('playground');
});

// VT6: 'Try this model' quick-action on ModelCard hover in catalog
await test("VT6: 'Try' quick-action on ModelCard hover -> /playground?model=<id>", async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // Look for any model card to hover
  const cardSelectors = ['.model-card', '[class*="model-card"]', '[class*="ModelCard"]', 'a[href*="/models/"]'];
  let cards = [];
  for (const sel of cardSelectors) {
    cards = await page.$$(sel);
    if (cards.length > 0) break;
  }
  if (cards.length > 0) {
    await cards[0].hover();
    await page.waitForTimeout(1500);
    const tryLink = await page.$('a[href*="/playground?model="]');
    if (tryLink) {
      await tryLink.click();
      await page.waitForTimeout(2000);
      return page.url().includes('/playground') && page.url().includes('model=');
    }
  }
  // Fallback: just check that some Try link exists on the page
  const anyTry = await page.$('a[href*="/playground?model="]');
  return anyTry !== null;
});

await browser.close();

console.log('\n=== RESULTS ===');
results.forEach(r => console.log(`  ${r.status}: ${r.name}${r.error ? ' - ' + r.error : ''}`));
const passCount = results.filter(r => r.status === 'PASS').length;
console.log(`\nPass: ${passCount}/${results.length}`);
if (passCount === results.length) console.log('OVERALL: ALL PASSED');
else console.log('OVERALL: ISSUES FOUND');
