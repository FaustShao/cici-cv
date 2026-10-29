const assert=require('node:assert/strict'),{chromium}=require('playwright');
const marks={
 home:[
  {world:[25.71241523989154,.07252831104907109,42.343609965858235],target:[9.9319,317.3383]},
  {world:[37.19235637036382,1.2236122111369323,45.35710472531336],target:[126.1685,483.4577]},
  {world:[29.234048199844448,.05927630601959244,41.109888661832976],target:[171.0677,349.4574]},
  {world:[38.21175438774673,1.1175654332577,44.88175162309969],target:[204.9302,505.5882]},
 ],
 contact:[
  {world:[46.78098491446437,1.9199082741730051,38.661918034846764],target:[262.1983,245.8149]},
  {world:[48.04410689439893,1.3618842663197526,40.11769220940611],target:[339.7814,307.0148]},
  {world:[46.48785277349086,1.2188062925331011,19.74453873185085],target:[454.2294,169.7686]},
 ]
};
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1662,height:882},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/bruno-preview/hub.html?webgl=1');
  await page.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
  assert.equal(await page.locator('body').getAttribute('data-failed'),null,await page.locator('#error-message').textContent());
  const initial=await page.evaluate(()=>designWorld.viewState());
  for(const kind of ['home','contact','resume']){
   await page.evaluate(kind=>designWorld.go(kind),kind);
   const n=await page.evaluate(()=>designWorld.world.renderCount);await page.waitForFunction(n=>designWorld.world.renderCount>n,n);
   if(marks[kind]){
    const errors=await page.evaluate(marks=>marks.map(({world,target})=>{
     const camera=designWorld.world.camera,p=camera.position.clone().set(...world).project(camera);
     return Math.hypot((p.x+1)*innerWidth/2-target[0]*innerWidth/1600,(1-p.y)*innerHeight/2-target[1]*innerHeight/850);
    }),marks[kind]);
    assert.ok(errors.every(e=>e<2.5),kind+' reference landmark pixel errors '+errors);console.log(kind,'reference landmark errors:',errors);
   }
   await page.screenshot({path:'/tmp/approved-layout-'+kind+'.png'});
  }
  const contacts=await page.evaluate(()=>{
   const w=designWorld,scene=w.world.scene,board=scene.getObjectByName('resume-preview-board'),resume=w.stations.get('resume'),contact=w.stations.get('contact'),bench=scene.getObjectByName('benchPhysicalDynamic001');
   const pairs=[['board/desk',board,resume.root],['board/label',board,resume.label],['bench/kiosk',bench,w.kioskRoot],['kiosk/welcome',w.kioskRoot,w.welcome]];
   const sword=scene.getObjectByName('sword');if(sword)pairs.push(['contact-sign/sword',contact.label,sword]);
   for(const device of w.devices.roots)pairs.push(['bench/'+device.name,bench,device]);
   return pairs.map(([name,a,b])=>({name,contacts:w.geometryContacts(a,b)}));
  });
  console.log('Physical intersections:',JSON.stringify(contacts));assert.ok(contacts.every(p=>p.contacts.length===0));
  const layout=await page.evaluate(()=>{
   const w=designWorld,board=w.world.scene.getObjectByName('resume-preview-board'),sign=w.stations.get('resume').label;
   return{independent:board.parent===w.world.scene,board:board.userData.parcel,sign:sign.userData.parcel,insertion:board.userData.insertionDepth,contactSign:w.stations.get('contact').label.userData.parcel,contact:w.stations.get('contact').root.userData.parcel};
  });
  assert.ok(layout.independent&&layout.insertion>0);assert.ok(Math.abs(layout.board.groundedY+layout.insertion)<1e-6);assert.ok(layout.sign.z>layout.board.z+2);assert.ok(layout.contactSign.x>layout.contact.x);
  const point=await page.evaluate(()=>{
   const mesh=designWorld.world.scene.getObjectByName('actual-resume-first-page'),p=mesh.position.clone().set(0,0,0);mesh.localToWorld(p).project(designWorld.world.camera);
   return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
  });
  await page.mouse.click(point.x,point.y);assert.ok(await page.locator('#reader').evaluate(e=>e.open));await page.locator('#close-reader').click();
  await page.locator('#reset-view').click();const n=await page.evaluate(()=>designWorld.world.renderCount);await page.waitForFunction(n=>designWorld.world.renderCount>n,n);
  assert.deepEqual(await page.evaluate(()=>designWorld.viewState()),initial);assert.deepEqual(errors,[]);
  console.log('PASS reference cameras, planted rear board/front sign, direct CV, geometry separation and exact initial reset.',JSON.stringify(layout));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
