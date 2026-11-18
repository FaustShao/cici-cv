import { getWorldAudio } from "./world-audio.js";
import { addWorldAtmosphere } from "./world-atmosphere.js";
import * as T from "three/webgpu";
import {
  color,
  float,
  uniform,
  vec2,
  vec3,
  pass,
  renderOutput,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import gsap from "gsap";
import { Game } from "./bruno/Game.js";
import { Events } from "./bruno/Events.js";
import { References } from "./bruno/References.js";
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
import { ProjectsArea } from "./bruno/World/Areas/ProjectsArea.js";
import { cheapDOF } from "./bruno/Passes/cheapDOF.js";
import data from "./data/projects.js";
import { MeshDefaultMaterial } from "./bruno/Materials/MeshDefaultMaterial.js";

const worldAudio = getWorldAudio();
worldAudio.bind(document);
const $ = (id) => document.getElementById(id),
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
gsap.ticker.lagSmoothing(0);
if (reduced) gsap.globalTimeline.timeScale(1000);
const contentRoot = import.meta.env.DEV
  ? new URL("http://127.0.0.1:8000/")
  : new URL("../", location.href);
$("back-site").href = new URL("hub.html", location.href);
let updateProjectLabels = () => {};
let selected = 0,
  reading = false,
  area,
  renderer,
  pipeline,
  game,
  baseCamera,
  baseTarget,
  overview = false;
const reader = $("reader"),
  frames = new Map();
function readWork() {
  selected = area?.navigation.index ?? selected;
  const p = data[selected],
    url = new URL(p.url, contentRoot).href;
  $("reader-title").textContent = p.title;
  $("reader-direct").href = url;
  frames.forEach((f) => (f.hidden = true));
  let frame = frames.get(url);
  if (!frame) {
    frame = document.createElement("iframe");
    frame.title = p.title;
    frame.src = url;
    frame.allow = "fullscreen";
    frame.addEventListener("load", () => {
      try {
        const style = frame.contentDocument.createElement("style");
        style.textContent =
          "header.topbar,.collection-return{display:none!important}";
        frame.contentDocument.head.append(style);
        frame.contentDocument.addEventListener("click", (event) => {
          const link = event.target.closest("a");
          if (!link || link.target === "_blank") return;
          const url = new URL(link.href);
          if (url.origin !== contentRoot.origin) return;
          const file = url.pathname.split("/").pop();
          if (file === "portfolio.html") {
            event.preventDefault();
            closeReader();
          }
          if (file === "index.html") {
            event.preventDefault();
            location.href = new URL("hub.html", location.href).href;
          }
        });
      } catch {}
    });
    frames.set(url, frame);
    $("frames").append(frame);
  }
  frame.hidden = false;
  reading = true;
  gsap.globalTimeline.pause();
  if (!reader.open) reader.showModal();
}
function closeReader() {
  reader.close();
  reading = false;
  gsap.globalTimeline.resume();
  frames.forEach((f) => {
    try {
      f.contentDocument
        .querySelectorAll("video,audio")
        .forEach((m) => m.pause());
    } catch {}
  });
}
$("close-reader").onclick = closeReader;
reader.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeReader();
});
$("open-work").onclick = readWork;
function select(index) {
  selected = (index + data.length) % data.length;
  if (area) {
    area.changeProject(selected, ProjectsArea.DIRECTION_NEXT, true, true);
    area.navigation.index = selected;
  }
  syncSelection();
}
function syncSelection() {
  selected = area?.navigation.index ?? selected;
  updateProjectLabels();
  $("selection").textContent = String(selected + 1).padStart(2, "0") + " / " + String(data.length).padStart(2,"0");
  $("project-name").textContent = data[selected].title;
}
$("previous").onclick = () => select((area?.navigation.index ?? selected) - 1);
$("next").onclick = () => select((area?.navigation.index ?? selected) + 1);
window.addEventListener("keydown", (e) => {
  if (reading) return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    select((area?.navigation.index ?? selected) - 1);
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    select((area?.navigation.index ?? selected) + 1);
  }
  if (e.key === "Enter" && e.target === document.body) readWork();
});

