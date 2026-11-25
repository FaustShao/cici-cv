const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = process.env.PREVIEW_ROOT || 'http://127.0.0.1:4188/';
const isPlaying = () => {
  const audio = document.getElementById('background-music');
  return audio && !audio.paused && audio.currentTime > .1;
};

async function check(blocked) {
  const policy = blocked ? 'user-gesture-required' : 'no-user-gesture-required';
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=' + policy],
  });
  try {
    const page = await browser.newPage({ viewport: {width: 900, height: 650}, reducedMotion: 'reduce' });
    // Exercise the pre-module recovery path and the older Safari release guard.
    await page.addInitScript(() => { delete AbortSignal.timeout; });
    if (blocked) {
      await page.route('**/assets/hub-*.js*', route => route.abort());
      await page.route('**/entrance/carefree.mp3*', route => route.request().resourceType() === 'media'
        ? route.fulfill({contentType:'audio/mpeg', body:'truncated media'})
        : route.continue());
    }
    await page.goto(root, {waitUntil: 'domcontentloaded'});
    const audio = page.locator('#background-music');
    const paused = () => audio.evaluate(track => track.paused);
    if (blocked) {
      await page.locator('#fallback').waitFor();
      assert.ok(await paused());
      await page.locator('#fallback h2').click();
      await page.waitForFunction(isPlaying);
      assert.ok(await audio.evaluate(track => track.currentSrc.startsWith('blob:')));
      const switcher = page.locator('#fallback-music');
      await switcher.click();
      assert.ok(await paused());
      await page.locator('#fallback h2').click();
      assert.ok(await paused());
      await switcher.click();
      await page.waitForFunction(isPlaying);
      await page.evaluate(() => {
        dispatchEvent(new PageTransitionEvent('pagehide', {persisted:true}));
        dispatchEvent(new PageTransitionEvent('pageshow', {persisted:true}));
      });
      await page.waitForFunction(() => !document.documentElement.dataset.releaseState);
      return;
    }

    await page.waitForFunction(isPlaying);
    await page.waitForFunction(() => document.body.dataset.ready, null, {timeout:150000});
    await page.locator('#map-trigger').click();
    await page.waitForSelector('#world-map[open]');
    assert.equal(await paused(), false);
    await page.locator('#close-map').click();
    for (const station of ['resume', 'other', 'portfolio']) {
      await page.evaluate(key => { designWorld.go(key); designWorld.openCurrent(); }, station);
      await page.waitForSelector('#reader[open] iframe');
      const time = await audio.evaluate(track => track.currentTime);
      await page.waitForFunction(t => document.getElementById('background-music').currentTime > t + .2, time);
      await page.locator('#close-reader').click();
      assert.equal(await paused(), false);
    }
    await page.evaluate(() => { designWorld.go('home'); document.getElementById('music-switch').focus(); });
    await page.keyboard.press('Space');
    assert.ok(await paused());
    await page.locator('#map-trigger').click();
    assert.ok(await paused());
    await page.locator('#close-map').click();
    await page.locator('#music-switch').focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(isPlaying);
  } finally { await browser.close(); }
}
(async () => {
  await check(true);
  await check(false);
  console.log('PASS autoplay, gesture recovery, scene navigation, reader continuity and speaker mute');
})().catch(error => { console.error(error); process.exitCode = 1; });
