const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{try{localStorage.setItem('resume-theme','dark');}catch{}});
  await p.goto('http://127.0.0.1:8000/gazette.html');
  await p.waitForFunction(()=>document.querySelector('#book .paper'));
  assert.equal(await p.locator('#theme').count(),0);assert.equal(await p.locator('html').getAttribute('data-theme'),'light');
  assert.equal(await p.locator('#reader').getAttribute('data-entering'),'true');
  await p.waitForFunction(()=>!document.querySelector('#reader').dataset.entering);
  assert.equal(await p.locator('.book-pose').evaluate(e=>getComputedStyle(e).transform),'none');
  let cover=await p.locator('.paper[data-pdf-page="1"]').boundingBox();
  assert.ok(cover.height>810,'Book fills the reading height instead of the old small stage');
  assert.ok(Math.abs(cover.width/cover.height-2/3)<.001);assert.ok(Math.abs(cover.x+cover.width/2-720)<2,'Closed cover is centered');
  await p.screenshot({path:'/tmp/gazette-large-centered.png'});
  await p.locator('#fullscreen-book').click();await p.waitForFunction(()=>document.fullscreenElement||document.querySelector('main').classList.contains('is-expanded'));
  await p.waitForFunction(()=>document.getElementById('fullscreen-book').getAttribute('aria-pressed')==='true');
  await p.waitForTimeout(350);await p.locator('#reader').focus();await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>document.querySelector('.book-shell').dataset.cover!=='true');
  assert.notEqual(await p.locator('.book-shell').getAttribute('data-cover'),'true');
  const before=await p.locator('#reader-message').textContent();
  await p.locator('#fullscreen-book').click();await p.waitForFunction(()=>!document.fullscreenElement&&!document.querySelector('main').classList.contains('is-expanded'));
  await p.waitForTimeout(350);assert.equal(await p.locator('#reader-message').textContent(),before);
  await p.keyboard.press('ArrowLeft');await p.waitForTimeout(1300);assert.equal(await p.locator('.book-shell').getAttribute('data-cover'),'true');
  await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:390,height:844});await p.reload();await p.waitForFunction(()=>document.querySelector('#book .paper'));
  assert.notEqual(await p.locator('#reader').getAttribute('data-entering'),'true');
  cover=await p.locator('.paper[data-pdf-page="1"]').boundingBox();assert.ok(cover.x>=0&&cover.x+cover.width<=390);await p.screenshot({path:'/tmp/gazette-large-mobile.png'});
  await p.setViewportSize({width:1440,height:900});await p.goto('http://127.0.0.1:8000/tideline.html');
  assert.equal(await p.locator('#project-back').count(),1);assert.equal(await p.locator('.feature-static').getAttribute('href'),null);
  const original=p.url();await p.locator('.feature-static').click();assert.equal(p.url(),original);assert.equal(await p.locator('.feature-static').evaluate(e=>getComputedStyle(e).cursor),'default');
  assert.equal(await p.locator('.join-link').getAttribute('href'),'mailto:wangyuxinqd2025@163.com');
  for(const route of ['teas','material','packaging','merch','diary','service','research']){
   await p.evaluate(route=>location.hash=route,route);await p.waitForFunction(route=>document.querySelector('.canvas')?.getAttribute('aria-label')===({teas:'TEAS',material:'Material',packaging:'Packaging',merch:'MERCH',diary:'DESIGN DIARY',service:'SERVICE SYSTEM',research:'RESEARCH'})[route],route);
   assert.ok(await p.locator('#project-back').isVisible());
  }
  await p.locator('#project-back').click();await p.waitForURL('**/tideline.html#service');
  await p.locator('#project-back').click();await p.waitForURL('**/tideline.html#diary');
  await p.goto('about:blank');await p.goto('http://127.0.0.1:8000/tideline.html#material');await p.locator('#project-back').click();await p.waitForURL('**/tideline.html#home');
  await p.route('**/portfolio.html',r=>r.fulfill({contentType:'text/html',body:'Portfolio destination'}));
  await p.locator('#project-back').click();await p.waitForURL('**/portfolio.html');
  assert.deepEqual(errors,[]);console.log('PASS enlarged proportional/centered book, 3D entry ends flat, fullscreen roundtrip and page preservation, reduced motion/mobile, sticky Tideline back on all pages, history/fallbacks, inert About Us and email Join.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
