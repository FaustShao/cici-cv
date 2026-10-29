import { T } from "./create-world.js";
import { color, texture, uniform } from "three/tsl";
import { MeshDefaultMaterial } from "./bruno/Materials/MeshDefaultMaterial.js";

// Palette-matched physical fixtures. Text is printed on surfaces, not extruded
// above a station. Only the owner's single-line name is a sculptural wordmark.
export function createFixtures(world) {
  const { scene, clean, game, surface } = world;
  const colors = {
    wood: "#a75d48",
    edge: "#62384d",
    cream: "#ffead0",
    red: "#b65a69",
    purple: "#735079",
    teal: "#63887f",
    gold: "#daaa64",
  };
  function material(options) {
    const m = new MeshDefaultMaterial(options);
    m.userData.prevent = true;
    return m;
  }
  const materials = Object.fromEntries(
    Object.entries(colors).map(([k, v]) => [
      k,
      material({ colorNode: color(v), hasWater: false }),
    ]),
  );
  const placements = [],
    reserved = [];
  function box(parent, size, pos, material = "wood") {
    const mesh = new T.Mesh(new T.BoxGeometry(...size), materials[material]);
    mesh.position.set(...pos);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function parcel(root, x, z, scale = 1, options = {}) {
    if (!options.prepared) clean(root);
    root.scale.setScalar(scale);
    scene.add(root);
    root.updateWorldMatrix(true, true);
    const bounds = new T.Box3().setFromObject(root),
      dimensions = bounds.getSize(new T.Vector3()),
      center = bounds.getCenter(new T.Vector3());
    const width = options.width || dimensions.x,
      depth = options.depth || dimensions.z;
    let best,
      score = Infinity;
    const radius = options.radius ?? 18;
    for (let dz = -radius; dz <= radius; dz += 0.5)
      for (let dx = -radius; dx <= radius; dx += 0.5) {
        const px = x + dx,
          pz = z + dz;
        if (
          reserved.some(r => {
            if (Math.abs(px-r.x) >= (width+r.width)/2+.4 || Math.abs(pz-r.z) >= (depth+r.depth)/2+.4) return false;
            if (!r.oriented) return true;
            const { angle, width: w, depth: d } = r.oriented;
            const c=Math.cos(angle),s=Math.sin(angle),dx=px-r.x,dz=pz-r.z;
            return Math.abs(dx*c-dz*s) < w/2+Math.abs(c)*width/2+Math.abs(s)*depth/2+.3 &&
              Math.abs(dx*s+dz*c) < d/2+Math.abs(s)*width/2+Math.abs(c)*depth/2+.3;
          })
        )
          continue;
        const ground = surface.check(px, pz, width, depth);
        if (ground.maxWater > 5 || ground.maxRoad > (options.plaza ? 255 : 120)) continue;
        const s = dx * dx + dz * dz;
        if (s < score) {
          best = { x: px, z: pz, width, depth, plaza: !!options.plaza, ...ground };
          score = s;
        }
      }
    if (!best) throw new Error("没有找到可落地的岸上空地：" + root.name);
    root.position.add(
      new T.Vector3(
        best.x - center.x,
        best.height - bounds.min.y + 0.015,
        best.z - center.z,
      ),
    );
    root.updateWorldMatrix(true, true);
    best.groundedY = new T.Box3().setFromObject(root).min.y;
    surface.clearGrass(best.x, best.z, width + 0.6, depth + 0.6);
    root.userData.parcel = best;
    placements.push({ name: root.name, ...best });
    if (options.reserve !== false) reserved.push({ ...best, oriented:options.oriented });
    return root;
  }
  function print(
    text,
    width,
    height,
    { bg = "#a75d48", ink = "#ffead0", size = 85, font = "World Xiaolai", fit = false } = {},
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.round((1024 * height) / width);
    const ctx = canvas.getContext("2d");
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#e8b984";
      ctx.lineWidth = 7;
      ctx.strokeRect(24, 20, canvas.width - 48, canvas.height - 40);
    }
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 ${size}px "${font}", sans-serif`;
    if(fit){
      ctx.textBaseline="alphabetic";
      const m=ctx.measureText(text),scale=Math.min(880/m.width,(canvas.height-14)/(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));
      ctx.translate(512,canvas.height/2);ctx.scale(scale,scale);
      ctx.fillText(text,0,(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
    } else ctx.fillText(text, 512, canvas.height / 2, 880);
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    return new T.Mesh(
      new T.PlaneGeometry(width, height),
      material({ colorNode: texture(tex).rgb, alphaNode:bg?undefined:texture(tex).a, transparent:!bg, hasWater: false }),
    );
  }
  function sign(text, x, z, width = 3.4) {
    const root = new T.Group();
    root.name = "wood-sign-" + text;
    for (const px of [-width * 0.32, width * 0.32]) {
      box(root, [0.16, 1.8, 0.18], [px, 0.9, 0], "edge");
      box(root, [0.4, 0.1, 0.45], [px, 0.05, 0], "wood");
    }
    box(root, [width, 0.82, 0.18], [0, 1.38, 0]);
    const face = print(text, width - 0.08, 0.74, { size: 104 });
    face.position.set(0, 1.38, 0.1);
    root.add(face);
    root.rotation.y = 0.35;
    parcel(root, x, z);
    return root;
  }
  function books(parent, x, y, z, count = 3, standing = false) {
    for (let i = 0; i < count; i++) {
      const root = new T.Group();
      parent.add(root);
      root.position.set(
        x + (standing ? i * 0.24 : 0),
        y + (standing ? 0.48 : i * 0.17),
        z,
      );
      root.rotation.y = standing ? 0 : i % 2 ? -0.12 : 0.08;
      if (standing) {
        box(
          root,
          [0.2, 0.95, 0.64],
          [0, 0, 0],
          ["red", "purple", "teal"][i % 3],
        );
        box(root, [0.15, 0.8, 0.57], [0, 0, 0.05], "cream");
      } else {
        box(
          root,
          [0.95, 0.15, 0.7],
          [0, 0, 0],
          ["red", "purple", "teal"][i % 3],
        );
        box(root, [0.86, 0.08, 0.64], [0.025, 0, 0], "cream");
      }
    }
  }
  function resumeCorner(original) {
    const root = new T.Group();
    root.name = "resume-reading-corner";
    const desk = original.getObjectByName("projects").clone(true);
    for (const child of [...desk.children])
      if (!/^(cube024|mainTablePhysicalDynamic)$/.test(child.name))
        child.removeFromParent();
    clean(desk);
    desk.scale.setScalar(1.55);
    root.add(desk);
    desk.updateWorldMatrix(true, true);
    const bounds = new T.Box3().setFromObject(desk),
      center = bounds.getCenter(new T.Vector3());
    desk.position.add(
      new T.Vector3(-center.x - 0.35, -bounds.min.y, -center.z + 0.3),
    );
    desk.updateWorldMatrix(true, true);
    const deskBox = new T.Box3().setFromObject(desk);
    books(root, -1.6, deskBox.max.y - 0.15, 0.3, 3);
    // Open bookshelf, separate from the table, to give this corner a clear use.
    const shelf = new T.Group();
    root.add(shelf);
    shelf.position.set(1.65, 0, -1.15);
    for (const x of [-0.75, 0.75])
      box(shelf, [0.16, 2.3, 0.76], [x, 1.15, 0], "edge");
    for (const y of [0.15, 1.15, 2.2]) box(shelf, [1.65, 0.13, 0.8], [0, y, 0]);
    books(shelf, -0.5, 0.23, 0.03, 4, true);
    books(shelf, -0.5, 1.23, 0.03, 3, true);
    const holder = new T.Mesh(
      new T.CylinderGeometry(0.17, 0.16, 0.34, 8),
      materials.teal,
    );
    holder.position.set(1, deskBox.max.y, 0.65);
    root.add(holder);
    for (let i = 0; i < 3; i++) {
      const pen = box(
        root,
        [0.035, 0.65, 0.035],
        [0.9 + i * 0.08, deskBox.max.y + 0.3, 0.65],
        i === 0 ? "red" : "edge",
      );
      pen.rotation.z = (i - 1) * 0.14;
    }
    parcel(root, 26, 24);
    return root;
  }
  function contactCorner(original) {
    const root = new T.Group();
    root.name = "roadside-post-corner";
    // Upright post box, an envelope tray and a small phone. The road
    // remains empty: the entire fixture is registered to a dry grass parcel.
    box(root, [0.2, 1.2, 0.2], [-0.65, 0.6, 0], "edge");
    box(root, [0.75, 0.12, 0.7], [-0.65, 0.06, 0], "wood");
    box(root, [1.05, 1.1, 0.75], [-0.65, 1.55, 0], "red");
    const roof = box(root, [1.2, 0.16, 0.92], [-0.65, 2.18, 0], "edge");
    roof.rotation.z = -0.06;
    box(root, [0.62, 0.055, 0.04], [-0.65, 1.8, 0.39], "edge");
    const letter = print("信件", 0.64, 0.28, { bg: "#b65a69", size: 100 });
    letter.position.set(-0.65, 1.45, 0.385);
    root.add(letter);
    box(root, [1.45, 0.15, 0.85], [0.95, 0.9, 0.03]);
    for (const x of [0.35, 1.55])
      box(root, [0.12, 0.9, 0.12], [x, 0.45, 0.03], "edge");
    for (let i = 0; i < 3; i++) {
      const envelope = box(
        root,
        [0.65, 0.035, 0.4],
        [0.9, 1.01 + i * 0.045, 0.08],
        "cream",
      );
      envelope.rotation.y = (i - 1) * 0.13;
    }
    const phone = new T.Group();
    root.add(phone);
    phone.position.set(1.02, 1.04, -0.12);
    phone.rotation.x = -0.16;
    box(phone, [0.45, 0.08, 0.78], [0, 0, 0], "edge");
    box(phone, [0.36, 0.02, 0.56], [0, 0.052, -0.03], "teal");
    box(phone, [0.07, 0.025, 0.035], [0, 0.055, 0.3], "cream");
    root.rotation.y = 0.2;
    parcel(root, 47, 29);
    return root;
  }
  function nameModel() {
    const root = new T.Group();
    root.name = "single-line-owner-name";
    const pixels = [], cell = 0.066;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 28;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let offset = 0;
    for (const char of "王钰欣") {
      ctx.clearRect(0, 0, 28, 28);
      ctx.fillStyle = "white";
      ctx.font = '900 24px "Scene Sans"';
      ctx.textBaseline = "top";
      ctx.fillText(char, 1, 0);
      const data = ctx.getImageData(0, 0, 28, 28).data;
      for (let y = 0; y < 26; y++) for (let x = 0; x < 26; x++)
        if (data[(y * 28 + x) * 4 + 3] > 100) pixels.push([offset + x, 25 - y]);
      offset += 28;
    }
    const alphabet = {
      C: ["01111","11000","11000","11000","11000","11000","01111"],
      E: ["11111","11000","11000","11110","11000","11000","11111"],
      I: ["111","010","010","010","010","010","111"],
      L: ["11000","11000","11000","11000","11000","11000","11111"],
      A: ["01110","11011","11011","11111","11011","11011","11011"],
      "/": ["0001","0001","0010","0010","0100","1000","1000"],
    };
    offset += 3;
    for (const char of "/ CECILIA") {
      if (char === " ") { offset += 7; continue; }
      const glyph = alphabet[char];
      glyph.forEach((row, y) => [...row].forEach((on, x) => {
        if (on === "1") for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 3; dy++)
          pixels.push([offset + x * 3 + dx, (6 - y) * 3 + dy + 2]);
      }));
      offset += glyph[0].length * 3 + 4;
    }
    const block = new T.BoxGeometry(cell * .96, cell * .96, .27);
    // Actual individual cubes: pale front (+Z), purple sides and backs.
    const frontPower = uniform(1);
    const front = material({colorNode:color(colors.cream).mul(frontPower),hasWater:false});
    const sides = [materials.purple, materials.purple, materials.purple, materials.purple, front, materials.purple];
    const mesh = new T.InstancedMesh(block, sides, pixels.length);
    mesh.name = "voxel-name-blocks";
    mesh.castShadow = mesh.receiveShadow = true;
    const matrix = new T.Matrix4();
    pixels.forEach(([x, y], i) => mesh.setMatrixAt(i, matrix.makeTranslation((x - offset / 2) * cell, (y + .5) * cell, 0)));
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
    root.rotation.y = Math.PI / 7.2;
    mesh.computeBoundingBox();
    const bounds=mesh.boundingBox;
    parcel(root, 43, 42.5, 1, { plaza: true, radius: 1, prepared: true,
      oriented:{angle:root.rotation.y,width:bounds.max.x-bounds.min.x,depth:.27} });
    root.userData.text = "王钰欣 / CECILIA";
    root.userData.blockCount = pixels.length;
    root.userData.lightOn = false;
    root.toggleLight = () => {
      root.userData.lightOn = !root.userData.lightOn;
      frontPower.value = root.userData.lightOn ? 2.6 : 1;
    };
    return root;
  }
  function nativeCrates() {
    const root = new T.Group();
    root.name = "native-landing-three-crates";
    for (const name of ["explosiveCrates001","explosiveCrates023","explosiveCrates002"]) {
      const box = game.resources.explosiveCratesModel.scene.getObjectByName(name);
      if (!box) throw new Error("原版入口箱子缺失：" + name);
      root.add(box.clone(true));
    }
    clean(root);
    root.updateWorldMatrix(true,true);
    const lower=root.children.filter(c=>c.name!=="explosiveCrates002");
    for(const box of lower){
      const bounds=new T.Box3().setFromObject(box),center=bounds.getCenter(new T.Vector3());
      box.position.y+=surface.sample(center.x,center.z).height+.015-bounds.min.y;
      box.updateWorldMatrix(true,true);
    }
    const upper=root.getObjectByName("explosiveCrates002");
    const supportY=Math.max(...lower.map(box=>new T.Box3().setFromObject(box).max.y));
    upper.position.y+=supportY+.005-new T.Box3().setFromObject(upper).min.y;
    upper.updateWorldMatrix(true,true);
    const center = new T.Box3().setFromObject(root).getCenter(new T.Vector3());
    parcel(root,center.x,center.z,1,{plaza:true,radius:0});
    root.userData.stackSupportGap=new T.Box3().setFromObject(upper).min.y-Math.max(...lower.map(box=>new T.Box3().setFromObject(box).max.y));
    return root;
  }
  function reserveExisting(root) {
    if (!root) return;
    const bounds = new T.Box3().setFromObject(root), center = bounds.getCenter(new T.Vector3()), size = bounds.getSize(new T.Vector3());
    reserved.push({x:center.x,z:center.z,width:size.x,depth:size.z});
  }
  function welcomeSign() {
    const native = scene.getObjectByName("fencePhysicalDynamic005");
    if (!native) throw new Error("原版欢迎木牌缺失");
    const root = native.clone(true);
    native.removeFromParent();
    root.name = "welcome-to-cecilias-world";
    const font="Amatic SC";
    for (const [text,y] of [["Welcome to",.065],["Cecilia’s world.",-.33]]) {
      const label=print(text,1.98,.28,{bg:null,size:110,font,fit:true});
      label.position.set(0,y,.22);
      root.add(label);
    }
    parcel(root,39.955,32.219,1.65,{plaza:true,radius:1});
    root.userData.text="Welcome to Cecilia’s world.";
    return root;
  }
  function gameDevices(original, activate) {
    const source = original.getObjectByName("landing");
    const devices = [], animated = [];
    const definitions = [
      ["gamepadPhysicalDynamic001", "gamepad", 43.5, 39.4, .9],
      ["phonePhysicalDynamic001", "joystick", 39.5, 38.5, .78],
      ["gizmoPhysicalDynamic", "gizmo", 36.5, 40.3, .75],
    ];
    for (const [sourceName, kind, x, z, scale] of definitions) {
      const native = source.getObjectByName(sourceName);
      if (!native) throw new Error("入口设备模型缺失：" + sourceName);
      const root = native.clone(true);
      root.position.set(0, 0, 0);
      root.name = "entrance-device-" + kind;
      parcel(root, x, z, scale, { plaza: true, radius: 1.5 });
      root.userData.kind = kind;
      devices.push(root);
      const movers = [];
      root.traverse(m => {
        if (m.isMesh && ((kind === "joystick" && m.name === "phonePhysicalDynamic002") || /qosdjqosjd/.test(m.name))) {
          movers.push({ mesh: m, position: m.position.clone(), rotation: m.rotation.clone() });
        }
      });
      animated.push({ root, movers, base: root.rotation.clone(), pulse: -10, active: false });
    }
    let now = 0;
    function hit(root) {
      const item = animated.find(d => d.root === root);
      if (item) {
        item.pulse = now;
        root.userData.interactions = (root.userData.interactions || 0) + 1;
        activate?.(root.userData.kind);
      }
    }
    function hover(root) { animated.forEach(d => d.active = d.root === root); }
    function update(time, reduced = false) {
      now = time;
      for (const d of animated) {
        const age = time - d.pulse;
        const pulse = age >= 0 && age < 1 ? Math.sin(age * Math.PI * 3) * Math.exp(-age * 4) : 0;
        d.root.rotation.z = d.base.z + pulse * .055;
        for (const m of d.movers) {
          m.mesh.position.copy(m.position);
          m.mesh.rotation.copy(m.rotation);
          if (d.root.userData.kind === "joystick") m.mesh.rotation.z += pulse * .16;
          else m.mesh.position.y -= Math.abs(pulse) * .12;
          if (d.active && !reduced) m.mesh.rotation.x += Math.sin(time * 3) * .025;
        }
      }
    }
    return { roots: devices, hit, hover, update };
  }
  return {
    parcel,
    sign,
    books,
    box,
    materials,
    placements,
    resumeCorner,
    contactCorner,
    nameModel,
    gameDevices,
    nativeCrates,
    welcomeSign,
    reserveExisting,
  };
}
