const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.env.PREVIEW_ROOT || 'http://127.0.0.1:4188/cici-cv/';
const entries = {
  home: ['Overview', 1123],
  products: ['Products', 1353],
  files: ['File library', 883],
  calendar: ['Schedules', 1715],
  market: ['Material market', 2800],
  profile: ['Settings', 1890],
  inbox: ['Inbox', 2384],
  comments: ['Comments', 2600],
};
const names = [
  'Overview',
  'Products',
  'File library',
  'Schedules',
  'Material market',
  'Statement',
  'Settings',
  'Inbox',
  'Notifications',
  'Comments',
];
const action = (page, id) => page.locator('[data-action="' + id + '"]:visible').first();
async function current(page, key) {
  const stage = page.locator('#stage');
  assert.equal(await stage.getAttribute('data-screen'), key);
  if (entries[key]) assert.equal(await stage.getAttribute('data-figma'), '1:' + entries[key][1]);
  const art = stage.locator('.slice > .design-art[data-ready="' + key + '"] > svg').first();
  await art.waitFor();
  assert.ok(await art.locator('[data-component]').count() >= 1);
  assert.ok(await stage.locator('.slice > .design-art [data-layer]').count() > 3);
  assert.equal(await stage.locator('img.scene-art, .hot').count(), 0);
}
async function checkControlShape(page) {
  const control = page.locator('#stage [data-layer="0:2359"][data-action="new-event"]');
  await control.scrollIntoViewIfNeeded();
  // The corner and adjacent banner share the visual background. Neither
  // belongs to the rounded New Schedule button, including after zooming.
  const hits = await control.evaluate((group) => {
    const path = group.querySelector('path');
    const rect = path.getBBox();
    const matrix = path.getScreenCTM();
    return [[0.5, 0.5], [0.002, 0.002], [-0.04, 0.5]].map(([u, v]) => {
      const point = new DOMPoint(rect.x + u * rect.width, rect.y + v * rect.height).matrixTransform(matrix);
      return document.elementFromPoint(point.x, point.y)?.closest('[data-action]')?.dataset.action || null;
    });
  });
  assert.deepEqual(hits, ['new-event', null, null]);
  await control.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#popup-title').innerText(), 'New Schedule');
  await action(page, 'close').click();
}

