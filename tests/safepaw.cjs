const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const{chromium}=require('playwright'),sharp=require('sharp');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
const repo=path.resolve(__dirname,'..'),inventory=require('../assets/safepaw-family/source-inventory.json');
const review=path.join(repo,'experiments/bruno-projects/public/review');
(async()=>{
 assert.equal(inventory.uploadedAssetCount,292);assert.equal(inventory.assets.length,293);
 assert.deepEqual([1,2,3,4,5].map(p=>inventory.assets.filter(a=>a.page===p).length),[34,25,154,36,44]);
 for(const item of inventory.assets){const bytes=fs.readFileSync(path.join(repo,'assets/safepaw-family',item.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256,'Original PNG bytes '+item.file);}
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await browser.newPage({viewport:{width:1744,height:1050},reducedMotion:'reduce'}),errors=[],bad=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
  await p.goto(new URL('safepaw.html',root).href);assert.equal(await p.locator('.board-viewport').count(),5);assert.equal(await p.locator('.design-layer image').count(),293);
  for(let i=1;i<=5;i++){
   const board=p.locator('#board-'+i);await board.scrollIntoViewIfNeeded();
   await p.waitForFunction(i=>document.getElementById('section-'+i).dataset.loaded==='true',i);
   await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.waitForLoadState('networkidle');
   const report=await p.evaluate(i=>{
    const layout=SAFEPAW_LAYOUT[i-1],b=document.getElementById('board-'+i),r=b.getBoundingClientRect();
    return layout.layers.map(l=>{const n=b.querySelector('[data-node="'+l.id+'"]'),img=n.firstChild,a=img.getBoundingClientRect();return {id:l.id,loaded:img.dataset.ready==='true'&&img.href.baseVal===CeciliaAssetURL('assets/safepaw-family/'+l.file),geometryError:Math.max(Math.abs(a.x-r.x-l.x/3488*r.width),Math.abs(a.y-r.y-l.y/1744*r.height),Math.abs(a.width-l.w/3488*r.width),Math.abs(a.height-l.h/1744*r.height))}});
   },i);
   assert.ok(report.every(r=>r.loaded&&r.geometryError<.1),'Every asset is decoded and matches its original Figma render geometry on page '+i);
   const png=await board.screenshot();await sharp(png).webp({quality:90}).toFile(path.join(review,'safepaw-'+i+'.webp'));
   const golden=path.join(__dirname,'fixtures/safepaw/reference-'+i+'.png');
   if(fs.existsSync(golden)){
    const ref=await sharp(golden).resize(1024,512).blur(4).removeAlpha().raw().toBuffer(),actual=await sharp(png).resize(1024,512).blur(4).removeAlpha().raw().toBuffer();let total=0;for(let n=0;n<ref.length;n++)total+=Math.abs(ref[n]-actual[n]);const mean=total/ref.length;console.log('Figma visual comparison',i,mean.toFixed(2));assert.ok(mean<5,'No missing artwork or large layout differences on page '+i);
   }
  }
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('#reading-size').click();assert.equal(await p.locator('#reading-size').getAttribute('aria-pressed'),'true');
  const first=p.locator('#section-1');await first.scrollIntoViewIfNeeded();
  assert.ok(await first.evaluate(n=>n.scrollWidth>n.clientWidth));await first.focus();await p.keyboard.press('ArrowRight');assert.ok(await first.evaluate(n=>n.scrollLeft>0));
  const dragBox=await first.boundingBox(),x=dragBox.x+900,y=dragBox.y+250;const before=await first.evaluate(n=>n.scrollLeft);await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x-160,y,{steps:4});await p.mouse.up();assert.ok(await first.evaluate((n,b)=>n.scrollLeft>b,before));
  await p.locator('#reading-size').click();await first.evaluate(n=>n.scrollLeft=0);
  const card=p.locator('[data-node="54:2512"]');await card.scrollIntoViewIfNeeded();await card.click();assert.equal(await card.getAttribute('aria-pressed'),'true');assert.equal(await p.locator('dialog').count(),0);assert.equal(new URL(p.url()).pathname,'/safepaw.html');await p.keyboard.press('Escape');assert.equal(await card.getAttribute('aria-pressed'),'false');
  await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.querySelector('.board-stage').clientWidth===390);assert.ok(await first.evaluate(n=>n.scrollWidth===n.clientWidth));
  await p.locator('#reading-size').click();assert.ok(await first.evaluate(n=>n.scrollWidth>n.clientWidth));
  await p.locator('#reading-size').click();assert.equal(await p.locator('#reading-size').getAttribute('aria-pressed'),'false');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:path.join(repo,'/../scratch/safepaw-mobile.png')});assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS: all 292 uploaded PNGs plus the missing original decoration, five exact boards, image proportions, full asset hashes, reading zoom, horizontal drag/arrows, local card emphasis, mobile fit and no navigation/lightbox/404.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
