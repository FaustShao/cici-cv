// Routing-only regression: the 3D render itself is tested in bruno-preview.cjs.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = process.env.PREVIEW_ROOT || "http://127.0.0.1:8000/";
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.route("**/island-scene.js*", (r) =>
      r.fulfill({ contentType: "text/javascript", body: "" }),
    );
    await page.route("**/bruno-preview/assets/*.js", (r) =>
      r.fulfill({ contentType: "text/javascript", body: "" }),
    );
    await page.goto(new URL("index.html", root).href);
    await page.waitForFunction(() => window.openIslandPlace);
    assert.equal(await page.evaluate(() => ISLAND_STATE.place), "home");
    await page.evaluate(() => openIslandPlace("resume"));
    assert.equal(await page.evaluate(() => ISLAND_STATE.place), "resume");
    await page.evaluate(() => openIslandPlace("contact"));
    assert.equal(await page.evaluate(() => ISLAND_STATE.place), "contact");
    await page.evaluate(() =>
      document
        .querySelector('#accessible-nav [data-place="portfolio"]')
        .click(),
    );
    await page.waitForURL(new URL("bruno-preview/", root).href);
    await page.goto(new URL("index.html#portfolio", root).href);
    await page.waitForURL(new URL("bruno-preview/", root).href);
    await page.goto(new URL("portfolio.html", root).href);
    await page.waitForURL(new URL("bruno-preview/", root).href);
    await page.locator("#back-site").click();
    await page.waitForURL(new URL("index.html", root).href);
    await page.waitForFunction(() => window.openIslandPlace);
    assert.equal(await page.evaluate(() => ISLAND_STATE.place), "home");
    console.log(
      "PASS: homepage portfolio navigation, legacy hash, portfolio.html alias, return home, resume/contact unchanged.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
