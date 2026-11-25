import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { color, uniform } from "three/tsl";
import { T } from "./create-world.js";
import { MeshDefaultMaterial } from "./bruno/Materials/MeshDefaultMaterial.js";

export async function createEntranceSpeaker(world, fixtures, reader, feedback) {
  const { scene: root } = await new GLTFLoader().loadAsync(world.asset("entrance/speaker-small.glb"));
  root.name = "entrance-music-speaker";
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const cabinet = mesh.material.name === "wood";
    mesh.material = new MeshDefaultMaterial({ colorNode: color(cabinet ? "#ba8055" : "#4e5260"), hasWater: false });
  });
  const light = uniform(color("#443d38"));
  const pilot = new T.Mesh(new T.CircleGeometry(.006, 12), new T.MeshBasicNodeMaterial({ colorNode: light }));
  pilot.position.set(.121, .272, .001);
  root.add(pilot);
  root.rotation.y = .52;
  fixtures.parcel(root, 42.70, 37.56, 4.35, { plaza: true, precise: true, hull: true, radius: 0, groundClearance: 0 });

  const button = document.getElementById("music-switch");
  const audio = new Audio();
  audio.preload = "none";
  audio.loop = true;
  audio.volume = .45;
  let enabled = false;
  let sequence = 0;
  let hideMessage;

  function report(text) {
    clearTimeout(hideMessage);
    feedback.textContent = text;
    hideMessage = setTimeout(() => {
      if (feedback.textContent === text) feedback.textContent = "";
    }, 3200);
  }

  function updateLight() {
    light.value.set(enabled && !audio.paused ? "#ffd772" : "#443d38");
    button.setAttribute("aria-pressed", String(enabled));
  }

  function unavailable() {
    enabled = false;
    audio.removeAttribute("src");
    audio.load();
    updateLight();
    report("音乐暂时无法播放，可再点音响重试");
  }

  function sync() {
    const request = ++sequence;
    if (!enabled || reader.open || document.hidden) {
      audio.pause();
      updateLight();
      return;
    }
    if (!audio.hasAttribute("src")) audio.src = world.asset("entrance/carefree.mp3");
    audio.play().catch(() => {
      if (request === sequence && enabled) unavailable();
    });
  }

  function toggle() {
    enabled = !enabled;
    report(enabled ? "♪ Carefree · Kevin MacLeod" : "背景音乐已暂停");
    sync();
  }

  button.onclick = toggle;
  audio.addEventListener("playing", updateLight);
  audio.addEventListener("pause", updateLight);
  audio.addEventListener("error", () => { if (enabled && audio.error) unavailable(); });
  new MutationObserver(sync).observe(reader, { attributes: true, attributeFilter: ["open"] });
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", () => { ++sequence; audio.pause(); });
  window.addEventListener("pageshow", sync);
  return { root, toggle };
}
