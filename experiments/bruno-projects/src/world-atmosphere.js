import * as T from 'three/webgpu';
import { color, mix, positionWorld, sin, smoothstep, texture } from 'three/tsl';

// Shared lightweight environmental motion for the landing world and exhibit.
export function addWorldAtmosphere(game, reduced = false) {
  const time = game.ticker.elapsedScaledUniform;
  const terrain = game.terrain.terrainNode(positionWorld.xz);
  const noise = texture(game.noises.perlin, positionWorld.xz.mul(0.075).add(time.mul(0.014))).r;
  const wave = sin(positionWorld.x.mul(1.8).add(positionWorld.z.mul(0.95)).sub(time.mul(1.05)).add(noise.mul(4)));
  const ripple = smoothstep(0.92, 1, wave).mul(noise.mul(0.65).add(0.35));
  const waterMaterial = new T.MeshBasicNodeMaterial({transparent:true,depthWrite:false,side:T.DoubleSide});
  waterMaterial.colorNode = mix(color('#348c91'), color('#a4d4c0'), noise.mul(0.16).add(ripple.mul(0.3)));
  waterMaterial.opacityNode = smoothstep(0.25, 0.62, terrain.b).mul(0.55);
  const water = new T.Mesh(new T.PlaneGeometry(200,200),waterMaterial);
  water.name = 'flowing-river-surface';water.rotation.x = -Math.PI/2;water.position.y = game.water.surfaceElevationUniform.value+0.004;
  game.scene.add(water);

  const shape = new T.Shape();shape.moveTo(0,-0.10);shape.lineTo(-0.055,-0.015);shape.lineTo(-0.036,0.055);shape.lineTo(0,0.11);shape.lineTo(0.05,0.015);shape.closePath();
  const leafCount=24;
  const leaves = new T.InstancedMesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}),leafCount);
  leaves.name='sparse-windblown-leaves';leaves.frustumCulled=false;leaves.visible=!reduced;
  const palette=['#db9a55','#db745f','#eaad75','#cc8b67'];
  const data=Array.from({length:leafCount},(_,i)=>({phase:i*2.399,age:(i*.731)%1,radius:3+(i*1.913)%12,speed:.06+(i%4)*.009}));
  const transform=new T.Object3D();
  for(let i=0;i<leafCount;i++)leaves.setColorAt(i,new T.Color(palette[i%4]));
  game.scene.add(leaves);
  function update(){
    const t=game.ticker.elapsedScaled,focus=game.view.focusPoint.position;
    water.position.x=focus.x;water.position.z=focus.z;
    if(reduced)return;
    data.forEach((d,i)=>{
      const age=(d.age+t*d.speed)%1;
      transform.position.set(focus.x+Math.cos(d.phase)*d.radius+Math.sin(t*.65+d.phase)*.6+(age-.5)*3,
        0.35+(1-age)*7.5,focus.z+Math.sin(d.phase)*d.radius+Math.cos(t*.4+d.phase)*.5);
      transform.rotation.set(t*1.3+d.phase,t*.55+d.phase,Math.sin(t*1.1+d.phase)*.8);
      transform.scale.setScalar(.7+(i%3)*.16);transform.updateMatrix();leaves.setMatrixAt(i,transform.matrix);
    });
    leaves.instanceMatrix.needsUpdate=true;
  }
  game.ticker.events.on('tick',update,11);update();
  return {water,leaves,update};
}
