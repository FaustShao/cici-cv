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
import { cheapDOF } from "./bruno/Passes/cheapDOF.js";

export { T };
export async function createWorld(canvas, progress) {
  const asset = (path) => new URL(path, new URL(".", location.href)).href;
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
      wind: { value: 0.25 },
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
    terrainModel: "terrain/terrain.glb",
    sceneryModel: "scenery/scenery.glb",
    bushesReferences: "bushes/bushesReferences.glb",
    oakTreesVisualModel: "oakTrees/oakTreesVisual.glb",
    oakTreesReferencesModel: "oakTrees/oakTreesReferences.glb",
    birchTreesVisualModel: "birchTrees/birchTreesVisual.glb",
    birchTreesReferencesModel: "birchTrees/birchTreesReferences.glb",
    cherryTreesVisualModel: "cherryTrees/cherryTreesVisual.glb",
    cherryTreesReferencesModel: "cherryTrees/cherryTreesReferences.glb",
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
      shadowColor: "#6d3fff",
      fogColorA: "#00ffff",
      fogColorB: "#9b89ff",
      fogNearRatio: 0.315,
      fogFarRatio: 1.25,
    },
    night: {
      lightColor: "#3240ff",
      lightIntensity: 3.8,
      shadowColor: "#2f00db",
      fogColorA: "#10266f",
      fogColorB: "#490a42",
      fogNearRatio: -0.85,
      fogFarRatio: 1,
    },
  };
  function setTheme(night) {
    for (const [key, value] of Object.entries(presets[night ? "night" : "day"]))
      game.dayCycles.properties[key] = {
        value: typeof value === "string" ? new T.Color(value) : value,
      };
    game.dayCycles.progress = night ? 0.45 : 0.12;
    game.dayCycles.intervalEvents.get("night").inInterval = night;
    game.dayCycles.events.trigger("night", [night]);
  }
  setTheme(false);
  game.noises = new Noises();
  game.wind = new Wind();
  game.terrain = new Terrain();
  game.lighting = new Lighting();
  game.fog = new Fog();
  game.materials = new Materials();
  Floor.prototype.setPhysical = noop;
  Floor.prototype.setBedRock = noop;
  Floor.prototype.update = function () {
    this.mesh.position.x = Math.round(center.x / this.cellSize) * this.cellSize;
    this.mesh.position.z = Math.round(center.z / this.cellSize) * this.cellSize;
  };
  Trees.prototype.setPhysical = noop;
  // Extend ground beyond the camera so this stays an open landscape, not a
  // bounded island. Keep upstream lighting and foliage density unchanged.
  game.view.optimalArea.radius = 100;
  game.world.floor = new Floor();
  game.view.optimalArea.radius = 45;
  game.world.grass = new Grass();
  game.world.grass.bladeHeight.value = 0.65;
  const near = (object) =>
    Math.hypot(object.position.x - center.x, object.position.z - center.z) < 48;
  for (const [type, a, b] of [
    ["oak", "#b4b536", "#d8cf3b"],
    ["birch", "#ff4f2b", "#ff903f"],
    ["cherry", "#ff6d6d", "#ff9990"],
  ]) {
    const clearings = [
      [43, 43, 7],
      [25, 6, 4],
      [35, 13, 4],
      [14, 18, 3],
      [48, 25, 7],
      [26, 24, 9],
      [47, 29, 7],
      [45, 49, 12],
    ];
    const refs = game.resources[type + "TreesReferencesModel"].scene.children
      .filter(near)
      .filter((tree) =>
        clearings.every(
          ([x, z, r]) =>
            Math.hypot(tree.position.x - x, tree.position.z - z) > r,
        ),
      );
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
    game.resources.bushesReferences.scene.children.filter(near).filter((b) =>
      [
        [26, 24, 6],
        [47, 29, 5],
        [45, 49, 12],
      ].every(
        ([x, z, r]) => Math.hypot(b.position.x - x, b.position.z - z) > r,
      ),
    );
  game.world.bushes = new Bushes();
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
  for (const key of [
    "sceneryModel",
    "benchesModel",
    "fencesModel",
    "lanternsModel",
    "poleLightsModel",
  ])
    for (const child of [...game.resources[key].scene.children])
      if (key === "sceneryModel" || near(child)) {
        if (
          key === "sceneryModel" &&
          /^basaltRocks/.test(child.name) &&
          Math.hypot(child.position.x - 26, child.position.z - 24) < 9
        )
          continue;
        scene.add(clean(child));
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
  };
}
