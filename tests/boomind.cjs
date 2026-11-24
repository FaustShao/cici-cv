const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.env.PREVIEW_ROOT || 'http://127.0.0.1:4188/cici-cv/';
const widths = [1440, 390, 320];

async function check(browser, width) {
  const mobile = width < 700;
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(response.url());
  });
  const button = (action, scope = page) => scope.locator('[data-action="' + action + '"]');
  const popup = page.locator('#popup');
  async function navigate(id) {
    if (mobile) await button('menu').tap();
    await page
      .locator('#sidebar [data-value="' + id + '"]')
      .first()
      .click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.goto(new URL('boomind.html', root).href);
  await button('about').click();
  assert.equal(await popup.locator('h2').innerText(), '项目说明');
  await button('close').click();
  await button('template').nth(1).click();
  assert.equal(await popup.locator('select').inputValue(), '1');
  await popup.locator('[name=title]').fill('课程讨论');
  await popup.locator('button.accent').click();
  assert.equal(await page.locator('.panel-heading h2').innerText(), '课程讨论');
  const node = page.locator('[data-node="0"]');
  await node.scrollIntoViewIfNeeded();
  const before = await node.evaluate((el) => el.style.left);
  const rect = await node.boundingBox();
  const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  if (mobile) {
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: point.x + 22, y: point.y + 18 }],
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
  } else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 22, point.y + 18, { steps: 4 });
    await page.mouse.up();
  }
  assert.notEqual(await node.evaluate((el) => el.style.left), before);
  assert.equal(await popup.isVisible(), false);
  if (mobile) await node.tap();
  else await node.click();
  await popup.locator('[name=text]').fill('体验设计');
  await popup.locator('button.accent').click();
  await button('add-node').click();
  await popup.locator('[name=text]').fill('访谈记录');
  await popup.locator('button.accent').click();
  await button('link').click();
  await page.locator('[data-node="1"]').click();
  await page.locator('[data-node="2"]').click();
  assert.equal(await page.locator('#map-stage line').count(), 6);
  await page.locator('#layer').selectOption('1');
  assert.equal(await page.locator('.map-node').count(), 1);
  await page.locator('#layer').selectOption('0');
  await page.locator('#progress-level').selectOption('60');
  await button('zoom').last().click();
  assert.equal(await page.locator('#scale').innerText(), '120%');
  await navigate('files');
  const file = page.locator('.file-card').filter({ hasText: '课程讨论' });
  assert.match(await file.innerText(), /6 个节点 · 6 条关联 · 60%/);
  await file.click();
  assert.equal(await node.innerText(), '体验设计');
  await button('back').click();
  assert.equal(await page.locator('#crumb').innerText(), 'File library');
  await navigate('devices');
  await button('product').first().click();
  assert.match(await popup.innerText(), /Project 2250/);
  await popup.locator('[data-value=schedule]').click();
  await button('event').first().click();
  await popup.locator('[data-value=files]').click();
  await navigate('market');
  await button('material').first().click();
  await button('save-material').click();
  await navigate('files');
  assert.equal(await button('material').count(), 1);
  await navigate('inbox');
  await button('thread').click();
  await popup.locator('[name=reply]').fill('已收到');
  await popup.locator('button.accent').click();
  assert.match(await popup.innerText(), /已收到/);
  await button('archive-mail').click();
  await button('mail-tab').last().click();
  assert.equal(await button('thread').count(), 1);
  await navigate('activity');
  await button('comment').first().click();
  await button('close').click();
  await navigate('settings');
  await page.locator('[name=name]').fill('BOO');
  await page.locator('#profile-form .accent').click();
  await button('login').click();
  await button('route', popup).click();
  assert.match(await page.locator('.panel-heading').innerText(), /Hi BOO/);
  await button('search').click();
  await page.locator('#query').fill('课程讨论');
  await button('open-file', popup).click();
  assert.equal(await page.locator('.panel-heading h2').innerText(), '课程讨论');
  await button('screen').first().click();
  for (let i = 0; i < 8; i++) {
    await popup.locator('img').evaluate((el) => el.decode());
    await popup.getByRole('button', { name: '下一张 →' }).click();
  }
  await button('screen-zoom').click();
  assert.ok(await page.locator('.screen-viewport.enlarged').count());
  await popup.locator('.accent').click();
  assert.equal(await page.locator('#crumb').innerText(), 'Overview');
  assert.deepEqual(errors, []);
  console.log('PASS BOOMIND', width);
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const width of widths) await check(browser, width);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
