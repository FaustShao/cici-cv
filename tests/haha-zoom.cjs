const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 // Exercise the no-WebGL fallback too; zoom is the same original-image dialog in both renderers.
 await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return /webgl/.test(type)?null:get.call(this,type,...rest)}});
 await p.goto(new URL('cecilia-world/haha-world.html',process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/').href);
 await p.waitForFunction(()=>window.HAHA_READER?.state.ready);
 assert.equal(await p.evaluate(()=>HAHA_READER.state.mode),'plain');
 await p.locator('#zoom-page').click();await p.locator('#page-zoom img').evaluate(i=>i.decode());
 await p.locator('#detail-plus').click();assert.equal(await p.locator('#detail-reset').innerText(),'150%');
 assert.ok(await p.locator('#page-zoom').evaluate(el=>el.scrollWidth>innerWidth));
 assert.ok(await p.locator('.zoom-tools').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}));
 await p.locator('#detail-reset').click();assert.equal(await p.locator('#detail-reset').innerText(),'100%');
 await p.locator('#page-zoom img').click();assert.equal(await p.locator('#detail-reset').innerText(),'200%');
 await p.locator('#detail-reset').click();await p.locator('#close-zoom').click();
 await p.locator('#contents-trigger').click();await p.locator('[data-page="19"]').click();assert.equal(await p.evaluate(()=>HAHA_READER.state.page),19);
 await p.locator('#plain-page').evaluate(i=>i.decode());assert.match(await p.locator('#plain-page').getAttribute('src'),/20.webp$/);
 assert.deepEqual(errors,[]);console.log('PASS mobile 100–400% original-image zoom controls, image-tap zoom, scrollable detail and fully usable no-WebGL fallback.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
