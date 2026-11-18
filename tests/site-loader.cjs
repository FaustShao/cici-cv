const assert=require('node:assert/strict'),{chromium}=require('playwright'),path=require('node:path');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const page=await b.newPage({viewport:{width:1200,height:850}});
 // Exercise progress, unchanged geometry, reduced-motion, and completion independently of WebGL speed.
 await page.goto(new URL('click-sounds.html',root).href);
 await page.addScriptTag({url:new URL('site-loader.js',root).href});await page.addStyleTag({url:new URL('site-loader.css',root).href});
 await page.evaluate(()=>{const el=document.createElement('div');el.id='test-loader';document.body.append(el);window.testLoader=CeciliaLoader.create(el);testLoader.setPercent(68);});
 assert.equal(await page.locator('#test-loader .cube').count(),27);assert.equal(await page.locator('#test-loader').getAttribute('aria-valuenow'),'68');
 assert.equal(await page.locator('#test-loader').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(91, 40, 98)');
 await page.locator('#test-loader').waitFor({state:'visible'});
 await page.screenshot({path:path.join(__dirname,'../experiments/bruno-projects/public/review/loading-cubes.png')});
 await page.evaluate(()=>{testLoader.setPercent(30);});assert.equal(await page.locator('#test-loader').getAttribute('aria-valuenow'),'68');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#test-loader .cube').first().evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
 await page.evaluate(()=>testLoader.finish());await page.waitForFunction(()=>document.getElementById('test-loader').hidden);
 // Each real reader must finish with cached or freshly decoded initial images;
 // deferred/lazy pages must not block the visible document.
 for(const file of ['gazette.html','resume.html?document=1','tideline.html','safepaw.html','dream-sentinel.html','works.html?document=1']){
  const p=await b.newPage({viewport:{width:1200,height:850},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(new URL(file,root).href,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.querySelector('#document-loading')?.hidden,null,{timeout:45000});
  assert.equal(await p.locator('#document-loading').getAttribute('aria-valuenow'),'100');assert.deepEqual(errors,[],file);console.log('PASS document loader',file);await p.close();
 }
 const native=await b.newPage({viewport:{width:1200,height:850},reducedMotion:'reduce'}),errors=[];native.on('pageerror',e=>errors.push(e.message));
 for(const file of ['hub.html','index.html']){
  await native.goto(new URL('cecilia-world/'+file+'?webgl=1',root).href,{waitUntil:'domcontentloaded'});
  assert.equal(await native.locator('#loading .cube').count(),27);
  await native.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});assert.equal(await native.locator('body').getAttribute('data-failed'),null);
  await native.waitForFunction(()=>document.getElementById('loading').hidden);assert.equal(await native.locator('#loading').getAttribute('aria-valuenow'),'100');console.log('PASS native scene loader',file);
 }
 assert.deepEqual(errors,[]);console.log('PASS shared first-palette cube loader, real progress, document and scene completion, cached images, reduced motion.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
