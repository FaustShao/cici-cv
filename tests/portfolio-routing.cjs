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
    await page.route("**/bruno-preview/assets/*.js", (r) =>
      r.fulfill({ contentType: "text/javascript", body: "" }),
    );
    await page.goto(new URL("index.html", root).href);
    await page.waitForURL(new URL("bruno-preview/hub.html", root).href);
    await page.goto(new URL("resume.html", root).href);
    await page.waitForURL(new URL("bruno-preview/hub.html#resume", root).href);
    await page.goto(new URL("works.html", root).href);
    await page.waitForURL(new URL("bruno-preview/hub.html#other", root).href);
    await page.goto(new URL("index.html#contact", root).href);
    await page.waitForURL(new URL("bruno-preview/hub.html#contact", root).href);
    await page.goto(new URL("index.html#portfolio", root).href);
    await page.waitForURL(new URL("bruno-preview/index.html", root).href);
    await page.goto(new URL("portfolio.html", root).href);
    await page.waitForURL(new URL("bruno-preview/", root).href);
    await page.locator("#back-site").click();
    await page.waitForURL(new URL("bruno-preview/hub.html", root).href);
    console.log(
      "PASS: home, resume, other, contact, legacy portfolio hash, portfolio alias and return to the unified world.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
