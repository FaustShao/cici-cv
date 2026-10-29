// The illustrated map is navigation, not another page or a second 3D world.
export function createWorldMap(go) {
  const dialog = document.getElementById("world-map"), trigger = document.getElementById("map-trigger");
  const content = document.getElementById("map-locations");
  const paths = {
    resume: '<path d="M10 44V14l22 5 22-5v30l-22 5z" fill="#fff0cc"/><path d="M32 19v30M15 21l12 3m-12 5 12 3m10-8 12-3m-12 11 12-3" fill="none"/><path d="M6 53h52v6H6z" fill="#a66f56"/>',
    portfolio: '<path d="M11 10h42v42H11z" fill="#b1735c"/><path d="M16 15h32v27H16z" fill="#f3ddab"/><path d="m20 35 10-11 8 7 6-6v14H20z" fill="#83945c"/><path d="m20 52-5 10m30-10 5 10"/>',
    other: '<path d="M9 41V22h45v19z" fill="#c39c6b"/><path d="M15 41v17m32-17v17M13 20h39"/><path d="M27 10v10l-8 15q13 9 25 0l-8-15V10" fill="#8f9e73"/>',
    contact: '<path d="M14 32V14q18-16 36 0v23H14z" fill="#ba6a64"/><path d="M26 37v24m-8 0h17M20 19h24"/><path d="M32 35h27v19H32z" fill="#fff0cc"/><path d="m32 35 13 11 14-11" fill="none"/>',
  };
  const sites = [
    { key: "resume", title: "个人简历", x: 37, y: 42, color: "#ae6d69" },
    { key: "portfolio", title: "作品集", x: 49.5, y: 18, color: "#867398" },
    { key: "other", title: "其他项目", x: 16.6, y: 30.8, color: "#b28a50" },
    { key: "contact", title: "联系方式", x: 84.2, y: 44.9, color: "#698f83" },
  ];
  for (const site of sites) {
    const button = document.createElement("button");
    button.className = "map-location";
    button.dataset.destination = site.key;
    button.style.cssText = `left:${site.x}%;top:${site.y}%;--pin:${site.color}`;
    button.innerHTML = `<svg viewBox="0 0 64 66" aria-hidden="true" fill="none" stroke="#654856" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${paths[site.key]}</svg><span>${site.title}</span>`;
    button.onclick = () => { close(); go(site.key); };
    content.append(button);
  }
  function open() {
    content.querySelectorAll("button").forEach(b => b.setAttribute("aria-current", String(document.body.dataset.place === b.dataset.destination)));
    const you = dialog.querySelector(".map-you");
    you.innerHTML = '<span>◆</span><b>姓名入口' + (document.body.dataset.place === "home" ? ' · 你在这里' : '') + '</b>';
    dialog.showModal();
  }
  function close() { if (dialog.open) dialog.close(); }
  trigger.onclick = open;
  document.getElementById("close-map").onclick = close;
  dialog.addEventListener("click", e => { if (e.target === dialog) close(); });
  window.addEventListener("keydown", e => {
    if (e.code === "KeyM" && !e.ctrlKey && !e.metaKey && !document.getElementById("reader").open && !/input|textarea/i.test(e.target.tagName)) {
      e.preventDefault(); dialog.open ? close() : open();
    }
  });
  return { open, close, dialog, sites };
}
