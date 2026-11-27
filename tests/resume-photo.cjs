const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [], bad = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) bad.push(r.url()); });
    const url = new URL('resume.html?document=1&v=cv-fig-1&photo=1', process.env.PREVIEW_ROOT || 'http://127.0.0.1:8765/').href;
    // Also exercise the same iframe embedding used by the scene reader.
    for (const embedded of [false, true]) {
      if (embedded) {
        await page.route('**/__resume-embed-test', route => route.fulfill({ contentType: 'text/html', body: `<iframe title="简历" style="width:100%;height:800px" src="${url}"></iframe>` }));
        await page.goto(new URL('__resume-embed-test', url).href);
      } else await page.goto(url);
      const doc = embedded ? await (await page.locator('iframe').elementHandle()).contentFrame() : page;
      await doc.locator('#portrait-photo').waitFor();
      await doc.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
      const photo = await doc.locator('#portrait-photo').evaluate(i => ({ complete: i.complete, width: i.naturalWidth, height: i.naturalHeight, src: i.currentSrc }));
      assert.ok(photo.complete); assert.equal(photo.width, 1494); assert.equal(photo.height, 1974);
      assert.match(photo.src, /assets\/resume\/cv-portrait\.webp/);
      await doc.locator('.profile-card').hover();
      await page.waitForTimeout(350);
      assert.notEqual(await doc.locator('.profile-card').evaluate(el => getComputedStyle(el).transform), 'none');
      if (!embedded) await doc.locator('.portrait-slot').screenshot({ path: '/tmp/resume-photo-fixed.png' });
    }
    assert.deepEqual(errors, []); assert.deepEqual(bad, []);
    console.log('PASS updated Figma portrait, all resume images decoded, standalone and embedded photo dimensions, hover interaction, no failed requests.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
