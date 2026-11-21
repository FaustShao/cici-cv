const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.PREVIEW_ROOT || 'http://127.0.0.1:8770/cici-cv/';
(async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for (const viewport of [{width:1200,height:650},{width:390,height:700}]) {
      const page = await browser.newPage({viewport,reducedMotion:'reduce'});
      await page.goto(new URL('tideline.html',base).href);
      await page.waitForFunction(()=>document.documentElement.dataset.pageBoot==='ready'&&!document.documentElement.dataset.releaseState);
      for (const route of ['home','research','diary','teas','merch','service','packaging','material']) {
        await page.evaluate(route=>{location.hash=route},route);
        await page.waitForFunction(route=>document.querySelector('.canvas-shell')&&location.hash==='#'+route&&(!['home','research','diary','teas','merch','service'].includes(route)||document.querySelector(`.mobile-nav a[href="#${route}"][aria-current="page"]`)),route);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.evaluate(()=>window.scrollTo({top:Math.min(900,document.documentElement.scrollHeight),behavior:'instant'}));
        const button=page.locator('#project-top');
        assert.equal(await button.count(),1);
        const bounds=await button.boundingBox();
        assert.ok(bounds.x>viewport.width/2&&bounds.y>viewport.height/2&&bounds.x+bounds.width<=viewport.width&&bounds.y+bounds.height<=viewport.height);
        await button.click();
        await page.waitForFunction(()=>window.scrollY===0);
        assert.equal(new URL(page.url()).hash,'#'+route,'Scroll control keeps the current page');
      }
      if(viewport.width===390)await page.screenshot({path:'/tmp/tideline-top-mobile.png'});
      // Verify that the control is keyboard operable as well.
      await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));
      await page.locator('#project-top').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>window.scrollY===0);
      await page.close();
    }
    console.log('PASS Tideline: all 8 pages keep one fixed bottom-right top arrow, correct scrolling and keyboard control on desktop/mobile.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
