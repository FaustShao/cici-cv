const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const root = process.env.PREVIEW_ROOT || 'http://127.0.0.1:4188/';
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1024,height:700}, reducedMotion:'reduce'});
    let releaseModule, releaseTerrain;
    const gate = new Promise(resolve => { releaseModule = resolve; });
    const terrainGate = new Promise(resolve => { releaseTerrain = resolve; });
    const terrain = '**/bruno/terrain/terrain.glb*';
    await page.route(terrain, async route => { await terrainGate; await route.continue(); });
    await page.route('**/assets/hub-*.js*', async route => { await gate; await route.continue(); });
    await page.goto(root, {waitUntil:'commit'});
    await page.waitForFunction(() => !!window.CeciliaMusic);
    const loader = page.locator('#loading'), fallback = page.locator('#fallback');
    // Hold the real module past the old timeout, without replacing the page's clock.
    await page.waitForTimeout(13500);
    assert.ok(await loader.isVisible() && await fallback.isHidden(), 'A slow module must keep the scene loader open');
    const terrainRequest = page.waitForRequest(terrain);
    releaseModule();
    await terrainRequest;
    const retry = page.locator('#retry-loading');
    await retry.waitFor({state:'visible', timeout:65000});
    assert.ok(await loader.isVisible() && await fallback.isHidden(), 'A pending model must keep its download and the loader');
    releaseTerrain();
    await page.waitForFunction(() => document.body.dataset.ready && document.querySelector('#loading').hidden, null, {timeout:120000});
    assert.ok(await fallback.isHidden() && await retry.isHidden());
    assert.ok(await page.evaluate(() => window.designWorld.world.renderCount > 0));
    console.log('PASS slow module and stalled model continue into the rendered scene without opening project links');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
