const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:1100,height:750}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(new URL('cecilia-world/haha-world.html',process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/').href);
 await p.waitForFunction(()=>window.HAHA_READER?.state.ready,null,{timeout:90000});
 const before=await p.locator('#paper-field').evaluate(c=>c.toDataURL());
 await p.mouse.move(250,170);
 const frame=await p.evaluate(()=>HAHA_READER.backgroundFrame);await p.waitForFunction(n=>HAHA_READER.backgroundFrame>n+1,frame);
 assert.notEqual(await p.locator('#paper-field').evaluate(c=>c.toDataURL()),before,'The paper field responds to the pointer');
 const card=await p.locator('[data-card="a"]').boundingBox();
 await p.mouse.move(card.x+card.width/2,card.y+card.height/2);await p.mouse.down();await p.mouse.move(card.x+card.width/2+30,card.y+card.height/2+20,{steps:5});await p.mouse.up();
 assert.equal(await p.locator('[data-card="a"]').getAttribute('data-x'),'30');
 async function point(x,y=0){return p.evaluate(([x,y])=>{const w=HAHA_READER,v=w.bookGroup.localToWorld(w.bookGroup.position.clone().set(x,y,.03)).project(w.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}},[x,y])}
 const afterDrag=await p.evaluate(()=>HAHA_READER.backgroundFrame);await p.waitForFunction(n=>HAHA_READER.backgroundFrame>n,afterDrag);
 await p.evaluate(()=>{window.pointerLog=[];for(const type of ['pointerdown','pointerup'])document.getElementById('magazine-canvas').addEventListener(type,e=>pointerLog.push({type,enabled:HAHA_READER.magazine.enabled,covers:HAHA_READER.magazine.covers(e.clientX,e.clientY),x:e.clientX,y:e.clientY}),true)});
 const cover=await point(.7);await p.mouse.click(cover.x,cover.y);
 await p.waitForFunction(()=>HAHA_READER.state.page===1&&!HAHA_READER.magazine.turning,null,{timeout:45000}).catch(async e=>{console.log(await p.evaluate(()=>({snapshot:HAHA_READER.snapshot(),events:pointerLog})));throw e});
 console.log('Direct cover click passed');
 // Double-click is reserved for zoom, with no accidental two-page advance.
 const sheet=await point(.6);await p.mouse.dblclick(sheet.x,sheet.y,{delay:70});
 await p.waitForFunction(()=>document.getElementById('page-zoom').open);
 assert.equal(await p.evaluate(()=>HAHA_READER.state.page),1);
 console.log('Double-click zoom passed');
 assert.equal(await p.evaluate(()=>HAHA_READER.state.zoomPage),2);
 await p.locator('#close-zoom').click();
 const from=await point(.9,.1),to=await point(-.6,.12);
 await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:14});await p.mouse.up();
 await p.waitForFunction(()=>HAHA_READER.state.page===3&&!HAHA_READER.magazine.turning,null,{timeout:45000});
 assert.deepEqual(errors,[]);console.log('PASS pointer-responsive background, draggable specimen, direct cover click, double-click zoom without page advance, and physical page dragging.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
