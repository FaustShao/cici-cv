const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const base=process.env.PREVIEW_ROOT||'http://127.0.0.1:8770/cici-cv/';
const release=JSON.parse(fs.readFileSync('public/release.json'));
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 // Check the exact published tree under a GitHub-Pages-style repository prefix.
 const staticContext=await b.newContext({javaScriptEnabled:false});const p=await staticContext.newPage();
 for(const entry of release.entrypoints){
  const url=new URL(entry,base).href;const response=await p.goto(url,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);assert.equal(p.url(),url,'No intermediate redirect document');
  assert.equal(await p.locator('meta[name=cecilia-release]').getAttribute('content'),release.revision);
  assert.equal(await p.locator('.island-shell,.hero,.entry-grid').count(),0,'No old site shell remains');
 }
 for(const entry of ['island-ui.js','island.css','site.js','click-sounds.html','cecilia-world/review/'])assert.equal((await staticContext.request.get(new URL(entry,base).href)).status(),404);
 await staticContext.close();console.log('PASS all published entries: direct current documents; no legacy shell, scripts, audition page or review directory.');
 // Simulate a browser holding stale HTML while the release manifest has already advanced.
 const cacheContext=await b.newContext();await cacheContext.route(/\/cecilia-world\/assets\/.*\.js/,r=>r.abort());
 const c=await cacheContext.newPage();let first=true,releaseManifest;const manifestGate=new Promise(r=>releaseManifest=r);
 await c.route(new URL('index.html*',base).href,async route=>{
  const response=await route.fetch();let body=await response.text();if(first){first=false;body=body.replace(`name="cecilia-release" content="${release.revision}"`,'name="cecilia-release" content="cached-old"').replace('</body>','<aside id="obsolete-probe" style="visibility:visible">旧界面探针</aside></body>');}
  await route.fulfill({response,body});
 });
 let gate=true;await c.route(new URL('release.json',base).href,async route=>{if(gate){gate=false;await manifestGate;}await route.continue()});
 await c.goto(new URL('index.html?audit=cache#other',base).href,{waitUntil:'domcontentloaded'});
 assert.equal(await c.locator('#obsolete-probe').count(),1);assert.equal(await c.locator('body').evaluate(e=>getComputedStyle(e).opacity),'0','Stale UI cannot paint even if a child forces visibility');
 releaseManifest();await c.waitForURL(url=>url.searchParams.get('build')===release.revision);await c.waitForFunction(()=>!document.documentElement.dataset.releaseState);
 assert.equal(await c.locator('#obsolete-probe').count(),0);assert.equal(new URL(c.url()).hash,'#other');await cacheContext.close();console.log('PASS cached old HTML stays unpainted, switches to the current revision once, and preserves the requested section.');
 const resourcePage=await b.newPage({viewport:{width:1100,height:800}}),firstCoverRequests=[];
 resourcePage.on('request',r=>{if(/page-01(?:-small)?\.webp/.test(r.url()))firstCoverRequests.push(r.url())});
 await resourcePage.goto(new URL('gazette.html',base).href);await resourcePage.waitForFunction(()=>document.documentElement.dataset.pageBoot==='ready'&&!document.documentElement.dataset.releaseState,null,{timeout:90000});
 assert.ok(firstCoverRequests.length>0);assert.ok(firstCoverRequests.every(url=>new URL(url).searchParams.get('build')===release.revision),'Preload and responsive first-page artwork use one current version');await resourcePage.close();
 console.log('PASS responsive preload and first cover share the current release; no obsolete artwork request.');
 if(process.env.ENTRY_STATIC_ONLY==='1')return;
 const context=await b.newContext({viewport:{width:1200,height:850},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))bad.push(r.url())});
 await page.goto(new URL('index.html?webgl=1',base).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.designWorld&&document.body.dataset.ready&&!document.documentElement.dataset.releaseState,null,{timeout:120000});
 assert.equal(new URL(page.url()).pathname,new URL('index.html',base).pathname,'Home renders in the first document');
 assert.ok(await page.evaluate(()=>designWorld.world.labCover.source.includes('icod')));
 await page.evaluate(()=>designWorld.go('other'));assert.equal(await page.locator('#other-position').innerText(),'1 / 4');
 await page.screenshot({path:'/tmp/production-home-direct.png',timeout:45000});
 await page.goto(new URL('portfolio.html?webgl=1',base).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.preview&&document.body.dataset.ready&&!document.documentElement.dataset.releaseState,null,{timeout:120000});
 assert.equal(new URL(page.url()).pathname,new URL('portfolio.html',base).pathname);assert.ok(await page.evaluate(()=>preview.area.images.initiated&&preview.area.images.loadProgress.value===1));
 await page.evaluate(()=>preview.renderer.setAnimationLoop(null));await page.screenshot({path:'/tmp/production-portfolio-direct.png',timeout:45000});
 for(const[index,file]of[[0,'tideline.html'],[1,'safepaw.html'],[2,'dream-sentinel.html'],[3,'gazette.html']]){
  await page.evaluate(index=>{preview.select(index);preview.readWork()},index);
  const frame=await(await page.locator('#frames>iframe').elementHandle()).contentFrame();await frame.waitForURL(new RegExp(file));await frame.waitForFunction(()=>document.documentElement.dataset.pageBoot==='ready'&&!document.documentElement.dataset.releaseState,null,{timeout:90000});
  assert.equal(await page.locator('#frames iframe').count(),1);assert.equal(await frame.locator('header.topbar:visible,.collection-return:visible').count(),0);
  assert.equal(await frame.locator('.cecilia-loader').count(),0,'No forced loading animation inside portfolio projects');
  const wrongArtwork=await frame.evaluate(revision=>[...document.querySelectorAll('img[src],svg image[href]')].map(i=>i.getAttribute('src')||i.getAttribute('href')).filter(src=>src.includes('assets/')).filter(src=>new URL(src,location.href).searchParams.get('build')!==revision),release.revision);
  assert.deepEqual(wrongArtwork,[],'Dynamic artwork follows the same release as its document');
  if(index===3)await page.screenshot({path:'/tmp/production-gazette-current.png',timeout:45000});
  if(index===0)await frame.locator('#project-back').click().catch(e=>{if(!frame.isDetached())throw e});
  else await page.locator('#close-reader').click();
  assert.equal(await page.locator('#frames iframe').count(),0);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS current root home and portfolio render without redirects; selected cover precedes reveal; all four actual project documents render once, with ready typography/artwork and clean return.');
 await page.goto(new URL('resume.html?document=1',base).href);await page.waitForFunction(()=>document.documentElement.dataset.pageBoot==='ready'&&!document.documentElement.dataset.releaseState,null,{timeout:90000});assert.equal(new URL(page.url()).pathname,new URL('resume.html',base).pathname);assert.ok(await page.locator('#portrait-photo').evaluate(i=>i.complete&&i.naturalWidth>0));assert.equal(await page.locator('.resume-page').count(),2);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await context.close();console.log('PASS current two-page resume and portrait; no intermediate legacy page or missing published dependency.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
