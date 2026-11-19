const assert=require('node:assert/strict'),{chromium}=require('playwright');
const manifest=require('../assets/project-ui-details/manifest.json');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const errors=[],bad=[];
  for(const project of ['safepaw','dream']){
   const p=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
   await p.goto(new URL(project==='safepaw'?'safepaw.html':'dream-sentinel.html',root).href);
   const assets=manifest.filter(a=>a.project===project);
   assert.equal(await p.locator('.ui-zoom-trigger').count(),assets.length);
   for(const a of assets){
    const trigger=project==='safepaw'?p.locator(`[data-node="${a.node}"]`):p.locator('.ui-zoom-trigger').filter({hasText:'never'});
    const target=project==='safepaw'?trigger:p.locator('.ui-zoom-trigger').nth(['34:799','34:739','34:740','34:746','34:747'].indexOf(a.node));
    await target.scrollIntoViewIfNeeded();await target.click();
    const dialog=p.locator('.project-ui-lightbox');assert(await dialog.isVisible());
    await p.waitForFunction(()=>{const i=document.querySelector('.project-ui-lightbox img');return i.complete&&i.naturalWidth>0});
    await dialog.locator('img').evaluate(im=>im.decode());
    const actual=await dialog.locator('img').evaluate(im=>({src:im.src,w:im.naturalWidth,h:im.naturalHeight,rect:im.getBoundingClientRect().toJSON()}));
    assert(actual.src.endsWith(a.file));assert.equal(actual.w,a.width);assert.equal(actual.h,a.height);
    assert(Math.abs(actual.rect.width/actual.rect.height-a.width/a.height)<.002);
    assert(actual.rect.x>=0&&actual.rect.y>=0&&actual.rect.right<=1440.5&&actual.rect.bottom<=900.5);
    // A click on the artwork keeps it open; the empty backdrop closes it.
    await dialog.locator('img').click();assert(await dialog.isVisible());
    const scroll=await p.evaluate(()=>({x:scrollX,y:scrollY}));await p.mouse.click(5,70);assert(await dialog.isHidden());
    await p.waitForFunction(()=>!document.body.classList.contains('ui-zoom-open'));
    // Keyboard open/close restores focus to the exact same UI control.
    await target.focus();await target.press('Enter');assert(await dialog.isVisible());await p.keyboard.press('Escape');assert(await dialog.isHidden());
    await p.waitForFunction(()=>!document.body.classList.contains('ui-zoom-open'));assert(await target.evaluate(e=>e===document.activeElement));
   }
   assert.equal(await p.locator('.cecilia-loader').count(),0);await p.close();
  }
  const context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(new URL('safepaw.html',root).href);const target=p.locator('[data-node="54:1091"]');await target.scrollIntoViewIfNeeded();await target.tap();
  await p.waitForFunction(()=>document.querySelector('.project-ui-lightbox img')?.naturalWidth>0);
  await p.locator('.project-ui-lightbox img').evaluate(im=>im.decode());await p.screenshot({path:'/workspace/ui-enlargements/mobile-zoom.png'});
  assert(await p.locator('.project-ui-lightbox').isVisible());await p.locator('.ui-zoom-close').tap();assert(await p.locator('.project-ui-lightbox').isHidden());
  await context.close();assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS 15 exact full-resolution UI mappings; real clicks, artwork click stays open, blank backdrop and Escape close, focus restored, aspect ratio and viewport fit, touch close, no loaders/errors/404s.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
