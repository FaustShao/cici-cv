const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright'),sharp=require('sharp');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8000/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  execFileSync('pdftoppm',['-scale-to-x','1588','-scale-to-y','2248','-png','assets/resume/wang-yuxin-resume.pdf','/tmp/resume-golden']);
  const page=await browser.newPage({viewport:{width:1636,height:2350}}),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  await page.goto(new URL('resume.html?document=1',root).href);
  await page.locator('.resume-art').last().waitFor();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.locator('#document-loading').waitFor({state:'hidden'});
  assert.equal(await page.locator('.resume-art').count(),59);assert.equal(await page.locator('.page-art').count(),0);
  const layout=await page.evaluate(()=>window.RESUME_LAYERS);
  const files=fs.readdirSync('assets/resume/layers').filter(f=>f.endsWith('.svg'));
  assert.equal(files.length,59);assert.deepEqual([...layout.layers.map(l=>l.file)].sort(),files.sort());
  assert.equal(new Set(layout.layers.map(l=>l.file)).size,59);
  for(const layer of layout.layers){
    assert.ok(layer.x>=0&&layer.y>=0&&layer.x+layer.w<=layout.width+1&&layer.y+layer.h<=layout.height+1);
    const meta=await sharp('assets/resume/layers/'+layer.file).metadata();
    assert.equal(meta.width,layer.w);assert.equal(meta.height,layer.h);
  }
  assert.equal(await page.locator('.resume-page').count(),2);
  assert.equal(await page.locator('#name').textContent(),'王钰欣');
  // The downloaded document and browser reader must carry the same layout.
  await page.evaluate(()=>document.documentElement.style.setProperty('--fit-width','1588px'));
  for(const i of [0,1]){
   await page.mouse.move(0,0);
   const screenshot=await page.locator('.resume-page').nth(i).screenshot({style:'.resume-toolbar{visibility:hidden}'});
   const actual=await sharp(screenshot).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const expected=await sharp(`/tmp/resume-golden-${i+1}.png`).removeAlpha().raw().toBuffer({resolveWithObject:true});
   assert.equal(actual.info.width,1588);assert.equal(actual.info.height,2248);assert.equal(actual.data.length,expected.data.length);
   let sum=0,count=0;for(let n=0;n<actual.data.length;n++){const d=Math.abs(actual.data[n]-expected.data[n]);sum+=d;if(d>3)count++;}
   const mean=sum/actual.data.length;console.log('Page',i+1,'mean pixel delta',mean,'channels >3',count);
   // Compare at the Figma frame's logical resolution. PDF and screen rasterizers
   // round subpixel positions differently at A4 print size.
   const atFrameSize = image => sharp(image).resize(794,1124).blur(2).removeAlpha().raw().toBuffer();
   const [soft,reference] = await Promise.all([atFrameSize(screenshot),atFrameSize(`/tmp/resume-golden-${i+1}.png`)]);
   let softSum=0;for(let n=0;n<soft.length;n++)softSum+=Math.abs(soft[n]-reference[n]);
   const layoutDelta=softSum/soft.length;
   console.log('Low-frequency layout delta',layoutDelta);assert.ok(layoutDelta<2,'PDF and screen page align');
   await sharp(screenshot).resize({width:1131}).webp({quality:94}).toFile(`/tmp/resume-matched-${i+1}.webp`);
  }
  await page.locator('.profile-card').hover();await page.waitForTimeout(360);
  assert.notEqual(await page.locator('.profile-card').evaluate(e=>getComputedStyle(e).transform),'none');
  await page.mouse.move(0,0);await page.waitForTimeout(360);
  const before=await page.locator('.hover-zone').first().boundingBox();await page.locator('.hover-zone').first().hover();await page.waitForTimeout(250);
  assert.notEqual(await page.locator('.hover-zone').first().evaluate(e=>getComputedStyle(e).boxShadow),'none');
  assert.deepEqual(await page.locator('.hover-zone').first().boundingBox(),before);
  assert.equal(await page.locator('a[href^="mailto:"]').getAttribute('href'),'mailto:wangyuxinqd2025@163.com');
  assert.equal(await page.locator('a[href^="tel:"]').getAttribute('href'),'tel:15066290491');
  await page.locator('#copy-wechat').click();await page.waitForFunction(()=>document.getElementById('resume-feedback').textContent.includes('Cecilia_cici68'));
  const website = page.locator('a.contact-hotspot[href="https://ciciworld.cc/"]');
  await page.context().route('https://ciciworld.cc/', route=>route.fulfill({contentType:'text/html',body:'<title>Website</title>'}));
  const [site]=await Promise.all([page.waitForEvent('popup'),website.click()]);
  await site.waitForLoadState();assert.equal(site.url(),'https://ciciworld.cc/');await site.close();
  const downloadURL = await page.locator('.download-pdf').evaluate(link=>link.href);
  const downloaded = await (await page.request.get(downloadURL)).body();
  assert.deepEqual(downloaded,fs.readFileSync('assets/resume/wang-yuxin-resume.pdf'));
  await page.mouse.move(0,0);await page.emulateMedia({media:'print'});
  await page.pdf({path:'/tmp/resume-matched-print.pdf',preferCSSPageSize:true,printBackground:true});
  const info=execFileSync('pdfinfo',['/tmp/resume-matched-print.pdf'],{encoding:'utf8'});assert.match(info,/Pages:\s+2/);
  assert.equal(await page.locator('.portrait-slot').evaluate(e=>getComputedStyle(e).display),'block');
  await page.emulateMedia({media:'screen',reducedMotion:'reduce'});await page.locator('.profile-card').hover();
  assert.equal(await page.locator('.profile-card').evaluate(e=>getComputedStyle(e).transform),'none');
  await page.evaluate(()=>document.documentElement.style.removeProperty('--fit-width'));
  await page.setViewportSize({width:390,height:844});await page.mouse.move(0,0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const mobile=await page.locator('.resume-page').first().boundingBox();assert.ok(mobile.width<=366);
  await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();
  assert.equal(await page.locator('#zoom-reset').textContent(),'150%');
  assert.ok((await page.locator('.resume-page').first().boundingBox()).width>mobile.width);
  await page.locator('#zoom-reset').click();assert.equal(await page.locator('#zoom-reset').textContent(),'100%');
  await page.screenshot({path:'/tmp/resume-matched-mobile.png',fullPage:true});
  for (const zoom of ['100%','125%']) {
    if (zoom==='125%') await page.locator('#zoom-in').click();
    for (const hot of await page.locator('.contact-hotspot').all()) {
      await hot.scrollIntoViewIfNeeded();
      assert.ok(await hot.evaluate(el=>{
        const r=el.getBoundingClientRect();
        return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;
      }), 'Scaled contact target receives the pointer');
    }
  }
  assert.match(await page.locator('.resume-page').nth(1).innerText(),/游戏经历/);
  assert.equal(new URL(await page.locator('.back-world').evaluate(el=>el.href)).hash,'#resume');
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS updated vector layers, PDF visual match, contact targets and website navigation, mobile zoom, hover, reduced motion, two-page printing and return link.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
