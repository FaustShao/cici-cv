// Final, automatic-renderer entry smoke after the full design-world regression.
const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const sharp = require("sharp");
const path = require("node:path");
const root = process.env.PREVIEW_ROOT || "http://127.0.0.1:8000/";
const review = path.resolve(__dirname,"../experiments/bruno-projects/public/review");
(async()=>{
  const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"});
    const errors=[],bad=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("response",r=>{if(r.status()>=400)bad.push(r.url());});
    await page.goto(new URL("bruno-preview/hub.html",root).href);
    await page.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
    assert.equal(await page.locator("body").getAttribute("data-failed"),null);
    assert.equal(await page.evaluate(()=>WORLD_STATE.place),"home");
    assert.ok(await page.evaluate(()=>designWorld.placements.every(p=>Math.abs(p.groundedY-p.height-.015)<.001)));
    async function shot(name){await sharp(await page.screenshot()).webp({quality:90}).toFile(path.join(review,name+".webp"));}
    await shot("home");
    const kiosk=await page.evaluate(()=>{
      const m=designWorld.kioskFace;
      const p=m.geometry.boundingBox.getCenter(m.position.clone().set(0,0,0));
      m.localToWorld(p).project(designWorld.world.camera);
      return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
    });
    await page.mouse.click(kiosk.x,kiosk.y);
    assert.ok(await page.locator("#world-map").evaluate(e=>e.open));
    await shot("navigation-map");
    await page.keyboard.press("Escape");
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(1000);
    await shot("home-mobile");
    await page.locator("#map-trigger").click();
    const box=await page.locator("#world-map").boundingBox();
    assert.ok(box.height<550,"Mobile map has no blank full-screen extension");
    assert.ok(Math.abs(box.x-(390-box.width)/2)<2);
    assert.ok(Math.abs(box.y-(844-box.height)/2)<2);
    for(const key of ["resume","portfolio","other","contact"]){
      const b=await page.locator(`[data-destination="${key}"]`).boundingBox();
      assert.ok(b.x>=0&&b.x+b.width<=390&&b.y>=box.y&&b.y+b.height<=box.y+box.height&&b.height>=44);
    }
    await shot("navigation-map-mobile");
    await page.locator("#close-map").click();
    assert.equal(await page.evaluate(()=>WORLD_STATE.place),"home");
    assert.deepEqual(errors,[]);
    assert.deepEqual(bad,[]);
    console.log("PASS: automatic renderer, entry ground contact, native kiosk map click, centered desktop/mobile map, four mobile targets, no page errors or 404.");
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
