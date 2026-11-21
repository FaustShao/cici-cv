const assert=require('node:assert/strict');const {chromium}=require('playwright');
const base=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 let release;const coverGate=new Promise(r=>release=r);
 await p.route('**/assets/haha-world/pages/01.webp',async route=>{await coverGate;await route.continue()});
 await p.addInitScript(()=>{window.drawnGlyphs=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(this.canvas.id==='paper-field')window.drawnGlyphs.push(text);return fill.call(this,text,...args)}});
 await p.goto(new URL('cecilia-world/haha-world.html',base).href,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.HAHA_READER);
 assert.ok(!await p.evaluate(()=>HAHA_READER.state.ready));assert.equal(await p.locator('#magazine-canvas').evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.equal(await p.locator('#cover-poster').count(),0);
 release();await p.waitForFunction(()=>HAHA_READER.state.ready,null,{timeout:90000});
 const pose=await p.evaluate(()=>({x:HAHA_READER.bookGroup.position.x,rot:HAHA_READER.bookGroup.rotation.toArray(),left:HAHA_READER.camera.left}));
 await p.waitForTimeout(500);const settled=await p.evaluate(()=>({x:HAHA_READER.bookGroup.position.x,rot:HAHA_READER.bookGroup.rotation.toArray(),left:HAHA_READER.camera.left}));
 assert.deepEqual(pose,settled,'First visible book frame already has its final cover pose');assert.ok(await p.evaluate(()=>HAHA_READER.loaded.has(0)));
 assert.deepEqual(await p.locator('.specimen>b').allTextContents(),['a','h','a']);assert.ok((await p.locator('.specimen>span').allTextContents()).every(t=>t.replace('×','').trim()==='haha.world'));
 await p.mouse.move(140,140);await p.mouse.move(600,180,{steps:12});await p.waitForFunction(()=>drawnGlyphs.length>0);assert.ok(await p.evaluate(()=>drawnGlyphs.every(g=>g==='h'||g==='a')));
 await p.screenshot({path:'/tmp/haha-stable-first-frame.png'});await p.close();
 console.log('PASS: cover delayed without a poster flash; actual textured cover is fully posed on first reveal; all window headings and pointer glyphs match ha branding.');
 const hub=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});hub.on('pageerror',e=>errors.push(e.message));
 await hub.goto(new URL('cecilia-world/hub.html?webgl=1',base).href,{waitUntil:'domcontentloaded'});
 if(!await hub.evaluate(()=>document.body.dataset.ready))assert.equal(await hub.locator('#world').evaluate(e=>getComputedStyle(e).visibility),'hidden');
 await hub.waitForFunction(()=>window.designWorld&&document.body.dataset.ready,null,{timeout:120000});
 for(const index of [2,0,1,2,1,0]){
  const result=await hub.evaluate(index=>{designWorld.selectOther(index);return{index:WORLD_STATE.otherIndex,...designWorld.world.labCover}},index);
  assert.equal(result.index,index);assert.equal(result.source,index===2?'assets/haha-world/pages/01.webp':index===0?'assets/icod/final/01-preview.webp':'text');
 }
 await hub.evaluate(()=>designWorld.go('resume'));await hub.waitForTimeout(250);
 const paper=await hub.evaluate(()=>{const s=designWorld.world.scene,p=s.getObjectByName('actual-resume-first-page');return{unlit:p.material.isMeshBasicNodeMaterial,toneMapped:p.material.toneMapped,z:p.position.z,backing:s.getObjectByName('resume-paper-backing')?.position.z,tape:!!s.getObjectByName('resume-paper-tape-left'),ground:designWorld.world.groundedLights.length}});
 assert.ok(paper.unlit&&!paper.toneMapped&&paper.z>paper.backing&&paper.tape);await hub.screenshot({path:'/tmp/resume-neutral-paper.png',timeout:45000});
 await hub.evaluate(()=>designWorld.world.renderer.setAnimationLoop(null));assert.deepEqual(errors,[]);
 console.log('PASS: current other-project covers are synchronously committed after preload; initial scene waits behind its reveal; resume is neutral printed artwork with thin backing and tape.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
