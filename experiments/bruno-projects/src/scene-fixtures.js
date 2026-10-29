import { T } from "./create-world.js";
import { color, texture } from "three/tsl";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
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
    clean(root);
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
    for (let dz = -18; dz <= 18; dz += 0.5)
      for (let dx = -18; dx <= 18; dx += 0.5) {
        const px = x + dx,
          pz = z + dz;
        if (
          reserved.some(
            (r) =>
              Math.abs(px - r.x) < (width + r.width) / 2 + 0.4 &&
              Math.abs(pz - r.z) < (depth + r.depth) / 2 + 0.4,
          )
        )
          continue;
        const ground = surface.check(px, pz, width, depth);
        if (ground.maxWater > 5 || ground.maxRoad > 120) continue;
        const s = dx * dx + dz * dz;
        if (s < score) {
          best = { x: px, z: pz, width, depth, ...ground };
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
    surface.clearGrass(best.x, best.z, width + 0.6, depth + 0.6);
    root.userData.parcel = best;
    placements.push({ name: root.name, ...best });
    if (options.reserve !== false) reserved.push(best);
    return root;
  }
  function print(
    text,
    width,
    height,
    { bg = "#a75d48", ink = "#ffead0", size = 85 } = {},
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.round((1024 * height) / width);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e8b984";
    ctx.lineWidth = 7;
    ctx.strokeRect(24, 20, canvas.width - 48, canvas.height - 40);
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${size}px "Scene Sans", sans-serif`;
    ctx.fillText(text, 512, canvas.height / 2, 880);
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    return new T.Mesh(
      new T.PlaneGeometry(width, height),
      material({ colorNode: texture(tex).rgb, hasWater: false }),
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
    let offset = 0;
    for (const [text, font] of [
      ["王钰欣", world.chinese],
      [" / CECILIA", world.english],
    ]) {
      const g = new TextGeometry(text, {
        font,
        size: 1,
        depth: 0.12,
        curveSegments: 6,
        bevelEnabled: true,
        bevelThickness: 0.016,
        bevelSize: 0.012,
        bevelSegments: 1,
      });
      g.computeBoundingBox();
      const b = g.boundingBox,
        height = b.max.y - b.min.y;
      const scale = 1.1 / height;
      g.translate(-b.min.x, -b.min.y, 0);
      const m = new T.Mesh(g, materials.cream);
      m.scale.setScalar(scale);
      m.position.set(offset, 0.22, 0.08);
      m.castShadow = true;
      root.add(m);
      offset += (b.max.x - b.min.x) * scale + 0.18;
    }
    for (const m of root.children) m.position.x -= offset / 2;
    box(root, [offset + 0.5, 0.2, 0.7], [0, 0.1, 0], "edge");
    root.rotation.y = 0.12;
    parcel(root, 45, 53);
    root.userData.text = "王钰欣 / CECILIA";
    return root;
  }
  function entranceMap(original) {
    const root = original.getObjectByName("landing").clone(true);
    root.name = "clickable-entrance-map";
    for (const child of [...root.children])
      if (!/^physicalFixed00[39]$/.test(child.name)) child.removeFromParent();
    parcel(root, 45, 48, 1.2);
    const face = root.getObjectByName("physicalFixed003");
    if (!face) throw new Error("入口地图牌面缺失");
    // The native kiosk uses a small square paper insert. Widen that insert
    // within its timber frame so four destinations are readable at entry.
    face.geometry = face.geometry.clone();
    const positions = face.geometry.attributes.position,
      uvs = face.geometry.attributes.uv;
    const points = Array.from({ length: positions.count }, (_, i) =>
      new T.Vector3().fromBufferAttribute(positions, i),
    );
    const middle = points
      .reduce((a, p) => a.add(p), new T.Vector3())
      .multiplyScalar(1 / points.length);
    const u = points[0].clone().sub(points[1]),
      v = points[2].clone().sub(points[0]);
    const normal = new T.Vector3().fromBufferAttribute(
      face.geometry.attributes.normal,
      0,
    );
    for (let i = 0; i < positions.count; i++) {
      const p = middle
        .clone()
        .addScaledVector(u, (uvs.getX(i) - 0.5) * 2)
        .addScaledVector(v, uvs.getY(i) - 0.5)
        .addScaledVector(normal, 0.04);
      positions.setXYZ(i, p.x, p.y, p.z);
    }
    positions.needsUpdate = true;
    face.geometry.computeBoundingBox();
    face.geometry.computeBoundingSphere();
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d"),
      tex = new T.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = T.SRGBColorSpace;
    face.material = new T.MeshBasicNodeMaterial({
      colorNode: texture(tex).rgb,
      side: T.DoubleSide,
    });
    face.material.userData.prevent = true;
    face.receiveShadow = false;
    const targets = [
      { key: "resume", title: "个人简历", x: 0.27, y: 0.33, color: "#b56067" },
      { key: "portfolio", title: "作品集", x: 0.73, y: 0.33, color: "#797099" },
      { key: "other", title: "其他项目", x: 0.27, y: 0.72, color: "#b78550" },
      { key: "contact", title: "联系方式", x: 0.73, y: 0.72, color: "#668f83" },
    ];
    function paint(hovered) {
      ctx.setTransform(canvas.width / 1200, 0, 0, canvas.height / 1200, 0, 0);
      ctx.fillStyle = "#f8e5bd";
      ctx.fillRect(0, 0, 1200, 1200);
      ctx.strokeStyle = "#a75d48";
      ctx.lineWidth = 18;
      ctx.strokeRect(32, 32, 1136, 1136);
      ctx.fillStyle = "#58354d";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '600 70px "Scene Sans", sans-serif';
      ctx.fillText("从这里出发", 600, 114);
      ctx.strokeStyle = "#b5a074";
      ctx.lineWidth = 17;
      ctx.setLineDash([23, 18]);
      ctx.beginPath();
      ctx.moveTo(325, 400);
      ctx.lineTo(875, 400);
      ctx.lineTo(875, 864);
      ctx.lineTo(325, 864);
      ctx.lineTo(325, 400);
      ctx.stroke();
      ctx.setLineDash([]);
      targets.forEach((t, i) => {
        const x = t.x * 1200,
          y = t.y * 1200,
          active = hovered === t.key,
          lift = active ? -14 : 0;
        ctx.fillStyle = "#ad8f6b";
        ctx.fillRect(x - 220, y - 132, 440, 295);
        ctx.fillStyle = active ? "#fff7e2" : "#f3d9a8";
        ctx.fillRect(x - 220, y - 144 + lift, 440, 295);
        ctx.strokeStyle = t.color;
        ctx.lineWidth = active ? 13 : 6;
        ctx.strokeRect(x - 220, y - 144 + lift, 440, 295);
        ctx.fillStyle = t.color;
        ctx.font = "800 44px Nunito, sans-serif";
        ctx.fillText("0" + (i + 1), x - 166, y - 100 + lift);
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 9;
        ctx.save();
        ctx.translate(x, y - 40 + lift);
        if (t.key === "resume") {
          ctx.beginPath();
          ctx.moveTo(0, -35);
          ctx.lineTo(-82, -55);
          ctx.lineTo(-82, 35);
          ctx.lineTo(0, 55);
          ctx.lineTo(82, 35);
          ctx.lineTo(82, -55);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -35);
          ctx.lineTo(0, 55);
          ctx.stroke();
        } else if (t.key === "portfolio") {
          ctx.strokeRect(-65, -43, 145, 90);
          ctx.strokeRect(-83, -59, 145, 90);
          ctx.beginPath();
          ctx.moveTo(-58, 13);
          ctx.lineTo(-12, -17);
          ctx.lineTo(39, 10);
          ctx.stroke();
        } else if (t.key === "other") {
          ctx.beginPath();
          ctx.roundRect(-90, -45, 180, 90, 27);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-57, 0);
          ctx.lineTo(-23, 0);
          ctx.moveTo(-40, -17);
          ctx.lineTo(-40, 17);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(40, -10, 8, 0, Math.PI * 2);
          ctx.arc(60, 13, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeRect(-85, -50, 170, 100);
          ctx.beginPath();
          ctx.moveTo(-85, -50);
          ctx.lineTo(0, 15);
          ctx.lineTo(85, -50);
          ctx.stroke();
        }
        ctx.restore();
        ctx.font = '600 88px "Scene Sans", sans-serif';
        ctx.fillText(t.title, x, y + 90 + lift);
      });
      ctx.fillStyle = "#795a49";
      ctx.font = '500 40px "Scene Sans", sans-serif';
      ctx.fillText("点击一个地点，即可进入", 600, 1092);
      tex.needsUpdate = true;
    }
    paint();
    function hit(uv) {
      return targets.reduce((best, t) =>
        Math.hypot(t.x - uv.x, t.y - uv.y) <
        Math.hypot(best.x - uv.x, best.y - uv.y)
          ? t
          : best,
      ).key;
    }
    function point(key) {
      const target = targets.find((t) => t.key === key),
        g = face.geometry,
        uvs = g.attributes.uv,
        pos = g.attributes.position;
      const ids =
        g.index?.array || Array.from({ length: pos.count }, (_, i) => i);
      const p = new T.Vector3(target.x, target.y, 0);
      for (let i = 0; i < ids.length; i += 3) {
        const tri = [ids[i], ids[i + 1], ids[i + 2]],
          uv = tri.map((n) => new T.Vector3(uvs.getX(n), uvs.getY(n), 0));
        const b = T.Triangle.getBarycoord(p, ...uv, new T.Vector3());
        if (b && Math.min(b.x, b.y, b.z) >= -0.0001) {
          const v = new T.Vector3();
          tri.forEach((n, k) =>
            v.addScaledVector(
              new T.Vector3().fromBufferAttribute(pos, n),
              [b.x, b.y, b.z][k],
            ),
          );
          return face.localToWorld(v);
        }
      }
      return face.getWorldPosition(new T.Vector3());
    }
    return { root, face, targets, paint, hit, point };
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
    entranceMap,
  };
}
