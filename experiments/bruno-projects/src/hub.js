import { worldBaseURL, versionedURL } from "./world-base.js";
import "../../../site-loader.js";
import { createLabChalkboard } from "./lab-chalkboard.js";
import { prepareLabCovers } from "./lab-covers.js";
import { getClickSound } from "./click-sound.js";
import { T, createWorld } from "./create-world.js";
import { texture, uniform } from "three/tsl";
import { createFixtures } from "./scene-fixtures.js";
import { createPortfolioStation } from "./portfolio-station.js";
import gsap from "gsap";
import { createWorldMap } from "./world-map.js";
import { subjectCorners, phonePose } from "./phone-framing.js";
import { referenceViews } from "./scene-views.js";
import { MeshDefaultMaterial } from "./bruno/Materials/MeshDefaultMaterial.js";
import "../../../resume.js";

const clickSound = getClickSound();
clickSound.bind(document);
const loadingScreen = window.CeciliaLoader.create(document.getElementById("loading"));
const $ = (id) => document.getElementById(id),
  profile = window.RESUME;
const phone = matchMedia("(pointer: coarse) and (max-width: 767px), (pointer: coarse) and (max-width: 1024px) and (max-height: 600px)");
const phoneViews = new Map();
const initialPlace = () => document.querySelector('meta[name="cecilia-initial-place"]')?.content || "home";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
gsap.ticker.lagSmoothing(0);
if(reduced)gsap.globalTimeline.timeScale(1000);
const contentRoot = import.meta.env.DEV
  ? new URL("http://127.0.0.1:8000/")
  : new URL("../", worldBaseURL());
const notes = profile.projects.filter((p) => p.collection !== "portfolio");
const reader = $("reader"),
  frames = new Map(),
  stations = new Map(),
  pickables = [];
let world,
  portfolio,
  readerLoadTimer,
  readerPaused=false,
  place = "home",
  reading = false,
  otherIndex = 0,
  drag = false;
let targetLook,
  currentLook,
  devices,
  identity,
  landingView,
  targetDistance = 55,
  currentDistance = 55;
let yaw = 0.5,
  targetYaw = 0.5,
  pitch = 0.85,
  targetPitch = 0.85,
  pointers = new Map();