try {
  await Promise.all([
    document.fonts.load('700 40px "Amatic SC"'),
    document.fonts.load("700 18px Nunito"),
    document.fonts.load(
      '400 40px Xiaolai',
      "精选作品设计研究服务角色地点项目性质应用场景档案家庭养宠儿童与犬互动灾害应急智能防护个人",
    ),
  ]);
  renderer = new T.WebGPURenderer({
    canvas: $("world"),
    antialias: true,
    powerPreference: "high-performance",
    forceWebGL: new URLSearchParams(location.search).has("webgl"),
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  await renderer.init();
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(25, innerWidth / innerHeight, 0.1, 200);
  const center = new T.Vector3(34.24, 0, 9.65),
    clockEvents = new Events(),
    qualityEvents = new Events();
  const noop = () => {},
    silent = { play: noop, playRandomNext: noop };
  game = Game.instance = {
    scene,
    rendering: { renderer },
    debug: {
      active: false,
      addManualBinding(panel, target, key, options, get) {
        return {
          update() {
            target[key] = get();
          },
        };
      },
    },
    ticker: {
      events: clockEvents,
      elapsedScaled: 0,
      elapsedScaledUniform: uniform(0),
      deltaScaled: 0,
      delta: 0,
    },
    quality: { level: 0, events: qualityEvents },
    viewport: { events: new Events(), width: innerWidth, height: innerHeight },
    view: {
      camera,
      optimalArea: {
        position: center.clone(),
        radius: 23,
        nearDistance: 5,
        farDistance: 85,
      },
      spherical: { offset: new T.Vector3(8, 6, 10), radius: { current: 14 } },
      delta: new T.Vector3(),
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
  };
  const black = new T.DataTexture(
    new Uint8Array([0, 0, 0, 255]),
    1,
    1,
    T.RGBAFormat,
  );
  black.needsUpdate = true;
  game.view.focusPoint = { position: center.clone() };
  game.tracks = {
    renderTarget: { texture: black },
    size: 192,
    halfSize: 96,
    focusPoint: new T.Vector2(),
  };
  const textureLoader = new T.TextureLoader(),
    gltfLoader = new GLTFLoader();
  const draco = new DRACOLoader().setDecoderPath("draco/");
  gltfLoader.setDRACOLoader(draco);
  const ktx = new KTX2Loader()
    .setTranscoderPath("basis/")
    .detectSupport(renderer);
  gltfLoader.setKTX2Loader(ktx);
  const textures = {
    paletteTexture: "palette.png",
    terrainTexture: "terrain/terrain.png",
    floorSlabsTexture: "floor/slabs.png",
    foliageTexture: "foliage/foliageSDF.png",
  };
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
  game.resources = {};
  let loaded = 0,
    total = Object.keys(textures).length + Object.keys(models).length;
  const progress = () => {
    $("loading").textContent = `正在布置作品展架 ${++loaded} / ${total}`;
  };
  await Promise.all([
    ...Object.entries(textures).map(async ([key, path]) => {
      const tex = await textureLoader.loadAsync("bruno/" + path);
      tex.flipY = false;
      if (key === "paletteTexture") {
        tex.colorSpace = T.SRGBColorSpace;
        tex.minFilter = T.NearestFilter;
        tex.magFilter = T.NearestFilter;
        tex.generateMipmaps = false;
      }
      if (key === "floorSlabsTexture") tex.wrapS = tex.wrapT = T.RepeatWrapping;
      game.resources[key] = tex;
      progress();
    }),
    ...Object.entries(models).map(async ([key, path]) => {
      game.resources[key] = await gltfLoader.loadAsync("bruno/" + path);
      progress();
    }),
  ]);
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
  function applyPreset(night) {
    const values = presets[night ? "night" : "day"];
    for (const [key, value] of Object.entries(values))
      game.dayCycles.properties[key] = {
        value: typeof value === "string" ? new T.Color(value) : value,
      };
    game.dayCycles.progress = night ? 0.45 : 0.12;
    game.dayCycles.intervalEvents.get("night").inInterval = night;
    game.dayCycles.events.trigger("night", [night]);
  }
  applyPreset(false);
  try { localStorage.setItem("resume-theme", "light"); } catch {}
  // Same high-quality default-view ground bounds as upstream View.setOptimalArea:
  // max radius 30 * (1 - (-0.4)), phi .31PI, theta .25PI, vertical FOV 25.
  // Use the original 16:9 calibration consistently in this single-scene study.
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
  game.noises = new Noises();
  game.wind = new Wind();
  game.wind.timeFrequency=.28;
  game.terrain = new Terrain();
  game.lighting = new Lighting();
  game.fog = new Fog();
  game.materials = new Materials();
  // Original terrain/trees' visual code is used without their physics hooks.
  Floor.prototype.setPhysical = noop;
  Floor.prototype.setBedRock = noop;
  Floor.prototype.update = function () {
    this.mesh.position.x =
      Math.round(game.view.optimalArea.position.x / this.cellSize) *
      this.cellSize;
    this.mesh.position.z =
      Math.round(game.view.optimalArea.position.z / this.cellSize) *
      this.cellSize;
  };
  Trees.prototype.setPhysical = noop;
  game.world.floor = new Floor();
  game.world.grass = new Grass();
  game.world.grass.bladeWidth.value = 0.045;
  game.world.grass.bladeHeight.value = 1.02;
  game.world.grass.bladeHeightRandomness.value = 0.45;
  game.world.atmosphere = addWorldAtmosphere(game, matchMedia("(prefers-reduced-motion: reduce)").matches);
  const near = (object) =>
    Math.hypot(object.position.x - center.x, object.position.z - center.z) < 33;
  const trees = [
    ["oak", "#b4b536", "#d8cf3b"],
    ["birch", "#ff4f2b", "#ff903f"],
    ["cherry", "#ff6d6d", "#ff9990"],
  ];
  for (const [type, a, b] of trees) {
    const refs =
      game.resources[type + "TreesReferencesModel"].scene.children.filter(near);
    if (refs.length) {
      const tree = new Trees(
        type,
        game.resources[type + "TreesVisualModel"].scene,
        refs,
        a,
        b,
      );
      game.world[type + "Trees"] = tree;
    }
  }
  game.resources.bushesReferences.scene.children =
    game.resources.bushesReferences.scene.children.filter(near);
  game.world.bushes = new Bushes();
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
  for (const child of [...game.resources.sceneryModel.scene.children]) {
    scene.add(cleanModel(child));
  }
  const emissiveMeshes = [];
  for (const key of [
    "benchesModel",
    "fencesModel",
    "lanternsModel",
    "poleLightsModel",
  ])
    for (const child of [...game.resources[key].scene.children]) {
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
  const projectRoot = game.resources.areasModel.scene.children.find(
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
          textureLoader.load(path, (tex) => {
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
  baseCamera = area.cinematic.position.clone();
  baseTarget = area.cinematic.target.clone();
  camera.position.copy(baseCamera);
  camera.lookAt(baseTarget);
  game.view.spherical.offset.copy(baseCamera).sub(baseTarget);
  game.view.spherical.radius.current = baseCamera.distanceTo(baseTarget);
  const renderPass = pass(scene, camera),
    renderColor = renderPass.getTextureNode("output");
  const bloomPass = bloom(renderColor);
  bloomPass._nMips = 5;
  bloomPass.threshold.value = 1;
  bloomPass.strength.value = 0.25;
  bloomPass.smoothWidth.value = 1;
  const dofPass = cheapDOF(renderOutput(renderPass));
  pipeline = new T.RenderPipeline(renderer);
  pipeline.outputNode = dofPass.add(bloomPass);
  let yaw = 0,
    pitch = 0,
    zoom = 1,
    targetYaw = 0,
    targetPitch = 0,
    targetZoom = 1;
  const offset = baseCamera.clone().sub(baseTarget),
    spherical = new T.Spherical().setFromVector3(offset),
    screenCenter = new T.Box3()
      .setFromObject(screen)
      .getCenter(new T.Vector3());
  $("overview").onclick = () => {
    overview = !overview;
    targetZoom = overview ? 1.7 : 1;
    $("overview").textContent = overview ? "展示近景" : "场景全景";
  };
  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = innerWidth < 700 ? 56 : 25;
    baseTarget.copy(innerWidth < 700 ? screenCenter : area.cinematic.target);
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    game.viewport.width = innerWidth;
    game.viewport.height = innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();
  const ray = new T.Raycaster(),
    pointer = new T.Vector2(),
    canvas = $("world");
  let start = null,
    last = null,
    dragged = false,
    pressed = null,
    hover = null,
    pinched = false,
    pinchDistance = 0;
  const pointers = new Map();
  const screenTarget = { onClick: readWork };
  function pick(event) {
    pointer.set(
      (event.clientX / innerWidth) * 2 - 1,
      (-event.clientY / innerHeight) * 2 + 1,
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
    return nearest;
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 1) {
      start = last = { x: event.clientX, y: event.clientY };
      dragged = false;
      pinched = false;
      pressed = pick(event);
    } else {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      pinched = true;
      dragged = true;
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()],
          distance = Math.hypot(a.x - b.x, a.y - b.y);
        targetZoom = T.MathUtils.clamp(
          (targetZoom * pinchDistance) / Math.max(1, distance),
          0.8,
          2.2,
        );
        pinchDistance = distance;
        return;
      }
    }
    if (start) {
      const dx = event.clientX - last.x,
        dy = event.clientY - last.y;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7)
        dragged = true;
      if (dragged) {
        targetYaw = T.MathUtils.clamp(targetYaw - dx * 0.003, -0.45, 0.45);
        targetPitch = T.MathUtils.clamp(targetPitch + dy * 0.002, -0.15, 0.3);
      }
      last = { x: event.clientX, y: event.clientY };
    } else {
      const next = pick(event);
      if (next !== hover) {
        hover?.onLeave?.();
        next?.onEnter?.();
        hover = next;
      }
      canvas.dataset.hover = String(!!next);
    }
  });
  canvas.addEventListener("pointerup", (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size) return;
    if (!dragged && !pinched) {
      if(pressed)worldAudio.play();
      pressed?.onClick?.();
      syncSelection();
    }
    start = last = pressed = null;
  });
  canvas.addEventListener("pointercancel", () => {
    pointers.clear();
    start = last = pressed = null;
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      targetZoom = T.MathUtils.clamp(
        targetZoom + event.deltaY * 0.001,
        0.8,
        2.2,
      );
    },
    { passive: false },
  );
  const clock = new T.Timer();
  let lastFrame = 0,
    ready = false;
  renderer.setAnimationLoop((time) => {
    try {
      if (reading || document.hidden || time - lastFrame < 33) return;
      lastFrame = time;
      clock.update();
      const delta = Math.min(clock.getDelta(), 0.05);
      game.ticker.delta = game.ticker.deltaScaled = reduced ? 0 : delta;
      game.ticker.elapsedScaled += game.ticker.deltaScaled;
      game.ticker.elapsedScaledUniform.value = game.ticker.elapsedScaled;
      const blend = reduced ? 1 : 1 - Math.exp(-delta * 12);
      yaw = T.MathUtils.lerp(yaw, targetYaw, blend);
      pitch = T.MathUtils.lerp(pitch, targetPitch, blend);
      zoom = T.MathUtils.lerp(zoom, targetZoom, blend);
      const current = new T.Spherical(
        spherical.radius * zoom,
        spherical.phi + pitch,
        spherical.theta + yaw,
      );
      camera.position
        .copy(baseTarget)
        .add(new T.Vector3().setFromSpherical(current));
      camera.lookAt(baseTarget);
      camera.updateMatrixWorld();
      clockEvents.trigger("tick");
      area.update();
      emissiveMeshes.forEach((m) => (m.visible = true));
      pipeline.render();
      if (!ready) {
        ready = true;
        document.body.dataset.ready = "true";
        $("loading").hidden = true;
      }
      // The upstream arrows update their internal index; sync accessible controls.
      if (selected !== area.navigation.index) syncSelection();
    } catch (error) {
      renderer.setAnimationLoop(null);
      console.error(error);
      $("loading").hidden = true;
      $("fallback").hidden = false;
      $("fallback-title").textContent = "场景运行暂时中断";
      $("error-message").textContent = "渲染中断：" + error.message;
      document.body.dataset.failed = "true";
    }
  });
  window.preview = { game, area, select, readWork, renderer };
} catch (error) {
  console.error(error);
  $("loading").hidden = true;
  $("fallback").hidden = false;
  $("error-message").textContent = "3D 预览未能启动：" + error.message;
  document.body.dataset.failed = "true";
}
