const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=process.env.PREVIEW_ROOT||'http://127.0.0.1:8770/cici-cv/';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const context=await browser.newContext({viewport:{width:1600,height:850},reducedMotion:'reduce'}),p=await context.newPage(),errors=[],bad=[],documents=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});p.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===p.mainFrame())documents.push(r.url())});
 await p.goto(new URL('index.html?webgl=1',base).href,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.designWorld&&document.body.dataset.ready&&!document.documentElement.dataset.releaseState,null,{timeout:180000});
 await p.evaluate(()=>{window.original={document,renderer:designWorld.world.renderer,camera:designWorld.world.camera,scene:designWorld.world.scene,optimal:{...designWorld.world.game.view.optimalArea,position:designWorld.world.game.view.optimalArea.position.clone()},children:designWorld.world.scene.children.length};});
 const docs=documents.length;
 async function frames(){const n=await p.evaluate(()=>designWorld.world.renderCount);await p.waitForFunction(n=>designWorld.world.renderCount>n+1,n,{timeout:45000});}
 async function same(){assert.ok(await p.evaluate(()=>document===original.document&&designWorld.world.renderer===original.renderer&&designWorld.world.camera===original.camera&&designWorld.world.scene===original.scene));assert.equal(documents.length,docs);assert.equal(await p.locator('canvas#world').count(),1);assert.equal(await p.locator('#frames iframe').count(),0);}
 await p.locator('#map-trigger').click();await p.locator('[data-destination="portfolio"]').click();await frames();await same();
 assert.equal(await p.locator('body').getAttribute('data-place'),'portfolio');assert.equal(new URL(p.url()).hash,'#portfolio');
 const pose=await p.evaluate(()=>({camera:preview.game.view.camera.position.toArray(),fov:preview.game.view.camera.fov,far:preview.game.view.camera.far,optimal:{radius:preview.game.view.optimalArea.radius,near:preview.game.view.optimalArea.nearDistance,far:preview.game.view.optimalArea.farDistance},shadow:preview.game.lighting.shadowAmplitude}));
 assert.deepEqual(pose.camera,[41.8890022277832,4.000000000000002,19.107179260253908]);assert.equal(pose.fov,25);assert.equal(pose.far,200);assert.equal(pose.optimal.radius,30.777017424130015);assert.equal(pose.optimal.near,32.438012582093556);assert.equal(pose.optimal.far,63.84775905500702);assert.equal(pose.shadow,30.777017424130015);
 assert.deepEqual(await p.evaluate(()=>preview.area.pagination.items.map(i=>i.intersect.active)),[true,false,false,false,false]);
 async function modelArrow(name,index){const point=await p.evaluate(name=>{const m=preview.area.references.items.get(name)[0];m.geometry.computeBoundingBox();const point=m.geometry.boundingBox.getCenter(m.position.clone().set(0,0,0));m.localToWorld(point);point.project(preview.game.view.camera);return{x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2};},name);await p.mouse.click(point.x,point.y);await p.waitForFunction(i=>preview.area.navigation.index===i,index);assert.ok(!await p.locator('#reader').evaluate(e=>e.open));}
 let index=0;for(let i=0;i<6;i++){index=(index+1)%4;await modelArrow('arrowNextImage',index);}for(let i=0;i<3;i++){index=(index+3)%4;await modelArrow('arrowPreviousImage',index);}
 await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>preview.area.navigation.index),(index+1)%4);
 await p.locator('#previous').click();assert.equal(await p.evaluate(()=>preview.area.navigation.index),index);
 await p.mouse.move(720,460);await p.mouse.down();await p.mouse.move(750,480,{steps:3});await p.mouse.up();await frames();assert.ok(await p.evaluate(()=>Math.abs(designWorld.viewState().yaw-designWorld.portfolio.pose().yaw)>.01));
 await p.mouse.wheel(0,-140);await frames();assert.ok(await p.evaluate(()=>designWorld.viewState().distance<designWorld.portfolio.pose().distance));
 await p.evaluate(()=>designWorld.go('portfolio'));await frames();
 await p.screenshot({path:'/workspace/portfolio-unified-final.png',timeout:60000});
 for(const [i,file]of[[0,'tideline.html'],[1,'safepaw.html'],[2,'dream-sentinel.html'],[3,'gazette.html']]){
  await p.evaluate(i=>{preview.select(i);preview.readWork()},i);assert.equal(await p.locator('#frames iframe').count(),1);
  const f=await(await p.locator('#frames iframe').elementHandle()).contentFrame();await f.waitForURL(new RegExp(file));await f.waitForFunction(()=>document.documentElement.dataset.pageBoot==='ready'&&!document.documentElement.dataset.releaseState,null,{timeout:90000});
  if(i===0)await f.locator('#project-back').click().catch(e=>{if(!f.isDetached())throw e});else await p.locator('#close-reader').click();
  await same();assert.equal(await p.locator('body').getAttribute('data-place'),'portfolio');
 }
 await p.locator('#map-trigger').click();const selection=await p.locator('#selection').innerText();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#selection').innerText(),selection);await p.locator('[data-destination="other"]').click();await frames();await same();
 assert.equal(await p.locator('body').getAttribute('data-place'),'other');await p.locator('#lab-next').click();assert.equal(await p.evaluate(()=>WORLD_STATE.otherIndex),1);
 for(const place of['portfolio','resume','portfolio','contact','home','portfolio']){await p.evaluate(place=>designWorld.go(place),place);await frames();await same();}
 assert.equal(await p.evaluate(()=>designWorld.world.scene.children.length),await p.evaluate(()=>original.children));
 await p.setViewportSize({width:390,height:844});await frames();assert.ok(await p.evaluate(()=>preview.game.view.camera.fov>56),'Narrow mouse windows keep both full-size signs inside the frame');assert.ok(await p.locator('#map-trigger').isVisible());
 const map=await p.locator('#map-trigger').boundingBox(),controls=await p.locator('#controls').boundingBox();assert.ok(map.y+map.height<controls.y);
 await p.screenshot({path:'/workspace/portfolio-unified-final-mobile.png',timeout:60000});
 await p.locator('#reset-view').click();await frames();await same();assert.equal(await p.locator('body').getAttribute('data-place'),'home');assert.equal(await p.evaluate(()=>designWorld.world.camera.far),250);assert.equal(await p.evaluate(()=>designWorld.world.game.view.optimalArea.radius),45);
 await p.screenshot({path:'/workspace/home-unified-final-mobile.png',timeout:60000});
 await p.goBack();await p.waitForFunction(()=>WORLD_STATE.place==='portfolio');await frames();await same();
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log('PASS one document/renderer/camera/scene across all five stations and browser history; exact portfolio camera/fog/shadow calibration; model and keyboard arrows, drag, zoom, four readers with clean return, map isolation, mobile controls, unchanged home settings.');
 await context.close();
 // Legacy portfolio addresses load the unified application directly, with a useful #home after returning.
 const direct=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',hasTouch:true,isMobile:true});
 await direct.goto(new URL('portfolio.html?webgl=1',base).href,{waitUntil:'domcontentloaded'});await direct.waitForFunction(()=>window.designWorld&&document.body.dataset.ready&&!document.documentElement.dataset.releaseState,null,{timeout:180000});assert.equal(await direct.locator('body').getAttribute('data-place'),'portfolio');
 await direct.locator('#next').tap();assert.equal(await direct.evaluate(()=>preview.area.navigation.index),1);
 await direct.locator('#previous').tap();assert.equal(await direct.evaluate(()=>preview.area.navigation.index),0);
 await direct.evaluate(()=>{window.directDocument=document;window.directRenderer=preview.renderer;});
 const cdp=await direct.context().newCDPSession(direct);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:430,id:1},{x:230,y:430,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:430,id:1},{x:260,y:430,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const rn=await direct.evaluate(()=>designWorld.world.renderCount);await direct.waitForFunction(n=>designWorld.world.renderCount>n+1,rn);
 assert.ok(await direct.evaluate(()=>designWorld.viewState().distance<designWorld.portfolio.pose().distance),'Native two-finger pinch retains portfolio zoom');
 await direct.locator('#reset-view').tap();assert.ok(await direct.evaluate(()=>document===directDocument&&preview.renderer===directRenderer));assert.equal(new URL(direct.url()).hash,'#home');await direct.close();
 console.log('PASS direct portfolio alias enters the same app, returns home without a document navigation, and preserves the home hash for refresh.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
