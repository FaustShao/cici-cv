const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8770/cici-cv/';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1440,height:950},reducedMotion:'reduce'});
 // Keep the actual published scene markup/CSS. Only omit the unrelated scene renderer bootstrap.
 await page.route(new URL('index.html?overlay-audit',root).href,async route=>{const response=await route.fetch();const body=(await response.text()).replace(/<script[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'');await route.fulfill({response,body});});
 await page.goto(new URL('index.html?overlay-audit',root).href);
 await page.evaluate(url=>{const reader=document.getElementById('reader');reader.dataset.project='sonicsense';reader.showModal();const frame=document.createElement('iframe');frame.src=url;document.getElementById('frames').append(frame)},new URL('cecilia-world/sonicsense.html',root).href);
 const frame=await(await page.locator('#frames iframe').elementHandle()).contentFrame();await frame.waitForFunction(()=>window.SONIC_FILM&&document.body.dataset.ready&&!document.documentElement.dataset.releaseState);
 assert.equal(await page.locator('#reader .reader-bar').isVisible(),true);
 await frame.evaluate(()=>SONIC_FILM.openViewer(26));await frame.waitForFunction(()=>document.getElementById('full-page').complete&&document.getElementById('full-page').naturalWidth>0);
 assert.equal(await page.locator('#reader .reader-bar').isVisible(),false,'Scene return does not overlap the full-screen image');
 assert.equal(await frame.locator('#zoom-page').count(),0);
 const size=await frame.locator('#page-viewer').boundingBox();assert.equal(size.height,950);assert.equal(size.width,1440);
 await page.screenshot({path:'/tmp/sonicsense-borderless-embedded.png'});
 await frame.locator('#close-page').click();await page.waitForFunction(()=>document.getElementById('reader').dataset.imageOpen==='false');
 assert.equal(await page.locator('#reader .reader-bar').isVisible(),true,'Scene return is restored after closing the image');
 console.log('PASS published parent/iframe: edge-to-edge reader, no duplicate return overlay or detail zoom, floating controls, clean restore.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
