const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(new URL('cecilia-world/hub.html?webgl=1#contact', process.env.PREVIEW_ROOT || 'http://127.0.0.1:8000/').href);
    await page.waitForFunction(() => document.body.dataset.ready || document.body.dataset.failed, null, { timeout: 90000 });
    assert.equal(await page.locator('body').getAttribute('data-failed'), null);
    await page.evaluate(() => designWorld.world.renderer.setAnimationLoop(null));
    assert.equal(await page.locator('#place-actions a[href^="tel:"]').count(), 0);
    assert.equal(await page.locator('#place-actions a').getAttribute('href'), 'mailto:wangyuxinqd2025@163.com');
    for (const [name, value] of [['复制电话', '15066290491'], ['复制微信号', 'Cecilia_cici68']]) {
      await page.getByRole('button', { name }).click();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), value);
      assert.match(await page.locator('#feedback').innerText(), /已复制/);
    }
    async function fits() {
      return page.locator('#place-actions').evaluate(note => {
        const box = note.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight && [...note.children].every(el => {
          const r = el.getBoundingClientRect(); return r.left >= box.left && r.right <= box.right && r.bottom <= box.bottom;
        });
      });
    }
    assert.ok(await fits(), 'Desktop paper strip and all contact actions fit');
    await page.screenshot({ path: '/tmp/contact-note-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await fits(), 'Mobile paper strip and all contact actions fit');
    assert.ok(await page.evaluate(() => {
      const note = document.getElementById('place-actions').getBoundingClientRect();
      const map = document.getElementById('map-trigger').getBoundingClientRect();
      return note.bottom < map.top;
    }), 'The contact note stays above the map trigger');
    await page.evaluate(() => designWorld.world.pipeline.render());
    await page.screenshot({ path: '/tmp/contact-note-mobile.png' });
    assert.deepEqual(errors, []);
    console.log('PASS paper contact strip, email link, phone/WeChat clipboard actions, desktop and mobile bounds.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
