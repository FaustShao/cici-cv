const assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const { chromium } = require('playwright'), sharp = require('sharp');
const base = process.env.PREVIEW_ROOT || 'http://127.0.0.1:8770/cici-cv/';
(async () => {
 const manifest = JSON.parse(fs.readFileSync('assets/haha-world/manifest.json'));
 assert.equal(manifest.pages.length,30);
 assert.deepEqual(manifest.parts.map(p=>[p.start,p.count]),[[1,9],[10,10],[20,11]]);
 for(const [i,p] of manifest.pages.entries()){
  assert.equal(p.number,i+1);const m=await sharp('assets/haha-world/pages/'+String(i+1).padStart(2,'0')+'.webp').metadata();
  assert.equal(m.width,2400);assert.ok(Math.abs(m.width/m.height-manifest.width/manifest.height)<.001);
 }
 execFileSync('python',['-c',`from fontTools.ttLib import TTFont
import re,json
from pathlib import Path
text=Path('experiments/bruno-projects/haha-world.html').read_text()+Path('experiments/bruno-projects/src/haha-world.js').read_text()+''.join(p['label'] for p in json.loads(Path('assets/haha-world/manifest.json').read_text())['pages'])
f=TTFont('experiments/bruno-projects/public/fonts/haha-ui.woff2')
missing={c for c in re.findall(r'[\\u3000-\\u9fff\\uff00-\\uffef]',text) if ord(c) not in f.getBestCmap()}
assert not missing, missing
assert f['OS/2'].usWeightClass==400`]);
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,200))});page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))bad.push(r.url())});
  await page.goto(new URL('cecilia-world/haha-world.html',base).href);await page.waitForFunction(()=>window.HAHA_READER?.state.ready,null,{timeout:90000});await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>HAHA_READER.state.mode),'webgl');assert.equal(await page.evaluate(()=>HAHA_READER.sources.length),32);
  assert.equal(await page.locator('#previous,#next,#close-book,#zoom-page,.book-tools,.credit').count(),0,'Removed the bottom controls and participant credits');
  assert.equal(await page.locator('.mag-footer button').count(),0);
  assert.equal(await page.locator('.identity').count(),0,'Remove the duplicate manual heading');
  assert.ok(await page.evaluate(()=>HAHA_READER.bookGroup.position.y>=.06),'Manual sits slightly higher');
  async function point(x,y=0){return page.evaluate(([x,y])=>{const w=HAHA_READER,v=w.bookGroup.localToWorld(w.bookGroup.position.clone().set(x,y,.01)).project(w.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}},[x,y]);}
  async function settled(pageIndex){await page.waitForFunction(n=>HAHA_READER.state.page===n&&!HAHA_READER.magazine.turning,pageIndex,{timeout:45000});}
  // Broad targets include the half-page interior and the margin outside the fore-edge.
  let p=await point(.28);await page.mouse.click(p.x,p.y);await settled(1);
  p=await point(-.28);await page.mouse.click(p.x,p.y);await settled(0);
  p=await point(1.08);await page.mouse.click(p.x,p.y);await settled(1);
  p=await point(.65,.1);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x-45,p.y+4,{steps:5});await page.mouse.up();await settled(3);
  console.log('PASS broad left/right click zones and short 45px swipe.');
  // Blue grid and ASCII cells react to a pointer path and then fade; no random floating glyphs.
  await page.mouse.move(100,105);await page.mouse.move(400,110,{steps:12});
  const frame=await page.evaluate(()=>HAHA_READER.backgroundFrame);await page.waitForFunction(n=>HAHA_READER.backgroundFrame>n,frame);
  assert.ok(await page.evaluate(()=>HAHA_READER.snapshot().gridCells>15));
  const before=await page.locator('#paper-field').evaluate(c=>c.toDataURL());
  await page.mouse.move(900,115,{steps:12});const f=await page.evaluate(()=>HAHA_READER.backgroundFrame);await page.waitForFunction(n=>HAHA_READER.backgroundFrame>n,f);
  assert.notEqual(await page.locator('#paper-field').evaluate(c=>c.toDataURL()),before);
  // Inspect the latter half, where the old constant-height stacks separated at the spine.
  await page.evaluate(()=>HAHA_READER.goTo(23));
  await page.waitForFunction(()=>HAHA_READER.state.page===23&&HAHA_READER.snapshot().bindingOpen===1&&[23,24].every(n=>HAHA_READER.loaded.has(n)),null,{timeout:90000});
  const loadedFrame=await page.evaluate(()=>HAHA_READER.backgroundFrame);await page.waitForFunction(n=>HAHA_READER.backgroundFrame>n+1,loadedFrame);
  await page.evaluate(()=>HAHA_READER.pause());const image=await page.screenshot({path:'/tmp/haha-fixed-binding.png',timeout:45000});
  const raw=await sharp(image).removeAlpha().raw().toBuffer({resolveWithObject:true});
  function sample(x,y,w=16,h=12){const sum=[0,0,0];for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)for(let c=0;c<3;c++)sum[c]+=raw.data[(yy*raw.info.width+xx)*3+c];return sum.map(v=>v/(w*h));}
  const rise=await page.evaluate(()=>Math.round(.05/(HAHA_READER.camera.top-HAHA_READER.camera.bottom)*innerHeight));
  const white=sample(672,287-rise,24,20),orange=sample(400,224-rise,20,12);
  console.log('Latter-spread white near hinge:',white,'brand orange:',orange);
  assert.ok(white.every(v=>v>235),'The bound hinge stays light, without an unrelated dark vertical slab');
  assert.ok(orange[0]>245&&Math.abs(orange[1]-141)<14&&orange[2]<28,'Printed brand colour stays close to the PDF instead of grey metallic shading');
  // No hole at the glued hinge, verified from the transparent WebGL surface rather than the page background.
  const png=await page.evaluate(()=>{const w=HAHA_READER;w.renderer.render(w.scene,w.camera);return w.renderer.domElement.toDataURL().split(',')[1]});
  const rgba=await sharp(Buffer.from(png,'base64')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let y=290;y<580;y+=25)assert.ok(rgba.data[(y*rgba.info.width+720)*4+3]>245,'Continuous opaque attachment at the spine');
  // Removed toolbar does not remove detailed reading: double-click, then blank-space dismissal.
  p=await point(.6);await page.mouse.dblclick(p.x,p.y,{delay:60});await page.locator('#page-zoom img').evaluate(i=>i.decode());
  assert.match(new URL(await page.locator('#page-zoom img').getAttribute('src')).pathname,/25.webp$/);assert.equal(await page.locator('#page-zoom img').evaluate(i=>getComputedStyle(i).filter),'none');
  await page.locator('#page-zoom').click({position:{x:12,y:100}});assert.ok(!await page.locator('#page-zoom').evaluate(e=>e.open));
  await page.locator('#contents-trigger').click();await page.locator('[data-page="9"]').click();await page.evaluate(()=>HAHA_READER.resume());await settled(9);
  await page.evaluate(()=>HAHA_READER.goTo(31));await settled(31);assert.equal(await page.locator('#page-status').innerText(),'封底');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);await page.evaluate(()=>HAHA_READER.pause());
  assert.ok(await page.locator('.header-tools').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}));
  assert.equal(await page.locator('.book-tools').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS original 30-page order and ratio; complete consistent UI glyphs; no bottom controls/credits; blue graph and ASCII trail; attached bright late-page binding; raw-artwork zoom; contents, back cover and mobile bounds.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
