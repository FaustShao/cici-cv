const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:1662,height:882},reducedMotion:'reduce'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(new URL('cecilia-world/hub.html?webgl=1',process.env.PREVIEW_ROOT||'http://127.0.0.1:8000/').href);
  await p.waitForFunction(()=>window.designWorld||document.body.dataset.failed,null,{timeout:90000});
  assert.equal(await p.locator('body').getAttribute('data-failed'),null,await p.locator('#error-message').textContent());
  const initial=await p.evaluate(()=>designWorld.viewState());
  async function frame(){const n=await p.evaluate(()=>designWorld.world.renderCount);await p.waitForFunction(n=>designWorld.world.renderCount>n,n);}
  await frame();await p.screenshot({path:'/tmp/clearing-home.png'});
  await p.evaluate(()=>designWorld.go('contact'));await frame();await p.screenshot({path:'/tmp/clearing-contact.png'});
  const result=await p.evaluate(()=>{
   const w=designWorld,s=w.world.scene,root=w.stations.get('contact').root,sign=w.stations.get('contact').label;
   const bench=root.getObjectByName('benchPhysicalDynamic005'),sculpture=root.getObjectByName('contact-stone-sculpture');
   const pairs=[['sign/contact',sign,root],['bench/sculpture',bench,sculpture],['contact/welcome',root,w.welcome]];
   s.traverse(n=>{if(/^(fence|poleLight|lantern|bridge)Physical/.test(n.name))pairs.push(['contact/'+n.name,root,n]);});
   const mailbox=root.getObjectByName('mailbox-label'),pt=mailbox.position.clone().set(0,0,0);mailbox.localToWorld(pt).project(w.world.camera);
   return{keyboardRemoved:!s.getObjectByName('Plane002')&&!s.getObjectByName('Plane004'),
    contacts:pairs.map(([name,a,b])=>({name,contacts:w.geometryContacts(a,b)})).filter(n=>n.contacts.length),
    bench:bench.userData.parcel,contact:root.userData.parcel,sign:sign.userData.parcel,
    welcome:{parcel:w.welcome.userData.parcel,scale:w.welcome.scale.x,text:w.welcome.userData.text,labels:w.welcome.children.filter(c=>c.userData.text).map(c=>({text:c.userData.text,font:c.userData.font,y:c.position.y,width:c.geometry.parameters.width,height:c.geometry.parameters.height}))},
    name:{resolution:w.identity.userData.glyphResolution,ratio:w.identity.userData.captionRatio},
    wind:{strength:w.world.game.wind.strength.value,timeFrequency:w.world.game.wind.timeFrequency,pinkCount:w.world.game.world.flowers?.references.length||0},
    mailbox:{x:(pt.x+1)*innerWidth/2,y:(1-pt.y)*innerHeight/2,mailto:root.userData.mailto},ring:s.getObjectByName('mailbox-click-ring').material.opacity};
  });
  console.log(JSON.stringify(result,null,2));
  assert.ok(result.keyboardRemoved);assert.deepEqual(result.contacts,[]);
  assert.ok(Math.abs(result.bench.groundedY-.015)<.001);assert.equal(result.contact.z,28);assert.equal(result.sign.z,29.5);
  assert.equal(result.welcome.scale,1.65);assert.equal(result.welcome.parcel.x,48);assert.equal(result.welcome.parcel.z,34.56);
  assert.deepEqual(result.welcome.labels.map(l=>l.text),['王钰欣 / Cecilia','的个人网站']);assert.ok(result.welcome.labels.every(l=>l.font==='World Xiaolai'&&l.width<=1.98&&l.height<=.28));
  for(const [i,limits] of [[0,[-.225,.17]],[1,[-.687,-.3]]]){const l=result.welcome.labels[i];assert.ok(l.y-l.height/2>limits[0]&&l.y+l.height/2<limits[1],'Text planes stay within the actual solid planks');}
  assert.equal(result.name.resolution,56);assert.ok(result.name.ratio>.25&&result.name.ratio<.35);assert.ok(result.wind.strength>.5&&result.wind.pinkCount>0);
  assert.equal(await p.evaluate(({x,y})=>designWorld.pick(x,y),result.mailbox),'contact-mail');
  assert.equal(result.mailbox.mailto,'mailto:wangyuxinqd2025@163.com');
  assert.ok(await p.evaluate(()=>{const w=designWorld.world,foliage=w.game.world.cherryTrees.leaves,rest=foliage.restMatrices.slice(),before=foliage.instanceMatrix.array.slice();w.game.ticker.elapsedScaled+=1;foliage.update();return before.some((n,i)=>n!==foliage.instanceMatrix.array[i])&&rest.every((n,i)=>n===foliage.restMatrices[i]);}),'Wind moves leaf clusters without drifting their rest positions');
  await p.locator('#map-trigger').click();await p.screenshot({path:'/tmp/clearing-map.png'});
  assert.ok(await p.locator('#world-map').evaluate(n=>n.getBoundingClientRect().width<=942));
  await p.locator('.map-you').click();await frame();assert.deepEqual(await p.evaluate(()=>designWorld.viewState()),initial);
  await p.setViewportSize({width:390,height:844});await p.locator('#map-trigger').click();await p.screenshot({path:'/tmp/clearing-map-mobile.png'});
  assert.ok(await p.locator('#world-map').evaluate(n=>n.getBoundingClientRect().width<=innerWidth));
  await p.locator('.map-location[data-destination="contact"]').click();await frame();assert.equal(await p.evaluate(()=>WORLD_STATE.place),'contact');
  assert.deepEqual(errors,[]);console.log('PASS relocated complete contact group, ground/separation, name, typography, compact map and exact home reset.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
