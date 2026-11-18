const assert=require('node:assert/strict'),{chromium}=require('playwright'),sharp=require('sharp'),path=require('node:path');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 await p.goto(new URL('cecilia-world/hub.html?webgl=1',process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/').href);
 await p.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});assert.equal(await p.locator('body').getAttribute('data-failed'),null);
 const initial=await p.evaluate(()=>({wind:designWorld.world.game.weather.wind.value,width:designWorld.world.game.world.grass.bladeWidth.value,height:designWorld.world.game.world.grass.bladeHeight.value,leaves:designWorld.world.game.world.atmosphere.leaves.count,time:designWorld.world.game.ticker.elapsedScaled,leaf:Array.from(designWorld.world.game.world.atmosphere.leaves.instanceMatrix.array.slice(0,16)),audio:__ceciliaAudio.state}));
 assert.equal(initial.width,.045);assert.equal(initial.height,1.02);assert.equal(initial.leaves,20);assert.equal(initial.audio,'locked');
 await p.waitForFunction(t=>designWorld.world.game.ticker.elapsedScaled>t+.1,initial.time,{timeout:30000});assert.notDeepEqual(await p.evaluate(()=>Array.from(designWorld.world.game.world.atmosphere.leaves.instanceMatrix.array.slice(0,16))),initial.leaf);
 const point=await p.evaluate(()=>{const m=designWorld.kioskFace;m.geometry.computeBoundingBox();const v=m.geometry.boundingBox.getCenter(m.position.clone().set(0,0,0));m.localToWorld(v);v.project(designWorld.world.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};});
 await p.mouse.move(point.x,point.y);await p.waitForFunction(()=>document.querySelector('#map-hover-hint').classList.contains('visible'));
 await sharp(await p.screenshot()).webp({quality:90}).toFile(path.join(__dirname,'../experiments/bruno-projects/public/review/world-atmosphere.webp'));
 await p.mouse.click(point.x,point.y);await p.waitForFunction(()=>document.querySelector('#world-map').open);await p.waitForFunction(()=>__ceciliaAudio.state==='running');
 await p.locator('#close-map').click();await p.locator('#sound-toggle').click();assert.equal(await p.evaluate(()=>__ceciliaAudio.enabled),false);await p.locator('#sound-toggle').click();assert.equal(await p.evaluate(()=>__ceciliaAudio.enabled),true);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS live water/leaf shaders, slender grass, moving leaves, map hover guide and opening, gesture-only audio activation and mute toggle; no errors/404.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
