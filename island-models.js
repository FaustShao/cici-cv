import * as T from "./assets/vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./assets/vendor/RoundedBoxGeometry.js";
import { TextGeometry } from "./assets/vendor/TextGeometry.js";

// Everything in this world is geometry. Textures are local typography and actual
// project artwork, not a flattened render of the island.
export function buildWorld(scene, font) {
  const C = {
    red: 0xf04a36,
    blue: 0x3155d9,
    yellow: 0xffcf32,
    cream: 0xfff1d1,
    white: 0xfffbeb,
    green: 0x62b638,
    leaf: 0x309254,
    wood: 0xc28a50,
    stone: 0x8b918a,
    ink: 0x24415a,
    sea: 0x24b4db,
  };
  const materials = new Map(),
    geometries = new Map(),
    pickables = [],
    interactions = [],
    lamps = [],
    books = [],
    animated = [];
  const mat = (color) => {
    if (!materials.has(color))
      materials.set(
        color,
        new T.MeshStandardMaterial({ color, roughness: 0.77 }),
      );
    return materials.get(color);
  };
  const group = (parent, x = 0, y = 0, z = 0) => {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  function solid(parent, geometry, color, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(p, x, y, z, w, h, d, color, r = 0.05) {
    const key = [w, h, d, r].join("/");
    if (!geometries.has(key))
      geometries.set(
        key,
        r
          ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3))
          : new T.BoxGeometry(w, h, d),
      );
    return solid(p, geometries.get(key), color, x, y, z);
  }
  function sphere(p, x, y, z, r, color, detail = 0) {
    const key = `ball/${r}/${detail}`;
    if (!geometries.has(key))
      geometries.set(key, new T.IcosahedronGeometry(r, detail));
    return solid(p, geometries.get(key), color, x, y, z);
  }
  function cylinder(p, x, y, z, rt, rb, h, color, sides = 12) {
    return solid(p, new T.CylinderGeometry(rt, rb, h, sides), color, x, y, z);
  }
  function rod(p, a, b, r, color) {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b);
    const m = cylinder(
      p,
      ...start.clone().add(end).multiplyScalar(0.5).toArray(),
      r,
      r,
      start.distanceTo(end),
      color,
      8,
    );
    m.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
    return m;
  }
  function texture(draw, w = 1024, h = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext("2d"), w, h);
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  function graphic(p, tex, x, y, z, w, h) {
    const m = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: T.DoubleSide,
      }),
    );
    m.position.set(x, y, z);
    p.add(m);
    return m;
  }
  function plaque(
    p,
    text,
    x,
    y,
    z,
    w = 2,
    h = 0.5,
    bg = C.blue,
    fg = "#fff7df",
  ) {
    box(p, x, y, z, w, h, 0.13, bg, 0.06);
    const tex = texture(
      (ctx, W, H) => {
        ctx.fillStyle = fg;
        ctx.font = `650 ${Math.min(180, 820 / text.length)}px Fredoka, "Island Sans", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, W / 2, H * 0.53, W * 0.91);
      },
      1024,
      256,
    );
    return graphic(p, tex, x, y, z + 0.075, w * 0.94, h * 0.94);
  }
  function lettering(p, text, x, y, z, size, color, depth = 0.12) {
    if (!font) return plaque(p, text, x, y, z, size * text.length * 0.55, size);
    const geo = new TextGeometry(text, {
      font,
      size,
      depth,
      curveSegments: 4,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 2,
    });
    geo.computeBoundingBox();
    geo.translate(-(geo.boundingBox.max.x + geo.boundingBox.min.x) / 2, 0, 0);
    const m = solid(p, geo, color, x, y, z);
    m.material = [mat(C.cream), mat(color)];
    return m;
  }
  function interactive(root, type, value, label, place, anchor) {
    const data = {
      root,
      type,
      value,
      label,
      place,
      anchor: anchor || new T.Vector3(0, 1, 0),
    };
    root.traverse((object) => {
      if (object.isMesh) {
        object.userData.action = data;
        pickables.push(object);
      }
    });
    interactions.push(data);
    return data;
  }
  const land = group(scene),
    shape = new T.Shape();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2,
      bump = 1 + 0.05 * Math.sin(a * 3) + 0.025 * Math.cos(a * 7),
      x = Math.cos(a) * 10.2 * bump,
      z = Math.sin(a) * 7.7 * bump;
    if (!i) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  function terrain(shape, y, depth, color) {
    const geo = new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.2,
      bevelThickness: 0.15,
      bevelSegments: 2,
      steps: 1,
    });
    const m = solid(land, geo, color, 0, y, 0);
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  const baseTerrain = terrain(shape, -0.95, 0.85, 0xd6ac71),
    grassTerrain = terrain(shape, -0.04, 0.18, C.green);
  const terrace = box(land, 1.2, 0.75, -3.4, 11.3, 1.4, 5.7, 0x96988c, 0.65),
    terraceGrass = box(land, 1.2, 1.49, -3.4, 11, 0.2, 5.4, C.green, 0.5);
  // A second small rock shelf gives the back of the island a different skyline.
  const cliff = cylinder(land, -6.3, 0.55, -3.4, 2.7, 3, 1.3, 0x90978a, 9),
    cliffGrass = cylinder(land, -6.3, 1.25, -3.4, 2.65, 2.65, 0.16, C.green, 9);
  const water = solid(scene, new T.PlaneGeometry(180, 180), C.sea, 0, -1.25, 0);
  water.rotation.x = -Math.PI / 2;
  water.castShadow = false;
  water.material = new T.MeshBasicMaterial({ color: C.sea, toneMapped: false });
  const waterShadow = new T.Mesh(
    new T.PlaneGeometry(180, 180),
    new T.ShadowMaterial({ opacity: 0.14 }),
  );
  waterShadow.rotation.x = -Math.PI / 2;
  waterShadow.position.y = -1.244;
  waterShadow.receiveShadow = true;
  scene.add(waterShadow);
  const waveGeometry = new T.BufferGeometry(),
    wavePoints = [];
  for (let i = 0; i < 190; i++) {
    const x = Math.sin(i * 34.71) * 27,
      z = Math.cos(i * 63.12) * 24;
    if (Math.hypot(x / 10, z / 7) < 1.12) continue;
    const len = 0.12 + (i % 5) * 0.08;
    wavePoints.push(x, -1.21, z, x + len, -1.21, z + 0.03);
  }
  waveGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(wavePoints, 3),
  );
  const waves = new T.LineSegments(
    waveGeometry,
    new T.LineBasicMaterial({
      color: 0xc3f2fa,
      transparent: true,
      opacity: 0.4,
    }),
  );
  scene.add(waves);
  const desktopPaths = group(land);
  function path(points, width = 0.8, parent = desktopPaths) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        length = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const m = box(
        parent,
        (a[0] + b[0]) / 2,
        (a[1] + b[1]) / 2,
        (a[2] + b[2]) / 2,
        width,
        0.1,
        length + 0.3,
        0xf5d9a1,
        0.04,
      );
      m.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]);
    }
  }
  path(
    [
      [-5, 0.23, 3.4],
      [-1.4, 0.23, 3.4],
      [0.5, 0.23, 1],
      [6, 0.23, 1],
      [6, 0.23, 2.8],
    ],
    1,
  );
  path(
    [
      [-1.4, 0.23, 3.4],
      [-1.4, 0.23, 0.5],
    ],
    1,
  );
  for (let i = 0; i < 6; i++)
    box(
      desktopPaths,
      -1.4,
      0.3 + i * 0.22,
      0.35 - i * 0.42,
      1.5,
      0.22 + i * 0.44,
      0.46,
      C.cream,
      0.02,
    );
  path(
    [
      [-1.4, 1.62, -2.1],
      [2.6, 1.62, -2.1],
    ],
    1,
  );
  const places = {},
    stationTargets = {};
  function place(name, x, y, z) {
    const g = group(land, x, y, z);
    places[name] = g;
    return g;
  }
  function windowPanel(p, x, y, z, w = 0.65, h = 0.9) {
    box(p, x, y, z, w + 0.1, h + 0.1, 0.12, C.cream);
    const glass = box(p, x, y, z + 0.075, w, h, 0.04, 0x61bfc8);
    glass.material = new T.MeshStandardMaterial({
      color: 0x60bdca,
      emissive: 0xffb85a,
      emissiveIntensity: 0,
    });
    lamps.push(glass);
    box(p, x, y, z + 0.11, 0.035, h, 0.025, C.cream);
  }
  function plant(p, x, y, z, s = 1) {
    const g = group(p, x, y, z);
    g.scale.setScalar(s);
    cylinder(g, 0, 0.2, 0, 0.25, 0.18, 0.4, C.red, 10);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4;
      const leaf = sphere(
        g,
        Math.sin(a) * 0.2,
        0.65 + Math.cos(i) * 0.1,
        Math.cos(a) * 0.2,
        0.24,
        i % 2 ? C.green : C.leaf,
      );
      leaf.scale.set(0.55, 1.8, 0.75);
      leaf.rotation.z = Math.sin(a) * 0.6;
    }
    return g;
  }
  function bookshelf(p, x, y, z) {
    box(p, x, y, z, 1.2, 1.4, 0.4, C.wood);
    for (let i = 0; i < 6; i++)
      box(
        p,
        x - 0.45 + i * 0.18,
        y + 0.15,
        z + 0.24,
        0.12,
        0.8 - (i % 3) * 0.13,
        0.17,
        [C.red, C.yellow, C.blue, C.cream][i % 4],
      );
    box(p, x, y - 0.35, z + 0.24, 1.2, 0.09, 0.5, C.cream);
  }
  function desk(p, x, y, z, w = 2) {
    box(p, x, y, z, w, 0.16, 0.85, C.wood);
    for (const dx of [-w * 0.4, w * 0.4])
      for (const dz of [-0.3, 0.3])
        box(p, x + dx, y - 0.55, z + dz, 0.1, 1, 0.1, C.blue);
  }
  function book(p, x, y, z, w, h, d, color) {
    const g = group(p, x, y, z);
    box(g, 0, 0, 0, w, h, d, color, 0.04);
    box(g, 0.02, 0.01, d / 2 + 0.012, w - 0.1, h - 0.1, 0.025, C.cream, 0.01);
    return g;
  }
  // CV studio: a curved, open-front red architectural shell, not a generic house.
  const cv = place("resume", -4.7, 0.23, 1.5);
  cylinder(cv, 0, 0.12, 0, 3, 3, 0.24, C.cream, 40);
  box(cv, -2.05, 1.68, -0.4, 0.4, 3.25, 3.1, C.red, 0.18);
  box(cv, 1.9, 1.05, -0.8, 0.35, 2.05, 2.3, C.red, 0.17);
  box(cv, -0.1, 1.48, -1.75, 4.2, 2.9, 0.3, C.red, 0.14);
  const awning = box(cv, -0.2, 3.1, -0.65, 4.5, 0.22, 2.7, C.cream, 0.15);
  awning.rotation.z = -0.03;
  plaque(cv, "个人简历", -1.8, 2.5, 1.22, 1.6, 0.6, C.red);
  windowPanel(cv, -0.9, 1.5, -1.53, 1.5, 1.35);
  bookshelf(cv, 1, 1.2, -1.35);
  desk(cv, -0.6, 0.9, -0.9, 1.9);
  plant(cv, -2.15, 0.2, 1.25, 0.9);
  plant(cv, 2.2, 0.2, 0.7, 0.8);
  const resumeBook = group(cv, 0.35, 0.52, 1.35);
  resumeBook.rotation.x = -0.12;
  resumeBook.rotation.y = -0.1;
  const resumeTexture = texture(
    (ctx, W, H) => {
      ctx.fillStyle = "#fff9e8";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#244165";
      ctx.font = "650 65px Fredoka";
      ctx.fillText("HELLO,", 60, 115);
      ctx.fillText("I’M CECILIA", 60, 190);
      ctx.fillStyle = "#f04a36";
      ctx.font = '750 50px "Island Sans",sans-serif';
      ctx.fillText("王钰欣", 60, 285);
      ctx.fillStyle = "#244165";
      ctx.font = "500 23px Fredoka";
      ctx.fillText("YUXIN WANG", 60, 330);
      ctx.font = '500 22px "Island Sans",sans-serif';
      ctx.fillText("工业设计 × 交互设计", 60, 385);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i === 0 ? "#f4bb36" : "#bdc9c2";
        ctx.fillRect(60, 440 + i * 35, i % 2 ? 270 : 340, 9);
      }
      ctx.fillStyle = "#3155d9";
      ctx.font = '600 24px "Island Sans",sans-serif';
      ctx.fillText("点击，翻开完整简历 ↗", 60, 660);
    },
    512,
    740,
  );
  for (const side of [-1, 1]) {
    const page = group(resumeBook, side * 0.77, 1.35, 0);
    page.rotation.y = side * -0.14;
    box(page, 0, 0, 0, 1.52, 2.7, 0.17, C.red);
    box(page, 0, 0, 0.11, 1.43, 2.58, 0.12, C.cream);
    if (side === 1) graphic(page, resumeTexture, 0, 0, 0.18, 1.4, 2.55);
    else {
      plaque(page, "Cecilia", 0, 0.65, 0.19, 1.18, 0.4, C.cream, "#3155d9");
      for (let i = 0; i < 4; i++)
        box(
          page,
          -0.05,
          -0.15 - i * 0.23,
          0.19,
          0.95 - (i % 2) * 0.2,
          0.055,
          0.02,
          i ? 0xc0cbbb : C.yellow,
          0.01,
        );
      sphere(page, 0, 0.05, 0.2, 0.32, C.red).scale.set(1, 1, 0.15);
    }
  }
  cylinder(resumeBook, 0, 1.35, 0, 0.08, 0.08, 2.8, C.yellow);
  interactive(
    resumeBook,
    "resume",
    null,
    "翻开完整简历",
    "resume",
    new T.Vector3(0, 1.5, 0),
  );
  stationTargets.resume = {
    look: new T.Vector3(-4.5, 1.9, 2.6),
    yaw: 0.08,
    pitch: 0.35,
    width: 7.8,
  };
  // The reading pavilion: open sides, curved yellow sail roof, blue structural legs.
  const gallery = place("portfolio", 2.6, 1.66, -3.2);
  box(gallery, 0, 0.08, 0, 6.8, 0.24, 4.2, C.cream, 0.15);
  for (const x of [-3.1, 3.1])
    for (const z of [-1.6, 1.6])
      cylinder(gallery, x, 1.85, z, 0.12, 0.12, 3.6, C.blue);
  const canopy = group(gallery);
  const roofGeo = new T.PlaneGeometry(7.15, 4.75, 18, 8);
  const rp = roofGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i);
    rp.setZ(i, 0.27 * Math.cos(x * 0.8) + 0.12 * Math.sin(rp.getY(i)));
  }
  roofGeo.computeVertexNormals();
  const roof = solid(canopy, roofGeo, C.yellow, 0, 3.72, 0);
  roof.rotation.x = -Math.PI / 2;
  roof.material = new T.MeshStandardMaterial({
    color: C.yellow,
    side: T.DoubleSide,
    roughness: 0.8,
  });
  box(canopy, 0, 3.25, 1.66, 6.5, 0.65, 0.18, C.blue, 0.08);
  plaque(canopy, "作品集", 0, 3.29, 1.78, 2.2, 0.55, C.blue);
  plant(gallery, -3.25, 0.2, 1.4, 1);
  plant(gallery, 3.25, 0.2, -1, 1);
  bookshelf(gallery, -2.35, 1.05, -1.3);
  const rack = group(gallery, 0, 0.26, 0.42);
  box(rack, 0, 0.23, 0, 5.7, 0.45, 1.1, C.blue, 0.14);
  box(rack, 0, 0.51, -0.25, 5.3, 0.18, 0.75, C.yellow, 0.06);
  for (const x of [-2.65, 2.65]) {
    box(rack, x, 1.25, -0.12, 0.22, 2.2, 0.8, C.red, 0.1);
    cylinder(rack, x, 2.25, -0.12, 0.4, 0.4, 0.2, C.red, 24).rotation.z =
      Math.PI / 2;
  }
  const axle = cylinder(rack, 0, 1.7, 0, 0.055, 0.055, 5.7, 0xd6d6c0, 12);
  axle.rotation.z = Math.PI / 2;
  const covers = [
    {
      title: ["TIDE", "LINE."],
      sub: "海藻茶循环交互系统",
      color: "#fff0cf",
      ink: "#d43e2b",
      image: "assets/tideline/HOME/Background.png",
    },
    {
      title: ["FUTURE", "GAZETTE", "2050"],
      sub: "地方文化 × 数字体验",
      color: "#fff3bd",
      ink: "#244164",
      image: "assets/gazette/page-01-small.webp",
    },
    {
      title: ["DREAM", "SENTINEL"],
      sub: "梦境哨兵 / 智能穿戴",
      color: "#d8edeb",
      ink: "#274fc4",
      image: "assets/dream-sentinel/3.3/4.1.322%201.png",
    },
  ];
  covers.forEach((data, index) => {
    const page = group(rack, (index - 1) * 1.72, 1.9, 0.45);
    page.rotation.x = -0.13;
    const width = 1.55,
      height = 2.28;
    box(
      page,
      0,
      0,
      0,
      width + 0.09,
      height + 0.09,
      0.2,
      [C.red, C.yellow, C.blue][index],
      0.06,
    );
    box(page, 0, 0, 0.115, width, height, 0.08, C.cream, 0.025);
    for (let n = 0; n < 3; n++)
      box(
        page,
        width / 2 - 0.015,
        -0.02 + n * 0.015,
        0.015 - n * 0.045,
        0.035,
        height - 0.1,
        0.025,
        0xd1c4a0,
        0.005,
      );
    const tex = texture(
      (ctx, W, H) => paintCover(ctx, W, H, data, index),
      768,
      1080,
    );
    const cover = graphic(page, tex, 0, 0, 0.162, width - 0.06, height - 0.06);
    const image = new Image();
    image.onload = () => {
      paintCover(tex.image.getContext("2d"), 768, 1080, data, index, image);
      tex.needsUpdate = true;
      window.dispatchEvent(new CustomEvent("island:art-ready"));
    };
    image.src = data.image;
    page.userData.index = index;
    page.userData.baseY = 1.9;
    books.push(page);
    interactive(
      page,
      "project",
      index,
      ["打开 Tideline 海藻茶", "打开 Future Gazette", "打开 DREAM SENTINEL"][
        index
      ],
      "portfolio",
      new T.Vector3(0, 0, 0.2),
    );
  });
  function paintCover(ctx, W, H, data, index, image) {
    ctx.fillStyle = data.color;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = data.ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(25, 25, W - 50, H - 50);
    ctx.fillStyle = data.ink;
    ctx.font = "500 21px Fredoka";
    ctx.fillText(`0${index + 1} / SELECTED WORK`, 56, 75);
    ctx.font = "650 94px Fredoka";
    data.title.forEach((line, i) => ctx.fillText(line, 52, 195 + i * 96));
    const top = index === 1 ? 420 : 345;
    if (image) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(52, top, W - 104, 440, index === 0 ? 95 : 14);
      ctx.clip();
      if (index === 2) {
        ctx.fillStyle = "#f4f6e7";
        ctx.fillRect(52, top, W - 104, 440);
        const scale = Math.min((W - 105) / image.width, 430 / image.height);
        ctx.drawImage(
          image,
          (W - image.width * scale) / 2,
          top + (440 - image.height * scale) / 2,
          image.width * scale,
          image.height * scale,
        );
      } else {
        const scale = Math.max((W - 104) / image.width, 440 / image.height);
        ctx.drawImage(
          image,
          (W - image.width * scale) / 2,
          top + (440 - image.height * scale) / 2,
          image.width * scale,
          image.height * scale,
        );
      }
      ctx.restore();
    } else {
      ctx.fillStyle =
        index === 0 ? "#719452" : index === 1 ? "#3155d9" : "#a5c5ce";
      ctx.beginPath();
      ctx.arc(W / 2, top + 210, 150, 0, Math.PI * 2);
      ctx.fill();
    }
    if (index === 0) {
      ctx.strokeStyle = "#e04d30";
      ctx.lineWidth = 7;
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.moveTo(585, 820);
        ctx.quadraticCurveTo(430 + j * 35, 650, 555 + j * 18, 390);
        ctx.stroke();
      }
    }
    ctx.fillStyle = data.ink;
    ctx.font = '600 31px "Island Sans",sans-serif';
    ctx.fillText(data.sub, 52, 970);
    ctx.font = "500 24px Fredoka";
    ctx.fillText("CLICK TO OPEN", 52, 1020);
    ctx.font = "500 48px Fredoka";
    ctx.fillText("↗", W - 100, 1020);
  }
  stationTargets.portfolio = {
    look: new T.Vector3(2.6, 3.55, -2.6),
    yaw: 0.035,
    pitch: 0.18,
    width: 8.4,
  };
  // Workshop with a workbench and two actual clickable project objects.
  const lab = place("other", 0.45, 0.25, 2.2);
  box(lab, 0, 0.1, 0, 4.4, 0.22, 3.4, C.cream, 0.15);
  box(lab, 0, 1.15, -1.35, 4.2, 2.1, 0.25, C.blue, 0.12);
  box(lab, 1.95, 1, -0.5, 0.25, 1.9, 1.5, C.blue, 0.1);
  box(lab, 0, 2.3, -0.6, 4.6, 0.18, 2.4, C.cream, 0.1);
  plaque(lab, "其他项目", 0, 2.05, 0.68, 2.2, 0.55, C.blue);
  desk(lab, 0, 1.05, 0.45, 3.2);
  bookshelf(lab, -1.4, 0.9, -1.15);
  plant(lab, 1.9, 0.3, 0.9, 0.8);
  const game = group(lab, 0.8, 1.4, 0.65);
  box(game, 0, 0.2, 0, 1.1, 0.8, 0.2, C.yellow, 0.2);
  box(game, 0, 0.28, 0.13, 0.55, 0.35, 0.06, C.blue, 0.05);
  box(game, -0.3, -0.02, 0.13, 0.22, 0.06, 0.04, C.ink, 0.02);
  box(game, -0.3, -0.02, 0.13, 0.06, 0.22, 0.04, C.ink, 0.02);
  sphere(game, 0.3, 0, 0.15, 0.07, C.red);
  sphere(game, 0.42, 0.13, 0.15, 0.07, C.blue);
  game.rotation.x = -0.15;
  interactive(
    game,
    "note",
    1,
    "Cardinal 独立游戏设计",
    "other",
    new T.Vector3(0, 0.3, 0),
  );
  const workbook = book(lab, -0.9, 1.6, 0.6, 1.1, 0.95, 0.2, C.red);
  workbook.rotation.z = -0.15;
  plaque(workbook, "TASA / ICoD", 0, 0.05, 0.135, 1, 0.3, C.cream, "#3155d9");
  interactive(
    workbook,
    "note",
    0,
    "TASA-ICoD 国际设计工作坊",
    "other",
    new T.Vector3(0, 0.3, 0),
  );
  // A controller sculpture on the workshop roof extends the model vocabulary.
  const pad = group(lab, 0.15, 2.7, -0.25);
  box(pad, 0, 0, 0, 1.65, 0.65, 0.45, C.cream, 0.2);
  box(pad, -0.45, 0, 0.24, 0.34, 0.1, 0.05, C.blue);
  box(pad, -0.45, 0, 0.24, 0.1, 0.34, 0.05, C.blue);
  sphere(pad, 0.4, 0.1, 0.25, 0.09, C.red);
  sphere(pad, 0.55, -0.08, 0.25, 0.09, C.blue);
  pad.rotation.z = -0.1;
  stationTargets.other = {
    look: new T.Vector3(0.4, 1.5, 2.7),
    yaw: 0.13,
    pitch: 0.27,
    width: 7,
  };
  // Post office: canopy, pier and physical letter/contact panels.
  const post = place("contact", 6, 0.25, 1.1);
  box(post, 0, 0.1, 0, 3.7, 0.24, 3.6, C.wood, 0.12);
  box(post, 0, 1.25, -0.4, 2.8, 2.3, 1.8, C.yellow, 0.12);
  box(post, 0, 2.5, 0.1, 3.4, 0.23, 2.7, C.red, 0.1);
  plaque(post, "联系方式", 0, 2.2, 1.38, 2.6, 0.55, C.red);
  for (const x of [-1.4, 1.4])
    rod(post, [x, 0.2, 1.2], [x, 2.3, 1.2], 0.07, C.red);
  const envelope = group(post, 0, 3, -0.3);
  box(envelope, 0, 0, 0, 1.7, 1.1, 0.15, C.cream, 0.07);
  rod(envelope, [-0.78, 0.45, 0.09], [0, -0.08, 0.09], 0.025, C.red);
  rod(envelope, [0, -0.08, 0.09], [0.78, 0.45, 0.09], 0.025, C.red);
  envelope.rotation.z = -0.12;
  const contactRows = [
    ["EMAIL", "wangyuxinqd2025@163.com", "email"],
    ["PHONE", "15066290491", "phone"],
    ["WECHAT", "Cecilia_cici68", "wechat"],
  ];
  contactRows.forEach(([label, text, type], i) => {
    const g = group(post, 0, 1.65 - i * 0.49, 1.1);
    box(g, 0, 0, 0, 2.4, 0.43, 0.15, C.cream, 0.04);
    const tex = texture(
      (ctx, W, H) => {
        ctx.fillStyle = "#3155d9";
        ctx.font = "600 24px Fredoka";
        ctx.fillText(label, 40, 43);
        ctx.fillStyle = "#24415a";
        ctx.font = `500 ${type === "email" ? 35 : 45}px Fredoka`;
        ctx.fillText(text, 40, 107);
      },
      1024,
      144,
    );
    graphic(g, tex, 0, 0, 0.09, 2.3, 0.4);
    interactive(
      g,
      type,
      null,
      type === "email"
        ? "写邮件 ↗"
        : type === "phone"
          ? "拨打电话 ↗"
          : "复制微信号",
      "contact",
      new T.Vector3(),
    );
  });
  for (let i = 0; i < 7; i++)
    box(post, 0, -0.07, 1.8 + i * 0.28, 3.4, 0.13, 0.23, C.wood, 0.025);
  for (const x of [-1.5, 1.5])
    for (let i = 0; i < 3; i++) {
      cylinder(post, x, -0.65, 1.6 + i * 0.7, 0.1, 0.12, 1.7, C.wood, 8);
      sphere(post, x, 0.25, 1.6 + i * 0.7, 0.13, C.cream);
    }
  stationTargets.contact = {
    look: new T.Vector3(6, 1.75, 2.3),
    yaw: 0.035,
    pitch: 0.24,
    width: 6.2,
  };
  // Identity is an actual extruded 3D sign mounted on the waterfront dock.
  const dock = group(land, -3.7, 0.25, 5.4);
  for (let i = 0; i < 10; i++)
    box(dock, -2.55 + i * 0.56, 0, 0, 0.51, 0.18, 1.5, C.wood, 0.02);
  for (const x of [-2.6, 2.6])
    cylinder(dock, x, -0.65, 0.45, 0.12, 0.15, 1.65, C.wood, 8);
  box(dock, 0, 0.2, -0.1, 5.5, 0.28, 0.6, C.cream, 0.06);
  lettering(dock, "Cecilia", 0, 0.65, -0.07, 1.15, C.red, 0.19);
  const identityPlaque = group(dock, 0, 0.4, 0.85);
  identityPlaque.rotation.x = -0.5;
  plaque(
    identityPlaque,
    "王钰欣 / YUXIN WANG",
    0,
    0,
    0,
    5.1,
    0.65,
    C.cream,
    "#24415a",
  );
  // Rocks form the coast; plants and trees are deliberately clustered, not a grid.
  for (let i = 0; i < 42; i++) {
    const a = (i / 42) * Math.PI * 2,
      rx = Math.cos(a) * (10 + 0.25 * Math.sin(a * 3)),
      rz = Math.sin(a) * 7.4;
    const rock = sphere(
      land,
      rx,
      -0.25,
      rz,
      0.45 + (i % 4) * 0.12,
      i % 3 ? C.stone : 0xb3b7a4,
    );
    rock.scale.set(1.15, 0.8, 1);
    rock.rotation.set(i * 0.3, i * 0.6, 0);
  }
  function tree(x, y, z, s = 1) {
    const g = group(land, x, y, z);
    g.scale.setScalar(s);
    cylinder(g, 0, 0.75, 0, 0.13, 0.2, 1.5, C.wood, 7);
    rod(g, [0, 0.8, 0], [0.48, 1.55, 0.1], 0.08, C.wood);
    for (let i = 0; i < 4; i++) {
      const crown = sphere(
        g,
        Math.sin(i * 2.3) * 0.42,
        1.8 + Math.cos(i) * 0.3,
        Math.cos(i * 2.3) * 0.3,
        0.72,
        i % 2 ? C.leaf : C.green,
        1,
      );
      crown.scale.y = 0.87;
    }
    animated.push(g);
  }
  [
    [-8, 0.2, 1.5, 1.1],
    [-8, 1.35, -3, 1.1],
    [-6.2, 1.35, -5, 0.9],
    [-3.6, 0.25, -5.5, 1],
    [-0.5, 1.7, -5.3, 0.8],
    [5.7, 1.7, -5, 0.9],
    [7.7, 0.2, -1.9, 0.8],
    [8.3, 0.2, 3.5, 0.65],
    [-7.5, 0.2, 3.6, 0.7],
  ].forEach((p) => tree(...p));
  [
    [-7, 1.35, -4.6],
    [-5.4, 0.2, 4],
    [-2.4, 0.2, 2.7],
    [4.1, 0.2, 1.2],
    [7.7, 0.2, 0],
    [-3, 1.7, -3.1],
    [5.7, 1.7, -2],
  ].forEach(([x, y, z]) => plant(land, x, y, z, 0.8));
  for (let i = 0; i < 12; i++) {
    const x = -8.5 + i * 1.4,
      z = -5.7 + 0.4 * Math.sin(i * 4);
    const y = x < -4 ? 1.35 : 1.7;
    const bush = sphere(land, x, y + 0.3, z, 0.38, i % 3 ? C.green : C.yellow);
    bush.scale.set(1, 0.75, 1);
  }
  // Little lighthouse is a decorative landmark, not another destination.
  const lighthouse = group(land, -5.8, 1.4, -4.4);
  cylinder(lighthouse, 0, 1, 0, 0.35, 0.5, 2, C.cream);
  cylinder(lighthouse, 0, 2.05, 0, 0.48, 0.48, 0.18, C.red);
  cylinder(lighthouse, 0, 2.35, 0, 0.3, 0.3, 0.5, C.blue);
  solid(lighthouse, new T.ConeGeometry(0.55, 0.35, 12), C.red, 0, 2.77, 0);
  for (const [x, y, z] of [
    [-2.5, 0.3, 3.8],
    [0.2, 1.7, -1.5],
    [5.2, 0.3, 1.9],
    [-4.7, 1.4, -2.7],
  ]) {
    cylinder(land, x, y + 0.8, z, 0.045, 0.045, 1.6, C.blue, 8);
    const light = sphere(land, x, y + 1.7, z, 0.19, C.cream, 1);
    light.material = new T.MeshStandardMaterial({
      color: 0xffedaf,
      emissive: 0xffbd55,
      emissiveIntensity: 0,
    });
    lamps.push(light);
  }
  // Physical building hit areas are only active in the full-island view.
  Object.entries(places).forEach(([name, g]) => {
    interactive(
      g,
      "place",
      name,
      {
        resume: "个人简历 · 从这里认识我",
        portfolio: "作品集 · 翻开三件作品",
        other: "其他项目 · 进入工作台",
        contact: "联系方式 · 来聊聊",
      }[name],
      "home",
      new T.Vector3(0, 1.8, 0),
    );
  });
  // Restore the more-specific child actions overwritten by building traversal.
  interactions
    .filter((data) => data.place !== "home")
    .forEach((data) =>
      data.root.traverse((object) => {
        if (object.isMesh) object.userData.detailAction = data;
      }),
    );
  const portraitPaths = group(land);
  path(
    [
      [-2.6, 0.23, 3],
      [0.2, 0.23, 3],
      [3.2, 0.23, 4.6],
    ],
    0.85,
    portraitPaths,
  );
  path(
    [
      [0.2, 0.23, 3],
      [0.2, 0.23, -1],
    ],
    0.85,
    portraitPaths,
  );
  for (let i = 0; i < 6; i++)
    box(
      portraitPaths,
      0.2,
      0.3 + i * 0.22,
      -1 - i * 0.4,
      1.2,
      0.22 + i * 0.44,
      0.44,
      C.cream,
      0.02,
    );
  const warmLights = [];
  Object.values(places).forEach((g) => {
    const light = new T.PointLight(0xffbd65, 0, 5, 2);
    light.position.set(0, 1.8, 1);
    g.add(light);
    warmLights.push(light);
  });
  const originals = land.children.map((object) => ({
    object,
    position: object.position.clone(),
    scale: object.scale.clone(),
  }));
  const api = {
    C,
    mat,
    places,
    stationTargets,
    pickables,
    interactions,
    lamps,
    books,
    animated,
    water,
    waves,
    land,
    canopy,
    warmLights,
    portrait: null,
  };
  const structures = new Set([
    baseTerrain,
    grassTerrain,
    terrace,
    terraceGrass,
    cliff,
    cliffGrass,
  ]);
  api.focus = (name) => {
    land.children.forEach((object) => {
      object.visible =
        name === "home" || structures.has(object) || places[name] === object;
    });
    if (name === "home") {
      desktopPaths.visible = !api.portrait;
      portraitPaths.visible = api.portrait;
    }
    canopy.position.y = name === "portfolio" ? (api.portrait ? 1.9 : 1.3) : 0;
  };
  api.setLayout = (portrait) => {
    if (api.portrait === portrait) return false;
    api.portrait = portrait;
    const exceptions = new Set([
      baseTerrain,
      grassTerrain,
      terrace,
      terraceGrass,
      cliff,
      cliffGrass,
      dock,
      desktopPaths,
      portraitPaths,
      ...Object.values(places),
    ]);
    originals.forEach(({ object, position, scale }) => {
      object.position.copy(position);
      object.scale.copy(scale);
      if (portrait && !exceptions.has(object)) {
        object.position.x *= 0.62;
        object.position.z *= 1.36;
      }
    });
    [baseTerrain, grassTerrain].forEach((object) =>
      object.scale.set(portrait ? 0.62 : 1, portrait ? 1.36 : 1, 1),
    );
    desktopPaths.visible = !portrait;
    portraitPaths.visible = portrait;
    if (portrait) {
      terrace.position.set(0, 0.75, -5.1);
      terrace.scale.x = 0.82;
      terraceGrass.position.set(0, 1.49, -5.1);
      terraceGrass.scale.x = 0.82;
      [cliff, cliffGrass].forEach((object) => {
        object.position.x = -3.8;
        object.position.z = -5.4;
        object.scale.x = 0.8;
        object.scale.z = 0.8;
      });
      cv.position.set(-2.6, 0.23, 0.9);
      gallery.position.set(0.5, 1.66, -5.4);
      lab.position.set(2.7, 0.25, 1.3);
      post.position.set(3.2, 0.25, 5.9);
      dock.position.set(-2.1, 0.25, 7.5);
    }
    const offsets = {
      resume: [0.2, 1.67, 1.1],
      portfolio: [0, 1.89, 0.6],
      other: [-0.05, 1.25, 0.5],
      contact: [0, 1.5, 1.2],
    };
    Object.entries(places).forEach(([name, g]) =>
      stationTargets[name].look
        .copy(g.position)
        .add(new T.Vector3(...offsets[name])),
    );
    return true;
  };
  return api;
}
