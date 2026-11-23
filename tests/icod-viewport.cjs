const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=process.env.PREVIEW_ROOT||'http://127.0.0.1:8770/cici-cv/';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await browser.newPage({reducedMotion:'reduce'}),errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 await p.goto(new URL('cecilia-world/icod.html',base).href);await p.waitForFunction(()=>window.ICOD_ARCHIVE&&!document.documentElement.dataset.releaseState);
 async function fits(){assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.body.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1),'Document fits one viewport');const rect=await p.locator('.layout-controls').boundingBox();assert.ok(rect.x+rect.width<=await p.evaluate(()=>innerWidth));assert.ok(rect.y>=0&&rect.y+rect.height<80);}
 assert.equal(await p.locator('.archive-header,#back-other,h1').count(),0);assert.equal(await p.locator('.layout-controls [data-view]').count(),2);
 for(const viewport of[{width:1440,height:900},{width:1280,height:720},{width:768,height:1024},{width:390,height:844},{width:844,height:390},{width:320,height:568}]){
  await p.setViewportSize(viewport);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await p.evaluate(()=>{ICOD_ARCHIVE.selectSection('final');ICOD_ARCHIVE.selectView('space');});await fits();
  const bounds=await p.locator('.archive-card[data-active=true]').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=40&&bounds.x+bounds.width<=viewport.width&&bounds.y+bounds.height<=viewport.height-60);assert.ok(Math.abs(bounds.width/bounds.height-16/9)<.01);
  await p.mouse.wheel(0,350);assert.equal(await p.evaluate(()=>scrollY),0);
  for(const section of['final','mid']){
   await p.evaluate(section=>{ICOD_ARCHIVE.selectSection(section);ICOD_ARCHIVE.selectIndex(0);ICOD_ARCHIVE.selectView('grid');},section);await fits();
   const total=await p.evaluate(()=>ICOD_ARCHIVE.manifest.sections.find(s=>s.id===ICOD_ARCHIVE.state.section).pages.length),seen=new Set();
   while(true){for(const n of await p.locator('.grid-card').evaluateAll(cards=>cards.map(c=>Number(c.dataset.index))))seen.add(n);
    const outside=await p.locator('.grid-card').evaluateAll(cards=>cards.some(c=>{const r=c.getBoundingClientRect();return r.x<0||r.y<0||r.right>innerWidth+1||r.bottom>innerHeight+1}));assert.ok(!outside);await fits();if(await p.locator('#grid-next').isDisabled())break;await p.locator('#grid-next').click();}
   assert.equal(seen.size,total,'Every original page remains reachable without scrolling');
  }
  await p.evaluate(()=>ICOD_ARCHIVE.selectSection('certificate'));await p.locator('#certificate-art img').evaluate(im=>im.decode());await fits();
  const cert=await p.locator('#certificate-art img').boundingBox();assert.ok(cert.x>=0&&cert.y>=40&&cert.x+cert.width<=viewport.width+1&&cert.y+cert.height<=viewport.height-20,'Certificate fully visible');
  if(viewport.width===1440||viewport.width===390){await p.screenshot({path:'/workspace/icod-fit-certificate-'+viewport.width+'.png'});await p.evaluate(()=>{ICOD_ARCHIVE.selectSection('final');ICOD_ARCHIVE.selectView('space')});await p.screenshot({path:'/workspace/icod-fit-space-'+viewport.width+'.png'});await p.evaluate(()=>ICOD_ARCHIVE.selectView('grid'));await p.screenshot({path:'/workspace/icod-fit-grid-'+viewport.width+'.png'});}
 }
 // The same constraints apply inside the real host's remaining iframe area.
 await p.setViewportSize({width:1440,height:900});await p.goto(new URL('cecilia-world/icod.html',base).href);await p.waitForFunction(()=>window.ICOD_ARCHIVE&&!document.documentElement.dataset.releaseState);
 await p.evaluate(()=>ICOD_ARCHIVE.selectSection('mid'));await p.locator('[data-view=grid]').click();await p.locator('#grid-next').click();const index=Number(await p.locator('.grid-card').first().getAttribute('data-index'));await p.locator('.grid-card').first().click();assert.equal(await p.evaluate(()=>ICOD_ARCHIVE.state.index),index);assert.ok(await p.locator('#image-viewer').evaluate(e=>e.open));await p.locator('#full-image').evaluate(im=>im.decode());await p.locator('#viewer-next').click();assert.equal(await p.evaluate(()=>ICOD_ARCHIVE.state.index),index+1);await p.keyboard.press('Escape');await fits();
 await p.locator('[data-view=space]').click();await p.locator('#next').click();assert.equal(await p.evaluate(()=>ICOD_ARCHIVE.state.index),index+2);
 await p.evaluate(()=>ICOD_ARCHIVE.selectSection('certificate'));await p.locator('#certificate-art button').click();await p.locator('#full-image').evaluate(im=>im.decode());assert.equal(await p.locator('#full-image').evaluate(im=>im.naturalWidth),1810);await p.locator('#close-viewer').click();
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS six desktop/tablet/mobile/landscape sizes: header removed, two controls in content toolbar, no document scroll; space artwork and certificate fit; all 37 pages reachable in paginated overview; full-resolution viewer and navigation preserved.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
