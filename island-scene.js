import * as T from "./assets/vendor/three.module.min.js";
import { FontLoader } from "./assets/vendor/FontLoader.js";
import { buildWorld } from "./island-models.js?v=world-2";

const host = document.getElementById("scene-canvas"),
  status = document.getElementById("scene-status"),
  tooltip = document.getElementById("scene-tooltip");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = window.ISLAND_STATE || {
  place: "home",
  selected: 0,
  reader: false,
};
function fallback(message) {
  document.body.classList.remove("scene-ready");
  document.body.classList.add("fallback-mode");
  host.hidden = true;
  tooltip.hidden = true;
  document.getElementById("model-hotspots").replaceChildren();
  status.textContent = message || "简洁模式 · 点击建筑卡片进入";
  window.dispatchEvent(new CustomEvent("island:fallback"));
}

try {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  host.append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0x23b4df);
  scene.fog = new T.Fog(0x23b4df, 65, 145);
  const camera = new T.OrthographicCamera(-12, 12, 9, -9, 0.1, 180);
  const hemi = new T.HemisphereLight(0xd6f4ff, 0xc8ab62, 2.6);
  scene.add(hemi);
  const sun = new T.DirectionalLight(0xffedcf, 3.1);
  sun.position.set(-12, 25, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(
    innerWidth < 700 ? 1024 : 2048,
    innerWidth < 700 ? 1024 : 2048,
  );
  Object.assign(sun.shadow.camera, {
    left: -16,
    right: 16,
    top: 16,
    bottom: -16,
    near: 0.5,
    far: 70,
  });
  sun.shadow.normalBias = 0.045;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const fill = new T.DirectionalLight(0xc0e5ff, 0.5);
  fill.position.set(8, 8, -8);
  scene.add(fill);
  let font = null;
  try {
    await Promise.all([
      document.fonts.load("650 20px Fredoka"),
      document.fonts.load('650 20px "Island Sans"', "王钰欣个人简历作品集"),
    ]);
    font = new FontLoader().parse(
      await fetch("assets/fonts/fredoka.typeface.json").then((r) => {
        if (!r.ok) throw Error("font");
        return r.json();
      }),
    );
  } catch {
    console.warn("Using local font fallback");
  }
  const world = buildWorld(scene, font),
    canvas = renderer.domElement;
  const positions = [];
  for (let i = 0; i < 90; i++) {
    positions.push(
      Math.sin(i * 32.17) * 30,
      8 + (i % 9) * 1.2,
      -8 + Math.cos(i * 9.8) * 25,
    );
  }
  const starsGeometry = new T.BufferGeometry();
  starsGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(positions, 3),
  );
  const stars = new T.Points(
    starsGeometry,
    new T.PointsMaterial({ color: 0xfff0cb, size: 0.065 }),
  );
  scene.add(stars);
  let dark = false,
    dirty = true,
    healthy = true,
    selected = state.selected,
    place = state.place,
    hover = null,
    dragged = false;
  let yaw = 0.16,
    pitch = 0.55,
    zoom = 1,
    targetYaw = yaw,
    targetPitch = pitch,
    targetZoom = 1;
  let targetLook = new T.Vector3(0, 1.1, 0.15),
    look = targetLook.clone(),
    viewHeight = 18,
    currentViewHeight = 18;
  let lastTime = 0,
    lastInteraction = performance.now(),
    pointerStart = null,
    lastPointer = null,
    pinchDistance = 0,
    pinched = false,
    flightUntil = 0,
    pressedAction = null;
  const pointers = new Map(),
    ray = new T.Raycaster(),
    ndc = new T.Vector2(),
    projected = new T.Vector3(),
    worldPoint = new T.Vector3();
  const hotspotHost = document.getElementById("model-hotspots");
  const hotspots = world.interactions.map((data) => {
    const button = document.createElement("button");
    button.className = "model-hotspot";
    button.textContent = data.label;
    button.setAttribute("aria-label", data.label);
    button.dataset.action = data.type;
    if (data.value !== null) button.dataset.value = data.value;
    button.onclick = () => window.islandAction(data.type, data.value);
    hotspotHost.append(button);
    return { button, data };
  });
  function framePlace(name, instant = false) {
    flightUntil = instant || reduced ? 0 : performance.now() + 650;
    host.dataset.transitioning = flightUntil ? "true" : "false";
    place = name;
    hover = null;
    tooltip.hidden = true;
    canvas.dataset.cursor = "";
    world.focus(name);
    Object.values(world.places).forEach((root) => root.scale.setScalar(1));
    renderer.shadowMap.needsUpdate = true;
    if (name === "home") {
      targetLook.set(0, 1.1, world.portrait ? 1.3 : 0.15);
      targetYaw = world.portrait ? 0.1 : 0.16;
      targetPitch = world.portrait ? 1.02 : 0.55;
      targetZoom = 1;
    } else {
      const target = world.stationTargets[name];
      targetLook.copy(target.look);
      targetYaw = target.yaw;
      targetPitch = target.pitch;
      targetZoom = 1;
    }
    if (instant || reduced) {
      look.copy(targetLook);
      yaw = targetYaw;
      pitch = targetPitch;
      zoom = targetZoom;
    }
    hotspots.forEach(({ button, data }) => {
      button.hidden = data.place !== name;
    });
    status.textContent =
      name === "home"
        ? "拖动旋转 · 滚轮缩放 · 点击建筑进入"
        : name === "portfolio"
          ? "直接点击封面 · 左右拖动翻阅"
          : "点击模型探索 · Esc 返回全岛";
    lastInteraction = performance.now();
    dirty = true;
    resize();
  }
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const layoutChanged = world.setLayout(w < 700);
    if (layoutChanged) {
      framePlace(place, true);
      return;
    }
    const aspect = w / h;
    let width =
      place === "home"
        ? world.portrait
          ? 13.8
          : 23.6
        : world.portrait
          ? { resume: 5.8, portfolio: 5, other: 5.5, contact: 4.8 }[place]
          : world.stationTargets[place].width;
    // Fit the island by width on phones, but fill the desktop vertically.
    viewHeight =
      place === "home"
        ? Math.max(world.portrait ? 23 : 15.5, width / aspect)
        : Math.max(place === "portfolio" ? 5.65 : 5.3, width / aspect);
    if (place !== "home" && aspect < 0.8)
      viewHeight = Math.max(viewHeight, 9.8);
    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  new ResizeObserver(resize).observe(host);
  function theme(value) {
    dark = value;
    const sea = dark ? 0x142b58 : 0x23b4df;
    scene.background.set(sea);
    scene.fog.color.set(sea);
    world.water.material.color.set(dark ? 0x142b58 : world.C.sea);
    hemi.intensity = dark ? 1.3 : 1.8;
    hemi.color.set(dark ? 0x9ab4f5 : 0xd6f4ff);
    hemi.groundColor.set(dark ? 0x3c4076 : 0xc8ab62);
    sun.intensity = dark ? 0.7 : 2;
    fill.intensity = dark ? 0.65 : 0.5;
    renderer.toneMappingExposure = 1;
    world.lamps.forEach((m) => {
      m.material.emissiveIntensity = dark ? 1.65 : 0;
      if (m.material.color.getHex() !== 0xffedaf)
        m.material.color.set(dark ? 0xffcf76 : 0x60bdca);
    });
    stars.visible = dark;
    dirty = true;
  }
  function activeAction(object) {
    const data =
      place === "home" ? object.userData.action : object.userData.detailAction;
    return data?.place === place ? data : null;
  }
  function hit(event) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(world.pickables, false);
    for (const intersection of hits) {
      const data = activeAction(intersection.object);
      if (data) return data;
    }
    return null;
  }
  function showHover(event) {
    hover = hit(event);
    canvas.dataset.cursor = hover ? "click" : "";
    tooltip.hidden = !hover;
    if (hover) {
      tooltip.textContent = hover.label + " ↗";
      tooltip.style.left = `${Math.min(innerWidth - 190, Math.max(8, event.clientX + 21))}px`;
      tooltip.style.top = `${Math.min(innerHeight - 45, event.clientY + 22)}px`;
    }
    dirty = true;
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    lastInteraction = performance.now();
    if (pointers.size === 1) {
      pressedAction = hit(event) || hover;
      pointerStart = { x: event.clientX, y: event.clientY };
      lastPointer = { ...pointerStart };
      dragged = false;
      pinched = false;
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      dragged = true;
      pinched = true;
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    lastInteraction = performance.now();
    if (!pointers.has(event.pointerId)) {
      if (event.pointerType === "mouse") showHover(event);
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()],
        distance = Math.hypot(a.x - b.x, a.y - b.y);
      targetZoom = T.MathUtils.clamp(
        (targetZoom * distance) / Math.max(1, pinchDistance),
        0.8,
        1.7,
      );
      pinchDistance = distance;
      dirty = true;
      return;
    }
    if (!pointerStart) return;
    const dx = event.clientX - lastPointer.x,
      dy = event.clientY - lastPointer.y;
    if (
      Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      ) > 7
    )
      dragged = true;
    if (dragged) {
      tooltip.hidden = true;
      hover = null;
      canvas.dataset.cursor = "drag";
      if (place === "home") {
        targetYaw -= dx * 0.006;
        targetPitch = T.MathUtils.clamp(targetPitch + dy * 0.003, 0.26, 1.08);
      } else if (place !== "portfolio") {
        targetYaw = T.MathUtils.clamp(targetYaw - dx * 0.003, -0.38, 0.38);
        targetPitch = T.MathUtils.clamp(targetPitch + dy * 0.002, 0.15, 0.65);
      }
      dirty = true;
    }
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  function release(event, cancelled = false) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size) return;
    if (pointerStart && !cancelled && !pinched) {
      const dx = event.clientX - pointerStart.x,
        dy = event.clientY - pointerStart.y;
      if (
        dragged &&
        place === "portfolio" &&
        Math.abs(dx) > 40 &&
        Math.abs(dx) > Math.abs(dy) * 1.15
      )
        window.islandAction(dx < 0 ? "next" : "prev");
      else if (!dragged) {
        // Keep the pressed object stable while a cover lifts or finishes moving.
        const data = pressedAction || hit(event);
        if (data?.place === place) window.islandAction(data.type, data.value);
      }
    }
    pointerStart = null;
    pressedAction = null;
    lastPointer = null;
    dragged = false;
    canvas.dataset.cursor = "";
    dirty = true;
  }
  canvas.addEventListener("pointerup", (event) => release(event));
  canvas.addEventListener("pointercancel", (event) => release(event, true));
  canvas.addEventListener("lostpointercapture", (event) =>
    release(event, true),
  );
  canvas.addEventListener("pointerleave", () => {
    if (!pointers.size) {
      hover = null;
      tooltip.hidden = true;
      canvas.dataset.cursor = "";
      dirty = true;
    }
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      targetZoom = T.MathUtils.clamp(
        targetZoom - event.deltaY * 0.001,
        0.8,
        1.7,
      );
      lastInteraction = performance.now();
      dirty = true;
    },
    { passive: false },
  );
  canvas.addEventListener("dblclick", (event) => {
    if (!hit(event)) framePlace(place);
  });
  window.addEventListener("island:place", (event) =>
    framePlace(event.detail.place),
  );
  window.addEventListener("island:select", (event) => {
    selected = event.detail.index;
    dirty = true;
    lastInteraction = performance.now();
  });
  window.addEventListener("island:theme", (event) => theme(event.detail.dark));
  window.addEventListener("island:reset", () => framePlace(place));
  window.addEventListener("island:reader", () => {
    tooltip.hidden = true;
    hover = null;
    dirty = true;
  });
  window.addEventListener("island:art-ready", () => {
    dirty = true;
  });
  document.addEventListener("visibilitychange", () => {
    dirty = true;
  });
  // Permit precise keyboard interaction with the same real models, without
  // permanently drawing a second navigation layer over the scene.
  hotspots.forEach(({ button, data }) => {
    button.addEventListener("focus", () => {
      hover = data;
      dirty = true;
    });
    button.addEventListener("blur", () => {
      hover = null;
      dirty = true;
    });
  });
  function render(time) {
    requestAnimationFrame(render);
    if (!healthy || document.hidden || state.reader || time - lastTime < 33)
      return;
    const moving =
      Math.abs(targetYaw - yaw) > 0.001 ||
      Math.abs(targetPitch - pitch) > 0.001 ||
      Math.abs(targetZoom - zoom) > 0.001 ||
      Math.abs(currentViewHeight - viewHeight) > 0.01 ||
      look.distanceTo(targetLook) > 0.005;
    if (!dirty && !moving && (reduced || time - lastInteraction > 5000)) return;
    const delta = Math.min(500, time - lastTime);
    lastTime = time;
    dirty = false;
    const lerp =
      reduced || (flightUntil && time >= flightUntil)
        ? 1
        : 1 - Math.exp(-delta / 140);
    yaw = T.MathUtils.lerp(yaw, targetYaw, lerp);
    pitch = T.MathUtils.lerp(pitch, targetPitch, lerp);
    zoom = T.MathUtils.lerp(zoom, targetZoom, lerp);
    look.lerp(targetLook, lerp);
    currentViewHeight = T.MathUtils.lerp(currentViewHeight, viewHeight, lerp);
    const aspect = host.clientWidth / host.clientHeight;
    camera.left = (-currentViewHeight * aspect) / 2;
    camera.right = (currentViewHeight * aspect) / 2;
    camera.top = currentViewHeight / 2;
    camera.bottom = -currentViewHeight / 2;
    camera.position.set(
      look.x + Math.sin(yaw) * Math.cos(pitch) * 32,
      look.y + Math.sin(pitch) * 32,
      look.z + Math.cos(yaw) * Math.cos(pitch) * 32,
    );
    camera.zoom = zoom;
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    let bookMoving = false;
    world.books.forEach((book, i) => {
      let offset = i - selected;
      if (offset > 1) offset -= 3;
      if (offset < -1) offset += 3;
      const mobile = world.portrait && place === "portfolio";
      const x = offset * (mobile ? 2.1 : 1.72),
        y =
          1.9 +
          (offset ? -0.08 : 0.12) +
          (hover?.type === "project" && hover.value === i ? 0.15 : 0),
        z = offset ? 0.22 : 0.7,
        rotation = offset * -0.1,
        scale = mobile ? (offset ? 1.2 : 1.8) : 1;
      if (
        Math.abs(book.position.x - x) > 0.005 ||
        Math.abs(book.position.y - y) > 0.005 ||
        Math.abs(book.position.z - z) > 0.005
      )
        bookMoving = true;
      book.position.x = T.MathUtils.lerp(book.position.x, x, lerp);
      book.position.y = T.MathUtils.lerp(book.position.y, y, lerp);
      book.position.z = T.MathUtils.lerp(book.position.z, z, lerp);
      book.rotation.y = T.MathUtils.lerp(book.rotation.y, rotation, lerp);
      book.rotation.z = T.MathUtils.lerp(
        book.rotation.z,
        hover?.type === "project" && hover.value === i ? -0.025 : 0,
        lerp,
      );
      book.scale.setScalar(T.MathUtils.lerp(book.scale.x, scale, lerp));
    });
    if (!reduced)
      world.waves.material.opacity = 0.3 + Math.sin(time * 0.0007) * 0.07;
    world.interactions.forEach((data) => {
      if (data.place === place && data.type !== "project") {
        const scale =
          hover === data ? (data.type === "place" ? 1.015 : 1.03) : 1;
        data.root.scale.setScalar(
          T.MathUtils.lerp(data.root.scale.x, scale, lerp),
        );
      }
    });
    world.warmLights.forEach((light) => (light.intensity = dark ? 3.5 : 0));
    renderer.render(scene, camera);
    if (!moving || (flightUntil && time >= flightUntil)) {
      flightUntil = 0;
      host.dataset.transitioning = "false";
    }
    hotspots.forEach(({ button, data }) => {
      if (button.hidden) return;
      data.root.updateWorldMatrix(true, false);
      worldPoint.copy(data.anchor);
      data.root.localToWorld(worldPoint);
      projected.copy(worldPoint).project(camera);
      button.style.left = `${T.MathUtils.clamp(((projected.x + 1) * innerWidth) / 2, 65, innerWidth - 65)}px`;
      button.style.top = `${T.MathUtils.clamp(((1 - projected.y) * innerHeight) / 2, 70, innerHeight - 110)}px`;
    });
    if (bookMoving) dirty = true;
  }
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    healthy = false;
    fallback("图形模式已暂停 · 可继续使用简洁小岛");
  });
  theme(document.documentElement.dataset.theme === "dark");
  framePlace(state.place, true);
  resize();
  document.body.classList.add("scene-ready");
  requestAnimationFrame(render);
} catch (error) {
  console.warn("Island fallback:", error.message);
  fallback();
}
