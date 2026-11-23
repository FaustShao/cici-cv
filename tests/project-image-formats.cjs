const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base=process.env.PREVIEW_ROOT||'http://127.0.0.1:8770/cici-cv/';
const manifest=require('../assets/project-lossless/manifest.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 sharp.cache(false);sharp.concurrency(1);
 let count=0;
 for(const file of manifest.files){
  const original=fs.readFileSync(path.join(root,file.source));assert.equal(hash(original),file.sourceSha256,'Original artwork unchanged: '+file.source);
  if(file.status!=='webp')continue;
  const optimized=fs.readFileSync(path.join(root,file.target));assert.equal(hash(optimized),file.sha256);assert.ok(optimized.length<original.length);
  const a=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(optimized).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(b.info,a.info);assert.ok(b.data.equals(a.data),'Independent decoder: exact RGB and alpha for '+file.source);
  assert.equal(a.info.width,file.width);assert.equal(a.info.height,file.height);count++;
 }
 console.log('PASS '+count+' smaller WebP files: original PNG checksums, original dimensions, independent decoder confirms identical RGBA. Conservative PNG fallbacks retained for long images and browser compositing differences.');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],bad=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
  await p.goto(new URL('tideline.html',base).href);await p.waitForFunction(()=>document.documentElement.dataset.pageBoot==='ready');
  const resolved=await p.evaluate(files=>files.map(f=>({url:CeciliaAssetURL(f.source.split("/").map(encodeURIComponent).join("/")),expected:f.target||f.source})),manifest.files);
  for(const item of resolved){const u=new URL(item.url);assert.equal(decodeURIComponent(u.pathname),decodeURIComponent(new URL(item.expected.split("/").map(encodeURIComponent).join("/"),base).pathname));assert.ok(u.searchParams.has('build'));}
  // Browser colour management and transparent compositing must also agree, not just the file decoder.
  const representatives=[];
  for(const project of ['tideline','safepaw-family','dream-sentinel']){
   const files=manifest.files.filter(f=>f.status==='webp'&&f.source.startsWith('assets/'+project+'/')).sort((a,b)=>b.originalBytes-a.originalBytes);
   representatives.push(...files.slice(0,4),...files.slice(-4));
  }
  const colour=await p.evaluate(async files=>{for(const f of files){const load=async src=>{const im=new Image();im.src=src;await im.decode();return im};const a=await load(new URL(f.source.split("/").map(encodeURIComponent).join("/"),location.href)),b=await load(new URL(f.target.split("/").map(encodeURIComponent).join("/"),location.href));for(const background of ['#ffffff','#34251c']){const draw=im=>{const c=document.createElement('canvas');c.width=192;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,192,192);ctx.drawImage(im,0,0,192,192);return ctx.getImageData(0,0,192,192).data;};const x=draw(a),y=draw(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return{file:f.source,background,index:i,a:x[i],b:y[i]};}}return null;},representatives);
  assert.equal(colour,null,'Browser rendering and alpha compositing unchanged');console.log('PASS all URL mappings/version queries; representative photos, UI, text and transparent assets render identically over light and dark backgrounds.');
  for(const route of ['home','research','teas','material','packaging','merch','diary','service']){
   await p.evaluate(route=>location.hash=route,route);await p.waitForTimeout(60);
   await p.evaluate(async()=>{const imgs=[...document.querySelectorAll('#project img')];imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode()));});
   assert.equal(await p.locator('#project-top').count(),1);
   const missing=await p.locator('#project img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src));assert.deepEqual(missing,[]);
  }
  console.log('PASS all eight Tideline routes: image decoding, including the retained long PNG, and existing controls.');
  for(const name of ['safepaw','dream-sentinel']){
   await p.goto(new URL(name+'.html',base).href);await p.waitForFunction(()=>document.documentElement.dataset.pageBoot==='ready');
   for(const section of await p.locator('.board-viewport').all()){await section.scrollIntoViewIfNeeded();if(name==='safepaw')await p.waitForFunction(el=>el.dataset.loaded==='true',await section.elementHandle());else await section.locator('img').evaluateAll(async imgs=>{imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode()));});}
   assert.equal(await p.locator('.design-layer').count(),name==='safepaw'?293:245);
   assert.ok(await p.evaluate(count=>CeciliaImageFormats.size===count,manifest.files.filter(f=>f.status==='webp').length));
   await p.setViewportSize({width:390,height:844});await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:'/tmp/'+name+'-lossless-mobile.png'});await p.setViewportSize({width:1440,height:900});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS both layered projects: all boards load, original layer counts preserved, desktop/mobile rendering and no missing resources or JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
