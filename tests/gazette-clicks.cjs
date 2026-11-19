const assert=require('node:assert/strict'),{chromium}=require('playwright'),path=require('node:path');
const root=process.env.PREVIEW_ROOT||'http://127.0.0.1:8765/';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(new URL('gazette.html',root).href);await p.waitForFunction(()=>document.querySelector('.paper[data-pdf-page="1"]')&&!document.querySelector('#reader').dataset.entering);
 async function idle(){await p.waitForFunction(()=>document.querySelector('#reader').dataset.flipState==='read');}
 async function pageNumber(n){await p.waitForFunction(n=>document.getElementById('reader-message').textContent.startsWith('第 '+n+' 页'),n);await idle();}
 let cover=await p.locator('.paper[data-pdf-page="1"]').boundingBox();
 assert(Math.abs(cover.width/cover.height-2/3)<.001);assert(cover.height>680);assert(900-cover.y-cover.height>=35);
 await p.screenshot({path:path.join(__dirname,'../../checked-gazette/desk-book-spacing.webp')});
 // Click the middle of the cover, well away from every edge.
 await p.mouse.click(cover.x+cover.width*.6,cover.y+cover.height*.5);await pageNumber(2);
 async function clickPage(side,n,y=.5){const s=await p.locator('.book-shell').boundingBox();await p.mouse.click(s.x+s.width*(side==='right'?.75:.25),s.y+s.height*y);await pageNumber(n);}
 await clickPage('right',4);await clickPage('left',2);
 // Top and lower bands are also clickable, not just the side-drag band.
 await clickPage('right',4,.2);await clickPage('left',2,.8);
 const s=await p.locator('.book-shell').boundingBox();await p.mouse.move(s.x+s.width*.9,s.y+s.height*.5);await p.mouse.down();
 for(let i=1;i<=14;i++){await p.mouse.move(s.x+s.width*(.9-.7*i/14),s.y+s.height*.5);await p.waitForTimeout(16);}
 await p.mouse.up();await pageNumber(4);
 assert.equal(await p.locator('.cecilia-loader').count(),0);
 await p.locator('#fullscreen-book').click();await p.waitForFunction(()=>document.fullscreenElement||document.querySelector('main').classList.contains('is-expanded'));await p.waitForTimeout(300);assert.match(await p.locator('#reader-message').textContent(),/^第 4 页/);
 await p.locator('#fullscreen-book').click();await p.waitForTimeout(300);
 await p.setViewportSize({width:390,height:844});await p.reload();await p.waitForFunction(()=>document.querySelector('.paper[data-pdf-page="1"]')&&!document.querySelector('#reader').dataset.entering);
 cover=await p.locator('.paper[data-pdf-page="1"]').boundingBox();assert(cover.x>=0&&cover.x+cover.width<=390);assert(844-cover.y-cover.height>=35);
 await p.mouse.click(cover.x+cover.width*.7,cover.y+cover.height*.5);await pageNumber(2);
 const mobile=await p.locator('.paper:visible').last().boundingBox();await p.mouse.click(mobile.x+mobile.width*.1,mobile.y+mobile.height*.5);await pageNumber(1);
 assert.deepEqual(errors,[]);console.log('PASS cover and broad page clicks, upper/lower bands, backward/forward, side drag, proportional sizing with bottom clearance, fullscreen and mobile tapping; no loading overlays or JS errors.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
