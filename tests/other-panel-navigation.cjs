const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:2048,height:1088},reducedMotion:'reduce'}),errors=[],bad=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))bad.push(r.url())});
 await p.goto(new URL('cecilia-world/hub.html?webgl=1#other',process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/').href);
 await p.waitForFunction(()=>window.designWorld&&document.body.dataset.ready,null,{timeout:120000});
 assert.ok(await p.locator('#place-actions').evaluate(e=>e.hidden));assert.equal(await p.locator('#place-actions button').count(),0);
 const v=await p.evaluate(()=>designWorld.viewState());assert.equal(v.distance,11.5);assert.equal(v.pitch,1.36);assert.equal(v.yaw,.55);
 async function aligned(){for(const [id,name]of[['lab-previous','refArrowPrevious'],['lab-next','refArrowNext']]){
  const target=await p.evaluate(name=>{const a=designWorld.stations.get('other').root.getObjectByName(name),q=a.geometry.attributes.position;let x=0,y=0,z=0;for(let i=0;i<q.count;i++){x+=q.getX(i);y+=q.getY(i);z+=q.getZ(i)}const point=a.position.clone().set(x/q.count,y/q.count,z/q.count);a.localToWorld(point);point.project(designWorld.world.camera);return{x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2}},name);
  const rect=await p.locator('#'+id).boundingBox();assert.ok(rect&&rect.width>=44&&rect.height>=44);assert.ok(target.x>rect.x&&target.x<rect.x+rect.width&&target.y>rect.y&&target.y<rect.y+rect.height,'Hit target covers the arrow on its purple block');
 }}await aligned();
 for(const i of[1,2,0]){await p.locator('#lab-next').click();assert.equal(await p.evaluate(()=>WORLD_STATE.otherIndex),i);assert.ok(!await p.locator('#reader').evaluate(e=>e.open));}
 await p.locator('#lab-previous').click();assert.equal(await p.evaluate(()=>WORLD_STATE.otherIndex),2);await p.screenshot({path:'/tmp/other-panel-desktop.png',timeout:45000});
 // The canvas is an aspect-fill crop: its edges come from the supplied art, never a letterbox background.
 const corners=await p.evaluate(async()=>{
  const {prepareLabCovers}=await import('/experiments/bruno-projects/src/lab-covers.js');
  const source=document.createElement('canvas');source.width=400;source.height=200;const ink=source.getContext('2d');ink.fillStyle='#123456';ink.fillRect(0,0,400,200);
  const project={name:'Aspect fill probe',tags:[],cover:source.toDataURL()};
  const prepared=(await prepareLabCovers([project],location.href)).get(project),ctx=prepared.getContext('2d');
  return [[0,0],[1399,0],[0,899],[1399,899]].map(([x,y])=>[...ctx.getImageData(x,y,1,1).data]);
 });for(const pixel of corners)assert.deepEqual(pixel,[18,52,86,255],'Every edge is filled by proportionally enlarged artwork');
 await p.evaluate(()=>designWorld.go('home'));assert.ok(await p.locator('#lab-navigation').evaluate(e=>e.hidden));
 const frames=await p.evaluate(()=>designWorld.world.renderCount);await p.setViewportSize({width:390,height:844});await p.evaluate(()=>designWorld.go('other'));await p.waitForFunction(n=>designWorld.world.renderCount>n+1,frames);await aligned();
 for(const id of['lab-previous','lab-next'])assert.ok(await p.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>0&&r.bottom<innerHeight}),'Mobile arrows stay on-screen');
 await p.locator('#lab-next').click();assert.equal(await p.evaluate(()=>WORLD_STATE.otherIndex),0);await p.screenshot({path:'/tmp/other-panel-mobile.png',timeout:45000});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS screenshot-calibrated camera; native arrows on purple blocks with aligned 44px+ targets; next/previous wrap correctly without opening a document; bottom controls removed; mobile controls remain usable.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