async function nav(page, mobile) {
  if (mobile) await action(page, 'navigate').click();
  return page.locator(mobile ? '#popup .original-nav' : '#stage .original-nav');
}
async function active(nav, key) {
  const link = nav.locator('.nav-link[aria-current="page"]');
  assert.equal(await link.count(), 1);
  assert.equal(await link.getAttribute('data-action'), key);
  assert.equal(await link.evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(108, 93, 211)');
}
async function matrix(page, mobile) {
  const close = () => action(page, 'close').click();
  for (const source of Object.keys(entries)) {
    const initial = await nav(page, mobile);
    await initial.locator('[data-action="' + source + '"].nav-link').click();
    await current(page, source);
    for (const [target, [label]] of Object.entries(entries)) {
      const menu = await nav(page, mobile);
      await active(menu, source);
      assert.deepEqual(
        await menu.locator('.nav-link').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label'))),
        names,
      );
      assert.equal(await menu.getByRole('button', { name: 'Statement', exact: true }).isDisabled(), true);
      await menu.getByRole('button', { name: label, exact: true }).click();
      await current(page, target);
      const destination = await nav(page, mobile);
      await active(destination, target);
      if (mobile) await close();
      if (source !== target) {
        await action(page, 'back').click();
        await current(page, source);
      }
    }
    const menu = await nav(page, mobile);
    await menu.getByRole('button', { name: 'Notifications', exact: true }).click();
    const overlay = page.locator('#popup[open]');
    assert.equal(await overlay.getAttribute('data-kind'), 'notifications');
    await overlay.locator('[data-ready=notifications] [data-action]').first().waitFor();
    assert.equal(await page.locator('#crumb').innerText(), 'Notifications');
    if (!mobile) await active(page.locator('#stage nav'), 'notifications');
    await close();
    await current(page, source);
    const restored = await nav(page, mobile);
    await active(restored, source);
    if (mobile) await close();
  }
}
async function check(browser, width) {
  const mobile = width < 741,
    page = await browser.newPage({
      viewport: { width, height: 850 },
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: 'reduce',
    });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(r.url());
  });
  await page.goto(new URL('boomind.html', root).href);
  await current(page, 'home');
  if (width !== 320) await matrix(page, mobile);
  async function navigate(id) {
    const n = await nav(page, mobile);
    await n.locator('.nav-link[data-action="' + id + '"]').click();
  }
  if (width === 1440) {
    await navigate('home');
    for (const [i, target] of [
      'comments',
      'comments',
      'comments',
      'market',
      'inbox',
      'files',
      'comments',
    ].entries()) {
      await page.locator('#stage .nav-link[data-action="notifications"]').click();
      const row = ['0:2709','0:2580','0:2607','0:2634','0:2661','0:2685','0:2736'][i];
      await page.locator('#popup [data-layer="' + row + '"]').click();
      await current(page, target);
      await active(page.locator('#stage nav'), target);
    }
  }
  await navigate('products');
  await page.getByRole('button', { name: 'Check settings', exact: true }).click();
  await current(page, 'profile');
  await navigate('calendar');
  await checkControlShape(page);
  if (!mobile) {
    await action(page, 'zoom').click();
    await checkControlShape(page);
    await action(page, 'zoom').click();
  }
  await action(page, 'event:0').click();
  assert.match(await page.locator('#popup-title').innerText(), /Project 101/);
  await action(page, 'close').click();
  await action(page, 'new-event').click();
  await page.locator('#popup input:not([type=time])').fill('Review');
  await page.locator('#popup button[type=submit]').click();
  await action(page, 'event:4').click();
  assert.match(await page.locator('#popup-title').innerText(), /Review/);
  await action(page, 'close').click();
  await navigate('home');
  await action(page, 'create:Basic mind map').click();
  await page.locator('#popup input').fill('Team meeting');
  await page.locator('#popup button[type=submit]').click();
  await current(page, 'map');
  await page.locator('#extras [data-action=canvas]').click();
  await current(page, 'canvas');
  const idea = page.locator('.bubble').nth(2);
  await idea.scrollIntoViewIfNeeded();
  const box = await idea.boundingBox(),
    point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const prev = await idea.getAttribute('style');
  if (mobile) {
    const c = await page.context().newCDPSession(page);
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await c.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: point.x + 18, y: point.y + 18 }],
    });
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await c.detach();
  } else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 18, point.y + 18, { steps: 3 });
    await page.mouse.up();
  }
  assert.notEqual(await idea.getAttribute('style'), prev);
  if (mobile) await idea.tap();
  else await idea.click();
  await page.locator('#popup input').fill('Concept');
  await page.locator('#popup button[type=submit]').click();
  await action(page, 'connect').click();
  await page.locator('.bubble').nth(2).click();
  await page.locator('.bubble').nth(3).click();
  assert.equal(await page.locator('.edges line').count(), 1);
  await page.locator('#extras [data-action=layers]').click();
  await current(page, 'layers');
  await action(page, 'navigate').click();
  await page.locator('#popup .nav-link[data-action=files]').click();
  await action(page, 'file:1').click();
  await current(page, 'canvas');
  assert.match(await page.locator('.bubble').nth(2).innerText(), /Concept/);
  await action(page, 'navigate').click();
  await action(page.locator('#popup'), 'login').click();
  await current(page, 'login');
  await action(page, 'welcome').click();
  await page.waitForFunction(() => document.querySelector('#stage').dataset.screen === 'home');
  await current(page, 'home');
  await navigate('inbox');
  await action(page, 'thread').click();
  await current(page, 'conversation');
  await page.locator('[aria-label=Message]').fill('Got it');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  assert.match(await page.locator('#extras').innerText(), /Got it/);
  await navigate('profile');
  const input = page.getByLabel('Full name', { exact: true });
  await input.fill('Guest');
  await navigate('home');
  await navigate('profile');
  assert.equal(await input.inputValue(), 'Guest');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.equal(await page.locator('#screen-gallery').count(), 0);
  assert.deepEqual(errors, []);
  await page.close();
  console.log('PASS BOOMIND original frames, navigation and interactions', width);
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    await Promise.all([1440, 390, 320].map((width) => check(browser, width)));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
