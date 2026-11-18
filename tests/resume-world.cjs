const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  await page.goto('http://127.0.0.1:8000/bruno-preview/hub.html?webgl=1#resume');
  await page.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
  assert.equal(await page.locator('body').getAttribute('data-failed'),null);
  await page.locator('#place-actions button').first().click();
  const frame=page.frameLocator('#frames iframe:visible');
  await frame.locator('#portrait-photo').waitFor();
  assert.equal(await frame.locator('.resume-page').count(),2);
  const iframe=await page.locator('#frames iframe:visible').elementHandle(),document=await iframe.contentFrame();
  await document.evaluate(()=>Promise.all([...window.document.images].map(i=>i.decode())));
  assert.ok(await frame.locator('.back-world').evaluate(e=>e.hidden));
  assert.match(await page.locator('#reader-direct').getAttribute('href'),/document=1&v=pdf-layout-1/);
  assert.match(await page.evaluate(()=>designWorld.world.scene.getObjectByName('resume-preview-board').userData.preview),/pdf-layout-1/);
  await page.screenshot({path:'/tmp/resume-in-world.png'});
  await page.locator('#close-reader').click();
  assert.equal(await page.evaluate(()=>WORLD_STATE.place),'resume');
  const n=await page.evaluate(()=>designWorld.world.renderCount);await page.waitForFunction(n=>designWorld.world.renderCount>n,n);
  await page.screenshot({path:'/tmp/resume-updated-preview.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS original 3D resume entry, cache-busted matching preview, two-page reader, photo layer, direct link, closing returns to the unchanged scene.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
