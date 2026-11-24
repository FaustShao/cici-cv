const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8770/cici-cv/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const errors=[],failed=[];
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
  await p.goto(new URL('gazette.html',root).href);await p.waitForFunction(()=>document.querySelector('.paper[data-pdf-page="1"]'));
  await p.waitForFunction(()=>[...document.querySelectorAll('.desk-scrap')].every(im=>im.complete&&im.naturalWidth>0));
  assert.equal(await p.locator('.desk-scrap').count(),4);
  await p.waitForFunction(()=>[...document.querySelectorAll('.research-pin')].length===6&&[...document.querySelectorAll('.research-pin')].every(im=>im.complete&&im.naturalWidth===400));
  assert.match(new URL(await p.locator('#research-tab-3 .research-pin').getAttribute('src')).pathname,/hi\.svg$/);
  assert.match(new URL(await p.locator('#research-tab-4 .research-pin').getAttribute('src')).pathname,/pencil\.svg$/);
  assert.equal(await p.locator('.research-pin').evaluateAll(es=>new Set(es.map(e=>e.src)).size),6,'Every entry has a distinct pin');
  assert.match(new URL(await p.locator('#research-tab-5 .research-pin').getAttribute('src')).pathname,/eyes\.svg$/);
  assert.equal(await p.locator('a[download],a[href$=".pdf"]').count(),0,'No source-file download control');
  assert.match(await p.locator('.desk-sheet').first().evaluate(e=>getComputedStyle(e).cursor),/cursors\/arrow\.svg/);
  assert.match(await p.locator('.research-tab').first().evaluate(e=>getComputedStyle(e).cursor),/cursors\/hand\.svg/);
  assert(parseFloat(await p.locator('.book-pose').evaluate(e=>getComputedStyle(e).rotate))>0,'Closed cover tilts in the new direction');
  assert.match(await p.locator('.contents-handle').evaluate(e=>getComputedStyle(e).fontFamily),/Huiwen/);
  assert(Math.abs((await p.locator('#contents-toggle').boundingBox()).y+(await p.locator('#contents-toggle').boundingBox()).height-900)<2,'Collapsed index reaches window bottom');
  const cover=await p.locator('.paper[data-pdf-page="1"]').boundingBox();assert(cover.height>=760,'Desktop book uses the available height');await p.mouse.click(cover.x+cover.width*.6,cover.y+cover.height*.5);
  await p.waitForFunction(()=>document.getElementById('reader-message').textContent.startsWith('第 2 页')&&document.getElementById('reader').dataset.flipState==='read');
  // Hover cards overlay the desk without moving or resizing the publication.
  const originalBook=await p.locator('.book-pose').boundingBox();
  assert.equal(await p.locator('.book-pose').evaluate(e=>getComputedStyle(e).rotate),'0deg','Reading spread is upright');
  assert.equal(await p.locator('.desk-scraps').evaluate(e=>getComputedStyle(e).opacity),'0','Cutouts withdraw under the open spread');
  const note=await p.locator('#research-tab-2').boundingBox();await p.mouse.move(Math.max(10,note.x+note.width/2),note.y+note.height/2);await p.waitForTimeout(250);
  assert.equal(await p.locator('#research-tab-2').getAttribute('aria-expanded'),'true');
  async function noOverlap(){const b=await p.locator('.book-pose').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(b[k]-originalBook[k])<1,'Book geometry stays fixed: '+k);}
  await noOverlap();await p.locator('.research-open:visible').click();assert.equal(await p.locator('#research-workspace').getAttribute('data-detail'),'2');await p.locator('#research-close-detail').click();await p.mouse.move(700,60);await p.waitForTimeout(500);assert.equal(await p.locator('.research-preview:visible').count(),0);
  async function pageTwo(){await p.waitForFunction(()=>document.getElementById('reader-message').textContent.startsWith('第 2 页'));}
  await pageTwo();
  for(let i=1;i<=6;i++){
   // Clicking the actual badge opens its own detail immediately.
   const tab=p.locator('#research-tab-'+i);await tab.locator('.research-badge').click();await p.waitForTimeout(250);await noOverlap();await pageTwo();
   assert.equal(await p.locator('#research-workspace').getAttribute('data-detail'),String(i));
   await p.waitForFunction(()=>[...document.querySelectorAll('#research-detail-content img')].every(im=>im.complete&&im.naturalWidth>0));
   await noOverlap();assert(await p.locator('#reader').evaluate(e=>e.inert),'Underlying book is inert while paper is open');
   const expected=await p.evaluate(i=>GAZETTE_RESEARCH.details[i-1].layers.length,i);assert.equal(await p.locator('#research-detail-content img').count(),expected);
   await p.locator('#research-zoom-in').click();await p.locator('#research-zoom-in').click();assert.equal(await p.locator('#research-zoom-reset').textContent(),'150%');
   await p.locator('#research-detail-scroll').evaluate(e=>{e.scrollTop=600;e.scrollLeft=120;});
   if(i===5){await p.screenshot({path:'/workspace/checked-gazette/qa-desktop-detail.png'});}
   if(i%2){await p.mouse.click(22,450);}else{await p.keyboard.press('Escape');}assert(await p.locator('#research-detail').isHidden());assert(!await p.locator('#reader').evaluate(e=>e.inert));await pageTwo();
  }
  for(const [i,key] of [[1,'Enter'],[2,'Space']]){await p.locator('#research-tab-'+i).focus();await p.locator('#research-tab-'+i).press(key);assert.equal(await p.locator('#research-workspace').getAttribute('data-detail'),String(i));await p.keyboard.press('Escape');await pageTwo();}
  await p.locator('#fullscreen-book').click();await p.waitForFunction(()=>document.fullscreenElement||document.getElementById('gazette-reader').classList.contains('is-expanded'));await pageTwo();
  await p.locator('#research-tab-6').focus();await p.locator('#research-tab-6').press('Enter');await p.locator('#research-close-detail').click();await pageTwo();await p.locator('#fullscreen-book').click();
  assert.equal(await p.locator('.cecilia-loader').count(),0);
  await p.setViewportSize({width:390,height:800});
  for (const tab of await p.locator('.research-tab').all()) {
    await tab.hover();
    assert.equal(await p.locator('.research-preview:visible').count(),0,'Compact research controls stay clear for mouse users');
    await tab.click();
    await p.locator('#research-close-detail').click();
  }
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));m.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
  await m.goto(new URL('gazette.html',root).href);await m.waitForFunction(()=>document.querySelector('.paper[data-pdf-page="1"]'));
  for(let i=1;i<=6;i++){
   await m.locator('#research-tab-'+i+' .research-badge').tap();
   assert.equal(await m.locator('#research-workspace').getAttribute('data-detail'),String(i));
   await m.waitForFunction(()=>[...document.querySelectorAll('#research-detail-content img')].every(im=>im.complete&&im.naturalWidth>0));
   assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await m.locator('#research-close-detail').tap();assert(await m.locator('#research-detail').isHidden());
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await context.close();await mobile.close();console.log('PASS: six cards and all artwork load, hover-preview click plus direct six-badge click/keyboard, fixed book geometry, backdrop dismissal, detail scroll/zoom, page preservation, fullscreen, mobile tapping and no loaders/errors/404s.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
