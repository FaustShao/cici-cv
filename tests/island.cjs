// Start a static server at :8000, then run node tests/island.cjs.
// Playwright is development-only; no browser/test packages ship to the site.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const root = process.env.ISLAND_URL || "http://127.0.0.1:8000/";
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      }),
      errors = [],
      failures = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error("Browser error:", error.message);
    });
    page.on("response", (r) => {
      if (r.status() >= 400) failures.push(r.url());
    });
    await page.goto(root);
    await page.waitForFunction(() =>
      document.body.classList.contains("scene-ready"),
    );
    assert.match(
      await page.locator("#home-name").innerText(),
      /Cecilia.*王钰欣.*YUXIN WANG/,
    );
    assert.equal(await page.locator(".place-label").count(), 0);
    assert.equal(await page.locator("header nav").count(), 0);
    assert.match(
      await page.locator("canvas").evaluate((e) => getComputedStyle(e).cursor),
      /cursor-arrow/,
    );
    // The actual raycast, not just a navigation handler.
    async function clickModel(type, value) {
      await page.waitForFunction(
        () =>
          document.getElementById("scene-canvas").dataset.transitioning ===
          "false",
      );
      const model = page.locator(
        `.model-hotspot[data-action="${type}"]${value == null ? "" : `[data-value="${value}"]`}`,
      );
      const bounds = await model.boundingBox();
      assert.ok(bounds);
      await page.mouse.move(
        bounds.x + bounds.width / 2 + 2,
        bounds.y + bounds.height / 2 + 2,
      );
      console.log(
        "Raycast",
        type,
        value,
        await page.locator("#scene-tooltip").textContent(),
      );
      await page.mouse.click(
        bounds.x + bounds.width / 2 + 2,
        bounds.y + bounds.height / 2 + 2,
      );
    }
    await page.waitForTimeout(800);
    await clickModel("place", "portfolio");
    await page.waitForFunction(
      () => document.body.dataset.place === "portfolio",
    );
    await page.waitForTimeout(1000);
    for (let i = 0; i < 3; i++) {
      console.log("Checking model cover", i);
      if (i) {
        await page.locator("#archive-next").click();
        await page.waitForTimeout(1100);
      }
      assert.equal(
        await page.locator("#archive-position").innerText(),
        `0${i + 1}`,
      );
      await clickModel("project", i);
      await page.waitForFunction(
        () => document.getElementById("project-reader").open,
      );
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("iframe")].find((f) => !f.hidden)
            ?.dataset.loaded === "true",
      );
      assert.match(
        await page.locator("#reader-title").innerText(),
        [/海藻茶/, /Gazette/, /SENTINEL/][i],
      );
      assert.match(
        await page
          .locator("#project-reader")
          .evaluate((e) => getComputedStyle(e).cursor),
        /auto/,
      );
      await page.locator("#reader-back").click();
      assert.equal(
        await page.locator("#archive-position").innerText(),
        `0${i + 1}`,
      );
    }
    await page.mouse.move(800, 430);
    await page.mouse.down();
    await page.mouse.move(630, 435, { steps: 5 });
    assert.equal(
      await page.locator("canvas").getAttribute("data-cursor"),
      "drag",
    );
    await page.mouse.up();
    assert.equal(await page.locator("#archive-position").innerText(), "01");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#archive-position").innerText(), "02");
    await page.locator("#back-island").click();
    await page.evaluate(() => openIslandPlace("resume"));
    await page.waitForTimeout(800);
    await clickModel("resume");
    await page.waitForFunction(
      () => document.getElementById("project-reader").open,
    );
    assert.match(await page.locator("#reader-title").innerText(), /简历/);
    await page.keyboard.press("Escape");
    await page.evaluate(() => openIslandPlace("other"));
    await page.waitForTimeout(800);
    await clickModel("note", 1);
    await page.waitForFunction(
      () => !document.getElementById("workshop-note").hidden,
    );
    assert.match(await page.locator("#note-title").innerText(), /Cardinal/);
    await page.locator("#close-note").click();
    await page.evaluate(() => openIslandPlace("contact"));
    await page.locator("#copy-wechat").click();
    await page.waitForFunction(() =>
      document
        .getElementById("contact-feedback")
        .textContent.includes("Cecilia_cici68"),
    );
    assert.equal(
      await page.locator("#contact-controls a").first().getAttribute("href"),
      "mailto:wangyuxinqd2025@163.com",
    );
    await page.locator("#island-theme").click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.reload();
    await page.waitForFunction(() =>
      document.body.classList.contains("scene-ready"),
    );
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.goto(new URL("portfolio.html", root).href);
    await page.waitForURL("**/index.html#portfolio");
    for (const width of [320, 390, 768, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(root);
      await page.waitForFunction(() =>
        document.body.classList.contains("scene-ready"),
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
      );
      await page.evaluate(() => openIslandPlace("portfolio"));
      await page.waitForTimeout(850);
      await clickModel("project", 0);
      await page.waitForFunction(
        () => document.getElementById("project-reader").open,
      );
      await page.locator("#reader-back").click();
    }
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.startsWith("webgl")
          ? null
          : original.call(this, type, ...args);
      };
    });
    await fallback.goto(root);
    await fallback.waitForFunction(() =>
      document.body.classList.contains("fallback-mode"),
    );
    await fallback.locator("#scene-fallback [data-place=portfolio]").click();
    await fallback.locator("#fallback-content button").first().click();
    assert.equal(
      await fallback.locator("#project-reader").evaluate((e) => e.open),
      true,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    console.log(
      "PASS: model raycasts, direct cover reading, drag flip, keyboard, resume book, workshop, contacts, theme persistence, 4 viewport sizes and WebGL fallback.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
