const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=document-user-activation-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 700 }, hasTouch: true, reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      window.clickVoices = [];
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        if (this.buffer?.duration < .02) window.clickVoices.push(this.buffer);
        return start.apply(this, args);
      };
    });
    await page.goto(process.env.PREVIEW_ROOT || 'http://127.0.0.1:4188/', { waitUntil: 'commit' });
    await page.waitForFunction(() => window.designWorld && document.querySelector('#loading').hidden, null, { timeout: 120000 });
    const count = () => page.evaluate(() => clickVoices.length);
    const map = page.locator('#world-map');
    assert.equal(await count(), 0);

    await page.locator('#map-trigger').hover();
    await page.mouse.down();
    await page.waitForFunction(() => clickVoices.length === 1);
    assert.equal(await map.evaluate(el => el.open), false, 'The first mouse press sounds before button activation');
    await page.mouse.up();
    await map.waitFor({ state: 'visible' });
    assert.equal(await count(), 1, 'Release must not replay the press');
    await page.locator('#close-map').press('Enter');
    assert.equal(await count(), 2, 'Keyboard activation sounds once');

    const hand = await page.evaluate(() => {
      const w = designWorld;
      const v = w.pixelHand.localToWorld(w.pixelHand.position.clone().set(0, 0, .06)).project(w.world.camera);
      const x = (v.x + 1) * innerWidth / 2, y = (1 - v.y) * innerHeight / 2;
      return { x, y, hit: w.pick(x, y) };
    });
    assert.equal(hand.hit, 'map');
    await page.mouse.move(hand.x, hand.y);
    await page.mouse.down();
    await page.mouse.move(hand.x + 40, hand.y, { steps: 3 });
    await page.mouse.up();
    assert.equal(await count(), 2, 'Rotating the scene is silent');
    await page.locator('#map-trigger').tap();
    await map.waitFor({ state: 'visible' });
    assert.equal(await count(), 3, 'A touch tap sounds once');

    await page.locator('[data-destination="portfolio"]').click();
    await page.evaluate(() => designWorld.openCurrent());
    const reader = page.frameLocator('#frames iframe');
    const info = reader.locator('[data-open-info]');
    await info.waitFor();
    const before = await count();
    await info.hover();
    await page.mouse.down();
    await page.waitForFunction(n => clickVoices.length === n + 1, before);
    await page.mouse.up();
    await reader.locator('#project-info[open]').waitFor();
    assert.equal(await count(), before + 1, 'The iframe shares the parent player without duplicate listeners');
    assert.ok(await page.evaluate(() => clickVoices.every(b => b === clickVoices[0])), 'Every click reuses the same buffer');
    console.log('PASS first press, release, keyboard, drag, touch and embedded reader click feedback');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
