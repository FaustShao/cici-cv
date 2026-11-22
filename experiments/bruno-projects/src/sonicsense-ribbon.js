import * as T from 'three';

// All pages and the perforated backing are sampled from this ONE spatial surface.
// No per-card scale/rotation: shared coordinates stay joined while the ribbon moves.
export const FILM_PITCH=3.02, FILM_HEIGHT=2.34, ART_WIDTH=2.84, ART_HEIGHT=ART_WIDTH*595/842;
export function filmPoint(u,y,progress,time,motion=0){
  const radius=13;
  const twist=.085*Math.sin(u*.43+progress*.18+.45)+motion*.01;
  const theta=u/radius;
  return [radius*Math.sin(theta),.12*Math.sin(u*.38+progress*.20)+y*Math.cos(twist),radius*(Math.cos(theta)-1)+y*Math.sin(twist)];
}
export class SpatialFilm {
  constructor(stage,pages,images){
    this.stage=stage;this.pages=pages;this.images=images;this.progress=0;this.time=0;this.motion=0;this.pointer={x:0,y:0};this.loaded=new Map();
    this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0xe5effb,0);this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.canvas=this.renderer.domElement;this.canvas.id='spatial-film';this.canvas.setAttribute('aria-hidden','true');stage.prepend(this.canvas);
    this.scene=new T.Scene();this.group=new T.Group();this.scene.add(this.group);
    this.camera=new T.PerspectiveCamera(38,1,.1,80);
    this.limit=10;
    const geometry=new T.PlaneGeometry(2, FILM_HEIGHT,260,14);
    const material=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,uniforms:{ink:{value:new T.Color('#1d304b')}},
      vertexShader:'varying vec2 ribbonUV;void main(){ribbonUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform vec3 ink;varying vec2 ribbonUV;void main(){
        float horizontal=abs(mod(ribbonUV.x+.055,.11)-.055)-.027;
        float vertical=abs(abs(ribbonUV.y)-1.095)-.030;
        vec2 q=vec2(horizontal,vertical);float hole=length(max(q,0.))+min(max(q.x,q.y),0.);
        float edge=max(fwidth(hole),.0008);float alpha=smoothstep(-edge,edge,hole);
        if(alpha<.01)discard;gl_FragColor=vec4(ink,alpha);
        #include <colorspace_fragment>
      }`});
    this.backing=new T.Mesh(geometry,material);this.backing.frustumCulled=false;this.group.add(this.backing);
    this.backingOriginal=new Float32Array(geometry.attributes.position.array);
    this.meshes=pages.map((page,index)=>{
      const tex=new T.Texture(images[index]);tex.colorSpace=T.SRGBColorSpace;tex.minFilter=T.LinearMipmapLinearFilter;tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      const mat=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false});
      const geo=new T.PlaneGeometry(ART_WIDTH,ART_HEIGHT,48,20);
      const mesh=new T.Mesh(geo,mat);mesh.userData.index=index;mesh.frustumCulled=false;mesh.visible=false;
      mesh.userData.original=new Float32Array(geo.attributes.position.array);this.group.add(mesh);return mesh;
    });
    this.ray=new T.Raycaster();this.ndc=new T.Vector2();this.resize();
  }
  resize(){
    const {width,height}=this.stage.getBoundingClientRect();this.width=width;this.height=height;
    this.renderer.setSize(width,height,false);this.camera.aspect=width/height;
    const visibleHeight=Math.max(2.95,FILM_PITCH/(.98*this.camera.aspect));
    this.camera.position.set(0,.08,visibleHeight/(2*Math.tan(T.MathUtils.degToRad(19))));this.camera.lookAt(0,.04,0);this.camera.updateProjectionMatrix();
    this.pixelsPerFrame=FILM_PITCH*height/visibleHeight;
  }
  update(progress,time,motion=0,reduced=false){
    this.progress=progress;this.time=time;this.motion=motion;
    const offset=progress*FILM_PITCH,t=reduced?0:time;
    this.group.rotation.set(.035*Math.cos(t*.33)+.03*Math.sin(progress*.23)+this.pointer.y*.012,.035*Math.sin(t*.24)+.04*Math.sin(progress*.18)+this.pointer.x*.018,.018+.018*Math.sin(t*.29)+.025*Math.sin(progress*.27));
    this.group.position.y=reduced?0:.045*Math.sin(t*.65);
    const low=Math.max(-this.limit,-FILM_PITCH/2-offset),high=Math.min(this.limit,(this.pages.length-.5)*FILM_PITCH-offset);
    const geo=this.backing.geometry,pos=geo.attributes.position,uv=geo.attributes.uv;
    for(let i=0;i<pos.count;i++){
      const u=low+(this.backingOriginal[i*3]+1)*.5*(high-low),y=this.backingOriginal[i*3+1];
      const p=filmPoint(u,y,progress,t,motion);pos.setXYZ(i,...p);uv.setXY(i,u+offset,y);
    }
    pos.needsUpdate=true;uv.needsUpdate=true;
    this.meshes.forEach((mesh,index)=>{
      const center=index*FILM_PITCH-offset;mesh.visible=Math.abs(center)<this.limit+FILM_PITCH;
      if(!mesh.visible){if(this.loaded.has(index)){mesh.material.map.dispose();this.loaded.delete(index)}return;}
      const image=this.images[index],key=image.currentSrc||image.src;
      if(image.complete&&image.naturalWidth&&this.loaded.get(index)!==key){mesh.material.map.needsUpdate=true;this.loaded.set(index,key)}
      if(!this.loaded.has(index)){mesh.visible=false;return;}
      const original=mesh.userData.original,positions=mesh.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const u=original[i*3]+center,y=original[i*3+1];const p=filmPoint(u,y,progress,t,motion);
        // A single 0.004-unit normal offset keeps the image attached without z-fighting.
        const twist=.085*Math.sin(u*.43+progress*.18+.45)+motion*.01;
        p[1]-=.004*Math.sin(twist);p[2]+=.004*Math.cos(twist);positions.setXYZ(i,...p);
      }
      positions.needsUpdate=true;mesh.geometry.computeBoundingSphere();
    });
    this.scene.updateMatrixWorld(true);this.renderer.render(this.scene,this.camera);
  }
  pick(clientX,clientY){
    const r=this.canvas.getBoundingClientRect();this.ndc.set((clientX-r.left)/r.width*2-1,1-(clientY-r.top)/r.height*2);
    this.ray.setFromCamera(this.ndc,this.camera);
    const hit=this.ray.intersectObjects(this.meshes.filter(m=>m.visible),false)[0];return hit?hit.object.userData.index:null;
  }
  pointOnPage(index){
    const p=filmPoint((index-this.progress)*FILM_PITCH,0,this.progress,this.time,this.motion);
    const v=new T.Vector3(...p).applyMatrix4(this.group.matrixWorld).project(this.camera),r=this.canvas.getBoundingClientRect();
    return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};
  }
  dispose(){this.renderer.dispose();this.backing.geometry.dispose();this.backing.material.dispose();this.meshes.forEach(m=>{m.geometry.dispose();m.material.map.dispose();m.material.dispose()});this.canvas.remove()}
}
