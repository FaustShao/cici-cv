// Camera extrinsics calibrated to the user's landing, contact and resume screenshots.
// Reference content viewport: 1662 x 882 (the browser toolbar is excluded).
// Never replace these angles with a generic category camera or an automatic orbit.
export const referenceViews = {
  home: { position:[58.09041346313593,9.743463509428947,53.84272520004712],yaw:.8231748736701113,pitch:1.2176592998276086,distance:24,fov:25 },
  resume: { position:[30.829777240951337,4.834345283380682,30.848841835538913],yaw:.6686458228292642,pitch:1.2765780126406072,distance:15,fov:36 },
  contact: { position:[52.1178263614629,4.532282986070333,57.4180753050418],yaw:-.09252641051502589,pitch:1.3000239509541858,distance:14,fov:34 },
};
