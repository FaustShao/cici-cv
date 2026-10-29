// Regress the actual visible geometry, not a transformed bounding-box corner.
const assert=require("node:assert/strict"),{chromium}=require("playwright"),sharp=require("sharp"),path=require("node:path");
const root=process.env.PREVIEW_ROOT||"http://127.0.0.1:8000/",review=path.resolve(__dirname,"../experiments/bruno-projects/public/review");
(async()=>{
  const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  try{
    const page=await browser.newPage({viewport:{width:1662,height:882},reducedMotion:"reduce"}),errors=[],bad=[];
    page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)bad.push(r.url());});
    await page.goto(new URL("bruno-preview/hub.html?webgl=1",root).href);
    await page.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.failed,null,{timeout:90000});
    assert.equal(await page.locator("body").getAttribute("data-failed"),null);
    const result=await page.evaluate(()=>{
      const w=designWorld,body=w.devices.roots[0].getObjectByName("body002"),frame=w.kioskRoot.getObjectByName("physicalFixed009");
      function bounds(mesh){const a=mesh.geometry.attributes.position,points=[];for(let i=0;i<a.count;i++)points.push(mesh.position.clone().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));
        return{minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y)),minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x))};}
      function findTexture(n,depth=0){if(!n||depth>8||typeof n!=="object")return null;if(n.isTexture)return n;if(n.value?.isTexture)return n.value;for(const key of ["node","aNode","bNode","colorNode"]){const t=findTexture(n[key],depth+1);if(t)return t;}return null;}
      const texture=findTexture(w.kioskFace.material.colorNode);
      return{frame:bounds(frame),body:bounds(body),contacts:w.kioskRoot.userData.parcel.contacts,gamepad:w.devices.roots[0].userData.parcel,
        scale:w.kioskRoot.scale.x,bodyScale:w.devices.roots[0].scale.x,handParent:w.pixelHand.parent.name,handMeshes:w.pixelHand.children.map(m=>m.isInstancedMesh),textureType:texture?.image?.tagName,textureURL:texture?.image?.src,
        imageElements:document.querySelectorAll("canvas").length};
    });
    assert.equal(result.scale,2.022352518678825);assert.equal(result.bodyScale,.62);
    assert.equal(result.handParent,"physicalFixed009");assert.deepEqual(result.handMeshes,[true,true]);
    assert.equal(result.textureType,"IMG");assert.ok(result.textureURL.endsWith("/ui/cecilia-map.png"),"Board uses the original unannotated map, not the old text/hand canvas");
    assert.equal(result.contacts.length,2);
    for(const c of result.contacts)assert.ok(Math.abs(c.gap-.015)<.025,"Both visible kiosk feet touch the ground");
    assert.ok(Math.abs(result.frame.minY-.015)<.025);
    assert.ok(Math.abs(result.body.minY-result.gamepad.height-.015)<.001);
    assert.equal(result.gamepad.x,37.9);assert.equal(result.gamepad.z,40.8);
    const handPoint=await page.evaluate(()=>{
      const hand=designWorld.pixelHand,p=hand.position.clone().set(0,0,0);hand.localToWorld(p).project(designWorld.world.camera);
      const x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;return{x,y,hit:designWorld.pick(x,y)};
    });
    assert.equal(handPoint.hit,"map");await page.mouse.click(handPoint.x,handPoint.y);
    assert.ok(await page.locator("#world-map").evaluate(e=>e.open));await page.locator("#close-map").click();
    assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
    // Stop animation only after interaction tests; take honest close-up renders.
    await page.evaluate(()=>designWorld.world.renderer.setAnimationLoop(null));
    async function closeup(kind,side=false){
      await page.evaluate(({kind,side})=>{
        const w=designWorld,mesh=kind==="board"?w.kioskRoot.getObjectByName("physicalFixed009"):w.devices.roots[0].getObjectByName("body002");
        const a=mesh.geometry.attributes.position,points=[];for(let i=0;i<a.count;i++)points.push(mesh.position.clone().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));
        const x=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2,y=(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2,z=(Math.min(...points.map(p=>p.z))+Math.max(...points.map(p=>p.z)))/2;
        const camera=w.world.camera;camera.fov=35;camera.updateProjectionMatrix();
        const d=kind==="board"?12:5.5;
        camera.position.set(x+(side?d:d*.35),y+(kind==="board"?3:3),z+(side?d*.2:d));camera.lookAt(x,y,z);camera.updateMatrixWorld();
        w.world.game.view.focusPoint.position.set(x,y,z);w.world.pipeline.render();
      },{kind,side});
      await sharp(await page.screenshot()).webp({quality:92}).toFile(path.join(review,kind==="board"?(side?"map-board-side":"map-board-grounded"):"gamepad-grounded")+".webp");
    }
    await closeup("board");await closeup("board",true);await closeup("gamepad");
    console.log("PASS visible vertex support:",JSON.stringify(result));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
