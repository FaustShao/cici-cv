const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8770/cici-cv/';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await b.newContext({viewport,reducedMotion:'reduce',...(viewport.width<700?{isMobile:true,hasTouch:true}:{})});
  await context.addInitScript(()=>{
   window.__paperSounds=[];window.__paperGains=[];
   const A=window.AudioContext||window.webkitAudioContext,start=A.prototype.createBufferSource,createGain=A.prototype.createGain;
   A.prototype.createBufferSource=function(){const s=start.call(this),play=s.start;s.start=function(...args){if(s.buffer?.duration>.3)__paperSounds.push({duration:s.buffer.duration,state:s.context.state});return play.apply(this,args)};return s};
   A.prototype.createGain=function(){const g=createGain.call(this);__paperGains.push(g.gain);return g};
  });
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(new URL('cecilia-world/haha-world.html',root).href);await p.waitForFunction(()=>window.HAHA_READER?.state.ready,null,{timeout:90000});
  assert.equal(await p.locator('.identity').count(),0);assert.equal(await p.evaluate(()=>__paperSounds.length),0,'Initial load is silent');
  await p.mouse.move(100,160);await p.mouse.move(320,170,{steps:5});assert.equal(await p.evaluate(()=>__paperSounds.length),0,'Background motion is silent');
  if(viewport.width<700){
    const point=await p.evaluate(()=>{const w=HAHA_READER,v=w.bookGroup.localToWorld(w.bookGroup.position.clone().set(.32,0,.01)).project(w.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}});
    await p.touchscreen.tap(point.x,point.y);
  }else{await p.locator('#magazine-canvas').focus();await p.keyboard.press('ArrowRight');}
  await p.waitForFunction(()=>HAHA_READER.state.page===1&&!HAHA_READER.magazine.turning);await p.waitForFunction(()=>__paperSounds.length===1);
  const record=await p.evaluate(()=>__paperSounds[0]);assert(record.duration>.3&&record.duration<.6);assert.equal(record.state,'running');assert.equal(await p.evaluate(()=>__paperGains.at(-1).value),Math.fround(.12));
  await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>HAHA_READER.state.page===3&&!HAHA_READER.magazine.turning);await p.waitForFunction(()=>__paperSounds.length===2);
  await p.evaluate(()=>HAHA_READER.goTo(3));assert.equal(await p.evaluate(()=>__paperSounds.length),2,'Same-page requests do not replay sound');
  await p.setViewportSize({width:viewport.width,height:viewport.height-30});await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>__paperSounds.length),2,'Resizing is silent');
  await p.locator('#return-cover').click();await p.waitForFunction(()=>HAHA_READER.state.page===0);await p.waitForFunction(()=>__paperSounds.length===3);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS desktop/mobile: no duplicate heading; quiet decoded paper recording once per actual page turn; initial load, hover, duplicate page requests and resizing stay silent.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
