const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8770/cici-cv/';
const release=JSON.parse(fs.readFileSync('public/release.json'));
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const errors=[],bad=[];
 for(const viewport of [{width:1440,height:950},{width:390,height:844}]){
  const p=await browser.newPage({viewport});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
  await p.goto(new URL('cecilia-world/sonicsense.html',root).href);
  await p.waitForFunction(()=>window.SONIC_FILM&&document.body.dataset.ready==='true'&&!document.documentElement.dataset.releaseState);
  assert.equal(await p.locator('.film-frame').count(),31);
  assert.equal(await p.locator('body').getAttribute('data-spatial'),'true');
  assert.equal(await p.locator('.footer-note,.edition,.project-line,.frame-mark').count(),0,'Remove the unwanted small print and slogan');
  const orientation=await p.evaluate(()=>SONIC_FILM.ribbon.group.rotation.toArray().slice(0,3));
  await p.waitForFunction(before=>Math.abs(SONIC_FILM.ribbon.group.rotation.z-before[2])>.005,orientation);
  assert.ok(await p.evaluate(()=>{const a=SONIC_FILM.ribbon.backing.geometry.attributes.position;let low=Infinity,high=-Infinity;for(let i=0;i<a.count;i++){low=Math.min(low,a.getZ(i));high=Math.max(high,a.getZ(i))}return high-low>1}),'Film has actual depth, rather than a CSS sliding row');
  assert.equal(await p.locator('#chapters button').count(),6);
  const manifest=await p.evaluate(()=>SONIC_FILM.manifest);
  assert.equal(manifest.pages[0].source,'Yuxin_Wang_stage2_project_doc-part-1-part-1.pdf');
  assert.equal(manifest.pages[30].source,'Yuxin_Wang_stage2_project_doc-part-9.pdf');
  for(const page of manifest.pages){assert.ok(Math.abs(page.width/page.height-842/595)<.001);}
  assert.equal(await p.locator('iframe,.cecilia-loader').count(),0,'No nested page or forced loading animation');
  await p.screenshot({path:`/tmp/sonicsense-cover-${viewport.width}.png`});
  // Wheel movement must drive both film position and spool rotation; reverse must also work.
  await p.locator('#film-stage').hover();await p.mouse.wheel(0,850);
  await p.waitForFunction(()=>SONIC_FILM.state.offset>500&&Math.abs(SONIC_FILM.state.target-SONIC_FILM.state.offset)<1);
  const advanced=await p.evaluate(()=>({offset:SONIC_FILM.state.offset,angle:document.getElementById('reel-directory').style.getPropertyValue('--reel-angle')}));
  assert.ok(parseFloat(advanced.angle)>0);await p.mouse.wheel(0,-300);
  await p.waitForFunction(previous=>SONIC_FILM.state.offset<previous-100&&Math.abs(SONIC_FILM.state.target-SONIC_FILM.state.offset)<1,advanced.offset);
  // Drag across an image without accidentally opening it.
  const bounds=await p.locator('#film-stage').boundingBox(),x=bounds.x+bounds.width*.75,y=bounds.y+bounds.height*.5;
  const before=await p.evaluate(()=>SONIC_FILM.state.offset);await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x-190,y,{steps:12});await p.mouse.up();
  await p.waitForFunction(previous=>SONIC_FILM.state.offset>previous+100,before);assert.equal(await p.locator('#page-viewer').evaluate(d=>d.open),false);
  // All directory chapters are clickable, with no overlap or offscreen targets.
  for(const chapter of manifest.chapters){
   await p.locator(`[data-chapter=${chapter.id}]`).click();await p.waitForFunction(index=>SONIC_FILM.state.index===index&&Math.abs(SONIC_FILM.state.target-SONIC_FILM.state.offset)<1,chapter.start);
   assert.equal(await p.locator(`[data-chapter=${chapter.id}]`).getAttribute('aria-current'),'true');
  }
  // Fractional positions on the continuous scrubber must not become invalid page indexes.
  await p.locator('#film-scrub').evaluate(el=>{el.value='23.4';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await p.evaluate(()=>SONIC_FILM.state.index),22);
  const pagePoint=await p.evaluate(()=>SONIC_FILM.ribbon.pointOnPage(22));await p.mouse.click(pagePoint.x,pagePoint.y);await p.waitForFunction(()=>document.getElementById('page-viewer').open&&document.getElementById('full-page').complete);
  await p.waitForFunction(()=>document.getElementById('full-page').src.includes('/23.webp'));
  const fit=await p.locator('#full-page').evaluate(img=>{const i=img.getBoundingClientRect(),s=document.getElementById('page-scroll').getBoundingClientRect();return {fits:i.height<=s.height&&i.width<=s.width,ratio:i.width/i.height}});
  assert.equal(fit.fits,true,'Full original fits the borderless reader');assert.ok(Math.abs(fit.ratio-842/595)<.01);
  await p.screenshot({path:`/tmp/sonicsense-detail-${viewport.width}.png`});
  assert.equal(await p.locator('#zoom-page').count(),0,'Remove the separate detail-zoom control');
  const fullSize=await p.locator('#full-page').boundingBox();
  const maximumHeight=Math.min(viewport.height-8,(viewport.width-8)*595/842);assert.ok(fullSize.height>=maximumHeight*.97,'The original uses the available screen rather than losing space to toolbars');
  assert.equal(await p.locator('#page-viewer .dialog-bar').evaluate(el=>getComputedStyle(el).position),'absolute');
  assert.equal(await p.locator('#page-viewer .viewer-caption').evaluate(el=>getComputedStyle(el).position),'absolute');
  await p.locator('#viewer-next').click();await p.waitForFunction(()=>SONIC_FILM.state.index===23);
  // Click actual blank space in the reader, not its image or toolbar.
  const blank=await p.locator('#page-scroll').boundingBox();await p.mouse.click(blank.x+3,blank.y+3);assert.equal(await p.locator('#page-viewer').evaluate(d=>d.open),false);
  assert.equal(await p.evaluate(()=>SONIC_FILM.state.index),23,'Closing retains the page being read');
  await p.locator('#reel-overview').click();assert.equal(await p.locator('#overview-pages button').count(),31);
  await p.locator('#overview-pages button').nth(24).click();await p.waitForFunction(()=>document.getElementById('page-viewer').open);
  assert.equal(await p.locator('#page-media a').getAttribute('href'),'https://youtu.be/e8wFDxjReWE');
  await p.keyboard.press('Escape');assert.equal(await p.locator('#page-viewer').evaluate(d=>d.open),false);
  await p.locator('#reel-start').click();await p.waitForFunction(()=>SONIC_FILM.state.index===0&&SONIC_FILM.state.offset<1);
  await p.locator('#film-stage').focus();await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>SONIC_FILM.state.index===1);
  await p.locator('#about-project').click();const summary=await p.locator('#project-info').innerText();assert.ok(summary.includes('研究问题与方向选择')&&summary.includes('指套与腕部设备'));assert.ok(!/我的参与|团队其他成员|完整保留|原稿为英文|未将设想/.test(summary));await p.keyboard.press('Escape');
  await p.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log('PASS desktop/mobile: 31 original pages, six chapter targets, wheel/drag/reverse with synchronized reels, fractional scrubbing, overview, borderless full-screen high-resolution fit, blank-space/Esc close, original video link, keyboard, actual spatial depth/idle float, removed small print and recruitment-oriented project summary.');
 const p=await browser.newPage({viewport:{width:1200,height:850},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(new URL('index.html?webgl=1#other',root).href,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.designWorld&&document.body.dataset.ready&&!document.documentElement.dataset.releaseState,null,{timeout:120000});
 const renderedBefore=await p.evaluate(()=>{designWorld.selectOther(3);return designWorld.world.renderCount});
 await p.waitForFunction(before=>designWorld.world.renderCount>before+4,renderedBefore,{timeout:90000});await p.evaluate(()=>designWorld.world.renderer.setAnimationLoop(null));
 assert.equal(await p.locator('#other-position').innerText(),'4 / 4');assert.ok(await p.evaluate(()=>designWorld.world.labCover.source.includes('sonicsense')));assert.deepEqual(await p.evaluate(()=>designWorld.world.scene.getObjectByName('other-project-chalk-tags').userData.tags),['未来情境','穿戴设计','交互探索']);
 await p.screenshot({path:'/tmp/sonicsense-world-cover.png',timeout:45000});
 async function open(){await p.evaluate(()=>designWorld.openCurrent());const f=await(await p.locator('#frames iframe:not([hidden])').elementHandle()).contentFrame();await f.waitForFunction(()=>window.SONIC_FILM&&document.body.dataset.ready);return f;}
 let f=await open();assert.equal(await f.locator('.sensor-header').isVisible(),false,'Only one reader header');assert.equal(await f.locator('#about-project-inline').isVisible(),true);
 await f.locator('[data-chapter=outcomes]').click();await f.waitForFunction(()=>SONIC_FILM.state.index===22);
 await p.locator('#close-reader').click();assert.equal(await p.locator('#frames iframe[data-project=sonicsense]').count(),0,'Disposed reader cannot remain over another project');
 f=await open();assert.equal(await f.evaluate(()=>SONIC_FILM.state.index),0,'Each reentry starts at cover');await p.locator('#close-reader').click();
 await p.evaluate(()=>{designWorld.selectOther(0);designWorld.openCurrent()});const other=await(await p.locator('#frames iframe:not([hidden])').elementHandle()).contentFrame();await other.waitForFunction(()=>window.ICOD_ARCHIVE);
 assert.equal(await p.locator('#frames iframe').count(),1);assert.equal(await p.locator('#reader').getAttribute('data-project'),'icod');await p.locator('#close-reader').click();
 const versioned=await p.request.get(new URL(`cecilia-world/sonicsense.html?build=${release.revision}`,root).href);assert.equal(versioned.status(),200);
 assert.deepEqual(errors,[]);console.log('PASS real Other Projects integration: fourth cover/tags, one header, readable project info, clean disposal, cover reset on reentry and no overlap with ICoD.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
