// Regression for anvil callbacks at animation cycle boundaries. Test the actual
// built adapter: importing ProjectsArea alone would miss its skipped setup.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = process.env.PREVIEW_ROOT || "http://127.0.0.1:8000/";
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
    // Cover explicit WebGL and the normal automatic renderer selection.
    for (const search of ["?webgl=1", ""]) {
      const page = await browser.newPage({
        viewport: { width: 800, height: 600 },
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto(new URL("bruno-preview/" + search, root).href);
      await page.waitForFunction(
        () => document.body.dataset.ready || document.body.dataset.failed,
        null,
        { timeout: 60000 },
      );
      assert.equal(
        await page.locator("body").getAttribute("data-failed"),
        null,
      );
      // Cross four complete cycles deterministically, regardless of the test
      // machine's frame rate or the page's capped animation delta.
      const result = await page.evaluate(() => {
        const { area, game } = preview;
        const elapsed = game.ticker.elapsedScaled;
        let beforeFix = false;
        try {
          game.ticker.elapsedScaled =
            (Math.PI - Math.PI / 4 - 0.001) / area.anvil.frequency;
          area.update();
          game.ticker.elapsedScaled += 0.002 / area.anvil.frequency;
          area.update();
        } catch (error) {
          beforeFix = error.message;
        }
        if (beforeFix) throw new Error("Anvil cycle crashed: " + beforeFix);
        const sound = area.sounds.anvil;
        const originalPlay = sound.play;
        let strikes = 0;
        sound.play = () => {
          strikes++;
        };
        try {
          for (let cycle = 1; cycle <= 4; cycle++) {
            game.ticker.elapsedScaled =
              (cycle * Math.PI - Math.PI / 4 - 0.001) / area.anvil.frequency;
            area.update();
            game.ticker.elapsedScaled += 0.002 / area.anvil.frequency;
            area.update();
          }
        } finally {
          sound.play = originalPlay;
          game.ticker.elapsedScaled = elapsed;
          area.anvil.loopTime =
            ((elapsed * area.anvil.frequency + Math.PI / 4) / Math.PI) % 1;
        }
        return { strikes, elapsed };
      });
      assert.equal(result.strikes, 4);
      await page.waitForFunction(
        (previous) =>
          preview.game.ticker.elapsedScaled > previous + 0.1 ||
          document.body.dataset.failed,
        result.elapsed,
      );
      assert.equal(
        await page.locator("body").getAttribute("data-failed"),
        null,
      );
      assert.equal(await page.locator("#fallback").isVisible(), false);
      await page.locator("#next").click();
      assert.equal(await page.locator("#selection").innerText(), "02 / 03");
      await page.locator("#open-work").evaluate((element) => element.click());
      assert.equal(
        await page.locator("#reader").evaluate((element) => element.open),
        true,
      );
      await page.locator("#close-reader").click();
      assert.equal(
        await page.locator("#reader").evaluate((element) => element.open),
        false,
      );
      assert.deepEqual(errors, []);
      console.log(
        "PASS: four anvil strikes, continued rendering, project navigation and reader",
        search || "automatic renderer",
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
