// Build experiments/bruno-projects, serve the repo at :8000, then run this file.
// Playwright/Chromium/sharp are local QA dependencies, not shipped to the site.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const sharp = require("sharp");
const root = process.env.PREVIEW_ROOT || "http://127.0.0.1:8000/";
const review = path.resolve(
  __dirname,
  "../experiments/bruno-projects/public/review",
);
(async () => {
  await fs.mkdir(review, { recursive: true });
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
      }),
      errors = [],
      bad = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) bad.push(r.url());
    });
    // The original portfolio URL now leads to the accepted exhibition.
    await page.goto(new URL("portfolio.html?webgl=1", root).href);
    await page.waitForURL("**/bruno-preview/?webgl=1");
    await page.waitForFunction(
      () => document.body.dataset.ready || document.body.dataset.failed,
      null,
      { timeout: 60000 },
    );
    assert.equal(await page.locator("body").getAttribute("data-failed"), null);
    assert.equal(
      await page.evaluate(() => preview.area.images.mesh.name),
      "refImages",
    );
    await page.waitForFunction(() => preview.area.title.status === "visible");
    await page.waitForTimeout(1200);
    assert.equal(await page.locator(".intro h1").innerText(), "精选作品");
    assert.equal(await page.locator("footer a").count(), 0);
    assert.equal(
      await page.evaluate(() =>
        document.fonts.check('400 40px "Cecilia Hand"', "精选作品"),
      ),
      true,
    );
    assert.deepEqual(
      await page.evaluate(
        () => preview.area.attributes.items.role.textCanvas.lines,
      ),
      ["设计研究", "服务设计"],
    );
    assert.deepEqual(
      await page.evaluate(() => preview.area.url.textCanvas.lines),
      ["点击查看完整项目"],
    );
    await sharp(await page.screenshot())
      .webp({ quality: 90 })
      .toFile(path.join(review, "day.webp"));
    await page.locator("#theme").click();
    await page.waitForTimeout(800);
    await sharp(await page.screenshot())
      .webp({ quality: 90 })
      .toFile(path.join(review, "night.webp"));
    await page.locator("#theme").click();
    for (let i = 0; i < 3; i++) {
      if (i) {
        await page.locator("#next").click();
        await page.waitForTimeout(2200);
      }
      assert.equal(
        await page.locator("#selection").innerText(),
        `0${i + 1} / 03`,
      );
      const point = await page.evaluate(() => {
        const mesh = preview.area.images.mesh;
        mesh.geometry.computeBoundingBox();
        const p = mesh.geometry.boundingBox.getCenter(
          mesh.position.clone().set(0, 0, 0),
        );
        mesh.localToWorld(p);
        p.project(preview.game.view.camera);
        return {
          x: ((p.x + 1) * innerWidth) / 2,
          y: ((1 - p.y) * innerHeight) / 2,
        };
      });
      await page.mouse.move(point.x, point.y);
      assert.equal(
        await page.locator("canvas").getAttribute("data-hover"),
        "true",
      );
      await page.mouse.click(point.x, point.y);
      await page.waitForFunction(() => document.getElementById("reader").open);
      const frame = page.locator("iframe:visible"),
        file = ["tideline.html", "gazette.html", "dream-sentinel.html"][i];
      assert.equal(await frame.getAttribute("src"), new URL(file, root).href);
      await page.waitForFunction(() => {
        const frame = [...document.querySelectorAll("iframe")].find(
          (f) => !f.hidden,
        );
        return frame?.contentDocument?.readyState === "complete";
      });
      const frozen = await page.evaluate(
        () => preview.game.ticker.elapsedScaled,
      );
      await page.waitForTimeout(120);
      assert.equal(
        await page.evaluate(() => preview.game.ticker.elapsedScaled),
        frozen,
      );
      await page.locator("#close-reader").click();
      assert.equal(
        await page.locator("#selection").innerText(),
        `0${i + 1} / 03`,
      );
      console.log("PASS direct model reading:", file);
    }
    // Test the original model's right arrow, not just the HTML fallback controls.
    const arrow = await page.evaluate(() => {
      const p = preview.area.adjacents.next.intersect.shape.center
        .clone()
        .project(preview.game.view.camera);
      return {
        x: ((p.x + 1) * innerWidth) / 2,
        y: ((1 - p.y) * innerHeight) / 2,
      };
    });
    await page.mouse.click(arrow.x, arrow.y);
    await page.waitForFunction(() => preview.area.navigation.index === 0);
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#selection").innerText(), "02 / 03");
    await page.locator("#quality").click();
    assert.equal(
      await page.locator("#quality").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("#overview").click();
    await page.waitForTimeout(350);
    await page.locator("#overview").click();
    assert.deepEqual(errors, []);
    assert.deepEqual(bad, []);
    await page.close();
    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await phone.goto(new URL("bruno-preview/?webgl=1", root).href);
    await phone.waitForFunction(() => document.body.dataset.ready, null, {
      timeout: 60000,
    });
    await phone.waitForTimeout(1300);
    assert.equal(
      await phone.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    await sharp(await phone.screenshot())
      .webp({ quality: 90 })
      .toFile(path.join(review, "mobile.webp"));
    const cdp = await phone.context().newCDPSession(phone);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: 130, y: 420 },
        { x: 240, y: 420 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 100, y: 420 },
        { x: 270, y: 420 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.equal(await phone.locator("#reader").evaluate((e) => e.open), false);
    await phone.locator("#next").click();
    assert.equal(await phone.locator("#selection").innerText(), "02 / 03");
    await phone.close();
    const failed = await browser.newPage();
    await failed.route("**/bruno/areas/areas.glb", (r) => r.abort());
    await failed.goto(new URL("bruno-preview/?webgl=1", root).href);
    await failed.waitForFunction(() => document.body.dataset.failed, null, {
      timeout: 60000,
    });
    assert.equal(await failed.locator("#fallback a").count(), 3);
    console.log(
      "PASS: original arrow, keyboard, quality, reading pause, 390px touch/pinch, asset failure fallback, no page errors or 404.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
