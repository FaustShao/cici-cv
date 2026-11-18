const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const sharp=require('sharp');
const path=require('node:path');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
  await page.goto(new URL('cecilia-world/index.html?webgl=1',root).href);
  await page.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
  assert.equal(await page.locator('body').getAttribute('data-failed'),null);
  assert.equal(await page.locator('#sound-toggle,#overview,#overview-world').count(),0);
  assert.equal(await page.locator('#reset-view').count(),1);
  await page.waitForFunction(()=>preview.area.title.status==='visible');
  assert.deepEqual(await page.evaluate(()=>preview.area.pagination.items.map(i=>i.intersect.active)),[true,false,false,false,false]);
  async function clickArrow(name,index){
   const point=await page.evaluate(name=>{
    const mesh=preview.area.references.items.get(name)[0];mesh.geometry.computeBoundingBox();
    const p=mesh.geometry.boundingBox.getCenter(mesh.position.clone().set(0,0,0));mesh.localToWorld(p);p.project(preview.game.view.camera);
    return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
   },name);
   await page.mouse.click(point.x,point.y);
   await page.waitForFunction(i=>preview.area.navigation.index===i,index,{timeout:5000});
   assert.equal(await page.locator('#reader').evaluate(e=>e.open),false);
  }
  let index=0;
  // Use the actual lower model buttons, including repeated clicks during transitions.
  for(let i=0;i<9;i++){index=(index+1)%4;await clickArrow('arrowNextImage',index);}
  for(let i=0;i<6;i++){index=(index+3)%4;await clickArrow('arrowPreviousImage',index);}
  await page.waitForFunction(()=>preview.area.images.animationProgress.value>.999&&preview.area.images.loadProgress.value>.999);
  await page.waitForFunction(()=>{const a=preview.area;return a.images.textureNew.image===a.images.resources.get(a.navigation.current.images[0])?.texture.image;});
  await page.mouse.wheel(0,-140);await page.waitForTimeout(300);
  index=(index+1)%4;await clickArrow('arrowNextImage',index);
  assert.equal(await page.evaluate(()=>preview.area.images.glassStrength.value),1);
  await page.waitForFunction(()=>preview.area.images.animationProgress.value>.999&&preview.area.images.loadProgress.value>.999);
  await sharp(await page.screenshot()).webp({quality:90}).toFile(path.join(__dirname,'../experiments/bruno-projects/public/review/portfolio-glass.webp'));
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS lower model arrows repeatedly switch and wrap during animation, zoomed hit targets, no hidden dots intercept, correct final texture, glass shader renders without errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
