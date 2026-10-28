// Start a static server at :8000, then run: node tests/island.cjs
// Playwright is a development-only test dependency, not needed by the website.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors = [], failures = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {if(response.status() >= 400) failures.push(response.url());});
    const root = process.env.ISLAND_URL || 'http://127.0.0.1:8000/';
    await page.goto(root);
    await page.waitForFunction(() => document.body.classList.contains('scene-ready'));
    assert.match(await page.locator('#home-name').innerText(), /王钰欣.*YUXIN WANG/s);
    await page.locator('#island-theme').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#island-theme').click();
    await page.locator('nav [data-place=portfolio]').click();
    assert.equal(await page.locator('.archive-file').count(), 3);
    for (let i=0; i<3; i++) {
      await page.locator(`[data-select-file="${i}"]`).click();
      assert.equal(await page.locator('#archive-position').innerText(), `0${i+1}`);
      await page.locator('#read-project').click();
      const frame = page.locator('iframe:visible');
      await page.waitForFunction(() => {
        const frame = [...document.querySelectorAll('iframe')].find(frame => !frame.hidden);
        return frame?.dataset.loaded === 'true';
      });
      assert.ok(await frame.getAttribute('title'));
      await page.locator('#reader-back').click();
      assert.equal(await page.locator('#archive-position').innerText(), `0${i+1}`);
    }
    await page.locator('#archive-fan').evaluate(fan => {
      fan.dispatchEvent(new TouchEvent('touchstart',{touches:[new Touch({identifier:1,target:fan,clientX:200,clientY:200})]}));
      fan.dispatchEvent(new TouchEvent('touchend',{changedTouches:[new Touch({identifier:1,target:fan,clientX:100,clientY:200})]}));
      fan.querySelector('[data-file="2"]').click();
    });
    assert.equal(await page.locator('#archive-position').innerText(),'01');
    await page.keyboard.press('Escape');
    await page.locator('.resume-priority').click();
    await page.locator('#read-resume').click();
    assert.match(await page.locator('#reader-title').innerText(), /简历/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#place-panel').evaluate(el => el.open), true);
    await page.locator('#panel-close').click();
    await page.locator('nav [data-place=other]').click();
    assert.equal(await page.locator('.side-project').count(), 2);
    await page.locator('#panel-close').click();
    await page.locator('nav [data-place=contact]').click();
    assert.equal(await page.locator('.contact-details a').first().getAttribute('href'), 'mailto:wangyuxinqd2025@163.com');
    assert.equal(await page.locator('.contact-details a').nth(1).getAttribute('href'), 'tel:15066290491');
    await page.locator('#copy-wechat').click();
    await page.waitForFunction(() => document.getElementById('contact-feedback').textContent.includes('Cecilia_cici68'));
    assert.match(await page.locator('#contact-feedback').innerText(), /Cecilia_cici68/);
    await page.goto(new URL('portfolio.html',root).href);
    await page.waitForURL('**/index.html#portfolio');
    for(const width of [320,390,768,1024]) {
      await page.setViewportSize({width,height:844});
      await page.goto(root);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
      await page.locator('nav [data-place=portfolio]').click();
      await page.locator('#archive-fan [data-file="0"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#archive-position').innerText(),'02');
      await page.locator('#read-project').click();
      assert.equal(await page.locator('#project-reader').evaluate(el=>el.open),true);
    }
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type,...args) {return type.startsWith('webgl') ? null : original.call(this,type,...args);};
    });
    await fallback.goto(root);
    await fallback.waitForFunction(() => document.getElementById('scene-status').textContent.includes('简洁地图'));
    await fallback.locator('.place-resume').click();
    assert.equal(await fallback.locator('#place-panel').evaluate(el=>el.open), true);
    assert.deepEqual(errors,[]); assert.deepEqual(failures,[]);
    console.log('PASS: 3D, themes, 3 readers, resume, contacts, archive keyboard, four viewport sizes, bookmarks and WebGL fallback.');
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode=1;});
