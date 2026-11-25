const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 }, reducedMotion: 'reduce' });
    // Hold a real module request and leave the decorative font promises unsettled.
    let resumeDownload;
    const gate = new Promise(resolve => { resumeDownload = resolve; });
    await page.route('**/assets/hub-*.js*', async route => { await gate; await route.continue(); });
    await page.addInitScript(() => { document.fonts.load = () => new Promise(() => {}); });
    await page.goto(process.env.PREVIEW_ROOT || 'http://127.0.0.1:4188/', { waitUntil: 'commit' });
    await page.locator('#fallback').waitFor({ timeout: 20000 });
    assert.equal(await page.locator('#loading').getAttribute('aria-valuenow'), '0');
    assert.ok(await page.locator('#fallback a[href*="tideline"]').isVisible());
    resumeDownload();
    await page.waitForFunction(() => document.body.dataset.ready && window.designWorld, null, { timeout: 120000 });
    assert.ok(await page.locator('#fallback').isHidden());
    const name = await page.evaluate(() => {
      const mesh = designWorld.identity.getObjectByName('voxel-name-blocks');
      return mesh.count;
    });
    assert.equal(name, 2752, 'The complete Chinese glyphs must be independent of browser font metrics.');
    const modules = await page.evaluate(() => performance.getEntriesByType('resource')
      .map(entry => new URL(entry.name)).filter(url => url.pathname.includes('/three.module-')));
    assert.equal(modules.length, 1, 'The HTML and the scene must load the same Three module URL.');
    console.log('PASS slow entry exposes project links, recovers in place and builds the complete wordmark.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
