const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = process.env.PREVIEW_ROOT || 'http://127.0.0.1:8770/cici-cv/';

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 752}, deviceScaleFactor: 3,
      hasTouch: true, isMobile: true, reducedMotion: 'reduce'});
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('portfolio.html', root).href, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => window.designWorld && document.body.dataset.ready, null, {timeout: 150000});
    assert.ok(await page.evaluate(() => designWorld.world.renderer.backend.isWebGLBackend));
    await page.evaluate(() => preview.select(2));

    // Drop the project document itself. A retry must replace the failed frame.
    const project = '**/dream-sentinel.html*';
    await page.route(project, route => route.abort(), {times: 1});
    await page.locator('#open-work').tap();
    await page.locator('.reader-load-notice button').waitFor();
    const images = [];
    await page.route('**/assets/project-mobile/**', route => { images.push(route); });
    await page.locator('.reader-load-notice button').tap();
    const frame = page.frameLocator('#frames iframe');
    await frame.locator('html[data-page-boot="ready"]').waitFor({state: 'attached'});
    assert.equal(await page.locator('#frames iframe').count(), 1);
    assert.ok(await frame.locator('#reading-size').isVisible());
    await page.waitForFunction(() => !document.querySelector('.reader-load-notice'));
    assert.ok(images.length, 'Mobile artwork requests are still pending');
    await frame.locator('.project-bar a').tap();
    await page.waitForFunction(() => !document.querySelector('#reader').open && !history.state?.overlay);
    await page.unroute('**/assets/project-mobile/**');
    await Promise.all(images.map(r => r.abort().catch(() => {})));

    // Repeatedly enter books with their own GPU contexts and resume the island.
    await page.evaluate(() => designWorld.go('other'));
    for (const index of [2, 3, 2, 3]) {
      await page.evaluate(index => designWorld.selectOther(index), index);
      await page.locator('#open-work').tap();
      await frame.locator('body[data-ready="true"]').waitFor();
      await page.locator('#close-reader').tap();
      await page.waitForFunction(() => !history.state?.overlay && !document.querySelector('#frames iframe'));
      const count = await page.evaluate(() => designWorld.world.renderCount);
      await page.waitForFunction(previous => designWorld.world.renderCount > previous, count);
    }
    assert.deepEqual(errors, []);
    await page.evaluate(() => {designWorld.go('portfolio'); preview.select(2);});

    // Complete another visit, upgrade the visible art, and lose the background
    // context while reading. The open document and its return control stay usable.
    await page.locator('#open-work').tap();
    const image = frame.locator('#board-31 img[data-full-src]').first();
    await image.waitFor();
    assert.match(await image.getAttribute('src'), /project-mobile/);
    await frame.locator('#reading-size').tap();
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const f = document.querySelector('#frames iframe').contentDocument;
      const im = f.querySelector('#board-31 img[data-full-src]');
      return im.src === im.dataset.fullSrc && im.complete && im.naturalWidth;
    });
    await frame.locator('#reading-size').tap();
    assert.equal(await image.getAttribute('src'), await image.getAttribute('data-preview-src'));
    await page.evaluate(() => designWorld.world.renderer.backend.gl.getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(() => document.body.dataset.failed === 'true');
    assert.ok(await frame.locator('#reading-size').isVisible());
    await page.locator('#close-reader').tap();
    const fallback = page.locator('#fallback');
    await fallback.waitFor();
    await fallback.locator('a[href*="dream-sentinel"]').tap();
    await page.waitForURL('**/dream-sentinel.html*');
    await page.locator('html[data-page-boot="ready"]').waitFor({state: 'attached'});
    console.log('PASS default phone renderer, failed document retry, progressive reveal, early return, zoom and context loss');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
