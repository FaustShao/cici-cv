const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:850},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/bruno-preview/hub.html?webgl=1');
  await page.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
  assert.equal(await page.locator('body').getAttribute('data-failed'),null);
  const result=await page.evaluate(()=>{
   const w=designWorld;
   const visited=new Set();
   function shares(node,depth=0){
    if(node===w.mapBrightness||node?.uuid===w.mapBrightness.uuid)return true;
    if(!node||typeof node!=='object'||depth>7||visited.has(node))return false;
    visited.add(node);return Object.values(node).some(v=>shares(v,depth+1));
   }
   return {removed:!w.world.scene.getObjectByName('lantern015'),welcome:w.welcome.userData.parcel,kiosk:w.kioskRoot.userData.parcel,
    contact:w.stations.get('contact').root.userData.parcel,joystick:w.devices.roots[1].scale.x,
    fingerUniform:shares(w.pixelHand.children[1].material._colorNode),
    initial:w.viewState()};
  });
  console.log('Fixture placement:',JSON.stringify(result));
  assert.ok(result.removed);assert.equal(result.joystick,.68);assert.ok(result.welcome.x>result.kiosk.x);assert.equal(result.contact.x,53);
  assert.ok(result.fingerUniform,'Pixel finger shares the map flash uniform');
  for(const k of ['home','resume','other','contact']){
   await page.evaluate(k=>designWorld.go(k),k);
   const n=await page.evaluate(()=>designWorld.world.renderCount);
   await page.waitForFunction(n=>designWorld.world.renderCount>n,n);
   await page.screenshot({path:'/tmp/figma-final-'+k+'.png'});
   if(k==='resume'){
    assert.ok(await page.evaluate(()=>{
     const board=designWorld.stations.get('resume').root.getObjectByName('resume-preview-board');
     return Math.abs(board.position.y-board.userData.supportY)<1e-6&&board.userData.supportGaps.every(g=>g<.025);
    }),'Preview board rests on the actual tabletop, not on the open book bounds');
    const point=await page.evaluate(()=>{
     const mesh=designWorld.stations.get('resume').root.getObjectByName('actual-resume-first-page');
     const p=mesh.position.clone().set(0,0,0);mesh.localToWorld(p).project(designWorld.world.camera);
     const x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;
     return{x,y,hit:designWorld.pick(x,y)};
    });
    assert.equal(point.hit,'resume-preview');await page.mouse.click(point.x,point.y);
    assert.equal(await page.locator('#reader').evaluate(e=>e.open),true);
    assert.ok((await page.locator('#frames iframe').getAttribute('src')).endsWith('resume.html?document=1'));
    await page.locator('#close-reader').click();
   }
  }
  await page.locator('#reset-view').click();
  await page.waitForFunction(()=>WORLD_STATE.place==='home'&&designWorld.viewState().yaw===.55);
  assert.deepEqual(await page.evaluate(()=>designWorld.viewState()),result.initial);
  assert.deepEqual(errors,[]);console.log('PASS Figma revisions:',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
