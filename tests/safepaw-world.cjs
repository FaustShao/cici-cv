const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],bad=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
  await p.goto(new URL('cecilia-world/index.html?webgl=1',root).href);
  await p.waitForFunction(()=>window.preview||document.body.dataset.failed,null,{timeout:90000});
  assert.equal(await p.locator('body').getAttribute('data-failed'),null);
  await p.waitForFunction(()=>document.body.dataset.ready,null,{timeout:90000});
  assert.equal(await p.locator('#selection').textContent(),'01 / 04');
  await p.evaluate(()=>preview.select(1));assert.equal(await p.locator('#selection').textContent(),'02 / 04');
  assert.match(await p.locator('#project-name').textContent(),/SafePaw/);
  await p.evaluate(()=>preview.readWork());
  const frame=p.frameLocator('#frames iframe:visible');await frame.locator('#board-1').waitFor();assert.equal(await frame.locator('.board-viewport').count(),5);
  await frame.locator('#reading-size').click();assert.equal(await frame.locator('#reading-size').getAttribute('aria-pressed'),'true');
  await frame.locator('.project-bar a').click();await p.waitForFunction(()=>!document.getElementById('reader').open);
  assert.equal(await p.locator('#selection').textContent(),'02 / 04');
  await p.evaluate(()=>preview.select(3));
  await p.locator('#next').click();await p.waitForFunction(()=>document.getElementById('selection').textContent==='01 / 04');
  await p.locator('#previous').click();await p.waitForFunction(()=>document.getElementById('selection').textContent==='04 / 04');
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS four peer projects, 04/04 counter, second project preview/embedded five-board reader, reading zoom, return to same selection and arrow wrapping, no errors/404.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
