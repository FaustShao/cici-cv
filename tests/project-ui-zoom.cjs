const assert=require('node:assert/strict'),{chromium}=require('playwright');
const manifest=require('../assets/project-ui-details/manifest.json');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8770/cici-cv/';
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
    assert(new URL(actual.src).pathname.endsWith(a.file));assert.equal(actual.w,a.width);assert.equal(actual.h,a.height);
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
   // Browse one project's whole gallery in its visual reading order.
   const ordered=[...assets].sort((a,b)=>a.order-b.order),first=ordered[0];
   const firstTrigger=project==='safepaw'?p.locator(`[data-node="${first.node}"]`):p.locator('.ui-zoom-trigger').first();
   await firstTrigger.scrollIntoViewIfNeeded();await firstTrigger.click();
   const dialog=p.locator('.project-ui-lightbox');
   async function shows(asset){await p.waitForFunction(file=>{const im=document.querySelector('.project-ui-lightbox img');return im&&!im.hidden&&im.complete&&im.naturalWidth>0&&new URL(im.src).pathname.endsWith(file)},asset.file);assert.equal(await dialog.getAttribute('data-project'),project);assert.equal(await dialog.getAttribute('data-index'),String(asset.order));}
   await shows(first);assert(await dialog.locator('.ui-zoom-previous').isDisabled());
   for(let i=1;i<ordered.length;i++){
    if(i%2)await dialog.locator('.ui-zoom-next').click();else await p.keyboard.press('ArrowRight');await shows(ordered[i]);
   }
   assert(await dialog.locator('.ui-zoom-next').isDisabled());await p.keyboard.press('ArrowRight');await shows(ordered.at(-1));
   for(let i=ordered.length-2;i>=0;i--){if(i%2)await p.keyboard.press('ArrowLeft');else await dialog.locator('.ui-zoom-previous').click();await shows(ordered[i]);}
   // Fast changes must show the final requested original, never a late earlier decode.
   for(let i=0;i<4;i++)await dialog.locator('.ui-zoom-next').click();await dialog.locator('.ui-zoom-previous').click();await shows(ordered[3]);
   await p.keyboard.press('Escape');assert(await firstTrigger.evaluate(e=>e===document.activeElement));
   assert.equal(await p.locator('.cecilia-loader').count(),0);await p.close();
  }
  const context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(new URL('safepaw.html',root).href);const target=p.locator('[data-node="54:1091"]');await target.scrollIntoViewIfNeeded();await target.tap();
  await p.waitForFunction(()=>document.querySelector('.project-ui-lightbox img')?.naturalWidth>0);
  await p.locator('.project-ui-lightbox img').evaluate(im=>im.decode());await p.screenshot({path:'/workspace/ui-enlargements/mobile-zoom.png'});
  assert(await p.locator('.project-ui-lightbox').isVisible());const before=Number(await p.locator('.project-ui-lightbox').getAttribute('data-index'));await p.locator('.ui-zoom-next').tap();await p.waitForFunction(index=>Number(document.querySelector('.project-ui-lightbox').dataset.index)===index,before+1);await p.locator('.ui-zoom-previous').tap();assert.equal(Number(await p.locator('.project-ui-lightbox').getAttribute('data-index')),before);await p.locator('.ui-zoom-close').tap();assert(await p.locator('.project-ui-lightbox').isHidden());
  await p.goto(new URL('dream-sentinel.html',root).href);
  await p.locator('.ui-zoom-trigger').first().scrollIntoViewIfNeeded();await p.locator('.ui-zoom-trigger').first().tap();
  await p.waitForFunction(()=>{const i=document.querySelector('.project-ui-lightbox img');return i&&!i.hidden&&i.complete&&i.naturalWidth>0});
  await p.locator('.ui-zoom-next').tap();await p.waitForFunction(()=>document.querySelector('.project-ui-lightbox').dataset.index==='2');
  assert.equal(await p.locator('.project-ui-lightbox').getAttribute('data-project'),'dream');
  await p.locator('.ui-zoom-previous').tap();await p.waitForFunction(()=>document.querySelector('.project-ui-lightbox').dataset.index==='1');
  await p.locator('.ui-zoom-close').tap();
  await context.close();assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS 16 exact original UI mappings, ordered next/previous by button and keyboard, boundaries, rapid decode changes, mobile navigation; real clicks, artwork click stays open, blank backdrop and Escape close, focus restored, aspect ratio and viewport fit, touch close, no loaders/errors/404s.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
