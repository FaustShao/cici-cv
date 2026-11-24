const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = process.env.PREVIEW_ROOT || 'http://127.0.0.1:8770/cici-cv/';

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    for (const [project, count] of [['safepaw', 5], ['dream-sentinel', 4]]) {
      const page = await browser.newPage({viewport: {width: 390, height: 752}, isMobile: true, hasTouch: true});
      await page.goto(new URL(project + '.html', root).href);
      const zoom = page.locator('#reading-size');
      async function checkFit() {
        await page.waitForFunction(count => {
          const views = [...document.querySelectorAll('.board-viewport')];
          return views.length === count && views.every(view => {
            const board = view.querySelector('.design-board').getBoundingClientRect();
            return Math.abs(board.left) < 1 && Math.abs(board.right - view.clientWidth) < 1 &&
              view.scrollWidth === view.clientWidth && view.clientWidth === document.documentElement.clientWidth;
          });
        }, count);
        assert.equal(await zoom.getAttribute('aria-pressed'), 'false');
      }
      for (const [width, height] of [[390,752], [320,568], [430,932], [844,390], [1440,900]]) {
        await page.setViewportSize({width, height});
        await checkFit();
      }
      await page.setViewportSize({width: 390, height: 752});
      await checkFit();
      await zoom.tap();
      const sections = page.locator('.board-viewport');
      assert.equal(await zoom.getAttribute('aria-pressed'), 'true');
      assert.ok(await sections.evaluateAll(views => views.every(view => view.scrollWidth > view.clientWidth)));
      await sections.first().evaluate(view => { view.scrollLeft = view.scrollWidth; });
      await zoom.tap();
      await checkFit();
      await zoom.tap();
      await page.reload();
      await checkFit();
      console.log(project, count, 'boards fit on entry, resize, return from zoom, and reload');
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
