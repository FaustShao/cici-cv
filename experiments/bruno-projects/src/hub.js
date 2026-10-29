import { T, createWorld } from "./create-world.js";
import { texture } from "three/tsl";
import { createFixtures } from "./scene-fixtures.js";
import { MeshDefaultMaterial } from "./bruno/Materials/MeshDefaultMaterial.js";
import "../../../resume.js";

const $ = (id) => document.getElementById(id),
  profile = window.RESUME;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const contentRoot = import.meta.env.DEV
  ? new URL("http://127.0.0.1:8000/")
  : new URL("../", location.href);
const portfolioURL = new URL("index.html", location.href).href;
const notes = profile.projects.filter((p) => p.collection !== "portfolio");
const reader = $("reader"),
  frames = new Map(),
  stations = new Map(),
  pickables = [];
let world,
  place = "home",
  reading = false,
  otherIndex = 0,
  low = false,
  drag = false;
let targetLook,
  currentLook,
  entrance,
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
const labels = {
  home: "首页",
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
async function copyWechat() {
  try {
    await navigator.clipboard.writeText("Cecilia_cici68");
    $("feedback").textContent = "微信号已复制：Cecilia_cici68";
  } catch {
    $("feedback").textContent = "微信号：Cecilia_cici68";
  }
}
function closeReader() {
  if (reader.open) reader.close();
  frames.forEach((f) => {
    try {
      f.contentDocument
        .querySelectorAll("video,audio")
        .forEach((m) => m.pause());
    } catch {}
  });
  reading = state.reading = false;
}
function openReader(title, file) {
  $("reader-title").textContent = title;
  $("frames").querySelector(".details-sheet")?.remove();
  frames.forEach((f) => (f.hidden = true));
  $("reader-direct").hidden = !file;
  if (file) {
    const url = new URL(file, contentRoot).href;
    $("reader-direct").href = url;
    let frame = frames.get(url);
    if (!frame) {
      frame = document.createElement("iframe");
      frame.src = url;
      frame.title = title;
      frame.allow = "fullscreen";
      frame.addEventListener("load", () => {
        try {
          const doc = frame.contentDocument;
          const style = doc.createElement("style");
          style.textContent =
            "header.topbar{position:sticky}.topbar nav>a,.topbar .wordmark{display:none!important}";
          doc.head.append(style);
          doc.addEventListener("click", (event) => {
            const a = event.target.closest("a");
            if (!a || a.target === "_blank") return;
            const url = new URL(a.href);
            if (url.origin !== contentRoot.origin) return;
            const name = url.pathname.split("/").pop();
            if (
              name === "index.html" &&
              !url.pathname.endsWith("bruno-preview/index.html")
            ) {
              event.preventDefault();
              closeReader();
              go("home");
            }
            if (
              [
                "tideline.html",
                "gazette.html",
                "dream-sentinel.html",
                "portfolio.html",
              ].includes(name)
            ) {
              event.preventDefault();
              location.href = portfolioURL;
            }
          });
        } catch {}
      });
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
  reader.showModal();
}
$("close-reader").onclick = closeReader;
reader.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeReader();
});
function openCurrent() {
  if (place === "resume") openReader("个人简历", "resume.html?document=1");
  if (place === "other") openReader(notes[otherIndex].name);
  if (place === "contact") location.href = "mailto:wangyuxinqd2025@163.com";
}
function selectOther(index) {
  otherIndex = state.otherIndex = (index + notes.length) % notes.length;
  if (world?.updateLab) world.updateLab(notes[otherIndex]);
  $("other-position") &&
    ($("other-position").textContent = `${otherIndex + 1} / ${notes.length}`);
}
function go(next, historyMode = "push") {
  if (next === "portfolio") {
    location.href = portfolioURL;
    return;
  }
  if (!labels[next]) next = "home";
  closeReader();
  place = state.place = next;
  document.body.dataset.place = place;
  document.title =
    place === "home" ? "王钰欣 / CECILIA" : `${labels[place]} · 王钰欣`;
  $("back-home").hidden = place === "home";
  $("overview-world").hidden = place !== "home";
  $("feedback").textContent = "";
  $("place-actions").replaceChildren();
  $("place-actions").hidden = place === "home";
  if (place === "resume") {
    action("阅读完整简历 ↗", openCurrent);
    link("独立阅读／打印 ↗", new URL("resume.html?document=1", contentRoot));
  }
  if (place === "other") {
    action("←", () => selectOther(otherIndex - 1)).setAttribute(
      "aria-label",
      "上一个项目",
    );
    const count = document.createElement("span");
    count.id = "other-position";
    $("place-actions").append(count);
    action("点击模型阅读", openCurrent);
    action("→", () => selectOther(otherIndex + 1)).setAttribute(
      "aria-label",
      "下一个项目",
    );
    selectOther(otherIndex);
  }
  if (place === "contact") {
    const entries = [
      [
        link("写邮件 ↗", "mailto:wangyuxinqd2025@163.com"),
        "wangyuxinqd2025@163.com",
      ],
      [link("打电话 ↗", "tel:15066290491"), "15066290491"],
      [action("复制微信号", copyWechat), "Cecilia_cici68"],
    ];
    for (const [element, value] of entries) {
      const detail = document.createElement("small");
      detail.textContent = value;
      element.append(detail);
    }
  }
  $("scene-hint").textContent =
    place === "home"
      ? "点击入口地图选择地点 · 拖动观察 · 滚轮缩放"
      : `${labels[place]} · 拖动观察 · 点击模型${place === "contact" ? "写邮件" : "完整阅读"} · Esc 返回首页`;
  if (world && targetLook) {
    const station = stations.get(place);
    targetLook.copy(station ? station.focus : landingView.focus);
    targetDistance = station ? station.distance : landingView.distance;
    targetYaw = station ? 0.35 : landingView.yaw;
    targetPitch = station ? 1 : landingView.pitch;
    if (reduced) {
      currentLook.copy(targetLook);
      currentDistance = targetDistance;
      yaw = targetYaw;
      pitch = targetPitch;
    }
  }
  if (historyMode !== "none")
    history[historyMode === "replace" ? "replaceState" : "pushState"](
      { place },
      "",
      place === "home" ? location.pathname + location.search : `#${place}`,
    );
}
window.openWorldPlace = go;
$("back-home").onclick = () => go("home");
window.addEventListener("popstate", () =>
  go(location.hash.slice(1) || "home", "none"),
);
window.addEventListener("keydown", (e) => {
  if (reading) return;
  if (e.key === "Escape") go("home");
  if (e.key === "Enter" && e.target === document.body) openCurrent();
  if (place === "other" && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    selectOther(otherIndex + (e.key === "ArrowRight" ? 1 : -1));
  }
});
try {
  await document.fonts.load(
    '600 24px "Scene Sans"',
    "王钰欣个人简历其他项目联系方式",
  );
  world = await createWorld($("world"), (n, total) => {
    $("loading").textContent = `正在布置设计世界 ${n} / ${total}`;
  });
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
  entrance = fixtures.entranceMap(original);
  identity = fixtures.nameModel();
  const career = original.getObjectByName("career").clone(true);
  career.getObjectByName("refYear")?.removeFromParent();
  career.traverse((m) => {
    if (/careerText/.test(m.name)) m.visible = false;
  });
  clean(career);
  scene.add(career);
  const resumeCorner = fixtures.resumeCorner(original);
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
    if (/ref(?:Title|Url|Mini|Arrow|Interactive|Intersect)/.test(child.name))
      child.removeFromParent();
  lab.traverse((m) => {
    if (/refBlackboardLabels/.test(m.name)) m.visible = false;
  });
  clean(lab);
  scene.add(lab);
  const social = fixtures.contactCorner(original);
  // Native landing props enrich the home without the original author's name.
  const landing = original.getObjectByName("landing").clone(true);
  for (const child of [...landing.children])
    if (
      /Letters|physicalFixed00[39]|phonePhysical|refBonfireInteractive/.test(
        child.name,
      )
    )
      child.removeFromParent();
  landing.traverse((m) => {
    if (m.material?.name === "stylizedMap") m.visible = false;
  });
  clean(landing);
  scene.add(landing);
  function station(key, root, title, distance) {
    const box = new T.Box3().setFromObject(root),
      focus = box.getCenter(new T.Vector3());
    const size = box.getSize(new T.Vector3());
    const label = fixtures.sign(
      title,
      focus.x - size.x * 0.5 - 1.2,
      focus.z + 1.2,
    );
    const focusWithLabel = focus.clone();
    focusWithLabel.y += 1;
    stations.set(key, { root, label, focus: focusWithLabel, distance });
    pickables.push({ root, key }, { root: label, key });
  }
  station("resume", resumeCorner, "个人简历", 14);
  station("portfolio", project, "作品集", 20);
  station("other", lab, "其他项目", 16);
  station("contact", social, "联系方式", 12);
  const landingBounds = new T.Box3()
    .setFromObject(entrance.root)
    .union(new T.Box3().setFromObject(identity));
  const landingCenter = landingBounds.getCenter(new T.Vector3()),
    landingSize = landingBounds.getSize(new T.Vector3());
  function fitLanding() {
    const aspect = innerWidth / innerHeight,
      fov = innerWidth < 700 ? 58 : 40;
    const vertical = Math.tan(T.MathUtils.degToRad(fov / 2));
    const yaw = .35, pitch = 1.05;
    const forward = new T.Vector3().setFromSpherical(new T.Spherical(1, pitch, yaw));
    const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), forward).normalize();
    const up = new T.Vector3().crossVectors(forward, right).normalize();
    let distance = 17;
    for (const x of [landingBounds.min.x, landingBounds.max.x]) for (const y of [landingBounds.min.y, landingBounds.max.y]) for (const z of [landingBounds.min.z, landingBounds.max.z]) {
      const v = new T.Vector3(x, y, z).sub(landingCenter), near = v.dot(forward);
      distance = Math.max(distance, near + Math.abs(v.dot(right)) / (vertical * aspect * .85), near + Math.abs(v.dot(up)) / (vertical * .8));
    }
    return {
      focus: landingCenter.clone(),
      distance,
      yaw,
      pitch,
    };
  }
  landingView = fitLanding();
  const screen = project.getObjectByName("refImages");
  if (screen) {
    const tex = await world.textures.loadAsync(
      world.asset("projects/images/tideline.webp"),
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
  world.updateLab = (p) => {
    ctx.fillStyle = "#f9e8ce";
    ctx.fillRect(0, 0, 1400, 900);
    ctx.fillStyle = "#a65765";
    ctx.fillRect(80, 80, 1240, 12);
    ctx.fillRect(80, 808, 1240, 12);
    ctx.fillStyle = "#56344f";
    ctx.textAlign = "left";
    ctx.font = "400 64px Xiaolai";
    const title = p.name;
    const parts =
      title.length > 15 ? [title.slice(0, 15), title.slice(15)] : [title];
    parts.forEach((text, i) => ctx.fillText(text, 100, 240 + i * 80));
    ctx.font = "400 34px Xiaolai";
    ctx.fillText(p.tags.join(" · "), 100, 560);
    ctx.fillText("点击阅读项目记录 ↗", 100, 710);
    cardTexture.needsUpdate = true;
  };
  world.updateLab(notes[0]);
  currentLook = pt(0, 2, 2);
  targetLook = currentLook.clone();
  let night = false;
  try {
    night = localStorage.getItem("resume-theme") === "dark";
  } catch {}
  const theme = (value) => {
    night = value;
    world.setTheme(night);
    $("theme").textContent = night ? "日间" : "夜间";
    $("theme").setAttribute("aria-pressed", String(night));
    try {
      localStorage.setItem("resume-theme", night ? "dark" : "light");
    } catch {}
  };
  theme(night);
  $("theme").onclick = () => theme(!night);
  $("quality").onclick = () => {
    low = !low;
    world.setQuality(low);
    $("quality").textContent = low ? "低画质" : "高画质";
    $("quality").setAttribute("aria-pressed", String(low));
  };
  $("reset-view").onclick = () => go(place, "none");
  $("overview-world").onclick = () => {
    targetLook.set(35, 2, 25);
    targetDistance = innerWidth < 700 ? 78 : 60;
    targetPitch = 0.85;
    targetYaw = 0.5;
  };
  const ray = new T.Raycaster(),
    pointer = new T.Vector2();
  function pick(x, y) {
    pointer.set((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    if (place === "home") {
      const mapHit = ray.intersectObject(entrance.face, false)[0];
      if (mapHit?.uv) {
        const key = entrance.hit(mapHit.uv);
        if (world.mapHover !== key) {
          entrance.paint(key);
          world.mapHover = key;
        }
        return key;
      }
    }
    if (world.mapHover) {
      entrance.paint();
      world.mapHover = null;
    }
    const hits = pickables.flatMap((p) =>
      ray
        .intersectObject(p.root, true)
        .filter((h) => h.object.visible)
        .map((h) => ({ ...h, key: p.key })),
    );
    hits.sort((a, b) => a.distance - b.distance);
    return hits[0]?.key;
  }
  let start,
    last,
    pressed,
    pinched = false,
    pinch = 0;
  $("world").addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.target.setPointerCapture(e.pointerId);
    if (pointers.size === 1) {
      start = last = { x: e.clientX, y: e.clientY };
      drag = pinched = false;
      pressed = pick(e.clientX, e.clientY);
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
      targetDistance = T.MathUtils.clamp((targetDistance * pinch) / d, 10, 95);
      pinch = d;
      return;
    }
    if (pointers.size && last) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) drag = true;
      targetYaw -= (e.clientX - last.x) * 0.004;
      targetPitch = T.MathUtils.clamp(
        targetPitch - (e.clientY - last.y) * 0.003,
        0.22,
        1.3,
      );
      last = { x: e.clientX, y: e.clientY };
    } else $("world").dataset.hover = String(!!pick(e.clientX, e.clientY));
  });
  $("world").addEventListener("pointerup", (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size) return;
    if (!drag && !pinched && pressed) {
      if (place === pressed) openCurrent();
      else go(pressed);
    }
    start = last = pressed = null;
  });
  $("world").addEventListener("pointercancel", () => {
    pointers.clear();
    start = last = pressed = null;
  });
  $("world").addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      targetDistance = T.MathUtils.clamp(
        targetDistance + e.deltaY * 0.025,
        10,
        95,
      );
    },
    { passive: false },
  );
  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = innerWidth < 700 ? 58 : 40;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    game.viewport.width = innerWidth;
    game.viewport.height = innerHeight;
    landingView = fitLanding();
  }
  window.addEventListener("resize", resize);
  resize();
  go(location.hash.slice(1) || "home", "replace");
  currentLook.copy(targetLook);
  currentDistance = targetDistance;
  yaw = targetYaw;
  pitch = targetPitch;
  const clock = new T.Timer();
  let lastFrame = 0;
  renderer.setAnimationLoop((time) => {
    if (reading || document.hidden || time - lastFrame < 33) return;
    try {
      lastFrame = time;
      clock.update();
      const dt = Math.min(clock.getDelta(), 0.05),
        blend = reduced ? 1 : 1 - Math.exp(-dt * 9);
      game.ticker.delta = game.ticker.deltaScaled = reduced ? 0 : dt;
      game.ticker.elapsedScaled += game.ticker.deltaScaled;
      game.ticker.elapsedScaledUniform.value = game.ticker.elapsedScaled;
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
      game.view.spherical.offset.copy(camera.position).sub(currentLook);
      game.view.spherical.radius.current = currentDistance;
      game.view.focusPoint.position.copy(currentLook);
      game.ticker.events.trigger("tick");
      pipeline.render();
      document.body.dataset.ready = "true";
      $("loading").hidden = true;
    } catch (error) {
      renderer.setAnimationLoop(null);
      fail(error);
    }
  });
  window.designWorld = {
    world,
    stations,
    entrance,
    identity,
    placements: fixtures.placements,
    landingView,
    go,
    openCurrent,
    selectOther,
    pick,
  };
} catch (error) {
  fail(error);
}
function fail(error) {
  console.error(error);
  $("loading").hidden = true;
  $("fallback").hidden = false;
  $("error-message").textContent = "场景暂时无法继续显示：" + error.message;
  document.body.dataset.failed = "true";
}
