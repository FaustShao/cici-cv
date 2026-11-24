const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.PREVIEW_ROOT || 'http://127.0.0.1:8770/cici-cv/';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    await page.goto(new URL('portfolio.html?webgl=1', base).href);
    await page.waitForFunction(() => window.designWorld && document.body.dataset.ready, null, { timeout: 120000 });
    await page.evaluate(() => designWorld.openCurrent());
    const project = page.frameLocator('#frames iframe');
    await project.locator('[data-open-info]').click();

    const results = [];
    for (const [width, height] of [[1280, 720], [2560, 1440], [3440, 1440], [1000, 600], [390, 800]]) {
      await page.setViewportSize({ width, height });
      const dimensions = await project.locator('#project-info').evaluate(async dialog => {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const body = dialog.querySelector('.project-info-body');
        body.scrollTop = body.scrollHeight;
        const close = dialog.querySelector('[data-close-info]');
        const button = close.getBoundingClientRect();
        const hit = document.elementFromPoint(button.x + button.width / 2, button.y + button.height / 2);
        return {
          width: dialog.offsetWidth,
          font: parseFloat(getComputedStyle(body.querySelector('p')).fontSize),
          fits: body.scrollWidth <= body.clientWidth + 1 && body.getBoundingClientRect().bottom <= innerHeight,
          canClose: close.contains(hit),
          scrollable: body.scrollTop > 0,
        };
      });
      assert.ok(dimensions.fits && dimensions.canClose, JSON.stringify({ width, height, dimensions }));
      assert.ok(dimensions.font >= 16);
      results.push(dimensions);
    }
    const [laptop, desktop, ultra, short] = results;
    assert.ok(desktop.width > laptop.width && desktop.font > laptop.font);
    assert.equal(ultra.width, desktop.width, 'Extra width on an ultrawide screen keeps line length bounded');
    assert.ok(short.scrollable, 'Long text remains reachable in a short embedded viewport');
    await project.locator('[data-close-info]').click();
    await page.locator('#close-reader').click();
    assert.equal(await page.locator('#frames iframe').count(), 0);
    console.log('PASS responsive project description, reachable close and return to scene');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
