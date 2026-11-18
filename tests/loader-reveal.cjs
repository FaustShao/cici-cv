const assert=require('node:assert/strict'),{chromium}=require('playwright'),path=require('node:path');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('click-sounds.html',root).href);await page.addScriptTag({url:new URL('site-loader.js',root).href});await page.addStyleTag({url:new URL('site-loader.css',root).href});
 // An immediate completion must be synchronous; even the indicator timer is cancelled.
 await page.evaluate(()=>{const el=document.createElement('div');el.id='fast';document.body.append(el);CeciliaLoader.create(el).finish();});
 assert.equal(await page.locator('#fast').evaluate(e=>e.hidden),true);assert.equal(await page.locator('#fast').getAttribute('data-shown'),'false');
 await page.waitForTimeout(500);assert.equal(await page.locator('#fast').evaluate(e=>e.hidden),true);
 // Hold a real image request, then release it after the delayed indicator appears.
 let pending;const requestReady=new Promise(resolve=>pending=resolve);
 await page.route('**/test-slow-image.svg',route=>pending(route));
 await page.evaluate(url=>{const img=new Image();img.src=url;document.body.append(img);const el=document.createElement('div');el.id='slow';document.body.append(el);CeciliaLoader.watchImages(el,[img]);},new URL('test-slow-image.svg',root).href);
 const request=await requestReady;await page.locator('#slow').waitFor({state:'visible'});assert.equal(await page.locator('#slow').getAttribute('aria-valuenow'),'0');
 await request.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><path fill="#ff903f" d="M0 0h50v50H0z"/></svg>'});
 await page.waitForFunction(()=>document.getElementById('slow').classList.contains('is-opening'));
 assert.equal(await page.locator('#slow').getAttribute('aria-valuenow'),'100');
 await page.waitForTimeout(320);await page.screenshot({path:path.join(__dirname,'../experiments/bruno-projects/public/review/loading-curtain.png')});
 assert.equal(await page.locator('#slow').evaluate(e=>e.hidden),false);
 await page.waitForFunction(()=>document.getElementById('slow').hidden);assert.equal(await page.locator('#slow').getAttribute('data-transition'),'revealed');
 // Already-decoded images must not produce a completion animation.
 await page.evaluate(async()=>{const image=document.querySelector('img[src*="test-slow-image"]');await image.decode();const el=document.createElement('div');el.id='cached';document.body.append(el);await CeciliaLoader.watchImages(el,[image]).ready;});
 assert.equal(await page.locator('#cached').evaluate(e=>e.hidden),true);assert.equal(await page.locator('#cached').getAttribute('data-shown'),'false');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{const el=document.createElement('div');el.id='reduced';document.body.append(el);window.reducedLoader=CeciliaLoader.create(el);});await page.locator('#reduced').waitFor({state:'visible'});await page.evaluate(()=>reducedLoader.finish());assert.equal(await page.locator('#reduced').evaluate(e=>e.hidden),true);
 assert.deepEqual(errors,[]);console.log('PASS immediate and cached loads skip presentation; genuinely pending image gets delayed loader and 700ms curtain reveal; reduced motion completes immediately.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
