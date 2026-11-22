import { worldBaseURL, versionedURL } from "./world-base.js";
import { addWorldAtmosphere } from "./world-atmosphere.js";
// Shared upstream visual modules, without vehicle, physics, or sound bootstraps.
import * as T from "three/webgpu";
import { color, float, uniform, pass, renderOutput } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { Font } from "three/addons/loaders/FontLoader.js";
import { Game } from "./bruno/Game.js";
import { Events } from "./bruno/Events.js";
import { Noises } from "./bruno/Noises.js";
import { Wind } from "./bruno/Wind.js";
import { Terrain } from "./bruno/Terrain.js";
import { Lighting } from "./bruno/Ligthing.js";
import { Fog } from "./bruno/Fog.js";
import { Materials } from "./bruno/Materials.js";
import { Floor } from "./bruno/World/Floor.js";
import { Grass } from "./bruno/World/Grass.js";
import { Trees } from "./bruno/World/Trees.js";
import { Bushes } from "./bruno/World/Bushes.js";
import { Flowers } from "./bruno/World/Flowers.js";
import { cheapDOF } from "./bruno/Passes/cheapDOF.js";

export { T };
export async function createWorld(canvas, progress) {
  const asset = (path) => versionedURL(path, worldBaseURL());
  const renderer = new T.WebGPURenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    forceWebGL: new URLSearchParams(location.search).has("webgl"),
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  await renderer.init();
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 250);
  const center = new T.Vector3(34.24, 0, 9.65),
    noop = () => {},
    silent = { play: noop, playRandomNext: noop };
  const game = (Game.instance = {
    scene,
    rendering: { renderer },
    debug: {
      active: false,
      addManualBinding: (p, t, k, o, get) => ({
        update: () => {
          t[k] = get();
        },
      }),
    },
    ticker: {
      events: new Events(),
      elapsedScaled: 0,
      elapsedScaledUniform: uniform(0),
      delta: 0,
      deltaScaled: 0,
    },
    quality: { level: 0, events: new Events() },
    viewport: { events: new Events(), width: innerWidth, height: innerHeight },
    view: {
      camera,
      optimalArea: {
        position: center.clone(),
        radius: 45,
        nearDistance: 1,
        farDistance: 140,
      },
      spherical: { offset: new T.Vector3(24, 26, 40), radius: { current: 55 } },
      delta: new T.Vector3(),
      focusPoint: { position: center.clone() },
    },
    dayCycles: {
      progress: 0.12,
      properties: {},
      events: new Events(),
      intervalEvents: new Map([["night", { inInterval: false }]]),
    },
    weather: {
      wind: { value: 0.76 },
      temperature: { value: 5 },
      rain: { value: 0 },
    },
    water: {
      surfaceElevationUniform: uniform(-0.3),
      surfaceThicknessUniform: uniform(0.013),
      depthElevation: -1.5,
    },
    reveal: {
      position2Uniform: uniform(new T.Vector2()),
      distance: float(10000),
      thickness: float(1),
      color: color("#ffffff"),
      intensity: float(1),
    },
    world: { visualVehicle: { screenPosition: new T.Vector2(-10, -10) } },
    audio: {
      register: () => silent,
      groups: new Map([
        ["click", silent],
        ["slide", silent],
        ["assemble", silent],
      ]),
    },
    achievements: { setProgress: noop },
    objects: { add: noop },
  });
  const black = new T.DataTexture(
    new Uint8Array([0, 0, 0, 255]),
    1,
    1,
    T.RGBAFormat,
  );
  black.needsUpdate = true;
  game.tracks = {
    renderTarget: { texture: black },
    size: 192,
    halfSize: 96,
    focusPoint: new T.Vector2(),
  };
  const gltf = new GLTFLoader(),
    textures = new T.TextureLoader();
  const draco = new DRACOLoader().setDecoderPath(asset("draco/"));
  gltf.setDRACOLoader(draco);
  const models = {
    areasModel: "areas/areas.glb",
    explosiveCratesModel: "explosiveCrates/explosiveCrates.glb",
    respawnsReferencesModel: "respawns/respawnsReferences.glb",
    terrainModel: "terrain/terrain.glb",
    sceneryModel: "scenery/scenery.glb",
    bushesReferences: "bushes/bushesReferences.glb",
    oakTreesVisualModel: "oakTrees/oakTreesVisual.glb",
    oakTreesReferencesModel: "oakTrees/oakTreesReferences.glb",
    birchTreesVisualModel: "birchTrees/birchTreesVisual.glb",
    birchTreesReferencesModel: "birchTrees/birchTreesReferences.glb",
    cherryTreesVisualModel: "cherryTrees/cherryTreesVisual.glb",
    cherryTreesReferencesModel: "cherryTrees/cherryTreesReferences.glb",
    flowersReferencesModel: "flowers/flowersReferences.glb",
    benchesModel: "benches/benches.glb",
    fencesModel: "fences/fences.glb",
    lanternsModel: "lanterns/lanterns.glb",
    poleLightsModel: "poleLights/poleLights.glb",
  };
  const maps = {
    paletteTexture: "palette.png",
    terrainTexture: "terrain/terrain.png",
    floorSlabsTexture: "floor/slabs.png",
    foliageTexture: "foliage/foliageSDF.png",
  };
  let loaded = 0;
  game.resources = {};
  const done = () =>
    progress(++loaded, Object.keys(models).length + Object.keys(maps).length);
  await Promise.all([
    ...Object.entries(models).map(async ([key, path]) => {
      game.resources[key] = await gltf.loadAsync(asset("bruno/" + path));
      done();
    }),
    ...Object.entries(maps).map(async ([key, path]) => {
      const tex = await textures.loadAsync(asset("bruno/" + path));
      tex.flipY = false;
      if (key === "paletteTexture") {
        tex.colorSpace = T.SRGBColorSpace;
        tex.minFilter = tex.magFilter = T.NearestFilter;
        tex.generateMipmaps = false;
      }
      if (key === "floorSlabsTexture") tex.wrapS = tex.wrapT = T.RepeatWrapping;
      game.resources[key] = tex;
      done();
    }),
  ]);
  // Preserve immutable source transforms before placement and material adaptation.
  // Both exhibit views share downloads, geometry, renderer and shader infrastructure.
  const originalResources = Object.fromEntries(Object.entries(game.resources)
    .filter(([,resource]) => resource.scene).map(([key,resource]) => [key,{scene:resource.scene.clone(true)}]));
  const originalTerrainImage = game.resources.terrainTexture.image;
  // CPU copy of the same terrain mask sampled by the floor shader. Blue is
  // water/depth, red is the paved route, green is grass. Placement checks use
  // the entire fixture footprint, not just a guessed center height.
  const terrainCanvas = document.createElement("canvas");
  const terrainImage = game.resources.terrainTexture.image;
  terrainCanvas.width = terrainImage.width;
  terrainCanvas.height = terrainImage.height;
  const terrainContext = terrainCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  terrainContext.drawImage(terrainImage, 0, 0);
  const terrainPixels = terrainContext.getImageData(
    0,
    0,
    terrainCanvas.width,
    terrainCanvas.height,
  );
  function sample(x, z) {
    const ix = T.MathUtils.clamp(
      Math.floor((x / 192 + 0.5) * terrainCanvas.width),
      0,
      terrainCanvas.width - 1,
    );
    const iz = T.MathUtils.clamp(
      Math.floor((z / 192 + 0.5) * terrainCanvas.height),
      0,
      terrainCanvas.height - 1,
    );
    const i = (iz * terrainCanvas.width + ix) * 4;
    return {
      road: terrainPixels.data[i],
      grass: terrainPixels.data[i + 1],
      water: terrainPixels.data[i + 2],
      height: (-1.5 * terrainPixels.data[i + 2]) / 255,
    };
  }
  const surface = {
    sample,
    check(x, z, width, depth) {
      let maxWater = 0,
        maxRoad = 0,
        height = -Infinity;
      for (let i = 0; i <= 8; i++)
        for (let j = 0; j <= 8; j++) {
          const s = sample(
            x + width * (i / 8 - 0.5),
            z + depth * (j / 8 - 0.5),
          );
          maxWater = Math.max(maxWater, s.water);
          maxRoad = Math.max(maxRoad, s.road);
          height = Math.max(height, s.height);
        }
      return { maxWater, maxRoad, height };
    },
    clearGrass(x, z, width, depth) {
      for (let iz = 0; iz < terrainCanvas.height; iz++)
        for (let ix = 0; ix < terrainCanvas.width; ix++) {
          const px = (ix / terrainCanvas.width - 0.5) * 192,
            pz = (iz / terrainCanvas.height - 0.5) * 192;
          if (Math.abs(px - x) <= width / 2 && Math.abs(pz - z) <= depth / 2)
            terrainPixels.data[(iz * terrainCanvas.width + ix) * 4 + 1] = 0;
        }
      terrainContext.putImageData(terrainPixels, 0, 0);
      game.resources.terrainTexture.image = terrainCanvas;
      game.resources.terrainTexture.needsUpdate = true;
    },
  };
  const presets = {
    day: {
      lightColor: "#ffd2c2",
      lightIntensity: 1.2,
      shadowColor: "#663aef",
      fogColorA: "#00ffff",
      fogColorB: "#9b89ff",
      fogNearRatio: 0.40,
      fogFarRatio: 1.25,
    },
  };
  function setTheme() {
    for (const [key, value] of Object.entries(presets.day))
      game.dayCycles.properties[key] = {
        value: typeof value === "string" ? new T.Color(value) : value,
      };
    game.dayCycles.progress = 0.12;
    game.dayCycles.intervalEvents.get("night").inInterval = false;
    game.dayCycles.events.trigger("night", [false]);
  }
  setTheme(false);
  game.noises = new Noises();
  game.wind = new Wind();
  game.wind.timeFrequency=.28;
  game.terrain = new Terrain();
  game.lighting = new Lighting();
  // Retain the warm daytime light; reduce ground fill so shaded forms keep depth.
  game.lighting.lightBounceMultiplier.value = 0.88;
  game.fog = new Fog();
  game.materials = new Materials();
  const sharedSceneNodes = new Set(scene.children);
  Floor.prototype.setPhysical = noop;
  Floor.prototype.setBedRock = noop;
  Floor.prototype.update = function () {
    this.mesh.position.x = Math.round(this.game.view.optimalArea.position.x / this.cellSize) * this.cellSize;
    this.mesh.position.z = Math.round(this.game.view.optimalArea.position.z / this.cellSize) * this.cellSize;
  };
  Trees.prototype.setPhysical = noop;
  // Extend ground beyond the camera so this stays an open landscape, not a
  // bounded island. Keep upstream lighting and foliage density unchanged.
  game.view.optimalArea.radius = 100;
  game.world.floor = new Floor();
  game.view.optimalArea.radius = 45;
  game.world.grass = new Grass();
  game.world.grass.bladeWidth.value *= 0.90;
  game.world.grass.bladeHeight.value = 0.70;
  game.world.grass.bladeHeightRandomness.value = 0.6;
  game.world.atmosphere = addWorldAtmosphere(game, matchMedia("(prefers-reduced-motion: reduce)").matches);

  const near = (object) =>
    Math.hypot(object.position.x - center.x, object.position.z - center.z) < 48;
  const nearVegetation = (object) =>
    Math.hypot(object.position.x - center.x, object.position.z - center.z) < 72;
  // Rectangles follow the actual fixtures, rather than clearing whole 9–12m
  // circles around them. Keep the open entrance silhouette and dry paths.
  const beds = {
    trees:[[35,31,51,46],[18.5,19,30,28],[49.5,25,59.5,35],[21,2,29,10],[30,9,39,17],[10,14,18,22]],
    low:[[35,35,43,42],[39,30,46.5,36.5],[46,33,50,36],[19.5,20,29,28],[50,26,59,34],[24,5,38,15],[10,14,18,21]],
  };
  const inBed=(x,z,kind)=>beds[kind].some(([left,top,right,bottom])=>x>left&&x<right&&z>top&&z<bottom);
  const inName=(x,z)=>{
    const a=Math.PI/7.2,dx=x-43,dz=z-42.5;
    return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<7 && Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<1.1;
  };
  game.world.vegetationStats={trees:{},bushes:0,flowers:0};
  for (const [type, a, b] of [
    ["oak", "#b4b536", "#d8cf3b"],
    ["birch", "#ff4f2b", "#ff903f"],
    ["cherry", "#ed82a0", "#ffc1c5"],
  ]) {
    const refs = game.resources[type + "TreesReferencesModel"].scene.children
      .filter(nearVegetation)
      .filter(tree=>!inBed(tree.position.x,tree.position.z,"trees")&&surface.check(tree.position.x,tree.position.z,.5,.5).maxWater<=5);
    if(type==="cherry"){
      // Reuse the native cherry geometry to flank our wider bilingual entry.
      // The native tree at the controller's location cannot stay under it.
      const template=game.resources.cherryTreesReferencesModel.scene.children[0];
      for(const [x,z,scale] of [[33,38,.75],[59,39,.65]]){
        const ground=surface.check(x,z,.7,.7);
        if(ground.maxWater>5||surface.sample(x,z).road>120)continue;
        const ref=template.clone();ref.position.set(x,ground.height,z);ref.scale.multiplyScalar(scale);ref.updateMatrix();ref.updateMatrixWorld(true);refs.push(ref);
      }
    }
    game.world.vegetationStats.trees[type]=refs.length;
    if (refs.length)
      game.world[type + "Trees"] = new Trees(
        type,
        game.resources[type + "TreesVisualModel"].scene,
        refs,
        a,
        b,
      );
  }
  game.resources.bushesReferences.scene.children =
    game.resources.bushesReferences.scene.children.filter(nearVegetation).filter((b) =>
      !inBed(b.position.x,b.position.z,"low")&&!inName(b.position.x,b.position.z),
    );
  game.world.bushes = new Bushes();
  game.world.vegetationStats.bushes=game.resources.bushesReferences.scene.children.length;
  const flowerRefs=game.resources.flowersReferencesModel.scene.children.filter(nearVegetation);
  // Native clusters now populate the banks and path edges, including the
  // foreground that was previously blank. Each individual cluster is checked.
  for(const [x,z] of [[33,36],[34,38],[34,41],[36,46],[39,48],[44,48],[49,47],[51,41],[52,36],[48,23],[29,29],[20,29]]){
    const ref=new T.Object3D();ref.position.set(x,surface.sample(x,z).height+.384,z);flowerRefs.push(ref);
  }
  const flowerAccepts=(x,z)=>{
    const floor=surface.sample(x,z);
    return floor.water<=5&&floor.road<120&&floor.grass>100&&!inBed(x,z,"low")&&!inName(x,z);
  };
  game.world.flowers=new Flowers(flowerRefs,flowerAccepts);
  game.world.vegetationStats.flowers=game.world.flowers.transformMatrices.length;
  function clean(root) {
    const remove = [];
    root.traverse((m) => {
      if (
        /^(cuboid|hull|trimesh|tube|ball(?:\.|$))/.test(m.name) ||
        /^ref(?:Zone|Intersect|Interactive)/.test(m.name)
      )
        remove.push(m);
      if (m.isMesh) {
        // Native palette conversions do not retain the GLTF material name.
        // Do not convert the already-node material a second time to white.
        if (m.material?.isNodeMaterial) m.material.userData.prevent = true;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    remove.forEach((m) => m.removeFromParent());
    game.materials.updateObject(root);
    return root;
  }
  const groundedLights = [];
  const supportRay = new T.Raycaster();
  function settleLight(root) {
    root.updateWorldMatrix(true, true);
    const bounds = new T.Box3().setFromObject(root), center = bounds.getCenter(new T.Vector3());
    const feet=[];
    root.traverse(mesh=>{
      if(!mesh.isMesh) return;
      const positions=mesh.geometry.attributes.position;
      for(let i=0;i<positions.count;i++) {
        const p=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
        if(p.y<bounds.min.y+.04)feet.push(p);
      }
    });
    if(feet.length){ center.x=feet.reduce((n,p)=>n+p.x,0)/feet.length;center.z=feet.reduce((n,p)=>n+p.z,0)/feet.length; }
    let ground = surface.check(center.x, center.z, .3, .3);
    let supportY = ground.height;
    // A lantern on a bridge belongs on its actual deck, not in the water below.
    const bridges = scene.children.filter(o => /^bridgePhysical/.test(o.name));
    bridges.forEach(o=>o.updateWorldMatrix(true,true));
    supportRay.set(new T.Vector3(center.x, bounds.min.y + 4, center.z), new T.Vector3(0,-1,0));
    const deck = supportRay.intersectObjects(bridges, true).find(h => h.point.y > supportY && h.point.y < bounds.min.y + 1.5);
    if (deck) supportY = deck.point.y;
    if(!deck && ground.maxWater>5){
      let best;
      for(let dx=-6;dx<=6;dx+=.25)for(let dz=-6;dz<=6;dz+=.25){
        const candidate=surface.check(center.x+dx,center.z+dz,.8,.8);
        if(candidate.maxWater<=5 && (!best||dx*dx+dz*dz<best.score))best={dx,dz,score:dx*dx+dz*dz,...candidate};
      }
      if(!best)throw new Error("灯具附近未找到落地支撑："+root.name);
      root.position.x+=best.dx;root.position.z+=best.dz;center.x+=best.dx;center.z+=best.dz;
      ground=best;supportY=best.height;
    }
    const before = bounds.min.y;
    root.position.y += supportY + .008 - bounds.min.y;
    root.updateWorldMatrix(true,true);
    const bottom = new T.Box3().setFromObject(root).min.y;
    groundedLights.push({name:root.name,x:center.x,z:center.z,before,bottom,supportY,gap:bottom-supportY,water:surface.sample(center.x,center.z).water,support:deck?"bridge":"terrain"});
  }
  for (const key of [
    "sceneryModel",
    "benchesModel",
    "fencesModel",
    "lanternsModel",
    "poleLightsModel",
  ])
    for (const child of [...game.resources[key].scene.children])
      if (key === "sceneryModel" || near(child)) {
        // Figma 45:1110 explicitly removes this one intersecting kiosk lantern.
        if(key==="lanternsModel"&&child.name==="lantern015")continue;
        // Keep the native entrance lamp, but out of the new name's silhouette.
        if (key === "poleLightsModel" && child.name === "poleLight001") {
          child.position.x = 35.5;
          child.position.z = 38.5;
        }
        if (
          key === "sceneryModel" &&
          /^basaltRocks/.test(child.name) &&
          Math.hypot(child.position.x - 26, child.position.z - 24) < 9
        )
          continue;
        scene.add(clean(child));
        if (key === "lanternsModel" || key === "poleLightsModel") settleLight(child);
      }
  const renderPass = pass(scene, camera),
    renderColor = renderPass.getTextureNode("output"),
    glow = bloom(renderColor);
  glow._nMips = 5;
  glow.threshold.value = 1;
  glow.strength.value = 0.25;
  glow.smoothWidth.value = 1;
  const dof = cheapDOF(renderOutput(renderPass)),
    pipeline = new T.RenderPipeline(renderer);
  pipeline.outputNode = dof.add(glow);
  function setQuality(low) {
    renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.5));
    game.lighting.light.shadow.mapSize.set(low ? 512 : 2048, low ? 512 : 2048);
    pipeline.outputNode = low ? renderColor.add(glow) : dof.add(glow);
    pipeline.needsUpdate = true;
  }
  const ttf = new TTFLoader();
  const [english, chinese] = await Promise.all([
    ttf.loadAsync(asset("fonts/scene-latin.ttf")),
    ttf.loadAsync(asset("fonts/scene-sans.ttf")),
  ]);
  return {
    game,
    scene,
    camera,
    renderer,
    pipeline,
    center,
    clean,
    setTheme,
    setQuality,
    asset,
    english: new Font(english),
    chinese: new Font(chinese),
    textures,
    surface,
    originalResources,
    originalTerrainImage,
    sharedSceneNodes,
    groundedLights,
  };
}
