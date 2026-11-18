const assert=require('node:assert/strict'),{chromium}=require('playwright'),sharp=require('sharp'),path=require('node:path');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 await p.goto(new URL('cecilia-world/hub.html?webgl=1',process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/').href);
 await p.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});assert.equal(await p.locator('body').getAttribute('data-failed'),null);
 const initial=await p.evaluate(()=>({wind:designWorld.world.game.weather.wind.value,width:designWorld.world.game.world.grass.bladeWidth.value,height:designWorld.world.game.world.grass.bladeHeight.value,leaves:designWorld.world.game.world.atmosphere.leaves.count,time:designWorld.world.game.ticker.elapsedScaled,leaf:Array.from(designWorld.world.game.world.atmosphere.leaves.instanceMatrix.array.slice(0,16)),audio:typeof window.__ceciliaAudio}));
 assert(initial.width>.22&&initial.width<.25);assert.equal(initial.height,.70);assert.equal(initial.leaves,20);assert.equal(initial.audio,'undefined');
 await p.waitForFunction(t=>designWorld.world.game.ticker.elapsedScaled>t+.1,initial.time,{timeout:90000});assert.notDeepEqual(await p.evaluate(()=>Array.from(designWorld.world.game.world.atmosphere.leaves.instanceMatrix.array.slice(0,16))),initial.leaf);
 const point=await p.evaluate(()=>{const m=designWorld.kioskFace;m.geometry.computeBoundingBox();const v=m.geometry.boundingBox.getCenter(m.position.clone().set(0,0,0));m.localToWorld(v);v.project(designWorld.world.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};});
 await p.mouse.move(point.x,point.y);await p.waitForFunction(()=>document.querySelector('#map-hover-hint').classList.contains('visible'));
 await sharp(await p.screenshot()).webp({quality:90}).toFile(path.join(__dirname,'../experiments/bruno-projects/public/review/world-atmosphere.webp'));
 await p.mouse.click(point.x,point.y);await p.waitForFunction(()=>document.querySelector('#world-map').open);assert.equal(await p.evaluate(()=>typeof window.__ceciliaAudio),'undefined');
 await p.locator('#close-map').click();
 assert.equal(await p.locator('#sound-toggle,#overview-world,#overview').count(),0);
 await p.locator('#reset-view').click();

 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS live water/leaf shaders, slender grass, moving leaves, map hover guide and opening, no ambient audio or overview controls, reset control; no errors/404.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
