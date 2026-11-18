const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:1662,height:882},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{try{localStorage.setItem('resume-theme','dark');}catch{}});
  const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8000/';
  await p.goto(new URL('bruno-preview/hub.html?webgl=1',root).href);
  await p.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
  assert.equal(await p.locator('body').getAttribute('data-failed'),null);
  assert.equal(await p.locator('#theme,#quality').count(),0);
  const name=await p.evaluate(()=>{
   const w=designWorld,n=w.identity,cn=n.getObjectByName('voxel-name-blocks'),en=n.getObjectByName('voxel-name-caption');
   const label=w.world.scene.getObjectByName('mailbox-label'),flowers=w.world.game.world.flowers;
   return{center:n.userData.parcel,text:n.userData.text,cnHeight:cn.boundingBox.max.y-cn.boundingBox.min.y,enHeight:en.boundingBox.max.y-en.boundingBox.min.y,cnCell:cn.geometry.parameters.width,advance:n.userData.chineseAdvance,day:w.world.game.dayCycles.progress,view:w.viewState(),vegetation:w.world.game.world.vegetationStats,mailboxTransparent:label.material.transparent,flowersOnGrass:flowers.positions.every(([x,z])=>{const s=w.world.surface.sample(x,z);return s.water<=5&&s.road<120&&s.grass>100;})};
  });
  assert.equal(name.center.x,43);assert.equal(name.center.z,42.5);assert.equal(name.text,'王钰欣 / CECILIA');assert.ok(name.enHeight>name.cnHeight*.25&&name.enHeight<name.cnHeight*.35);assert.ok(name.cnHeight>2);assert.equal(name.day,.12);assert.equal(name.view.yaw,.8231748736701113);
  assert.equal(name.advance,52);assert.ok(name.mailboxTransparent);assert.ok(name.flowersOnGrass);assert.ok(Object.values(name.vegetation.trees).reduce((a,b)=>a+b,0)>40);assert.ok(name.vegetation.flowers>100,'Original flower clusters replace the previous two pink shrubs');
  await p.screenshot({path:'/tmp/name-caption-day.png'});
  await p.goto(new URL('bruno-preview/index.html?webgl=1',root).href);
  await p.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
  assert.equal(await p.locator('body').getAttribute('data-failed'),null);assert.equal(await p.locator('#theme,#quality').count(),0);assert.equal(await p.evaluate(()=>preview.game.dayCycles.progress),.12);
  await p.evaluate(()=>preview.readWork());
  let iframe=p.frameLocator('#frames iframe:visible');
  await iframe.locator('#project-back').waitFor();assert.ok(await iframe.locator('#project-back').isVisible(),'Back must not be hidden by parent iframe CSS');
  await iframe.locator('.navigator a[aria-label="TEAS"]').click();await iframe.locator('.canvas[aria-label="TEAS"]').waitFor();
  await iframe.locator('#project-back').click();await iframe.locator('.canvas[aria-label="HOME"]').waitFor();
  await iframe.locator('#project-back').click();await p.waitForFunction(()=>!document.getElementById('reader').open);
  await p.evaluate(()=>{preview.select(1);preview.readWork();});
  iframe=p.frameLocator('#frames iframe:visible');await iframe.locator('#fullscreen-book').waitFor();
  await iframe.locator('#fullscreen-book').click();
  const frame=await (await p.locator('#frames iframe:visible').elementHandle()).contentFrame();
  await frame.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('main').classList.contains('is-expanded'));
  await iframe.locator('#fullscreen-book').click();await frame.waitForFunction(()=>!document.fullscreenElement&&!document.querySelector('main').classList.contains('is-expanded'));
  await p.locator('#close-reader').click();assert.deepEqual(errors,[]);
  console.log('PASS centered small / CECILIA caption and modest Chinese enlargement, fixed day in both worlds, no quality/night controls, preserved camera, embedded Tideline back returns to collection, embedded Gazette fullscreen roundtrip.',JSON.stringify(name));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
