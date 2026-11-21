const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.PREVIEW_ROOT || 'http://127.0.0.1:8765/';
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}), errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))bad.push(r.url())});
  await page.goto(new URL('cecilia-world/hub.html?webgl=1#other',base).href);
  await page.waitForFunction(()=>window.designWorld&&document.body.dataset.ready,null,{timeout:90000});
  await page.evaluate(()=>{designWorld.selectOther(2);designWorld.openCurrent();designWorld.world.renderer.setAnimationLoop(null)});
  async function currentFrame() {
   const frame=await (await page.locator('#frames iframe:visible').elementHandle()).contentFrame();
   await frame.waitForFunction(()=>window.HAHA_READER?.state.ready,null,{timeout:90000});await frame.evaluate(()=>document.fonts.ready);return frame;
  }
  async function centered(frame) {
   const title=await frame.locator('.identity').boundingBox(),width=await frame.evaluate(()=>innerWidth);
   assert.ok(Math.abs(title.x+title.width/2-width/2)<1, 'Inner heading is centered against the full viewport');
  }
  let frame=await currentFrame();await page.evaluate(()=>document.fonts.ready);await centered(frame);
  const outer=await page.locator('#reader-title').evaluate(el=>({family:getComputedStyle(el).fontFamily,weight:getComputedStyle(el).fontWeight}));
  assert.ok(outer.family.includes('Magazine UI'));assert.equal(outer.weight,'400');
  const inner=await frame.locator('.identity h1').evaluate(el=>getComputedStyle(el).fontFamily);
  assert.equal(outer.family,inner,'Both reader layers use the same complete font');
  const titleBox=await page.locator('#reader-title').boundingBox();assert.ok(Math.abs(titleBox.x+titleBox.width/2-720)<1);
  await frame.evaluate(()=>{window.firstEntryMarker=true;HAHA_READER.goTo(23)});
  await frame.waitForFunction(()=>HAHA_READER.state.page===23);
  await frame.locator('#return-cover').click();await frame.waitForFunction(()=>HAHA_READER.state.page===0);
  await frame.evaluate(()=>{HAHA_READER.goTo(9);HAHA_READER.openZoom(9)});
  await frame.locator('#zoom-return-cover').click();
  await frame.waitForFunction(()=>HAHA_READER.state.page===0&&!document.getElementById('page-zoom').open);
  await frame.evaluate(()=>HAHA_READER.goTo(19));await frame.waitForFunction(()=>HAHA_READER.state.page===19);
  await page.locator('#close-reader').click();
  assert.equal(await page.locator('#frames iframe[data-project="haha-world"]').count(),0, 'The exited magazine is disposed rather than cached on a later page');
  await page.evaluate(()=>{designWorld.go('home');designWorld.go('other');designWorld.selectOther(2);designWorld.openCurrent()});
  frame=await currentFrame();assert.equal(await frame.evaluate(()=>HAHA_READER.state.page),0);assert.ok(!await frame.evaluate(()=>window.firstEntryMarker));
  await centered(frame);
  await frame.evaluate(()=>HAHA_READER.pause());await page.screenshot({path:'/tmp/haha-title-reset.png',timeout:45000});
  await page.setViewportSize({width:390,height:844});await centered(frame);
  assert.ok(await frame.locator('.header-tools').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}));
  await frame.evaluate(()=>{HAHA_READER.resume();HAHA_READER.goTo(5)});await frame.waitForFunction(()=>HAHA_READER.state.page===5);
  const exiting=frame;
  await frame.locator('#back-other').click().catch(e=>{if(!exiting.isDetached())throw e});
  assert.ok(!await page.locator('#reader').evaluate(d=>d.open));
  assert.equal(await page.locator('#frames iframe[data-project="haha-world"]').count(),0);
  await page.evaluate(()=>designWorld.openCurrent());frame=await currentFrame();assert.equal(await frame.evaluate(()=>HAHA_READER.state.page),0);
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS both title fonts and true viewport centering; cover buttons in normal/zoom reading; disposal and repeated fresh cover entry via parent close, home navigation and project back; mobile header bounds.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