const state = (window.WORLD_STATE = { place, reading: false, otherIndex: 0 });
const navigationMap = createWorldMap(go, () => recordOverlay("map"), () => returnFromOverlay("map"));
function stationEntry() {
  return { place, otherIndex, portfolioIndex: portfolio?.selected ?? 0 };
}
function recordOverlay(overlay) {
  if (!phone.matches || !portfolio || history.state?.overlay === overlay) return;
  const station = stationEntry();
  history.replaceState(station, "");
  history.pushState({ ...station, overlay, stationKey: window.navigation?.currentEntry?.key }, "");
}
function returnFromOverlay(overlay) {
  const entry = history.state;
  if (entry?.overlay !== overlay) return;
  if (entry.stationKey && window.navigation?.entries().some(e => e.key === entry.stationKey)) {
    window.navigation.traverseTo(entry.stationKey);
  } else history.back();
}
const labels = {
  home: "首页",
  portfolio: "作品集",
  resume: "个人简历",
  other: "其他项目",
  contact: "联系方式",
};
const action = (text, fn) => {
  const b = document.createElement("button");
  b.textContent = text;
  b.onclick = fn;
  $("place-actions").append(b);
  return b;
};
const link = (text, href) => {
  const a = document.createElement("a");
  a.textContent = text;
  a.href = href;
  $("place-actions").append(a);
  return a;
};
async function copyContact(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    $("feedback").textContent = `${label}已复制：${value}`;
  } catch {
    $("feedback").textContent = `未能自动复制，请手动复制${label}：${value}`;
  }
}
function closeReader() {
  clearReader();
  returnFromOverlay("reader");
}
function clearReader() {
  clearTimeout(readerLoadTimer);
  if (reader.open) reader.close();
  frames.forEach(f=>{
    try { f.contentDocument.querySelectorAll("video,audio").forEach(m=>m.pause());f.contentWindow.HAHA_READER?.dispose();f.contentWindow.SONIC_FILM?.dispose(); } catch {}
    f.remove();
  });
  frames.clear();
  $("frames").replaceChildren();
  if(readerPaused){gsap.globalTimeline.resume();readerPaused=false;}
  reading = state.reading = false;
}
function openReader(title, file) {
  clearReader();
  recordOverlay("reader");
  const filename = file ? new URL(file, contentRoot).pathname.split("/").pop() : "";
  const project = filename === "haha-world.html" ? "haha-world" : filename === "icod.html" ? "icod" : filename === "sonicsense.html" ? "sonicsense" : "";
  reader.dataset.project = project;
  $("reader-title").textContent = title;
  $("frames").querySelector(".details-sheet")?.remove();
  frames.forEach((f) => (f.hidden = true));
  $("reader-direct").hidden = !file;
  if (file) {
    const url = versionedURL(file, contentRoot);
    $("reader-direct").href = url;
    let frame = frames.get(url);
    if (!frame) {
      frame = document.createElement("iframe");
      frame.src = url;
      frame.title = title;
      frame.dataset.project = project;
      frame.allow = "fullscreen";
      let loadNotice, boundDocument;
      if (phone.matches) {
        readerLoadTimer = setTimeout(() => {
          if (!frame.isConnected || frames.get(url) !== frame) return;
          loadNotice = document.createElement("div");
          loadNotice.className = "reader-load-notice";
          loadNotice.setAttribute("role", "status");
          loadNotice.append("项目加载较慢 ");
          const retry = document.createElement("button");
          retry.textContent = "重新加载";
          retry.onclick = () => openReader(title, file);
          loadNotice.append(retry);
          $("frames").append(loadNotice);
        }, 8000);
      }
      const bindReader = () => {
        try {
          if(!frame.isConnected||frames.get(url)!==frame)return;
          const doc = frame.contentDocument;
          if (!doc?.head || doc === boundDocument || doc.URL === "about:blank") return;
          if (document.querySelector('meta[name="cecilia-release"]') && !doc.querySelector('meta[name="cecilia-release"]')) return;
          clearTimeout(readerLoadTimer);
          loadNotice?.remove();
          boundDocument = doc;
          clickSound.bind(doc);
          const style = doc.createElement("style");
          style.textContent =
            place === "portfolio" ? "header.topbar,.collection-return{display:none!important}" : "header.topbar{position:sticky}.topbar nav>a,.topbar .wordmark{display:none!important}";
          doc.head.append(style);
          doc.addEventListener("click", (event) => {
            const a = event.target.closest("a");
            if (!a || a.target === "_blank") return;
            const url = new URL(a.href);
            if (url.origin !== contentRoot.origin) return;
            // Let the project handle navigation within its current document.
            if (url.pathname === doc.location.pathname && url.search === doc.location.search) return;
            const name = url.pathname.split("/").pop();
            if (place === "other" && name === "works.html" && url.hash === "#other") {
              event.preventDefault();
              closeReader();
              return;
            }
            if (
              name === "index.html" &&
              !url.pathname.endsWith("cecilia-world/index.html")
            ) {
              event.preventDefault();
              go("home");
            }
            if (
              [
                "tideline.html",
                "gazette.html",
                "dream-sentinel.html",
                "safepaw.html",
                "portfolio.html",
              ].includes(name)
            ) {
              event.preventDefault();
              event.stopImmediatePropagation();
              if(place !== "portfolio")go("portfolio");
              else closeReader();
            }
          },true);
        } catch {}
      };
      frame.addEventListener("cecilia-project-ready", bindReader);
      frame.addEventListener("load", bindReader);
      frames.set(url, frame);
      $("frames").append(frame);
    }
    frame.hidden = false;
  } else {
    const sheet = document.createElement("section");
    sheet.className = "details-sheet";
    const article = document.createElement("article"),
      p = notes[otherIndex];
    for (const [tag, value] of [
      ["p", p.category],
      ["h3", p.name],
      ["p", p.description],
    ]) {
      const el = document.createElement(tag);
      el.textContent = value;
      article.append(el);
    }
    const list = document.createElement("ul");
    (p.details || []).forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      list.append(li);
    });
    article.append(list);
    sheet.append(article);
    $("frames").append(sheet);
  }
  reading = state.reading = true;
  if(place==="portfolio"){gsap.globalTimeline.pause();readerPaused=true;}
  reader.showModal();
}
const projectReaderBridge={close:closeReader};
Object.defineProperty(window,"CeciliaProjectReader",{get:()=>place === "portfolio" ? projectReaderBridge : undefined});
$("close-reader").onclick = closeReader;
reader.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeReader();
});
function openCurrent() {
  if(place === "portfolio")openReader(portfolio.current.title,portfolio.current.url);
  if (place === "resume") openReader("个人简历", "resume.html?document=1&v=cv-slices-2&photo=1");
  if (place === "other") openReader(notes[otherIndex].name, notes[otherIndex].url || undefined);
  if (place === "contact") location.href = "mailto:wangyuxinqd2025@163.com";
}
function selectOther(index) {
  otherIndex = state.otherIndex = (index + notes.length) % notes.length;
  if (world?.updateLab) world.updateLab(notes[otherIndex]);
  $("other-position") &&
    ($("other-position").textContent = `${otherIndex + 1} / ${notes.length}`);
}
function updateReadAction() {
  const button = $("open-work");
  button.hidden = place !== "portfolio" && !(phone.matches && ["resume", "other"].includes(place));
  button.textContent = place === "resume" ? "阅读简历 ↗" : phone.matches ? "阅读当前项目 ↗" : "打开当前作品 ↗";
}
function go(next, historyMode = "push") {
  if (historyMode === "push" && history.state?.overlay) {
    if (place === next) {
      navigationMap.close();
      clearReader();
      returnFromOverlay(history.state.overlay);
      return;
    }
    historyMode = "replace";
  } else if (phone.matches && historyMode === "push") {
    history.replaceState(stationEntry(), "");
  }
  navigationMap.close();
  if (!labels[next]) next = "home";
  clearReader();
  portfolio?.clearHover();
  if(next === "portfolio" && place !== "portfolio" && portfolio?.selected !== 0)portfolio?.select(0);
  if((next === "portfolio") !== (place === "portfolio"))portfolio?.activate(next === "portfolio");
  place = state.place = next;
  document.body.dataset.place = place;
  document.title =
    place === "home" ? "王钰欣 / CECILIA" : `${labels[place]} · 王钰欣`;
  $("back-home").hidden = place === "home";
  $("feedback").textContent = "";
  $("place-actions").replaceChildren();
  $("place-actions").hidden = place !== "contact";
  $("controls").hidden = place !== "portfolio";
  updateReadAction();
  $("reset-view").textContent = place === "portfolio" ? "返回主页" : "视角归位";
  $("close-reader").textContent = place === "portfolio" ? "← 返回展示区" : "← 返回场景";
  $("lab-navigation").hidden = place !== "other";
  if (place === "other") selectOther(otherIndex);
  if (place === "contact") {
    const entries = [
      [
        link("写邮件 ↗", "mailto:wangyuxinqd2025@163.com"),
        "wangyuxinqd2025@163.com",
      ],
      [action("复制电话", () => copyContact("15066290491", "电话号码")), "15066290491"],
      [action("复制微信号", () => copyContact("Cecilia_cici68", "微信号")), "Cecilia_cici68"],
    ];
    for (const [element, value] of entries) {
      const detail = document.createElement("small");
      detail.textContent = value;
      element.append(detail);
    }
  }
  $("scene-hint").textContent =
    place === "home"
      ? "左键旋转 · 中键平移 · 滚轮缩放 · 点击设备试试亮灯"
      : place === "portfolio" ? "拖动观察 · 滚轮缩放 · ← → 切换作品"
      : `${labels[place]} · 拖动观察 · 点击模型${place === "contact" ? "写邮件" : "完整阅读"} · Esc 返回首页`;
  if (phone.matches) {
    $("scene-hint").textContent = place === "home" ? "轻点地图选择地点 · 双指缩放" :
      place === "portfolio" || place === "other" ? "轻点封面阅读 · 箭头切换项目" :
      place === "resume" ? "轻点简历阅读" : "轻点邮箱写邮件";
  }
  if (world && targetLook) {
    if(place === "portfolio")Object.assign(stations.get("portfolio"),portfolio.pose());
    const fitted = phone.matches ? phoneViews.get(place) : null;
    const station = stations.get(place);
    const view = fitted || station || landingView;
    world.camera.fov = fitted?.fov ?? (place === "portfolio" ? station.fov : place === "home" ? (innerWidth < 700 ? 40 : 25) : (innerWidth < 700 ? 58 : station.fov || 36));
    world.camera.far=place === "portfolio" ? 200 : 250;
    world.camera.updateProjectionMatrix();
    targetLook.copy(view.focus);
    targetDistance = (!fitted && innerWidth < 700 ? view.mobileDistance : null) ?? view.distance;
    targetYaw = view.yaw;
    targetPitch = view.pitch;
    if (reduced || phone.matches) {
      currentLook.copy(targetLook);
      currentDistance = targetDistance;
      yaw = targetYaw;
      pitch = targetPitch;
    }
  }
  if (historyMode !== "none")
    history[historyMode === "replace" ? "replaceState" : "pushState"](
      phone.matches ? stationEntry() : { place },
      "",
      place === "home" ? location.pathname + location.search + ((phone.matches ? initialPlace() !== "home" : initialPlace() === "portfolio") ? "#home" : "") : `#${place}`,
    );
}
function restoreSelection(entry) {
  if (place === "other" && Number.isInteger(entry?.otherIndex)) selectOther(entry.otherIndex);
  if (place === "portfolio" && Number.isInteger(entry?.portfolioIndex) && portfolio.selected !== entry.portfolioIndex) {
    portfolio.select(entry.portfolioIndex);
  }
}
function restoreOverlay(entry) {
  if (entry?.overlay === "reader") openCurrent();
  if (entry?.overlay === "map") navigationMap.open();
}
window.openWorldPlace = go;
$("back-home").onclick = () => go("home");
window.addEventListener("popstate", event => {
  if (!world || !portfolio) return;
  const entry = event.state;
  if (phone.matches || entry?.overlay) {
    const next = entry?.place || location.hash.slice(1) || initialPlace();
    if (next !== place) go(next, "none");
    else { clearReader(); navigationMap.close(); }
    restoreSelection(entry);
    restoreOverlay(entry);
  } else go(location.hash.slice(1) || "home", "none");
});
window.addEventListener("keydown", (e) => {
  if (reading || navigationMap.dialog.open) return;
  if (e.key === "Escape") go("home");
  if (e.key === "Enter" && e.target === document.body) openCurrent();
  if (place === "portfolio" && ["ArrowLeft", "ArrowRight"].includes(e.key)){e.preventDefault();portfolio.select(portfolio.selected+(e.key === "ArrowRight" ? 1 : -1));}
  if (place === "other" && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    selectOther(otherIndex + (e.key === "ArrowRight" ? 1 : -1));
  }
});
if (phone.matches) {
  $("world").addEventListener("webglcontextlost", () => {
    fail(new Error("手机已暂停 3D 渲染。你可以继续阅读作品，或重新加载场景。"));
  }, {once: true});
}
try {
  await document.fonts.load(
    '900 24px "Scene Sans"',
    "王钰欣个人简历其他项目联系方式",
  );
  await document.fonts.load('400 24px Xiaolai', "个人简历作品集其他项目联系方式信件地图");
  await document.fonts.load('400 24px "World Xiaolai"', "王钰欣的个人网站邮箱想去哪里个人简历作品集其他项目联系方式地图Cecilia未来概念穿戴产品防护设计独立游戏界面设计手绘美术视觉识别品牌设计VI手册");
  await document.fonts.load('700 36px "Amatic SC"', "Welcome to Cecilia’s world.");
  world = await createWorld($("world"), (n, total) => {
    loadingScreen.setPercent(n / total * 90);
  }, phone.matches);
  const {
    game,
    scene,
    camera,
    renderer,
    pipeline,
    center,
    clean,
    english,
    chinese,
  } = world;
  const pt = (x, y, z) => center.clone().add(new T.Vector3(x, y, z));
  function fit(root, x, z, scale = 1) {
    clean(root);
    root.scale.setScalar(scale);
    scene.add(root);
    root.updateWorldMatrix(true, true);
    const box = new T.Box3().setFromObject(root),
      mid = box.getCenter(new T.Vector3());
    root.position.add(
      pt(x, 0.05 - box.min.y, z).sub(new T.Vector3(mid.x, 0, mid.z)),
    );
    // pt's y is ground relative, not an extra scene-origin elevation.
    root.updateWorldMatrix(true, true);
    return root;
  }
  const original = game.resources.areasModel.scene;
  const fixtures = createFixtures(world);
  function referencePose(key){
    const view=referenceViews[key],direction=new T.Vector3().setFromSpherical(new T.Spherical(1,view.pitch,view.yaw));
    return {...view,focus:new T.Vector3(...view.position).addScaledVector(direction,-view.distance)};
  }
  identity = fixtures.nameModel();
  const entranceBench=scene.getObjectByName("benchPhysicalDynamic001");
  fixtures.parcel(entranceBench,40.6,37.15,1.6,{plaza:true,radius:0,precise:true,hull:true});
  const crates = fixtures.nativeCrates();
  let effectTime=0, mapFlashAt=-100, entryFlashPending=true;
  const mapBrightness=uniform(1);
  const career = original.getObjectByName("career").clone(true);
  career.getObjectByName("refYear")?.removeFromParent();
  career.traverse((m) => {
    if (/careerText/.test(m.name)) m.visible = false;
  });
  clean(career);
  scene.add(career);
  const resumeTexture = await world.textures.loadAsync(world.asset("ui/resume-preview.webp?v=cv-slices-2"));
  resumeTexture.colorSpace=T.SRGBColorSpace;
  const resumeCorner = fixtures.resumeCorner(original,resumeTexture);
  const resumePreview=scene.getObjectByName("resume-preview-board");
  const project = original.getObjectByName("projects").clone(true);
  for (const child of [...project.children])
    if (
      /ref(?:Title|Url|Next|Previous|Attributes|Distinctions|Pagination|el)|medal/.test(
        child.name,
      )
    )
      child.removeFromParent();
  clean(project);
  scene.add(project);
  const lab = original.getObjectByName("lab").clone(true);
  for (const child of [...lab.children])
    if (/ref(?:Title|Url|Mini|Interactive|Intersect)/.test(child.name))
      child.removeFromParent();
  lab.traverse((m) => {
    if (/refBlackboardLabels/.test(m.name)) m.visible = false;
  });
  clean(lab);
  scene.add(lab);
  const labArrows = [
    [lab.getObjectByName("refArrowPrevious"), $("lab-previous"), -1],
    [lab.getObjectByName("refArrowNext"), $("lab-next"), 1],
  ];
  for (const [arrow, button, step] of labArrows) {
    if (!arrow) continue;
    arrow.material = new T.MeshBasicNodeMaterial({ color: 0xffead0, side: T.DoubleSide, toneMapped: false });
    arrow.material.userData.prevent = true;
    arrow.translateZ(.012);
    arrow.userData.step = step;
    button.onclick = () => selectOther(otherIndex + step);
  }
  function updateLabControls() {
    if (place !== "other") return;
    for (const [arrow, button] of labArrows) {
      if (!arrow) continue;
      const anchor = new T.Box3().setFromObject(arrow).getCenter(new T.Vector3()).project(camera);
      const point = arrow.getWorldPosition(new T.Vector3());
      const distance = camera.position.distanceTo(point);
      const pixels = innerHeight / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * distance);
      const size = T.MathUtils.clamp(.64 * pixels, 44, 100);
      button.style.left = `${(anchor.x + 1) * innerWidth / 2}px`;
      button.style.top = `${(1 - anchor.y) * innerHeight / 2}px`;
      button.style.width = button.style.height = `${size}px`;
      button.hidden = anchor.z < -1 || anchor.z > 1;
    }
  }
  // Native landing props enrich the home without the original author's name.
  const landing = original.getObjectByName("landing").clone(true);
  for (const child of [...landing.children])
    if (
      /Letters|gamepadPhysical|gizmoPhysical|phonePhysical|refBonfireInteractive/.test(
        child.name,
      )
    )
      child.removeFromParent();
  const kioskFace = landing.getObjectByName("physicalFixed003");
  const kioskTexture = await world.textures.loadAsync(world.asset("ui/cecilia-map.png?v=contact-clearing"));
  kioskTexture.flipY = false;
  kioskTexture.colorSpace = T.SRGBColorSpace;
  if (kioskFace) {
    kioskFace.material = new T.MeshBasicNodeMaterial({ colorNode: texture(kioskTexture).rgb.mul(mapBrightness), side:T.DoubleSide });
    kioskFace.material.userData.prevent = true;
    kioskFace.geometry = kioskFace.geometry.clone();
    const positions = kioskFace.geometry.attributes.position, uv = kioskFace.geometry.attributes.uv;
    const points = Array.from({length:positions.count}, (_,i) => new T.Vector3().fromBufferAttribute(positions,i));
    const middle = points.reduce((a,p) => a.add(p),new T.Vector3()).multiplyScalar(1/points.length);
    const u = points[0].clone().sub(points[1]), v = points[2].clone().sub(points[0]);
    const normal = new T.Vector3().fromBufferAttribute(kioskFace.geometry.attributes.normal,0);
    for(let i=0;i<positions.count;i++) {
      const p=middle.clone().addScaledVector(u,(uv.getX(i)-.5)*2).addScaledVector(v,uv.getY(i)-.5).addScaledVector(normal,.04);
      positions.setXYZ(i,p.x,p.y,p.z);
    }
    positions.needsUpdate=true;
    kioskFace.geometry.computeBoundingBox();
    kioskFace.geometry.computeBoundingSphere();
  }
  clean(landing);
  scene.add(landing);
  const kioskRoot=new T.Group();
  kioskRoot.name="enlarged-native-map-kiosk";
  scene.add(kioskRoot);
  landing.updateWorldMatrix(true,true);
  for(const name of ["physicalFixed003","physicalFixed009"]) {
    const child=landing.getObjectByName(name); if(child)kioskRoot.attach(child);
  }
  fixtures.levelKiosk(kioskRoot,kioskRoot.getObjectByName("physicalFixed009"),kioskFace);
  fixtures.parcel(kioskRoot,42.89033170249464,33.57996186497684,2.022352518678825*.85,{plaza:true,radius:0,precise:true,supportName:"physicalFixed009",ignoreReservations:["benchPhysicalDynamic001"]});
  const welcome = fixtures.welcomeSign();
  const handPulse = uniform(1);
  const pixelHand=fixtures.pixelPointer(mapBrightness.mul(handPulse));
  const mapHint=document.createElement("div");
  mapHint.id="map-hover-hint";mapHint.setAttribute("aria-hidden","true");
  mapHint.innerHTML='<span>MAP</span><i><b>↵</b></i>';
  document.body.append(mapHint);
  const hintCenter = new T.Vector3(), hintLeft = new T.Vector3(), hintRight = new T.Vector3();
  const projectedCenter = new T.Vector3(), projectedLeft = new T.Vector3(), projectedRight = new T.Vector3();

  if(kioskFace){
    const g=kioskFace.geometry,p=g.attributes.position;
    const p0=new T.Vector3().fromBufferAttribute(p,0),p1=new T.Vector3().fromBufferAttribute(p,1),p2=new T.Vector3().fromBufferAttribute(p,2);
    const u=p0.clone().sub(p1),v=p2.clone().sub(p0);
    const n=new T.Vector3().fromBufferAttribute(g.attributes.normal,0).normalize();
    pixelHand.position.copy(p1).addScaledVector(u,.98).addScaledVector(v,.78).addScaledVector(n,.08);
    pixelHand.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(u.clone().normalize(),v.clone().normalize().negate(),n));
    pixelHand.rotateZ(T.MathUtils.degToRad(14));
    kioskFace.add(pixelHand);kioskFace.updateWorldMatrix(true,true);
    kioskRoot.getObjectByName("physicalFixed009").attach(pixelHand);
    // Pin the badge to the lower middle of the sign, including during camera drags.
    hintLeft.copy(p1).addScaledVector(v, .86);
    hintRight.copy(hintLeft).add(u);
    hintCenter.copy(hintLeft).lerp(hintRight, .5);
    for (const point of [hintCenter, hintLeft, hintRight]) kioskFace.localToWorld(point);
  }
  devices = fixtures.gameDevices(original, kind => {
    if(kind === "gamepad") identity.toggleLight();
    if(kind === "joystick") mapFlashAt=effectTime;
  });
  const social = fixtures.contactCorner(original);
  function station(key, root, title, distance) {
    const box = new T.Box3().setFromObject(root),
      focus = box.getCenter(new T.Vector3());
    const size = box.getSize(new T.Vector3());
    const label = fixtures.sign(
      title,
      key==="resume"?22.35:key==="contact"?56:focus.x - size.x * 0.5 - 1.2,
      key==="resume"?25.9:key==="contact"?29.5:focus.z + 1.2,
      key==="resume"?2.5:3.4,
      key==="resume"||key==="contact"?{plaza:true,radius:0,precise:true,hull:true,ignoreReservations:key==="contact"?["roadside-post-corner"]:[]}:{},
    );
    const focusWithLabel = focus.clone();
    focusWithLabel.y += 1;
    stations.set(key, { root, label, focus: focusWithLabel, distance, yaw:.55,pitch:1.05,fov:36 });
    pickables.push({ root, key }, { root: label, key });
  }
  station("resume", resumeCorner, "个人简历", 14);
  station("portfolio", project, "作品集", 20);
  station("other", lab, "其他项目", 16);
  station("contact", social, "联系方式", 12);
  Object.assign(stations.get("resume"),referencePose("resume"));
  Object.assign(stations.get("other"),referencePose("other"),{mobileDistance:16});
  Object.assign(stations.get("contact"),referencePose("contact"));
  stations.get("contact").focus.z-=15.5;
  const landingBounds = new T.Box3().setFromObject(identity);
  for (const root of devices.roots) landingBounds.union(new T.Box3().setFromObject(root));
  // Match the upstream landing's focus behind the letters, adapted to our
  // longer bilingual name. Do not let unrelated station bounds move this pose.
  const landingCenter = new T.Vector3(identity.userData.parcel.x-.7,1.8,identity.userData.parcel.z-3.3);
  const landingPoints = [];
  for (const root of [identity, ...devices.roots]) root.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (mesh.isInstancedMesh) mesh.computeBoundingBox();
    else mesh.geometry.computeBoundingBox();
    const bounds = mesh.isInstancedMesh ? mesh.boundingBox : mesh.geometry.boundingBox;
    for(const x of [bounds.min.x,bounds.max.x]) for(const y of [bounds.min.y,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z])
      landingPoints.push(new T.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld));
  });
  function fitLanding() {
    const calibrated=referencePose("home");
    if(innerWidth>=1000)return calibrated;
    const aspect = innerWidth / innerHeight,
      fov = innerWidth < 700 ? 40 : 25;
    const vertical = Math.tan(T.MathUtils.degToRad(fov / 2));
    const {yaw,pitch}=calibrated;
    const forward = new T.Vector3().setFromSpherical(new T.Spherical(1, pitch, yaw));
    const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), forward).normalize();
    const up = new T.Vector3().crossVectors(forward, right).normalize();
    let distance = 30; // Frontal entry composition, fitted to the bilingual sculpture.
    for (const point of landingPoints) {
      const v = point.clone().sub(landingCenter), near = v.dot(forward);
      distance = Math.max(distance, near + Math.abs(v.dot(right)) / (vertical * aspect * .85), near + Math.abs(v.dot(up)) / (vertical * .8));
    }
    return {
      focus: calibrated.focus.clone(),
      distance,
      yaw,
      pitch,
    };
  }
  landingView = fitLanding();
  const screen = project.getObjectByName("refImages");
  if (screen) {
    const tex = await world.textures.loadAsync(
      world.asset("projects/images/tideline-cover-v3.webp"),
    );
    tex.flipY = false;
    tex.colorSpace = T.SRGBColorSpace;
    screen.material = new MeshDefaultMaterial({
      colorNode: texture(tex).rgb,
      hasWater: false,
    });
  }
  let labScreen;
  lab.traverse((m) => {
    if (m.name.startsWith("refImages")) labScreen = m;
  });
  const card = document.createElement("canvas");
  card.width = 1400;
  card.height = 900;
  const ctx = card.getContext("2d"),
    cardTexture = new T.CanvasTexture(card);
  cardTexture.flipY = false;
  cardTexture.colorSpace = T.SRGBColorSpace;
  if (labScreen)
    labScreen.material = new MeshDefaultMaterial({
      colorNode: texture(cardTexture).rgb,
      hasWater: false,
    });
  const labCovers = await prepareLabCovers(notes, contentRoot);
  const chalkboard = createLabChalkboard(lab);
  world.updateLab = (project) => {
    const prepared = labCovers.get(project);
    if (!prepared) return;
    ctx.drawImage(prepared, 0, 0);
    cardTexture.needsUpdate = true;
    chalkboard.update(project);
    world.labCover = { name: project.name, source: prepared.dataset.source };
  };
  world.updateLab(notes[0]);
  portfolio = await createPortfolioStation(world,openCurrent);
  window.preview = {game,area:portfolio.area,renderer,select:index=>portfolio.select(index),readWork:openCurrent};
  $("previous").onclick=()=>portfolio.select(portfolio.selected-1);
  $("next").onclick=()=>portfolio.select(portfolio.selected+1);
  $("open-work").onclick=openCurrent;
  await portfolio.warm();
  const subjects = new Map([
    ["home", [identity, kioskRoot, ...devices.roots]],
    ["resume", [resumePreview, resumeCorner, stations.get("resume").label]],
    ["other", [labScreen, ...labArrows.map(([mesh]) => mesh), chalkboard.lettering]],
    ["contact", [social, stations.get("contact").label]],
    ["portfolio", [portfolio.area.images.mesh, portfolio.area.title.inner, portfolio.area.url.inner,
      ...["arrowPreviousImage","arrowNextImage"].map(key => portfolio.area.references.items.get(key)[0])]],
  ]);
  // Cache geometry separately from poses so rotation only repeats the projection.
  const phoneCorners = new Map();
  function updatePhoneViews() {
    document.body.toggleAttribute("data-phone-layout", phone.matches);
    updateReadAction();
    identity.setPhoneLettering(phone.matches);
    if (!phone.matches) return;
    for (const [key, objects] of subjects) {
      if (!phoneCorners.has(key)) phoneCorners.set(key, subjectCorners(objects));
      const base = key === "home" ? landingView : key === "portfolio" ? portfolio.pose() : stations.get(key);
      const fov = key === "home" ? 40 : key === "portfolio" ? 56 : 50;
      phoneViews.set(key, phonePose(base, phoneCorners.get(key), innerWidth, innerHeight, fov));
    }
  }
  currentLook = pt(0, 2, 2);
  targetLook = currentLook.clone();
  // Keep the approved initial render, including cheapDOF and bloom. The old
  // low-quality toggle removed DOF, so do not invoke it when removing controls.
  world.setTheme(false);
  try{localStorage.setItem("resume-theme","light");}catch{}
  $("reset-view").onclick = () => go(phone.matches && place !== "portfolio" ? place : "home", place === "portfolio" ? "push" : "replace");
  const ray = new T.Raycaster(),
    pointer = new T.Vector2();
  const phoneHomeTargets = new Map([
    ...pickables.map(({ root, key }) => [root, key]),
    ...devices.roots.map(root => [root, root]),
    [resumePreview, "resume"], [kioskRoot, "map"],
  ]);
  const phoneHomeRoots = [...phoneHomeTargets.keys()];
  function pick(x, y) {
    if(place === "portfolio")return portfolio.pick(x, y, phone.matches ? 22 : 0);
    pointer.set((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    if(place==="contact" && (ray.intersectObject(social.getObjectByName("mailbox-label"),false).length || ray.intersectObject(social.getObjectByName("mailbox-click-ring"),false).length))return "contact-mail";
    if (phone.matches && place === "contact") {
      return ray.intersectObjects(social.mailTargets, false).length ? "contact-mail" : undefined;
    }
    if (place === "other") {
      for (const [arrow,,step] of labArrows) if (arrow && ray.intersectObject(arrow, false).length) return step < 0 ? "lab-previous" : "lab-next";
    }
    if (phone.matches && place === "home") {
      // The frame and face both open the map. Resolve overlapping models front to back.
      for (const hit of ray.intersectObjects(phoneHomeRoots, true)) {
        let node = hit.object;
        while (node?.visible) {
          if (phoneHomeTargets.has(node)) return phoneHomeTargets.get(node);
          node = node.parent;
        }
      }
      return;
    }
    if(place === "resume" && resumePreview && ray.intersectObject(resumePreview,true).length)return "resume-preview";
    if (place === "home") {
      const hits = devices.roots.flatMap(root => ray.intersectObject(root, true).map(hit => ({ ...hit, root })));
      hits.sort((a, b) => a.distance - b.distance);
      devices.hover(hits[0]?.root);
      if (hits[0]) return hits[0].root;
      if (kioskFace && (ray.intersectObject(kioskFace, false).length || ray.intersectObject(pixelHand,true).length)) return "map";
    }
    const targets = phone.matches && place !== "home" ? pickables.filter(p => p.key === place) : pickables;
    const hits = targets.flatMap((p) =>
      ray
        .intersectObject(p.root, true)
        .filter((h) => h.object.visible)
        .map((h) => ({ ...h, key: p.key })),
    );
    hits.sort((a, b) => a.distance - b.distance);
    return hits[0]?.key;
  }
  let mapTapPending = false;
  let start,
    last,
    pressed,
    mouseButton=0,
    pinched = false,
    pinch = 0;
  $("world").addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && (e.button !== 1 || place === "portfolio")) return;
    e.preventDefault();
    mapTapPending = false;
    mouseButton=e.button;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.target.setPointerCapture(e.pointerId);
    if (pointers.size === 1) {
      start = last = { x: e.clientX, y: e.clientY };
      drag = pinched = false;
      pressed = e.button===0 ? pick(e.clientX, e.clientY) : null;
    } else {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
      pinched = drag = true;
    }
  });
  $("world").addEventListener("pointermove", (e) => {
    if (pointers.has(e.pointerId))
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size > 1) {
      const [a, b] = [...pointers.values()],
        d = Math.hypot(a.x - b.x, a.y - b.y);
      if (phone.matches) {
        const base = phoneViews.get(place).distance;
        if (pinch > 0 && d > 0) targetDistance = T.MathUtils.clamp(targetDistance * pinch / d, base * .65, base * 2.2);
      } else targetDistance = place === "portfolio" ? T.MathUtils.clamp(targetDistance*pinch/Math.max(1,d),portfolio.pose().distance*.8,portfolio.pose().distance*2.2) : T.MathUtils.clamp((targetDistance * pinch) / d, 10, 95);
      pinch = d;
      return;
    }
    if (pointers.size && last) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > (phone.matches ? 10 : place === "portfolio" ? 7 : 5)) drag = true;
      if (phone.matches && !drag) return;
      if(place === "portfolio") {
        if(drag){const base=portfolio.pose();targetYaw=T.MathUtils.clamp(targetYaw-(e.clientX-last.x)*.003,base.yaw-.45,base.yaw+.45);targetPitch=T.MathUtils.clamp(targetPitch+(e.clientY-last.y)*.002,base.pitch-.15,base.pitch+.3);}
      } else if(mouseButton===1) {
        const step=2*targetDistance*Math.tan(T.MathUtils.degToRad(camera.fov/2))/innerHeight;
        const right=new T.Vector3(Math.cos(targetYaw),0,-Math.sin(targetYaw));
        const forward=new T.Vector3(Math.sin(targetYaw),0,Math.cos(targetYaw));
        targetLook.addScaledVector(right,-(e.clientX-last.x)*step);
        targetLook.addScaledVector(forward,-(e.clientY-last.y)*step/Math.max(.35,Math.cos(targetPitch)));
      } else {
        targetYaw -= (e.clientX - last.x) * 0.004;
        targetPitch = T.MathUtils.clamp(targetPitch-(e.clientY-last.y)*0.003,0.22,1.3);
      }
      last = { x: e.clientX, y: e.clientY };
    } else {
      const hit=pick(e.clientX,e.clientY);
      if(place === "portfolio")portfolio.hover(hit);
      $("world").dataset.hover=String(!!hit);
    }
  });
  $("world").addEventListener("auxclick",e=>{if(e.button===1)e.preventDefault();});
  $("world").addEventListener("pointerup", (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size) {
      if (phone.matches) last = start = [...pointers.values()][0];
      return;
    }
    if (phone.matches && start && (Math.hypot(e.clientX-start.x,e.clientY-start.y)>10 || (!drag && pressed !== pick(e.clientX,e.clientY)))) pressed=null;
    if (!drag && !pinched && pressed) {
      clickSound.play();
      if(place === "portfolio"){pressed.onClick?.();portfolio.update();}
      else if (pressed === "map") {
        // A tap also dispatches a click. Open after that click lands on the
        // canvas so it cannot select a destination in the newly opened map.
        if (e.pointerType === "touch") mapTapPending = true;
        else navigationMap.open();
      }
      else if(pressed === "contact-mail")location.href=social.userData.mailto;
      else if(pressed === "lab-previous")selectOther(otherIndex-1);
      else if(pressed === "lab-next")selectOther(otherIndex+1);
      else if(pressed === "resume-preview")openCurrent();
      else if (pressed.isObject3D) devices.hit(pressed);
      else if (place === pressed) openCurrent();
      else go(pressed);
    }
    start = last = pressed = null;
  });
  $("world").addEventListener("click", () => {
    if (!mapTapPending) return;
    mapTapPending = false;
    navigationMap.open();
  });
  function cancelGesture() {
    mapTapPending = false;
    pointers.clear();
    start = last = pressed = null;
  }
  $("world").addEventListener("pointercancel", cancelGesture);
  $("world").addEventListener("lostpointercapture", e => { if (phone.matches && pointers.has(e.pointerId)) cancelGesture(); });
  $("world").addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      targetDistance = place === "portfolio" ? T.MathUtils.clamp(targetDistance+e.deltaY*.001*portfolio.pose().distance,portfolio.pose().distance*.8,portfolio.pose().distance*2.2) : T.MathUtils.clamp(targetDistance+e.deltaY*.025,10,95);
    },
    { passive: false },
  );
  function resize() {
    if (phone.matches) cancelGesture();
    camera.aspect = innerWidth / innerHeight;
    camera.fov = place === "portfolio" ? portfolio.pose().fov : place === "home" ? (innerWidth < 700 ? 40 : 25) : (innerWidth < 700 ? 58 : stations.get(place)?.fov || 36);
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    game.viewport.width = innerWidth;
    game.viewport.height = innerHeight;
    landingView = fitLanding();
    if(place === "portfolio" && targetLook) { targetLook.copy(portfolio.pose().focus); }
    if (place === "other" && targetLook) targetDistance = innerWidth < 700 ? stations.get("other").mobileDistance : stations.get("other").distance;
    if (place === "home" && targetLook) {
      targetLook.copy(landingView.focus);
      targetDistance = landingView.distance;
    }
    updatePhoneViews();
    if (phone.matches && targetLook) {
      const view = phoneViews.get(place);
      camera.fov = view.fov;
      camera.updateProjectionMatrix();
      targetLook.copy(view.focus);
      currentLook.copy(targetLook);
      currentDistance = targetDistance = view.distance;
    }
  }
  window.addEventListener("resize", resize);
  resize();
  const savedEntry = phone.matches ? history.state : null;
  const initial = location.hash.slice(1) || initialPlace();
  go(initial, savedEntry?.place === initial ? "none" : "replace");
  if (savedEntry?.place === initial) restoreSelection(savedEntry);
  currentLook.copy(targetLook);
  currentDistance = targetDistance;
  yaw = targetYaw;
  pitch = targetPitch;
  await renderer.compileAsync(scene, camera);
  const clock = new T.Timer();
  function updateEffects(dt, timeMs = performance.now()) {
    effectTime+=dt;
    devices.update(effectTime,reduced);
    social.animateCue(effectTime,reduced);
    const age=effectTime-mapFlashAt;
    kioskRoot.userData.flashActive=age>=0&&age<.7;
    const cycle = .5 + .5 * Math.cos(2 * Math.PI * timeMs / 1600);
    const flash = kioskRoot.userData.flashActive ? Math.sin(Math.PI * age / .7) : 0;
    const level = Math.max(cycle, flash);
    mapBrightness.value = reduced ? .98 + .22 * level : .96 + 1.16 * level;
    // The hand already shares the map light; give its cream face a stronger highlight.
    handPulse.value = reduced ? .94 + .36 * level : .58 + 1.45 * level;
  }
  let lastFrame = 0;
  renderer.setAnimationLoop((time) => {
    if (document.body.dataset.failed || reading || navigationMap.dialog.open || document.hidden || time - lastFrame < 33) return;
    try {
      lastFrame = time;
      clock.update();
      const dt = Math.min(clock.getDelta(), 0.05),
        blend = reduced ? 1 : 1 - Math.exp(-dt * (place === "portfolio" ? 12 : 9));
      game.ticker.delta = game.ticker.deltaScaled = reduced ? 0 : dt;
      game.ticker.elapsedScaled += game.ticker.deltaScaled;
      game.ticker.elapsedScaledUniform.value = game.ticker.elapsedScaled;
      updateEffects(dt, time);
      currentLook.lerp(targetLook, blend);
      currentDistance = T.MathUtils.lerp(
        currentDistance,
        targetDistance,
        blend,
      );
      yaw = T.MathUtils.lerp(yaw, targetYaw, blend);
      pitch = T.MathUtils.lerp(pitch, targetPitch, blend);
      camera.position
        .copy(currentLook)
        .add(
          new T.Vector3().setFromSpherical(
            new T.Spherical(currentDistance, pitch, yaw),
          ),
        );
      camera.lookAt(currentLook);
      camera.updateMatrixWorld();
      updateLabControls();
      if (place === "home" && kioskFace) {
        projectedCenter.copy(hintCenter).project(camera);
        projectedLeft.copy(hintLeft).project(camera);
        projectedRight.copy(hintRight).project(camera);
        const width = Math.hypot((projectedRight.x - projectedLeft.x) * innerWidth / 2,
          (projectedRight.y - projectedLeft.y) * innerHeight / 2);
        mapHint.style.left = `${(projectedCenter.x + 1) * innerWidth / 2}px`;
        mapHint.style.top = `${(1 - projectedCenter.y) * innerHeight / 2}px`;
        mapHint.style.setProperty("--map-label-scale", T.MathUtils.clamp(width / 320, .38, 2));
        mapHint.classList.toggle("visible", projectedCenter.z >= -1 && projectedCenter.z <= 1);
      } else mapHint.classList.remove("visible");
      game.view.spherical.offset.copy(camera.position).sub(currentLook);
      game.view.spherical.radius.current = currentDistance;
      game.view.focusPoint.position.copy(currentLook);
      game.ticker.events.trigger("tick");
      portfolio.update();
      pipeline.render();
      world.renderCount=(world.renderCount||0)+1;
      document.body.dataset.ready = "true";
      loadingScreen.finish();
      if(entryFlashPending){
        entryFlashPending=false;
        if (savedEntry?.place === place && history.state?.overlay === savedEntry?.overlay) restoreOverlay(savedEntry);
        if(place==="home"){
          // Reveal first, then cue the map and its hand together exactly once.
          mapFlashAt=effectTime+.18;
          kioskRoot.userData.entryFlashAt=mapFlashAt;
        }
      }
    } catch (error) {
      renderer.setAnimationLoop(null);
      fail(error);
    }
  });
  window.designWorld = {
    world,
    portfolio,
    stations,
    devices,
    kioskFace,
    kioskRoot,
    pixelHand,
    crates,
    welcome,
    mapBrightness,
    navigationMap,
    identity,
    placements: fixtures.placements,
    get landingView(){return landingView;},
    updateEffects,
    get effectTime(){return effectTime;},
    viewState:()=>({look:currentLook.toArray(),target:targetLook.toArray(),yaw,pitch,distance:currentDistance,fov:camera.fov}),
    go,
    openCurrent,
    selectOther,
    pick,
    geometryContacts(a,b){
      const collect=root=>{const list=[];root.traverse(m=>{if(m.isMesh&&!m.isInstancedMesh)list.push(m);});return list;};
      const first=collect(a),second=collect(b),probe=new T.Raycaster(),contacts=[];
      function edges(source,target){
        const box=new T.Box3().setFromObject(target,true),p=source.geometry.attributes.position,index=source.geometry.index;
        const count=index?index.count:p.count;
        for(let i=0;i<count;i+=3){
          const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(source.matrixWorld));
          if(!new T.Box3().setFromPoints(points).intersectsBox(box))continue;
          for(let j=0;j<3;j++){
            const from=points[j],delta=points[(j+1)%3].clone().sub(from),length=delta.length();
            if(length<.002)continue;
            probe.set(from,delta.normalize());probe.near=.001;probe.far=length-.001;
            const hit=probe.intersectObject(target,false)[0];
            if(hit){contacts.push({a:source.name,b:target.name,point:hit.point.toArray()});return;}
          }
        }
      }
      for(const x of first)for(const y of second){
        if(!new T.Box3().setFromObject(x,true).intersectsBox(new T.Box3().setFromObject(y,true)))continue;
        edges(x,y);edges(y,x);
      }
      return contacts;
    },
  };
} catch (error) {
  fail(error);
}
function fail(error) {
  if (document.body.dataset.failed) return;
  console.error(error);
  world?.renderer.setAnimationLoop(null);
  loadingScreen.cancel();
  $("fallback").hidden = false;
  $("error-message").textContent = "场景暂时无法继续显示：" + error.message;
  document.body.dataset.failed = "true";
  if (phone.matches) {
    $("error-message").textContent = "你可以直接打开作品，或重新加载 3D 场景。";
    const retry = document.createElement("button");
    retry.textContent = "重新加载场景";
    retry.onclick = () => {
      if (portfolio) history.replaceState(stationEntry(), "");
      location.reload();
    };
    $("fallback").append(retry);
  }
}
