const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(new URL('cecilia-world/index.html?webgl=1',process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/').href,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.preview&&document.body.dataset.ready,null,{timeout:120000});await p.evaluate(()=>preview.renderer.setAnimationLoop(null));
 async function open(index,file){await p.evaluate(index=>{preview.select(index);preview.readWork()},index);assert.equal(await p.locator('#frames>iframe').count(),1);const f=await(await p.locator('#frames>iframe').elementHandle()).contentFrame();await f.waitForURL(new RegExp(file));await f.waitForLoadState('domcontentloaded');return f;}
 async function gone(){assert.ok(!await p.locator('#reader').evaluate(e=>e.open));assert.equal(await p.locator('#frames iframe').count(),0);assert.equal(p.frames().length,1);}
 let f=await open(0,'tideline.html');await f.locator('#project-back').click().catch(e=>{if(!f.isDetached())throw e});await gone();
 f=await open(1,'safepaw.html');await p.locator('#close-reader').click();await gone();
 f=await open(2,'dream-sentinel.html');await f.locator('a[href="portfolio.html"]').first().click().catch(e=>{if(!f.isDetached())throw e});await gone();
 f=await open(3,'gazette.html');await p.locator('#close-reader').click();await gone();
 f=await open(0,'tideline.html');await p.waitForTimeout(500);assert.equal(await f.locator('#reader').count(),0,'No nested portfolio reader inside the project');await p.screenshot({path:'/tmp/portfolio-single-reader.png',timeout:45000});
 // A programmatic legacy return must close the outer reader instead of creating a nested gallery.
 await f.evaluate(()=>location.href='portfolio.html').catch(e=>{if(!f.isDetached())throw e});await p.waitForFunction(()=>!document.getElementById('reader').open);await gone();
 f=await open(1,'safepaw.html');await p.keyboard.press('Escape');await gone();
 f=await open(0,'tideline.html');await f.evaluate(()=>location.href='cecilia-world/index.html').catch(e=>{if(!f.isDetached())throw e});await p.waitForFunction(()=>!document.getElementById('reader').open);await gone();
 assert.deepEqual(errors,[]);console.log('PASS four project types, project HOME return, direct return link, outer close, ESC, programmatic legacy redirect and repeated project entry: at most one live iframe, no nested reader, no retained previous project.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
