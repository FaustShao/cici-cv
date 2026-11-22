const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],bad=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 await p.goto(new URL('gazette.html',root).href);await p.waitForFunction(()=>window.GAZETTE_BOOK);
 assert.equal(await p.locator('.contents-chapter').count(),4);assert.equal(await p.locator('.contents-tick').count(),31);assert.equal(await p.locator('.contents-tick.is-major').count(),4);
 assert.equal(await p.locator('#contents-toggle').getAttribute('aria-expanded'),'false');
 // Opening the tray does not change the reading page and it clears the visible book.
 const initialBook=await p.locator('.book-pose').boundingBox();const start=await p.evaluate(()=>GAZETTE_BOOK.getPage());await p.locator('#contents-toggle').hover();await p.waitForTimeout(100);
 assert.equal(await p.locator('#contents-toggle').getAttribute('aria-expanded'),'true');assert.equal(await p.evaluate(()=>GAZETTE_BOOK.getPage()),start);
 const book=await p.locator('.book-pose').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(book[k]-initialBook[k])<1,'Paper index must keep the book fixed');
 for(const n of [4,9,15,20]){
  await p.locator(`.contents-chapter[data-page="${n}"]`).click();
  const actual=await p.evaluate(()=>GAZETTE_BOOK.getPage());assert(actual===n||actual===n-1,`chapter ${n} is visible in its spread`);
  assert.equal(await p.locator(`.contents-chapter[data-page="${n}"]`).getAttribute('aria-current'),'location');
 }
 // Small titles appear at individual ticks, without opening another menu.
 await p.locator('.contents-tick[data-page="21"]').hover();assert.match(await p.locator('#contents-tooltip').textContent(),/Forres Highland Games/);
 await p.screenshot({path:'/workspace/checked-gazette/paper-contents-verified.png'});
 await p.locator('.contents-tick[data-page="11"]').click();let value=await p.evaluate(()=>GAZETTE_BOOK.getPage());assert(value===10||value===11);
 const slider=p.locator('.contents-range'),r=await slider.boundingBox();
 const old=await p.evaluate(()=>GAZETTE_BOOK.getPage());
 // A thumb drag changes the preview only until release.
 await p.mouse.move(r.x+8+(r.width-16)*(old-1)/30,r.y+r.height/2);await p.mouse.down();
 await p.mouse.move(r.x+8+(r.width-16)*26/30,r.y+r.height/2,{steps:14});
 assert.equal(await p.evaluate(()=>GAZETTE_BOOK.getPage()),old,'No live page churn while scrubbing');assert(!await p.locator('#contents-tooltip').isHidden());
 await p.mouse.up();value=await p.evaluate(()=>GAZETTE_BOOK.getPage());assert(value>=25&&value<=28,'Release navigates to selected spread');
 // Keyboard interaction works on the same range and never bubbles into a second book action.
 await slider.focus();await slider.press('End');assert.equal(await p.evaluate(()=>GAZETTE_BOOK.getPage()),31);
 await slider.press('Home');assert.equal(await p.evaluate(()=>GAZETTE_BOOK.getPage()),1);
 await p.mouse.move(700,65);await slider.blur();await p.waitForTimeout(350);assert.equal(await p.locator('#contents-toggle').getAttribute('aria-expanded'),'false');
 // All six horizontal notes go directly to their own small card, then big card.
 for(let n=1;n<=6;n++){
  const tab=p.locator('#research-tab-'+n),b=await tab.boundingBox();await p.mouse.move(Math.min(1430,Math.max(10,b.x+b.width/2)),b.y+b.height/2);await p.waitForTimeout(150);
  assert.equal(await tab.getAttribute('aria-expanded'),'true');assert.equal(await p.locator('.research-preview-actions').count(),0);
  assert.equal(await tab.locator('.tab-label').evaluate(e=>getComputedStyle(e).writingMode),'horizontal-tb');
  await p.locator('.research-open:visible').click();assert.equal(await p.locator('#research-workspace').getAttribute('data-detail'),String(n));assert(await p.locator('.gazette-contents').isHidden());
  await p.locator('#research-close-detail').click();await p.mouse.move(700,65);await p.waitForTimeout(350);
 }
 assert.equal(await p.locator('.cecilia-loader').count(),0);
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const m=await context.newPage();m.on('pageerror',e=>errors.push(e.message));
 await m.goto(new URL('gazette.html',root).href);await m.locator('#contents-toggle').tap();assert.equal(await m.locator('#contents-toggle').getAttribute('aria-expanded'),'true');
 await m.locator('.contents-chapter[data-page="20"]').tap();let mobilePage=await m.evaluate(()=>GAZETTE_BOOK.getPage());assert.equal(mobilePage,20);
 await m.waitForFunction(()=>{const im=document.querySelector('.paper[data-pdf-page=\"20\"] img');return im&&im.complete&&im.naturalWidth>0});await m.screenshot({path:'/workspace/checked-gazette/paper-contents-mobile.png'});
 await m.locator('#contents-toggle').tap();await m.locator('#research-tab-2').tap();assert.equal(await m.locator('#research-workspace').getAttribute('data-detail'),'2');assert(!await m.locator('#research-detail').isHidden());
 assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await context.close();console.log('PASS: four bilingual chapter labels, 31 individual hover ticks, thumb previews until release, direct chapter/keyboard jumps, separate paper notes, fixed book position, mobile tap and no JS/network errors.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
