import * as THREE from 'three';

// Open sheets meet on the same glued hinge. Thickness fans out toward the fore-edge.
export function hingeProfile(x) {
  const t = Math.max(0, Math.min(1, x / .16));
  return t * t * (3 - 2 * t);
}
export const bindingDeform = `
  uniform float uBindingOpen;
  vec3 deformSheet(vec3 p, vec2 uv) {
    float attached = 1.0 - smoothstep(0.0, 0.16, uv.x);
    float openedGap = uStackGap * (1.0 - 0.82 * uBindingOpen);
    p.z += openedGap - uStackGap;
    p.z -= openedGap * uBindingOpen * attached;
    return p;
  }
`;

// Only the three cut edges: no opaque top plate can poke through a flexing printed page.
export function makePaperEdges(side, aspect) {
  const positions = [], uvs = [], indices = [], profile = [];
  function vertex(x, y, z, u, v, fraction) {
    positions.push(x, y, z); uvs.push(u, v); profile.push(fraction); return profile.length - 1;
  }
  for (const y of [-aspect / 2, aspect / 2]) {
    for (let i = 0; i < 32; i++) {
      const a = i / 32, b = (i + 1) / 32;
      const n = vertex(side * a, y, 0, a, 0, -1);
      vertex(side * b, y, 0, b, 0, -1);
      vertex(side * b, y, 1, b, 1, b);
      vertex(side * a, y, 1, a, 1, a);
      indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
  }
  const n = vertex(side, -aspect / 2, 0, 0, 0, -1);
  vertex(side, aspect / 2, 0, 1, 0, -1);
  vertex(side, aspect / 2, 1, 1, 1, 1);
  vertex(side, -aspect / 2, 1, 0, 1, 1);
  indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.userData.profile = profile;
  return geometry;
}
export function fitPaperEdges(geometry, open) {
  if (geometry.userData.fittedOpen === open) return;
  geometry.userData.fittedOpen = open;
  const positions = geometry.attributes.position;
  geometry.userData.profile.forEach((fraction, i) => {
    positions.setZ(i, fraction < 0 ? 0 : 1 - open + open * hingeProfile(fraction));
  });
  positions.needsUpdate = true; geometry.computeVertexNormals();
}
