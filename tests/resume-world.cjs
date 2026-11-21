const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  await page.goto(new URL('cecilia-world/hub.html?webgl=1#resume',process.env.PREVIEW_ROOT||'http://127.0.0.1:8000/').href);
  await page.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
  assert.equal(await page.locator('body').getAttribute('data-failed'),null);
  assert.ok(await page.locator('#place-actions').isHidden());
  // Click the actual page model rather than a redundant external read button.
  const hit=await page.evaluate(()=>{const w=designWorld,m=w.world.scene.getObjectByName('actual-resume-first-page');const v=m.getWorldPosition(m.position.clone()).project(w.world.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}});
  assert.equal(await page.evaluate(p=>designWorld.pick(p.x,p.y),hit),'resume-preview');
  await page.mouse.click(hit.x,hit.y);
  const frame=page.frameLocator('#frames iframe:visible');
  await frame.locator('#portrait-photo').waitFor();
  assert.equal(await frame.locator('.resume-page').count(),2);
  const iframe=await page.locator('#frames iframe:visible').elementHandle(),document=await iframe.contentFrame();
  await document.evaluate(()=>Promise.all([...window.document.images].map(i=>i.decode())));
  assert.ok(await frame.locator('.back-world').evaluate(e=>e.hidden));
  assert.match(await page.locator('#reader-direct').getAttribute('href'),/document=1&v=cv-slices-2/);
  assert.match(await page.evaluate(()=>designWorld.world.scene.getObjectByName('resume-preview-board').userData.preview),/cv-slices-2/);
  await page.evaluate(()=>designWorld.world.renderer.setAnimationLoop(null));
  await page.screenshot({path:'/tmp/resume-in-world.png'});
  await page.locator('#close-reader').click();
  assert.equal(await page.evaluate(()=>WORLD_STATE.place),'resume');
  await page.evaluate(()=>designWorld.world.pipeline.render());
  await page.screenshot({path:'/tmp/resume-updated-preview.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS original 3D resume entry, cache-busted matching preview, two-page reader, photo layer, direct link, closing returns to the unchanged scene.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
