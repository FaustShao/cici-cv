const assert=require("node:assert/strict"),{chromium}=require("playwright"),sharp=require("sharp"),path=require("node:path");
const root=process.env.PREVIEW_ROOT||"http://127.0.0.1:8000/",review=path.resolve(__dirname,"../experiments/bruno-projects/public/review");
(async()=>{
  const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"}),errors=[],bad=[];
    page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)bad.push(r.url());});
    await page.goto(new URL("bruno-preview/hub.html?webgl=1",root).href);
    await page.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
    assert.equal(await page.locator("body").getAttribute("data-failed"),null);
    const initial=await page.evaluate(()=>designWorld.viewState());
    assert.equal(initial.fov,25);assert.equal(initial.yaw,.55);assert.equal(initial.pitch,1.02);
    assert.ok(await page.evaluate(()=>designWorld.world.groundedLights.length>10&&designWorld.world.groundedLights.every(l=>Math.abs(l.gap-.008)<.001&&(l.support==="bridge"||l.water<=5))));
    assert.equal(await page.evaluate(()=>designWorld.crates.children.length),3);
    assert.ok(await page.evaluate(()=>Math.abs(designWorld.crates.userData.stackSupportGap-.005)<.001));
    assert.equal(await page.evaluate(()=>designWorld.welcome.userData.text),"Welcome to Cecilia’s world.");
    assert.ok(await page.evaluate(()=>{
      const n=designWorld.identity.userData.parcel,a=designWorld.identity.rotation.y,s=Math.sin(a),c=Math.cos(a);
      return designWorld.devices.roots.every(root=>{
        let max=-Infinity;
        root.traverse(m=>{if(!m.isMesh)return;m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;
          for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
            const p=m.position.clone().set(x,y,z);m.localToWorld(p);max=Math.max(max,(p.x-n.x)*s+(p.z-n.z)*c);
          }
        });return max<-.15;
      });
    }),"Every device is behind the name plane, not in front");
    async function frame(){const n=await page.evaluate(()=>designWorld.world.renderCount);await page.waitForFunction(n=>designWorld.world.renderCount>n,n);}
    async function shot(name){await frame();await sharp(await page.screenshot()).webp({quality:90}).toFile(path.join(review,name+".webp"));}
    async function clickDevice(index){
      const p=await page.evaluate(index=>{
        const root=designWorld.devices.roots[index],points=[];
        root.traverse(m=>{if(!m.isMesh)return;m.geometry.computeBoundingBox();const p=m.geometry.boundingBox.getCenter(m.position.clone().set(0,0,0));m.localToWorld(p).project(designWorld.world.camera);points.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2});});
        return points.find(p=>p.x>0&&p.x<innerWidth&&p.y>70&&p.y<innerHeight-100&&designWorld.pick(p.x,p.y)===root);
      },index);
      assert.ok(p,"Clickable entrance device "+index);await page.mouse.click(p.x,p.y);
    }
    await shot("home");
    await clickDevice(0);assert.equal(await page.evaluate(()=>designWorld.identity.userData.lightOn),true);
    await shot("entry-name-lit");
    await clickDevice(0);assert.equal(await page.evaluate(()=>designWorld.identity.userData.lightOn),false);
    await clickDevice(1);
    assert.ok(await page.evaluate(()=>{designWorld.updateEffects(.3);return designWorld.mapBrightness.value>1.5;}));
    await shot("entry-map-flash");
    assert.equal(await page.evaluate(()=>{designWorld.updateEffects(.8);return designWorld.mapBrightness.value;}),1);
    const counts=await page.evaluate(()=>designWorld.devices.roots.map(r=>r.userData.interactions||0));
    await page.mouse.move(700,700);await page.mouse.down({button:"middle"});await page.mouse.move(820,725,{steps:8});await page.mouse.up({button:"middle"});
    const pan=await page.evaluate(()=>designWorld.viewState());assert.notDeepEqual(pan.target,initial.target);assert.equal(pan.yaw,initial.yaw);assert.equal(pan.pitch,initial.pitch);
    assert.deepEqual(await page.evaluate(()=>designWorld.devices.roots.map(r=>r.userData.interactions||0)),counts);
    await page.mouse.move(700,700);await page.mouse.down();await page.mouse.move(760,725,{steps:6});await page.mouse.up();await frame();
    assert.notEqual(await page.evaluate(()=>designWorld.viewState().yaw),initial.yaw);
    await page.mouse.wheel(0,160);
    await page.locator("#reset-view").click();await frame();
    assert.deepEqual(await page.evaluate(()=>designWorld.viewState()),initial);
    await page.evaluate(()=>openWorldPlace("resume"));await frame();
    await page.locator("#reset-view").click();await frame();
    assert.equal(await page.evaluate(()=>WORLD_STATE.place),"home");assert.deepEqual(await page.evaluate(()=>designWorld.viewState()),initial);
    await shot("entry-reset");
    await page.locator("#theme").click();await shot("home-night");
    assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
    console.log("PASS: rear device composition, native three crates, grounded lamps, 25-degree landing, middle pan/left rotation, name toggle, one-shot map flash, reset equals initial landing from home and resume, no errors/404.");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
