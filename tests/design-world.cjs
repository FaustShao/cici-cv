const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const sharp = require("sharp");
const path = require("node:path");
const root = process.env.PREVIEW_ROOT || "http://127.0.0.1:8000/";
const review = path.resolve(
  __dirname,
  "../experiments/bruno-projects/public/review",
);
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const errors = [],
      bad = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 400) bad.push(r.url());
    });
    await page.goto(new URL("index.html?webgl=1", root).href);
    await page.waitForURL("**/bruno-preview/hub.html?webgl=1");
    await page.waitForFunction(
      () => document.body.dataset.ready || document.body.dataset.failed,
      null,
      { timeout: 90000 },
    );
    assert.equal(await page.locator("body").getAttribute("data-failed"), null);
    assert.equal(await page.evaluate(() => designWorld.stations.size), 4);
    assert.equal(await page.evaluate(() => WORLD_STATE.place), "home");
    async function shot(name) {
      await page.waitForTimeout(500);
      await sharp(await page.screenshot())
        .webp({ quality: 90 })
        .toFile(path.join(review, name + ".webp"));
    }
    async function clickStation(key) {
      const point = await page.evaluate((key) => {
        const { world, stations, pick } = designWorld;
        const candidates = [];
        stations.get(key).root.traverse((m) => {
          if (!m.isMesh || !m.visible) return;
          m.geometry.computeBoundingBox();
          const p = m.geometry.boundingBox.getCenter(
            m.position.clone().set(0, 0, 0),
          );
          m.localToWorld(p);
          p.project(world.camera);
          candidates.push({
            x: ((p.x + 1) * innerWidth) / 2,
            y: ((1 - p.y) * innerHeight) / 2,
          });
        });
        for (const point of candidates)
          for (const dx of [0, -12, 12])
            for (const dy of [0, -12, 12]) {
              const x = point.x + dx,
                y = point.y + dy;
              if (
                x > 0 &&
                x < innerWidth &&
                y > 70 &&
                y < innerHeight - 140 &&
                pick(x, y) === key
              )
                return { x, y };
            }
        return null;
      }, key);
      assert.ok(point, "Visible clickable model for " + key);
      await page.mouse.move(point.x, point.y);
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(500);
    }
    await shot("home");
    await page.locator("#theme").click();
    await shot("home-night");
    await page.locator("#theme").click();
    await clickStation("resume");
    assert.equal(await page.evaluate(() => WORLD_STATE.place), "resume");
    await shot("resume-station");
    await clickStation("resume");
    assert.equal(await page.locator("#reader").evaluate((e) => e.open), true);
    const frame = page.frameLocator("#frames iframe:visible");
    await frame.locator("#name").waitFor();
    assert.equal(await frame.locator("#name").innerText(), "王钰欣");
    assert.equal(await frame.locator("#print").count(), 1);
    assert.equal(await frame.locator("#education .education").count(), 2);
    await shot("resume-reading");
    await page.locator("#close-reader").click();
    await page.evaluate(() => openWorldPlace("other"));
    await shot("other-station");
    assert.equal(await page.locator("#other-position").innerText(), "1 / 2");
    await clickStation("other");
    assert.match(await page.locator(".details-sheet h3").innerText(), /TASA/);
    await page.locator("#close-reader").click();
    await page.getByRole("button", { name: "下一个项目" }).click();
    assert.equal(await page.locator("#other-position").innerText(), "2 / 2");
    await clickStation("other");
    assert.match(
      await page.locator(".details-sheet h3").innerText(),
      /Cardinal/,
    );
    await page.locator("#close-reader").click();
    await page.evaluate(() => openWorldPlace("contact"));
    await shot("contact-station");
    assert.equal(
      await page
        .locator('#place-actions a[href^="mailto:"]')
        .getAttribute("href"),
      "mailto:wangyuxinqd2025@163.com",
    );
    assert.equal(
      await page.locator('#place-actions a[href^="tel:"]').getAttribute("href"),
      "tel:15066290491",
    );
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "复制微信号" }).click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      "Cecilia_cici68",
    );
    await page.locator("#back-home").click();
    assert.equal(await page.evaluate(() => WORLD_STATE.place), "home");
    assert.equal(await page.locator("body").getAttribute("data-failed"), null);
    assert.deepEqual(errors, []);
    assert.deepEqual(bad, []);
    await page.close();
    const paper = await browser.newPage();
    await paper.goto(new URL("resume.html?document=1", root).href);
    await paper.locator("#name").waitFor();
    await paper.emulateMedia({ media: "print" });
    assert.equal(
      await paper
        .locator(".topbar")
        .evaluate((e) => getComputedStyle(e).display),
      "none",
    );
    assert.ok(
      (await paper.pdf({ format: "A4", printBackground: true })).length > 10000,
    );
    await paper.close();
    const live = await browser.newPage({
      viewport: { width: 800, height: 600 },
      reducedMotion: "no-preference",
    });
    await live.goto(
      new URL("bruno-preview/hub.html?webgl=1#resume", root).href,
    );
    await live.waitForFunction(
      () => document.body.dataset.ready || document.body.dataset.failed,
      null,
      { timeout: 90000 },
    );
    assert.equal(await live.locator("body").getAttribute("data-failed"), null);
    await live.waitForFunction(
      () => designWorld.world.game.ticker.elapsedScaled > 0.1,
    );
    await live.getByRole("button", { name: "阅读完整简历 ↗" }).click();
    const frozen = await live.evaluate(
      () => designWorld.world.game.ticker.elapsedScaled,
    );
    await live.waitForTimeout(200);
    assert.equal(
      await live.evaluate(() => designWorld.world.game.ticker.elapsedScaled),
      frozen,
    );
    await live.locator("#close-reader").click();
    await live.waitForFunction(
      (previous) =>
        designWorld.world.game.ticker.elapsedScaled > previous ||
        document.body.dataset.failed,
      frozen,
    );
    assert.equal(await live.locator("body").getAttribute("data-failed"), null);
    await live.close();
    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await phone.goto(new URL("bruno-preview/hub.html?webgl=1", root).href);
    await phone.waitForFunction(
      () => document.body.dataset.ready || document.body.dataset.failed,
      null,
      { timeout: 90000 },
    );
    assert.equal(await phone.locator("body").getAttribute("data-failed"), null);
    assert.equal(
      await phone.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    assert.ok(
      await phone
        .locator(".keyboard-nav")
        .evaluate((e) => e.getBoundingClientRect().bottom < 0),
    );
    await sharp(await phone.screenshot())
      .webp({ quality: 90 })
      .toFile(path.join(review, "home-mobile.webp"));
    const cdp = await phone.context().newCDPSession(phone);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: 120, y: 400 },
        { x: 250, y: 400 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 100, y: 400 },
        { x: 270, y: 400 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.equal(await phone.locator("#reader").evaluate((e) => e.open), false);
    assert.equal(await phone.evaluate(() => WORLD_STATE.place), "home");
    await phone.evaluate(() => openWorldPlace("resume"));
    await phone.getByRole("button", { name: "阅读完整简历 ↗" }).click();
    await phone.frameLocator("iframe").locator("#name").waitFor();
    await phone.locator("#close-reader").click();
    await phone.close();
    console.log(
      "PASS: model navigation, resume reading and PDF, render pause/resume, two projects, contacts, day/night, mobile/pinch, no errors or 404.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
