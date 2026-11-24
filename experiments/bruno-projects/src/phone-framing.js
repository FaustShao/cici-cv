import { T } from './create-world.js';

// Measure the actual display pieces once. A world-axis bounding box also includes
// empty corners around the rotated signs, which wastes space in portrait.
export function subjectCorners(objects) {
  const points = [];
  for (const root of objects) {
    root.updateWorldMatrix(true, true);
    root.traverseVisible(mesh => {
      if (!mesh.isMesh) return;
      const source = mesh.isInstancedMesh ? mesh : mesh.geometry;
      if (!source.boundingBox) source.computeBoundingBox();
      const { min, max } = source.boundingBox;
      for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
        points.push(new T.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld));
      }
    });
  }
  return points;
}

export function phonePose(base, points, width, height, fov) {
  const forward = new T.Vector3().setFromSphericalCoords(1, base.pitch, base.yaw);
  const right = new T.Vector3(forward.z, 0, -forward.x).normalize();
  const up = new T.Vector3().crossVectors(forward, right);
  const box = new T.Box3();
  const projected = points.map(p => {
    const local = new T.Vector3(p.dot(right), p.dot(up), p.dot(forward));
    box.expandByPoint(local);
    return local;
  });
  const middle = box.getCenter(new T.Vector3());
  const focus = right.clone().multiplyScalar(middle.x).addScaledVector(up, middle.y).addScaledVector(forward, middle.z);
  const slope = Math.tan(T.MathUtils.degToRad(fov / 2));
  const halfWidth = slope * width / height * .87;
  // Leave space above for navigation and below for the map and reading actions.
  const halfHeight = slope * (width > height ? .58 : .68);
  let distance = 1;
  for (const p of projected) {
    const depth = p.z - middle.z;
    distance = Math.max(distance, depth + Math.abs(p.x - middle.x) / halfWidth,
      depth + Math.abs(p.y - middle.y) / halfHeight);
  }
  focus.addScaledVector(up, -distance * slope * .06);
  return { focus, distance, yaw: base.yaw, pitch: base.pitch, fov };
}
