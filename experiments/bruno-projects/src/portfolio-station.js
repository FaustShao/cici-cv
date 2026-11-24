import * as T from "three/webgpu";
import gsap from "gsap";
import { References } from "./bruno/References.js";
import { Floor } from "./bruno/World/Floor.js";
import { Grass } from "./bruno/World/Grass.js";
import { Trees } from "./bruno/World/Trees.js";
import { Bushes } from "./bruno/World/Bushes.js";
import { ProjectsArea } from "./bruno/World/Areas/ProjectsArea.js";
import { addWorldAtmosphere } from "./world-atmosphere.js";
import data from "./data/projects.js";

// One station in the existing world; never creates a renderer, camera or render loop.
export async function createPortfolioStation(world,readWork) {
  const {game,scene,camera,originalResources}=world;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noop=()=>{},silent={play:noop};
  let selected=0,area,updateProjectLabels=()=>{};
  const hubPresentation=new T.Group();hubPresentation.name="home-stations";
  for(const node of [...scene.children])if(!world.sharedSceneNodes.has(node))hubPresentation.add(node);
  scene.add(hubPresentation);
  const previousNodes=new Set(scene.children);
  const hubOptimal={...game.view.optimalArea,position:game.view.optimalArea.position.clone()};
  const hubLighting={radius:game.lighting.spherical.radius,amplitude:game.lighting.shadowAmplitude,depth:game.lighting.depth};
  const hubTerrainImage=game.resources.terrainTexture.image;
  const savedWorld={...game.world};
  const center=new T.Vector3();
  const calibration = new T.PerspectiveCamera(25, 16 / 9, 0.1, 200);
  calibration.position.setFromSphericalCoords(
    42,
    Math.PI * 0.31,
    Math.PI * 0.25,
  );
  calibration.lookAt(0, 0, 0);
  calibration.updateMatrixWorld();
  const ground = new T.Plane(new T.Vector3(0, 1, 0), 0),
    probe = new T.Raycaster();
  const corners = [
    [1, -1],
    [-1, 1],
    [-1, -1],
    [1, 1],
  ].map(([x, y]) => {
    probe.setFromCamera(new T.Vector2(x, y), calibration);
    return probe.ray.intersectPlane(ground, new T.Vector3());
  });
  const baseCenter = corners
    .reduce((sum, p) => sum.add(p), new T.Vector3())
    .multiplyScalar(0.25);
  const nativeProject = game.resources.areasModel.scene.children.find(
    (c) => c.name === "projects",
  );
  nativeProject.updateWorldMatrix(true, true);
  const interactive = nativeProject
    .getObjectByName("refInteractivePoint")
    .getWorldPosition(new T.Vector3());
  interactive.y = 0;
  center.copy(baseCenter).add(interactive);
  game.view.optimalArea.position.copy(center);
  game.view.optimalArea.radius = baseCenter.distanceTo(corners[3]);
  for (const [key, y] of [
    ["nearDistance", -1],
    ["farDistance", 1],
  ]) {
    probe.setFromCamera(new T.Vector2(0, y), calibration);
    game.view.optimalArea[key] = calibration.position.distanceTo(
      probe.ray.intersectPlane(ground, new T.Vector3()),
    );
  }
  game.world.floor = new Floor();
  game.world.grass = new Grass();
  game.world.grass.bladeWidth.value *= 0.90;
  game.world.grass.bladeHeight.value *= 1.07;
  game.world.grass.bladeHeightRandomness.value = 0.6;
  addWorldAtmosphere(game, reduced);
  const near = (object) =>
    Math.hypot(object.position.x - center.x, object.position.z - center.z) < 33;
  const trees = [
    ["oak", "#b4b536", "#d8cf3b"],
    ["birch", "#ff4f2b", "#ff903f"],
    ["cherry", "#ff6d6d", "#ff9990"],
  ];
  for (const [type, a, b] of trees) {
    const refs =
      originalResources[type + "TreesReferencesModel"].scene.children.filter(near);
    if (refs.length) {
      const tree = new Trees(
        type,
        originalResources[type + "TreesVisualModel"].scene,
        refs,
        a,
        b,
      );
      game.world[type + "Trees"] = tree;
    }
  }
  const hubBushes = game.resources.bushesReferences;
  game.resources.bushesReferences = originalResources.bushesReferences;
  game.resources.bushesReferences.scene.children = game.resources.bushesReferences.scene.children.filter(near);
  game.world.bushes = new Bushes();
  game.resources.bushesReferences = hubBushes;
  function cleanModel(root) {
    const remove = [];
    root.traverse((m) => {
      if (/^(cuboid|hull|trimesh|tube|ball(?:\.|$))/i.test(m.name))
        remove.push(m);
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    remove.forEach((m) => m.removeFromParent());
    game.materials.updateObject(root);
    return root;
  }
  for (const child of [...originalResources.sceneryModel.scene.children]) {
    scene.add(cleanModel(child));
  }
  const emissiveMeshes = [];
  for (const key of [
    "benchesModel",
    "fencesModel",
    "lanternsModel",
    "poleLightsModel",
  ])
    for (const child of [...originalResources[key].scene.children]) {
      if (!near(child)) continue;
      scene.add(cleanModel(child));
      child.traverse((m) => {
        if (
          m.isMesh &&
          m.material === game.materials.list.get("emissiveOrangeRadialGradient")
        )
          emissiveMeshes.push(m);
      });
    }
  const projectRoot = originalResources.areasModel.scene.children.find(
    (c) => c.name === "projects",
  );
  // Replace only the original label atlas, preserving its mesh, UVs and lighting.
  // The original role/at/with headings occupy the lower half of this atlas.
  const labelsCanvas = document.createElement("canvas");
  labelsCanvas.width = 2048;
  labelsCanvas.height = 512;
  const labelsContext = labelsCanvas.getContext("2d");
  const labelsTexture = new T.CanvasTexture(labelsCanvas);
  labelsTexture.colorSpace = T.SRGBColorSpace;
  labelsTexture.flipY = false;
  let currentAtLabel = null;
  updateProjectLabels = () => {
    const atLabel = data[selected].attributeLabels?.at || "地点";
    if (atLabel === currentAtLabel) return;
    currentAtLabel = atLabel;
    labelsContext.fillStyle = "#000";
    labelsContext.fillRect(0, 0, 2048, 512);
    labelsContext.fillStyle = "#fff";
    labelsContext.textAlign = "center";
    labelsContext.textBaseline = "middle";
    for (const [label, x, y, size] of [
      ["设计档案", 1024, 128, 150],
      ["项目性质", 393, 384, 140],
      ["角色", 1188, 384, 210],
      [atLabel, 1791, 384, atLabel.length > 2 ? 105 : 185],
    ]) {
      labelsContext.font = `400 ${size}px Xiaolai`;
      labelsContext.fillText(label, x, y);
    }
    labelsTexture.needsUpdate = true;
    labelsCanvas.dataset.atLabel = atLabel;
  };
  updateProjectLabels();
  projectRoot.traverse((mesh) => {
    if (mesh.isMesh && mesh.material.name === "projectsLabels")
      mesh.material.map = labelsTexture;
  });
  projectRoot.updateWorldMatrix(true, true);
  const roots = [...projectRoot.children],
    refs = new References();
  for (const child of roots) {
    scene.attach(child);
    cleanModel(child);
    refs.parse(child);
  }
  const hitAreas = [];
  game.rayCursor = {
    addIntersect(description) {
      hitAreas.push(description);
      return description;
    },
  };
  game.resourcesLoader = {
    getLoader() {
      return {
        load(path, callback) {
          world.textures.load(world.asset(path), (tex) => {
            tex.flipY = false;
            tex.colorSpace = T.SRGBColorSpace;
            tex.magFilter = T.LinearFilter;
            tex.minFilter = T.LinearFilter;
            callback(tex);
          });
        },
      };
    },
  };
  // Original ProjectsArea visual methods, with its vehicle/zone constructor
  // intentionally not called. Geometry and reference transforms stay original.
  area = Object.create(ProjectsArea.prototype);
  Object.assign(area, {
    game,
    references: refs,
    state: ProjectsArea.STATE_OPEN,
    blackBoard: { active: false },
    // Original update() plays this on every strike. Full spatial audio depends
    // on the game's physics setup; this visual-only adapter remains silent.
    sounds: { anvil: silent },
  });
  for (const method of [
    "setCinematic",
    "setShadeMix",
    "setTexts",
    "setHover",
    "setNavigation",
    "setImages",
    "setPagination",
    "setAttributes",
    "setAdjacents",
    "setTitle",
    "setUrl",
  ])
    area[method]();
  area.distinctions = { update: noop };
  refs.items.get("distinctions")[0].visible = false;
  roots
    .filter((object) => object.name === "medal")
    .forEach((object) => (object.visible = false));
  for (const [name, objects] of refs.items)
    if (name.startsWith("blackboardLabels"))
      objects.forEach((o) => (o.visible = false));
  area.setOven();
  area.setGrinder();
  area.setAnvil();
  area.shadeMix.images.mixUniform.value = area.shadeMix.images.max;
  area.shadeMix.texts.mixUniform.value = area.shadeMix.texts.max;
  area.url.open = readWork;
  select(0);
  // Only the visible pagination dots can receive pointer input.
  for (const hit of hitAreas) {
    const dot = area.pagination.items.find((item) => item.intersect === hit);
    hit.active = dot ? dot.visible : true;
  }
  const modelButtons = [
    ["arrowPreviousImage", area.pagination.previousIntersect],
    ["arrowNextImage", area.pagination.nextIntersect],
    ["arrowPreviousProject", area.adjacents.previous.intersect],
    ["arrowNextProject", area.adjacents.next.intersect],
  ].map(([name, hit]) => ({ mesh: refs.items.get(name)[0], hit }));
  const modelButtonBounds = new T.Box3();
  const modelButtonPoint = new T.Vector3();
  // Screen itself is directly clickable, in addition to original model arrows.
  const screen = area.images.mesh;
  screen.userData.openWork = true;

  const group=new T.Group();group.name="portfolio-station";
  for(const node of [...scene.children])if(!previousNodes.has(node))group.add(node);
  scene.add(group);
  const portfolioOptimal={...game.view.optimalArea,position:game.view.optimalArea.position.clone()};
  const portfolioLighting={radius:portfolioOptimal.radius+1,amplitude:portfolioOptimal.radius,depth:portfolioOptimal.radius*2};
  Object.assign(game.world,savedWorld);
  function useLighting(preset){
    const lighting=game.lighting;
    lighting.spherical.radius=preset.radius;lighting.shadowAmplitude=preset.amplitude;lighting.depth=preset.depth;
    const shadow=lighting.light.shadow.camera;
    shadow.top=shadow.right=preset.amplitude;shadow.bottom=shadow.left=-preset.amplitude;
    shadow.far=lighting.near+preset.depth;shadow.updateProjectionMatrix();
  }
  let active=false;
  function activate(value){
    active=value;
    hubPresentation.visible=!value;group.visible=value;
    const optimal=value?portfolioOptimal:hubOptimal;
    Object.assign(game.view.optimalArea,optimal,{position:optimal.position.clone()});
    useLighting(value?portfolioLighting:hubLighting);
    game.resources.terrainTexture.image=value?world.originalTerrainImage:hubTerrainImage;
    game.resources.terrainTexture.needsUpdate=true;
    game.fog.update();game.lighting.update();
  }
  function select(index){
    selected=(index+data.length)%data.length;
    if(area){area.changeProject(selected,ProjectsArea.DIRECTION_NEXT,true,true);area.navigation.index=selected;}
    syncSelection();
  }
  function syncSelection(){
    selected=area?.navigation.index??selected;updateProjectLabels();
    document.getElementById("selection").textContent=String(selected+1).padStart(2,"0")+" / "+String(data.length).padStart(2,"0");
    document.getElementById("project-name").textContent=data[selected].title;
  }
  const screenCenter=new T.Box3().setFromObject(screen).getCenter(new T.Vector3());
  const offset=area.cinematic.position.clone().sub(area.cinematic.target);
  const spherical=new T.Spherical().setFromVector3(offset);
  function pose(){return{focus:(innerWidth<700?screenCenter:area.cinematic.target).clone(),distance:spherical.radius,yaw:spherical.theta,pitch:spherical.phi,fov:innerWidth<700?56:25};}
  const ray=new T.Raycaster(),pointer=new T.Vector2(),screenTarget={onClick:readWork};
  function pick(x,y, touchRadius = 0) {
    pointer.set(
      (x / innerWidth) * 2 - 1,
      (-y / innerHeight) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    // Derive the button targets from the rendered meshes, rather than the
    // upstream reference spheres, which do not match this adapted scene.
    let button = null, distance = Infinity;
    for (const target of modelButtons) {
      if (!target.hit.active || !target.mesh.visible) continue;
      modelButtonBounds.setFromObject(target.mesh).expandByScalar(0.035);
      if (ray.ray.intersectBox(modelButtonBounds, modelButtonPoint)) {
        const d = ray.ray.origin.distanceToSquared(modelButtonPoint);
        if (d < distance) { button = target.hit; distance = d; }
      }
    }
    if (button) return button;
    const screenHit = ray.intersectObject(screen, false)[0];
    if (screenHit) return screenTarget;
    let nearest = null;
    distance = Infinity;
    for (const hit of hitAreas) {
      if (!hit.active || modelButtons.some((target) => target.hit === hit)) continue;
      let point = null;
      if (hit.shape?.isObject3D) {
        point = ray.intersectObject(hit.shape, true)[0]?.point;
      } else if (hit.shape?.isSphere) {
        point = ray.ray.intersectSphere(hit.shape, modelButtonPoint);
      }
      if (point) {
        const d = ray.ray.origin.distanceToSquared(point);
        if (d < distance) { nearest = hit; distance = d; }
      }
    }
    if (nearest || !touchRadius) return nearest;
    // Allow a fingertip just outside a small model arrow; exact screen and
    // pagination hits above keep priority over this extra touch area.
    let closest = touchRadius;
    for (const { mesh, hit } of modelButtons) {
      if (!hit.active || !mesh.visible) continue;
      const point = modelButtonBounds.setFromObject(mesh).getCenter(modelButtonPoint).project(camera);
      if (point.z < -1 || point.z > 1) continue;
      const delta = Math.hypot((point.x + 1) * innerWidth / 2 - x, (1 - point.y) * innerHeight / 2 - y);
      if (delta < closest) { closest = delta; nearest = hit; }
    }
    return nearest;
  }

  for(const part of [area.title,area.url]){gsap.killTweensOf(part.inner.rotation);part.inner.rotation.x=0;part.status="visible";}
  area.title.textCanvas.updateText(data[0].title);
  area.url.textCanvas.updateText("点击查看完整项目");
  area.url.panel.scale.x=Math.max(2.4,area.url.textCanvas.getMeasure().width/area.texts.density+.9);
  // Decode the selected cover once before the shared scene is revealed.
  await new Promise((resolve,reject)=>{const started=performance.now();function check(){if(area.images.initiated&&area.images.loadProgress.value===1)return resolve();if(performance.now()-started>60000)return reject(new Error("作品集封面加载失败"));setTimeout(check,20);}check();});
  activate(false);
  return {area,game,renderer:world.renderer,group,hubPresentation,pose,activate,select,pick,
    get selected(){return area.navigation.index;},get current(){return data[area.navigation.index];},
    update(){if(active){area.update();emissiveMeshes.forEach(mesh=>mesh.visible=true);syncSelection();}},
    hover(next){if(next!==this.hovered){this.hovered?.onLeave?.();next?.onEnter?.();this.hovered=next;}},
    clearHover(){this.hover(null);},
    ready:()=>area.images.initiated&&area.images.loadProgress.value===1,
    async warm(){activate(true);await world.renderer.compileAsync(scene,camera);activate(false);},
  };
}
