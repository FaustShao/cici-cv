const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.addInitScript(()=>{
  window.__paperSounds=[];
  const Audio=window.AudioContext||window.webkitAudioContext;
  const create=Audio.prototype.createBufferSource;
  Audio.prototype.createBufferSource=function(){const s=create.call(this),start=s.start;s.start=function(...args){window.__paperSounds.push({duration:s.buffer?.duration,state:s.context.state});return start.apply(this,args)};return s};
 });
 const p=await context.newPage(),errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 await p.goto(new URL('gazette.html',root).href);await p.waitForFunction(()=>window.GAZETTE_BOOK&&!document.getElementById('reader').dataset.entering);
 const sounds=()=>p.evaluate(()=>__paperSounds.length);assert.equal(await sounds(),0,'No initial playback');
 await p.locator('#research-tab-1').hover();await p.waitForTimeout(300);assert.equal(await sounds(),0,'Hover is silent');
 await p.mouse.move(700,25);await p.waitForTimeout(400);
 const cover=await p.locator('.paper[data-pdf-page="1"]').boundingBox();await p.mouse.click(cover.x+cover.width*.55,cover.y+cover.height*.5);
 await p.waitForFunction(()=>GAZETTE_BOOK.getPage()===2&&document.getElementById('reader').dataset.flipState==='read');
 await p.waitForFunction(()=>__paperSounds.length===1);await p.waitForTimeout(450);assert.equal(await sounds(),1,'One sound for one flip');
 const record=await p.evaluate(()=>__paperSounds[0]);assert(record.duration>.3&&record.duration<.6);assert.equal(record.state,'running');
 await p.locator('#reader').focus();await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>GAZETTE_BOOK.getPage()===4&&document.getElementById('reader').dataset.flipState==='read');await p.waitForFunction(()=>__paperSounds.length===2);
 await p.evaluate(()=>GAZETTE_BOOK.goToPage(4));await p.waitForTimeout(200);assert.equal(await sounds(),2,'Same-page requests stay silent');
 const spread=await p.locator('.book-shell').boundingBox();await p.mouse.move(spread.x+spread.width*.9,spread.y+spread.height*.5);await p.mouse.down();await p.mouse.move(spread.x+spread.width*.9-12,spread.y+spread.height*.5,{steps:3});await p.mouse.up();await p.waitForTimeout(1000);assert.equal(await sounds(),2,'Cancelled fold stays silent');assert.equal(await p.evaluate(()=>GAZETTE_BOOK.getPage()),4);
 await p.setViewportSize({width:1360,height:850});await p.waitForTimeout(500);assert.equal(await sounds(),2,'Resize rebuild stays silent');
 await p.locator('#fullscreen-book').click();await p.waitForTimeout(500);assert.equal(await sounds(),2,'Fullscreen rebuild stays silent');await p.locator('#fullscreen-book').click();await p.waitForTimeout(500);
 await p.locator('#contents-toggle').hover();await p.locator('.contents-chapter[data-page="20"]').click();await p.waitForFunction(()=>__paperSounds.length===3);await p.waitForTimeout(300);assert.equal(await sounds(),3,'Chapter jump plays once despite multiple UI announcements');
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await mobile.addInitScript(()=>{
  window.__paperSounds=[];const Audio=window.AudioContext||window.webkitAudioContext,create=Audio.prototype.createBufferSource;
  Audio.prototype.createBufferSource=function(){const s=create.call(this),start=s.start;s.start=function(...args){__paperSounds.push(1);return start.apply(this,args)};return s};
 });
 const m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(new URL('gazette.html',root).href);await m.waitForFunction(()=>window.GAZETTE_BOOK);assert.equal(await m.evaluate(()=>__paperSounds.length),0);
 const c=await m.locator('.paper[data-pdf-page="1"]').boundingBox();await m.touchscreen.tap(c.x+c.width*.65,c.y+c.height*.5);await m.waitForFunction(()=>__paperSounds.length===1);assert.equal(await m.evaluate(()=>GAZETTE_BOOK.getPage()),2);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await mobile.close();await context.close();console.log('PASS: real MP3 decoding and gesture-unlocked playback; one sound per click/key/chapter turn; initial load, hover, duplicate announcements, resize and fullscreen silent; mobile tap works.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
