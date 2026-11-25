import { letteringBaseline } from "./canvas-lettering.js";
import { T } from './create-world.js';

// Printed chalk lettering sits on the native easel's existing front face.
export function createLabChalkboard(lab) {
  const reference=lab.getObjectByName('refBlackboardLabelsMouseKeyboard');
  if(!reference)return {update(){}};
  const canvas=document.createElement('canvas');canvas.width=880;canvas.height=1080;
  const ctx=canvas.getContext('2d'),map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshBasicNodeMaterial({map,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide});
  material.userData.prevent=true;
  const geometry=new T.PlaneGeometry(1.10,1.35);geometry.rotateX(-Math.PI/2);
  const lettering=new T.Mesh(geometry,material);lettering.name='other-project-chalk-tags';
  lettering.position.copy(reference.position);lettering.quaternion.copy(reference.quaternion);lettering.scale.copy(reference.scale);
  lettering.translateY(.012);reference.parent.add(lettering);
  function update(project){
    const tags=(project.boardTags||[]).slice(0,3);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.font='400 164px "World Xiaolai"';ctx.textAlign='center';ctx.fillStyle='#fff0cf';
    const step=250,start=canvas.height/2-(tags.length-1)*step/2;
    tags.forEach((tag,index)=>ctx.fillText(tag,canvas.width/2,letteringBaseline(ctx,tag,start+index*step)));
    map.needsUpdate=true;lettering.userData.tags=[...tags];lettering.userData.project=project.name;
  }
  return {update,lettering,canvas};
}
