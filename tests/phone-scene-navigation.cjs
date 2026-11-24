const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.env.PREVIEW_ROOT || 'http://127.0.0.1:8770/cici-cv/';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
    });
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('index.html?webgl=1', root).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.designWorld && document.body.dataset.ready, null, {timeout: 150000});
    const canvas = page.locator('#world');
    const map = page.locator('#map-trigger');
    const reader = page.locator('#reader');
    async function place(name) {
      await page.waitForFunction(key => document.body.dataset.place === key, name);
      const frames = await page.evaluate(() => designWorld.world.renderCount);
      await page.waitForFunction(n => designWorld.world.renderCount > n, frames);
    }
    async function visit(name) {
      await map.tap();
      await page.locator('.map-location[data-destination="' + name + '"]').tap();
      await place(name);
    }
    async function point(name) {
      return page.evaluate(name => {
        const w = designWorld;
        const mesh = name === 'lab-cover' ? w.stations.get('other').root.children.find(m => m.name.startsWith('refImages')) :
          name === 'portfolio-cover' ? w.portfolio.area.images.mesh : w.world.scene.getObjectByName(name);
        mesh.geometry.computeBoundingBox();
        const v = mesh.geometry.boundingBox.getCenter(mesh.position.clone());
        mesh.localToWorld(v).project(w.world.camera);
        return {x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2};
      }, name);
    }
    async function tapModel(name) {
      const at = await point(name);
      const bounds = await canvas.boundingBox();
      assert.ok(at.x > 0 && at.x < bounds.width && at.y > 0 && at.y < bounds.height, name);
      assert.equal(await page.evaluate(p => document.elementFromPoint(p.x, p.y).id, at), 'world', name);
      await page.touchscreen.tap(at.x, at.y);
    }
    async function file(name) {
      await reader.waitFor({state:'visible'});
      await page.waitForFunction(name => document.querySelector('#frames iframe')?.contentWindow.location.pathname.endsWith('/' + name), name);
      assert.equal(await reader.locator('iframe').count(), 1);
    }

    await tapModel('physicalFixed003');
    await page.locator('#world-map[open]').waitFor();
    await page.evaluate(() => history.back());
    await page.locator('#world-map').waitFor({state:'hidden'});
    console.log('PASS kiosk and phone Back');
    await visit('resume');
    await tapModel('actual-resume-first-page');
    await file('resume.html');
    await page.evaluate(() => history.back());
    await reader.waitFor({state:'hidden'});
    await place('resume');
    await page.evaluate(() => history.forward());
    await file('resume.html');
    await page.locator('#close-reader').tap();
    await page.waitForFunction(() => !history.state?.overlay);
    console.log('Checking other-project stand');
    await visit('other');
    await page.locator('#lab-next').tap();
    const selection = await page.evaluate(() => WORLD_STATE.otherIndex);
    await tapModel('lab-cover');
    await file('cardinal.html');
    await page.evaluate(() => history.back());
    await reader.waitFor({state:'hidden'});
    await place('other');
    assert.equal(await page.evaluate(() => WORLD_STATE.otherIndex), selection);

    console.log('Checking portfolio model and reader');
    await visit('portfolio');
    // Lift one finger and move the remaining one slightly. Its previous position
    // must belong to that same finger, and no part of the pinch may open a reader.
    const start = await page.evaluate(() => designWorld.viewState());
    const touch = await page.context().newCDPSession(page);
    const dispatch = (type, touchPoints) => touch.send('Input.dispatchTouchEvent', {type, touchPoints});
    const left = {x: 120, y: 405, id: 1}, right = {x: 240, y: 405, id: 2};
    await dispatch('touchStart', [left]);
    await dispatch('touchStart', [left, right]);
    await dispatch('touchMove', [{...left, x: 90}, {...right, x: 270}]);
    await dispatch('touchEnd', [{...left, x: 90}]);
    await dispatch('touchMove', [{...right, x: 273}]);
    await dispatch('touchEnd', []);
    await place('portfolio');
    const end = await page.evaluate(() => designWorld.viewState());
    assert.ok(end.distance < start.distance);
    assert.ok(Math.abs(end.yaw - start.yaw) < .08);
    assert.ok(!await reader.isVisible());
    await page.locator('#next').tap();
    await tapModel('portfolio-cover');
    await file('safepaw.html');
    await page.locator('#close-reader').tap();
    await page.waitForFunction(() => !history.state?.overlay);
    assert.equal(await page.evaluate(() => designWorld.portfolio.selected), 1);
    await page.locator('#previous').tap();
    await page.locator('#open-work').tap();
    await file('tideline.html');
    const frame = page.frameLocator('#frames iframe');
    await frame.locator('.mobile-nav a[href="#research"]').tap();
    await frame.locator('#project-back').tap();
    await file('tideline.html');
    await frame.locator('#project-back').tap();
    await reader.waitFor({state:'hidden'});
    await place('portfolio');

    await page.setViewportSize({ width: 844, height: 390 });
    await visit('contact');
    assert.equal(await page.locator('#place-actions a[href^="mailto:"]').count(), 1);
    console.log('Checking other-project stand');
    await visit('other');
    const before = await page.evaluate(() => WORLD_STATE.otherIndex);
    await page.locator('#lab-next').tap();
    assert.notEqual(await page.evaluate(() => WORLD_STATE.otherIndex), before);
    await tapModel('lab-cover');
    await file('haha-world.html');
    assert.equal(await reader.locator('iframe').count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS phone model taps, map, four stations, reader history, Tideline internal return, rotation and project selection');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
