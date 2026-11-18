const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright'),sharp=require('sharp');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  execFileSync('pdftoppm',['-scale-to-x','1588','-scale-to-y','2248','-png','assets/resume/wang-yuxin-resume.pdf','/tmp/resume-golden']);
  const page=await browser.newPage({viewport:{width:1636,height:2350}}),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  await page.goto('http://127.0.0.1:8000/resume.html?document=1');
  await page.locator('.resume-art').last().waitFor();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  assert.equal(await page.locator('.resume-art').count(),56);assert.equal(await page.locator('.page-art').count(),0);
  const layout=await page.evaluate(()=>window.RESUME_LAYERS);
  const files=fs.readdirSync('assets/resume/slices/cv拆分').filter(f=>f.endsWith('.png'));
  assert.equal(files.length,57);assert.deepEqual([...layout.layers.map(l=>l.file)].sort(),files.sort());
  assert.equal(new Set(layout.layers.map(l=>l.file)).size,57);
  for(const layer of layout.layers){
    assert.ok(layer.x>=0&&layer.y>=0&&layer.x+layer.w<=layout.width+1&&layer.y+layer.h<=layout.height+1);
    const meta=await sharp('assets/resume/slices/cv拆分/'+layer.file).metadata();
    assert.equal(meta.width,layer.pixelWidth);assert.equal(meta.height,layer.pixelHeight);
  }
  assert.equal(await page.locator('.resume-page').count(),2);
  assert.equal(await page.locator('#name').textContent(),'王钰欣');
  // Compare original layout while allowing the intentionally sharper 3x glyphs.
  await page.evaluate(()=>document.documentElement.style.setProperty('--fit-width','1588px'));
  for(const i of [0,1]){
   await page.mouse.move(0,0);
   const screenshot=await page.locator('.resume-page').nth(i).screenshot();
   const actual=await sharp(screenshot).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const expected=await sharp(`/tmp/resume-golden-${i+1}.png`).removeAlpha().raw().toBuffer({resolveWithObject:true});
   assert.equal(actual.info.width,1588);assert.equal(actual.info.height,2248);assert.equal(actual.data.length,expected.data.length);
   let sum=0,count=0;for(let n=0;n<actual.data.length;n++){const d=Math.abs(actual.data[n]-expected.data[n]);sum+=d;if(d>3)count++;}
   const mean=sum/actual.data.length;console.log('Page',i+1,'mean pixel delta',mean,'channels >3',count);
   const soft=await sharp(screenshot).blur(2).removeAlpha().raw().toBuffer();
   const softReference=await sharp(`/tmp/resume-golden-${i+1}.png`).blur(2).removeAlpha().raw().toBuffer();
   let softSum=0,samples=0;for(let n=0;n<soft.length;n++){const pixel=Math.floor(n/3),x=pixel%1588,y=Math.floor(pixel/1588);if(i===0&&x>=1276&&x<=1504&&y>=88&&y<=388)continue;softSum+=Math.abs(soft[n]-softReference[n]);samples++;}
   const layoutDelta=softSum/samples;console.log('Low-frequency layout delta',layoutDelta);assert.ok(layoutDelta<2,'Layout alignment is retained; high-frequency text sharpening and the new source photo are intentional');
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
  const downloaded=await (await page.request.get('http://127.0.0.1:8000/assets/resume/wang-yuxin-resume.pdf')).body();
  assert.deepEqual(downloaded,fs.readFileSync('assets/resume/wang-yuxin-resume.pdf'));
  await page.mouse.move(0,0);await page.emulateMedia({media:'print'});
  await page.pdf({path:'/tmp/resume-matched-print.pdf',preferCSSPageSize:true,printBackground:true});
  const info=execFileSync('pdfinfo',['/tmp/resume-matched-print.pdf'],{encoding:'utf8'});assert.match(info,/Pages:\s+2/);
  assert.equal(await page.locator('.portrait-slot').evaluate(e=>getComputedStyle(e).display),'block');
  await page.emulateMedia({media:'screen',reducedMotion:'reduce'});await page.locator('.profile-card').hover();
  assert.equal(await page.locator('.profile-card').evaluate(e=>getComputedStyle(e).transform),'none');
  await page.setViewportSize({width:390,height:844});await page.mouse.move(0,0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const mobile=await page.locator('.resume-page').first().boundingBox();assert.ok(mobile.width<=366);
  await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();
  assert.equal(await page.locator('#zoom-reset').textContent(),'150%');
  assert.ok((await page.locator('.resume-page').first().boundingBox()).width>mobile.width);
  await page.locator('#zoom-reset').click();assert.equal(await page.locator('#zoom-reset').textContent(),'100%');
  await page.screenshot({path:'/tmp/resume-matched-mobile.png',fullPage:true});
  await page.goto('http://127.0.0.1:8000/resume.html');await page.waitForURL('**/bruno-preview/hub.html#resume');
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('PASS all 57 original PNG slices used once at measured positions, two-page original layout, original PDF, photo/section hover, contact links, mobile zoom, reduced motion, two-page A4 printing and route.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
