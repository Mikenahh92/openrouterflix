const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    console.log('CATALOG');
    await p.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
    await p.waitForTimeout(2000);
    const ml = await p.$$eval('a[href*="/model/"]', els => els.slice(0, 5).map(e => e.href));
    console.log('Links:', JSON.stringify(ml));
    const bd = await p.$$eval('span[class*="badge"],span[class*="Badge"],[class*="tier"],[class*="Tier"]', els => els.slice(0, 8).map(e => ({ t: e.textContent?.trim()?.substring(0, 40), c: e.className })));
    console.log('Badges:', bd.length, JSON.stringify(bd));
    const bt = await p.textContent('body');
    console.log('Speed:', /Speed|Fast|Slow/i.test(bt), 'Cost:', /Cost|Budget|Premium/i.test(bt));
    if (ml.length > 0) {
      console.log('DETAIL');
      await p.click('a[href*="/model/"]:first-child');
      await p.waitForTimeout(2000);
      const bars = await p.$$eval('[class*="percentile"],[class*="Percentile"],[role="progressbar"]', els => els.map(e => ({ t: e.textContent?.trim()?.substring(0, 80), w: e.style.width, c: e.className })));
      console.log('Bars:', JSON.stringify(bars));
      const dt = await p.textContent('body');
      console.log('Free:', /Free|cheapest/i.test(dt), 'Pct:', /percentile/i.test(dt));
      const prc = await p.$$eval('[class*="pricing"],[class*="Pricing"]', els => els.map(e => ({ t: e.tagName, c: e.className, tx: e.textContent?.trim()?.substring(0, 100) })));
      console.log('Pricing:', JSON.stringify(prc));
    }
    console.log('PLAYGROUND');
    await p.goto('http://localhost:5173/playground', { waitUntil: 'networkidle', timeout: 15000 });
    await p.waitForTimeout(2000);
    const rp = await p.$('[class*="response"],[class*="Response"]');
    console.log('RP:', rp ? 'found' : 'not found');
    const pg = await p.textContent('body');
    console.log('PG:', /Playground|prompt|Send/i.test(pg));
    const tk = await p.$$eval('[class*="token-bar"],[class*="TokenBar"],[data-testid*="token"]', els => els.length);
    console.log('TokenEls:', tk);
    console.log('DARK');
    await p.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
    await p.waitForTimeout(1000);
    const hc = await p.$('html').then(e => e ? e.evaluate(x => x.className) : 'none');
    const bg = await p.$eval('body', e => getComputedStyle(e).backgroundColor);
    console.log('HTML:', hc, 'BG:', bg);
    console.log('RESP768');
    await p.setViewportSize({ width: 768, height: 600 });
    await p.waitForTimeout(500);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log('Overflow:', ov);
  } catch(e) { console.error('ERR:', e.message); console.error(e.stack); }
  finally { await b.close(); }
})();
