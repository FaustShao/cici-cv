const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],bad=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))bad.push(r.url())});
 await p.goto(new URL('cecilia-world/hub.html?webgl=1#other',process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/').href);
 await p.waitForFunction(()=>window.designWorld&&document.body.dataset.ready,null,{timeout:180000});
 assert.equal(await p.evaluate(()=>RESUME.projects.filter(p=>p.collection!=='portfolio').length),4);
 await p.evaluate(()=>{designWorld.selectOther(0);designWorld.openCurrent();designWorld.world.renderer.setAnimationLoop(null)});
 async function frame(){const f=await(await p.locator('#frames iframe:visible').elementHandle()).contentFrame();await f.waitForFunction(()=>window.ICOD_ARCHIVE);return f;}
 let f=await frame();assert.equal(await f.evaluate(()=>ICOD_ARCHIVE.state.section),'final');
 await f.evaluate(()=>{ICOD_ARCHIVE.selectSection('mid');ICOD_ARCHIVE.selectIndex(10);ICOD_ARCHIVE.openViewer()});
 await p.screenshot({path:'/tmp/icod-embedded.png'});
 await p.locator('#close-reader').click();assert.equal(await p.locator('#frames iframe[data-project=icod]').count(),0);
 await p.evaluate(()=>designWorld.openCurrent());f=await frame();assert.equal(await f.evaluate(()=>ICOD_ARCHIVE.state.index),0);assert.equal(await f.evaluate(()=>ICOD_ARCHIVE.state.section),'final');assert.ok(!await f.locator('#image-viewer').evaluate(e=>e.open));
 assert.equal(await f.locator('#back-other,.archive-header').count(),0);
 for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){
  await p.setViewportSize(viewport);
  for(const section of['final','mid','certificate']){
   await f.evaluate(section=>{ICOD_ARCHIVE.selectSection(section);if(section!=='certificate')ICOD_ARCHIVE.selectView('space');},section);
   await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.ok(await f.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.body.scrollHeight<=innerHeight+1),'Embedded archive also fits the available iframe viewport');
  }
 }
 await p.locator('#close-reader').click();
 assert.ok(!await p.locator('#reader').evaluate(d=>d.open));assert.equal(await p.evaluate(()=>WORLD_STATE.place),'other');
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log('PASS: ICoD is the first of four other projects; opens archive with its cover; original other projects retained; exit removes iframe; repeat entry resets; outer return keeps the same scene; embedded desktop/mobile layouts do not scroll.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
