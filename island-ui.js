(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    reader = $("project-reader");
  const projects = (window.RESUME?.projects || []).filter(
    (p) => p.collection === "portfolio",
  );
  const sideProjects = (window.RESUME?.projects || []).filter(
    (p) => p.collection !== "portfolio",
  );
  const places = {
    resume: [
      "01 / THE RESUME STUDIO",
      "个人简历",
      "点击展开的简历册，认识我。",
    ],
    portfolio: [
      "02 / THE READING PAVILION",
      "作品集",
      "三件作品，三个不同的设计故事。",
    ],
    other: [
      "03 / THE PLAY WORKSHOP",
      "其他项目",
      "点击工作台上的模型，看看这些探索。",
    ],
    contact: [
      "04 / THE LITTLE POST OFFICE",
      "联系方式",
      "邮箱、电话，或者微信。欢迎来聊聊。",
    ],
  };
  const frames = new Map();
  let currentPlace = "home",
    selected = 0,
    activeFrame,
    previousFocus;
  const emit = (name, detail = {}) =>
    window.dispatchEvent(new CustomEvent(`island:${name}`, { detail }));
  const state = (window.ISLAND_STATE = {
    place: "home",
    selected: 0,
    reader: false,
  });
  function setTheme(dark) {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector("meta[name=theme-color]").content = dark
      ? "#142b58"
      : "#23b4df";
    $("island-theme").setAttribute("aria-pressed", String(dark));
    $("island-theme").setAttribute(
      "aria-label",
      dark ? "切换至日间" : "切换至夜晚",
    );
    document.querySelector(".theme-caption").textContent = dark
      ? "夜间"
      : "日间";
    try {
      localStorage.setItem("resume-theme", dark ? "dark" : "light");
    } catch {}
    emit("theme", { dark });
  }
  let saved;
  try {
    saved = localStorage.getItem("resume-theme");
  } catch {}
  setTheme(saved === "dark");
  $("island-theme").onclick = () =>
    setTheme(document.documentElement.dataset.theme !== "dark");
  $("copyright-year").textContent = new Date().getFullYear();
  function selectProject(index) {
    selected = (index + projects.length) % projects.length;
    state.selected = selected;
    $("archive-position").textContent = String(selected + 1).padStart(2, "0");
    emit("select", { index: selected });
  }
  function closeReader() {
    if (!reader.open) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    reader.close();
    state.reader = false;
    try {
      activeFrame.contentDocument
        .querySelectorAll("video,audio")
        .forEach((media) => media.pause());
    } catch {}
    document.body.classList.remove("native-cursor");
    emit("reader", { open: false });
    previousFocus?.focus({ preventScroll: true });
  }
  function openPlace(place, historyMode = "push") {
    if (place !== "home" && !places[place]) return;
    // The accepted exhibition is now the portfolio category, not a test link.
    if (place === "portfolio") {
      location.assign("bruno-preview/");
      return;
    }
    closeReader();
    currentPlace = place;
    state.place = place;
    document.body.dataset.place = place;
    $("back-island").hidden = place === "home";
    $("world-identity").hidden = place !== "home";
    $("station-heading").hidden = place === "home";
    if (places[place])
      ["station-kicker", "station-title", "station-description"].forEach(
        (id, i) => ($(id).textContent = places[place][i]),
      );
    ["archive", "resume", "contact"].forEach(
      (kind) =>
        ($(kind + "-controls").hidden =
          place !== (kind === "archive" ? "portfolio" : kind)),
    );
    $("workshop-note").hidden = true;
    $("contact-feedback").textContent = "";
    if (historyMode !== "none")
      history[historyMode === "replace" ? "replaceState" : "pushState"](
        { place },
        "",
        location.pathname +
          location.search +
          (place === "home" ? "" : `#${place}`),
      );
    emit("place", { place });
    renderFallback();
  }
  function read(url, name) {
    previousFocus = document.activeElement;
    $("reader-title").textContent = name;
    $("reader-direct").href = url;
    $("reader-back").textContent =
      currentPlace === "resume" ? "← 返回简历册" : "← 返回展架";
    frames.forEach((frame) => (frame.hidden = true));
    let frame = frames.get(url);
    if (!frame) {
      frame = document.createElement("iframe");
      frame.title = name;
      frame.src = url;
      frame.allow = "fullscreen";
      frame.addEventListener("load", () => {
        frame.dataset.loaded = "true";
        if (frame === activeFrame) $("reader-loading").hidden = true;
        try {
          const style = frame.contentDocument.createElement("style");
          style.textContent =
            '@font-face{font-family:Island UI;src:url("assets/fonts/fredoka.woff2")}header.topbar,.portfolio-bar,.collection-return{display:none!important}.project-bar{font-family:"Island UI","Noto Sans CJK SC",sans-serif}.project-bar>a{display:none}.project-bar button{font-family:inherit}';
          frame.contentDocument.head.append(style);
          frame.contentDocument.addEventListener("click", (event) => {
            const link = event.target.closest("a");
            if (!link || link.target === "_blank") return;
            const target = new URL(link.href);
            if (target.origin !== location.origin) return;
            const file = target.pathname.split("/").pop(),
              routes = {
                "index.html": "home",
                "portfolio.html": "portfolio",
                "works.html": "other",
                "resume.html": "resume",
              };
            if (routes[file]) {
              event.preventDefault();
              closeReader();
              openPlace(routes[file]);
            }
          });
        } catch {}
      });
      frames.set(url, frame);
      $("reader-frames").append(frame);
    }
    activeFrame = frame;
    frame.hidden = false;
    $("reader-loading").hidden = frame.dataset.loaded === "true";
    state.reader = true;
    document.body.classList.add("native-cursor");
    if (!reader.open) reader.showModal();
    emit("reader", { open: true });
  }
  function showNote(index) {
    const p = sideProjects[index];
    if (!p) return;
    $("note-title").textContent = p.name;
    $("note-description").textContent = p.description;
    $("note-details").replaceChildren(
      ...(p.details || []).map((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        return li;
      }),
    );
    $("workshop-note").hidden = false;
    $("close-note").focus({ preventScroll: true });
  }
  async function copyWechat() {
    try {
      await navigator.clipboard.writeText("Cecilia_cici68");
      $("contact-feedback").textContent = "微信号已复制：Cecilia_cici68";
    } catch {
      $("contact-feedback").textContent =
        "微信号：Cecilia_cici68（请选中复制）";
    }
  }
  function action(type, value) {
    if (type === "place") openPlace(value);
    if (type === "project") {
      selectProject(Number(value));
      read(projects[selected].url, projects[selected].name);
    }
    if (type === "resume") read("resume.html", "王钰欣 / YUXIN WANG · 简历");
    if (type === "note") showNote(Number(value));
    if (type === "prev") selectProject(selected - 1);
    if (type === "next") selectProject(selected + 1);
    if (type === "email") location.href = "mailto:wangyuxinqd2025@163.com";
    if (type === "phone") location.href = "tel:15066290491";
    if (type === "wechat") copyWechat();
  }
  window.openIslandPlace = openPlace;
  window.islandAction = action;
  document.querySelectorAll("a[data-place]").forEach((link) =>
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openPlace(link.dataset.place);
    }),
  );
  $("back-island").onclick = () => openPlace("home");
  $("reset-view").onclick = () => emit("reset");
  $("archive-prev").onclick = () => selectProject(selected - 1);
  $("archive-next").onclick = () => selectProject(selected + 1);
  $("read-resume").onclick = () => action("resume");
  $("copy-wechat").onclick = copyWechat;
  $("close-note").onclick = () => {
    $("workshop-note").hidden = true;
  };
  $("reader-back").onclick = closeReader;
  reader.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeReader();
  });
  $("browser-fullscreen").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await reader.requestFullscreen();
    } catch {
      $("browser-fullscreen").textContent = "请独立打开 ↗";
    }
  };
  window.addEventListener("keydown", (event) => {
    if (
      reader.open ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target.matches("input,textarea,[contenteditable]")
    )
      return;
    if (event.key === "Escape") {
      if (!$("workshop-note").hidden) $("workshop-note").hidden = true;
      else if (currentPlace !== "home") openPlace("home");
    }
    if (
      currentPlace === "portfolio" &&
      ["ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
      selectProject(selected + (event.key === "ArrowRight" ? 1 : -1));
    }
    if (event.key.toLowerCase() === "r") emit("reset");
  });
  function renderFallback() {
    const content = $("fallback-content");
    content.hidden =
      !document.body.classList.contains("fallback-mode") ||
      currentPlace === "home";
    if (content.hidden) return;
    content.replaceChildren();
    const button = (text, click) => {
      const b = document.createElement("button");
      b.textContent = text;
      b.onclick = click;
      content.append(b);
      return b;
    };
    if (currentPlace === "portfolio")
      projects.forEach((p, i) => {
        const b = button(p.name, () => action("project", i)),
          img = document.createElement("img");
        img.src = p.cover;
        img.alt = "";
        b.prepend(img);
      });
    if (currentPlace === "resume") {
      const p = document.createElement("p");
      p.textContent = window.RESUME.summary;
      content.append(p);
      button("王钰欣 / YUXIN WANG · 完整简历", () => action("resume"));
    }
    if (currentPlace === "other")
      sideProjects.forEach((p, i) => button(p.name, () => showNote(i)));
    if (currentPlace === "contact") {
      const nav = document.createElement("nav");
      [
        ["wangyuxinqd2025@163.com", "mailto:wangyuxinqd2025@163.com"],
        ["15066290491", "tel:15066290491"],
      ].forEach(([text, url]) => {
        const a = document.createElement("a");
        a.textContent = text;
        a.href = url;
        nav.append(a);
      });
      content.append(nav);
      button("微信：Cecilia_cici68", copyWechat);
    }
  }
  window.addEventListener(
    "error",
    (event) => {
      if (event.target?.src?.includes("island-scene.js")) {
        document.body.classList.add("fallback-mode");
        $("scene-status").textContent = "简洁模式 · 点击建筑卡片进入";
        renderFallback();
      }
    },
    true,
  );
  window.addEventListener("island:fallback", renderFallback);
  window.addEventListener("popstate", () =>
    openPlace(
      places[location.hash.slice(1)] ? location.hash.slice(1) : "home",
      "none",
    ),
  );
  selectProject(0);
  openPlace(
    places[location.hash.slice(1)] ? location.hash.slice(1) : "home",
    "none",
  );
})();
