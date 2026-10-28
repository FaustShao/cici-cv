import * as THREE from './assets/vendor/three.module.min.js';

const host = document.getElementById('scene-canvas');
const status = document.getElementById('scene-status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
try {
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0); host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-12,12,10,-10,.1,100);
  const look = new THREE.Vector3();
  const hemi = new THREE.HemisphereLight(0xf0faff,0x6c7552,2.8); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0,3.2); sun.position.set(-8,16,8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14}); sun.shadow.normalBias=.04; scene.add(sun);
  const palette = {cream:0xfff1d2, coral:0xef785c, roof:0xd94d3e, gold:0xf3c54f, blue:0x759fc9, mint:0x70b2a0, trunk:0x906653, green:0x689a63, pink:0xf5b4ae};
  const mats = new Map();
  const material = color => {if (!mats.has(color)) mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.9})); return mats.get(color);};
  function mesh(geometry, color, parent, x=0,y=0,z=0) { const object = new THREE.Mesh(geometry, material(color)); object.position.set(x,y,z); object.castShadow=true; object.receiveShadow=true; parent.add(object); return object; }
  const box = (parent,x,y,z,w,h,d,color) => mesh(new THREE.BoxGeometry(w,h,d),color,parent,x,y,z);
  const ball = (parent,x,y,z,r,color) => mesh(new THREE.IcosahedronGeometry(r,0),color,parent,x,y,z);
  function sign(parent,text,x,y,z,width=1.6) {
    const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=192;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff3d7';ctx.fillRect(0,0,512,192);ctx.fillStyle='#34433e';ctx.font='bold 85px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,102);
    const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
    const object=new THREE.Mesh(new THREE.PlaneGeometry(width,width*192/512),new THREE.MeshBasicMaterial({map:texture})); object.position.set(x,y,z);parent.add(object);
  }
  const island = new THREE.Group(); scene.add(island);
  const shape = new THREE.Shape();
  for(let i=0;i<=32;i++) {const angle=i/32*Math.PI*2, bump=1+Math.sin(angle*5)*.035+Math.cos(angle*3)*.04;const x=Math.cos(angle)*8*bump,z=Math.sin(angle)*6.5*bump; if(!i)shape.moveTo(x,z);else shape.lineTo(x,z);}
  const land = mesh(new THREE.ExtrudeGeometry(shape,{depth:.75,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.16,bevelThickness:.15}),0xc99464,island);
  land.rotation.x=-Math.PI/2;land.position.y=-.8;
  const grass=mesh(new THREE.ShapeGeometry(shape),0xaacb83,island);grass.rotation.x=-Math.PI/2;grass.position.y=.12;
  const water=mesh(new THREE.CircleGeometry(12.4,64),0x83c9d9,scene,0,-1.13,0);water.rotation.x=-Math.PI/2;water.receiveShadow=true;water.castShadow=false;
  const rippleMaterial=new THREE.MeshBasicMaterial({color:0xe5f7f5,transparent:true,opacity:.38,side:THREE.DoubleSide});
  for(let i=0;i<3;i++){const ripple=new THREE.Mesh(new THREE.RingGeometry(9.4+i*.8,9.43+i*.8,64),rippleMaterial);ripple.rotation.x=-Math.PI/2;ripple.scale.y=.82;ripple.position.y=-1.1;scene.add(ripple);}
  function road(points) { for(let i=1;i<points.length;i++){const a=points[i-1], b=points[i], length=Math.hypot(b[0]-a[0],b[1]-a[1]);const segment=box(island,(a[0]+b[0])/2,.16,(a[1]+b[1])/2,.8,.09,length+.3,0xf8e7bd);segment.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);} }
  road([[-3.8,3.5],[-1.2,3.5],[.2,1],[4.3,1],[4.3,2.8]]);
  road([[-1.2,3.5],[-1.2,-2.8],[2.6,-2.8],[4.3,1]]);
  road([[-1.2,-1.8],[-3.9,-1.8]]);
  const places={}, clickable=[], anchors={};
  function building(place,x,z,w,d,h,color,roofColor,label) {
    const group=new THREE.Group(); group.position.set(x,.2,z);island.add(group);places[place]=group;
    box(group,0,h/2,0,w,h,d,color);
    // A pitched roof with a solid triangular gable, not an open plane.
    const triangle=new THREE.Shape();triangle.moveTo(-w/2-.18,0);triangle.lineTo(w/2+.18,0);triangle.lineTo(0,.95);triangle.closePath();
    const roof=mesh(new THREE.ExtrudeGeometry(triangle,{depth:d+.36,bevelEnabled:false}),roofColor,group,0,h-.02,-d/2-.18);
    for(const side of [-1,1]){box(group,side*w*.29,h*.53,d/2+.025,.43,.66,.07,palette.cream);box(group,side*w*.29,h*.53,d/2+.07,.31,.53,.035,0x5a8a97);box(group,side*w*.29,h*.53,d/2+.1,.035,.55,.02,palette.cream);}
    box(group,0,.59,d/2+.06,.63,1.18,.12,0x375957);
    box(group,.17,.55,d/2+.14,.07,.07,.06,palette.gold);
    box(group,0,.1,d/2+.35,1.02,.2,.55,palette.cream);
    sign(group,label,0,h-.36,d/2+.075,w*.75);
    group.traverse(object=>{if(object.isMesh){object.userData.place=place;clickable.push(object);}});
    anchors[place]=new THREE.Vector3(x,h+1.55,z);
    return group;
  }
  const cv=building('resume',-3.6,2.3,3.05,2.4,2.7,palette.coral,palette.roof,'CV / CECILIA');
  const gallery=building('portfolio',2,-2.8,2.8,2.2,2.05,palette.gold,palette.cream,'ARCHIVE');
  const lab=building('other',-3.8,-2.8,2.1,1.8,1.65,palette.blue,0x527eae,'PLAY');
  const post=building('contact',4.5,2.4,1.95,1.8,1.65,palette.mint,palette.coral,'HELLO');
  // Giant book spines make the archive legible from the map.
  [palette.coral,palette.blue,palette.mint].forEach((color,i)=>{const b=box(gallery,(i-1)*.58,3.03,0,.49,1.06,.65,color);b.rotation.z=(i-1)*-.12;box(gallery,(i-1)*.58,3.15,.34,.31,.04,.02,palette.cream);});
  // A game controller on the workshop roof.
  const game=box(lab,0,2.65,0,1.6,.62,.6,palette.cream);game.rotation.z=-.13;
  box(lab,-.4,2.7,.34,.36,.1,.04,0x375957);box(lab,-.4,2.7,.34,.1,.36,.04,0x375957);
  ball(lab,.4,2.82,.35,.1,palette.coral);ball(lab,.58,2.64,.35,.1,palette.gold);
  box(post,1.35,.7,.3,.65,.65,.5,palette.coral);box(post,1.35,.27,.3,.12,.6,.12,palette.trunk);box(post,1.35,.75,.56,.38,.07,.03,0x375957);
  // Flag and book pile beside the main CV house.
  box(cv,-1.8,1.9,.1,.06,3.4,.06,palette.cream);box(cv,-1.46,3.3,.1,.68,.42,.07,palette.gold);
  for(let i=0;i<3;i++) box(island,-1,.3+i*.13,4.7,.7,.11,.48,[palette.blue,palette.coral,palette.gold][i]);
  const trees=[];
  function tree(x,z,size=1) {const g=new THREE.Group();g.position.set(x,.2,z);g.scale.setScalar(size);island.add(g);box(g,0,.6,0,.16,1.15,.16,palette.trunk);ball(g,0,1.38,0,.63,palette.green);ball(g,.32,1.1,.1,.4,0x82ad6d);trees.push(g);}
  [[-6.6,0,1.1],[-6,-3.4,.85],[-1.4,-5,1],[4.4,-4.3,.9],[6.5,-.4,1.2],[6,3.8,.8],[.4,5.2,.8],[-5.5,4.6,.75]].forEach(p=>tree(...p));
  function plant(x,z){mesh(new THREE.CylinderGeometry(.2,.14,.3,7),palette.coral,island,x,.3,z);for(let i=0;i<3;i++){const leaf=ball(island,x+Math.sin(i*2)*.15,.65,z+Math.cos(i*2)*.15,.23,0x629876);leaf.scale.y=1.5;}}
  [[-.2,-4.7],[3.6,-1.5],[-5.4,1],[-2.3,4.7],[4.8,4]].forEach(p=>plant(...p));
  // Bench, stepping stones and small shoreline rocks.
  box(island,.9,.62,3.9,1.4,.13,.45,palette.trunk);box(island,.9,.95,4.12,1.4,.45,.1,palette.gold);
  [-.5,.5].forEach(x=>box(island,.9+x,.36,3.9,.12,.55,.34,0x657a6b));
  for(let i=0;i<13;i++){const a=i*2.4;const stone=ball(island,Math.cos(a)*7.7,-.45,Math.sin(a)*6.3,.25+(i%3)*.08,0xc0c4b0);stone.scale.y=.7;}
  const lamps=[];
  [[-.5,2.4],[-1.6,-.4],[3.2,.6]].forEach(([x,z])=>{box(island,x,.9,z,.08,1.55,.08,0x4c6762);const bulb=ball(island,x,1.75,z,.23,palette.cream);bulb.material=new THREE.MeshStandardMaterial({color:0xffe5a3,emissive:0xffb458,emissiveIntensity:0});lamps.push(bulb);});
  const cloud=new THREE.Group();scene.add(cloud);cloud.position.set(-3,6,-5);for(let i=0;i<3;i++){const puff=ball(cloud,i*.7,Math.sin(i)*.25,0,.75,palette.cream);puff.scale.y=.55;}
  const starPositions=[];for(let i=0;i<50;i++){const seed=Math.sin(i*132.4)*4321;starPositions.push((seed%1)*15,5+(i%7)*.7,-5-(i%4));}
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xffedbe,size:.07}));scene.add(stars);
  let dark=false;
  function theme(value){dark=value;hemi.intensity=dark?1.3:2.8;sun.intensity=dark?.8:3.2;hemi.color.set(dark?0x91b4ed:0xf0faff);water.material.color.set(dark?0x294d70:0x83c9d9);cloud.visible=!dark;stars.visible=dark;lamps.forEach(lamp=>lamp.material.emissiveIntensity=dark?2:0);const windows=material(0x5a8a97);windows.color.set(dark?0xffd58d:0x5a8a97);windows.emissive.set(dark?0xf5ac54:0x000000);windows.emissiveIntensity=dark?.65:0;dirty=true;}
  let dirty=true,modal=!!document.querySelector('dialog[open]'), healthy=true, animateUntil=0, yaw=.0,targetYaw=0, focus=new THREE.Vector3(),focusGoal=new THREE.Vector3(), hovered='', dragging=false, startX=0,startY=0,lastX=0;
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const labels=[...document.querySelectorAll('.place-label')];
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);const aspect=width/height;const view=aspect<1.1?19:17.8;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();dirty=true;}
  new ResizeObserver(resize).observe(host);
  function hit(event){const r=host.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(clickable,false)[0]?.object.userData.place||'';}
  renderer.domElement.style.touchAction='pan-y';
  renderer.domElement.addEventListener('pointerdown',e=>{startX=lastX=e.clientX;startY=e.clientY;dragging=true;});
  renderer.domElement.addEventListener('pointermove',e=>{if(dragging&&e.buttons){targetYaw=THREE.MathUtils.clamp(targetYaw+(e.clientX-lastX)*.003,-.35,.35);lastX=e.clientX;dirty=true;}else{hovered=hit(e);renderer.domElement.style.cursor=hovered?'pointer':'grab';labels.forEach(l=>l.classList.toggle('scene-hover',l.dataset.place===hovered));dirty=true;}});
  window.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;if(Math.hypot(e.clientX-startX,e.clientY-startY)<7){const place=hit(e);if(place)window.openIslandPlace?.(place);}});
  renderer.domElement.addEventListener('pointerleave',()=>{hovered='';labels.forEach(l=>l.classList.remove('scene-hover'));dirty=true;});
  renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;});
  window.addEventListener('island:theme',e=>theme(e.detail.dark));
  window.addEventListener('island:place',e=>{focusGoal.copy(places[e.detail.place].position).multiplyScalar(.16);animateUntil=performance.now()+800;dirty=true;});
  window.addEventListener('island:reset',()=>{focusGoal.set(0,0,0);targetYaw=0;animateUntil=performance.now()+800;dirty=true;});
  window.addEventListener('island:modal',e=>{modal=e.detail.open;dirty=true;});
  const projected=new THREE.Vector3();let lastFrame=0;
  function render(time){requestAnimationFrame(render);if(!healthy||document.hidden||(modal&&time>animateUntil)||time-lastFrame<30)return;if(reduced&&!dirty)return;lastFrame=time;dirty=false;
    yaw=THREE.MathUtils.lerp(yaw,targetYaw,reduced?1:.09);focus.lerp(focusGoal,reduced?1:.075);look.copy(focus);camera.position.set(15*Math.cos(yaw)+20*Math.sin(yaw),18,20*Math.cos(yaw)-15*Math.sin(yaw));camera.lookAt(look);camera.updateMatrixWorld();
    Object.entries(places).forEach(([key,group])=>{group.position.y=THREE.MathUtils.lerp(group.position.y,hovered===key?.36:.2,.15);});
    if(!reduced)cloud.position.x=-3+Math.sin(time*.00015)*.45;
    renderer.render(scene,camera);
    const width=host.clientWidth,height=host.clientHeight;
    labels.forEach(label=>{projected.copy(anchors[label.dataset.place]).project(camera);label.style.left=`${Math.max(65,Math.min(width-65,(projected.x+1)/2*width))}px`;label.style.top=`${(1-projected.y)/2*height}px`;});
    if(Math.abs(yaw-targetYaw)>.001||focus.distanceTo(focusGoal)>.01)dirty=true;
  }
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();healthy=false;document.body.classList.remove('scene-ready');renderer.domElement.hidden=true;labels.forEach(l=>{l.style.left='';l.style.top='';});status.textContent='简洁地图模式 · 点击路牌探索';});
  theme(document.documentElement.dataset.theme==='dark');resize();requestAnimationFrame(render);document.body.classList.add('scene-ready');status.textContent='拖动轻转 · 点击探索';
} catch(error) {status.textContent='简洁地图模式 · 点击路牌探索'; console.warn('Island fallback:',error.message);}
