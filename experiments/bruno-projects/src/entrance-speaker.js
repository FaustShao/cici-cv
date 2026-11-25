import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { color, uniform } from "three/tsl";
import { T } from "./create-world.js";
import { MeshDefaultMaterial } from "./bruno/Materials/MeshDefaultMaterial.js";

// A small enamel volume marker mounted on the right side of the cabinet.
function mountVolumeMarker(cabinet) {
  const marker = new T.Group();
  marker.name = "speaker-volume-marker";
  marker.position.set(.228, .225, -.037);
  cabinet.add(marker);
  const enamel = new MeshDefaultMaterial({ colorNode: color("#54394b"), hasWater: false });
  const ivory = new T.MeshBasicNodeMaterial({ colorNode: color("#fff1ce") });
  const honey = new T.MeshBasicNodeMaterial({ colorNode: color("#ffcd69") });

  const bracket = new T.Mesh(new T.BoxGeometry(.09, .022, .021), enamel);
  bracket.position.set(-.055, 0, -.005);
  const plate = new T.Mesh(new T.CylinderGeometry(.073, .073, .021, 12), enamel);
  plate.rotation.x = Math.PI / 2;
  marker.add(bracket, plate);

  const shape = new T.Shape();
  shape.moveTo(-.050, -.013);
  shape.lineTo(-.034, -.013);
  shape.lineTo(-.009, -.035);
  shape.lineTo(-.009, .035);
  shape.lineTo(-.034, .013);
  shape.lineTo(-.050, .013);
  shape.closePath();
  const horn = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: .005, bevelEnabled: false }), ivory);
  horn.position.z = .011;
  const wave = new T.Mesh(new T.TorusGeometry(.036, .006, 6, 12, Math.PI * .64), honey);
  wave.rotation.z = -Math.PI * .32;
  wave.position.set(-.008, 0, .017);
  const mute = new T.Group();
  for (const angle of [-Math.PI / 4, Math.PI / 4]) {
    const stroke = new T.Mesh(new T.BoxGeometry(.049, .010, .006), ivory);
    stroke.position.set(.023, 0, .016);
    stroke.rotation.z = angle;
    mute.add(stroke);
  }
  wave.visible = false;
  marker.add(horn, wave, mute);
  marker.updateWorldMatrix(true, true);
  return playing => {
    wave.visible = playing;
    mute.visible = !playing;
  };
}

export async function createEntranceSpeaker(world, fixtures, playback) {
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
  // The kiosk reserves a rectangular area around its pitched roof. The cabinet
  // stands clear of its actual supports, in line with the right end of the bench.
  fixtures.parcel(root, 42.68, 35.62, 4.35, {
    plaza: true, precise: true, hull: true, radius: 0, groundClearance: 0,
    ignoreReservations: ["enlarged-native-map-kiosk"],
  });
  const showVolume = mountVolumeMarker(root);

  playback.setIndicator(playing => {
    showVolume(playing);
    light.value.set(playing ? "#ffd772" : "#443d38");
  });
  return { root, toggle: playback.toggle };
}
