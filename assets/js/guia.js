/*!
 * guia.js — comportamiento común de las guías con índice lateral (FC, IP y L1 de FLI).
 *   · «Hecho» por ejercicio (localStorage, clave data-storage-key del <body>), progreso por parte en el
 *     índice y botón de reiniciar;
 *   · índice plegable en el móvil, parte visible resaltada y recordada en data-visto-key (la portada de
 *     la asignatura la muestra);
 *   · resoluciones plegables: abrir/cerrar todas, abrir la enlazada y abrirlas todas al imprimir;
 *   · «Marcar como estudiado» en cada apartado si el <body> tiene data-estudio-key;
 *   · ayudas visuales: pestaña con el número de cada tema, mapa del tema (apartados, lo estudiado y el
 *     tiempo de lectura), duración de cada «Más a fondo» y leyenda de la guía.
 * Requiere: assets/js/core.js (App.store).
 */
(function () {
  "use strict";
  const body = document.body;
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const store = (k, v) => (window.App && window.App.store ? window.App.store(k, v) : null);
  const mobile = () => window.matchMedia("(max-width: 900px)").matches;
  const subject = body.getAttribute("data-subject") || "guia";

  /* ---------- Ejercicios: «Hecho», progreso por parte y reinicio ---------- */
  const KEY = body.getAttribute("data-storage-key") || subject + "-practicas-hechos";
  let done = store(KEY) || {};
  const boxes = $$(".card.ex input[type=checkbox]");
  function refreshDone() {
    const per = {}, tot = {};
    let all = 0;
    boxes.forEach((b) => {
      const card = b.closest(".card"), t = card.getAttribute("data-tema");
      tot[t] = (tot[t] || 0) + 1;
      card.classList.toggle("is-done", b.checked);
      if (b.checked) { per[t] = (per[t] || 0) + 1; all++; }
    });
    $$("[data-prog]").forEach((el) => {
      const t = el.getAttribute("data-prog"), n = per[t] || 0;
      el.textContent = n + "/" + tot[t];
      el.classList.toggle("complete", n === tot[t]);
    });
    const dt = document.getElementById("done-total"); if (dt) dt.textContent = all;
  }
  if (boxes.length) {
    boxes.forEach((b) => {
      b.checked = !!done[b.getAttribute("data-key")];
      b.addEventListener("change", () => {
        if (b.checked) done[b.getAttribute("data-key")] = 1; else delete done[b.getAttribute("data-key")];
        store(KEY, done); refreshDone();
      });
    });
    refreshDone();
  }
  const reset = document.getElementById("reset");
  if (reset) {
    let armed = false, timer;
    reset.addEventListener("click", () => {
      if (!armed) {
        armed = true; reset.classList.add("confirm"); reset.textContent = "Pulsa otra vez para borrar";
        timer = setTimeout(() => { armed = false; reset.classList.remove("confirm"); reset.textContent = "Reiniciar progreso"; }, 3000);
        return;
      }
      clearTimeout(timer); armed = false; done = {}; store(KEY, done);
      boxes.forEach((b) => { b.checked = false; }); refreshDone();
      reset.classList.remove("confirm"); reset.textContent = "Progreso borrado";
      setTimeout(() => { reset.textContent = "Reiniciar progreso"; }, 1800);
    });
  }

  /* ---------- Índice: plegable en el móvil y parte visible resaltada ---------- */
  const side = document.getElementById("side"), tog = document.getElementById("toc-toggle");
  function closeToc() { side.classList.remove("open"); tog.setAttribute("aria-expanded", "false"); tog.textContent = "Índice"; }
  if (side && tog) {
    tog.addEventListener("click", () => {
      const open = side.classList.toggle("open");
      tog.setAttribute("aria-expanded", open ? "true" : "false");
      tog.textContent = open ? "Cerrar" : "Índice";
    });
    $$(".toc a", side).forEach((a) => a.addEventListener("click", () => { if (mobile()) closeToc(); }));
  }
  const temas = $$("section.tema");
  const VISTO = body.getAttribute("data-visto-key");
  const brand = document.querySelector(".side-brand");
  let cur = null;
  if (brand) { cur = document.createElement("span"); cur.className = "side-cur"; brand.appendChild(cur); }
  if ("IntersectionObserver" in window) {
    const links = {};
    $$(".toc-tema, .toc-sols a").forEach((a) => { links[a.getAttribute("href").slice(1)] = a; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach((k) => links[k].classList.remove("active"));
        const l = links[en.target.id]; if (l) l.classList.add("active");
        const h = en.target.querySelector(".tema-head h2, .divider h2, h2");
        if (cur) cur.textContent = h ? "· " + h.textContent.trim() : "";
        if (VISTO && en.target.matches("section.tema")) {
          const th = en.target.querySelector(".tema-head h2");
          if (th) store(VISTO, { id: en.target.id, label: th.textContent });
        }
      });
    }, { rootMargin: "-30% 0px -65% 0px" });
    temas.concat($$(".divider")).forEach((s) => io.observe(s));
  }

  /* ---------- Plegables: resoluciones y «Más a fondo» ---------- */
  const sols = $$("details.sol");
  $$("[data-sol]").forEach((b) => b.addEventListener("click", () => {
    const open = b.getAttribute("data-sol") === "open";
    sols.forEach((d) => { d.open = open; });
  }));
  // Abre el plegable que contiene (o es) el destino del enlace, para que se vea lo enlazado.
  function openTarget() {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id && document.getElementById(id);
    if (!el) return;
    const inner = el.matches("details") ? el : el.querySelector("details.sol");
    if (inner) inner.open = true;
    for (let d = el.parentElement && el.parentElement.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) d.open = true;
  }
  window.addEventListener("hashchange", openTarget);
  openTarget();
  // Al imprimir se abren todos y después se dejan como estaban.
  let was = [];
  window.addEventListener("beforeprint", () => { const all = $$("main details"); was = all.map((d) => [d, d.open]); all.forEach((d) => { d.open = true; }); });
  window.addEventListener("afterprint", () => { was.forEach(([d, o]) => { d.open = o; }); });

  /* ---------- Ayudas visuales ---------- */
  const WPM = 180;   // palabras por minuto leyendo texto técnico con atención
  const words = (el) => (el.textContent.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/g) || []).length;
  // Palabras de un bloque sin contar lo plegado («Más a fondo» y resoluciones).
  function coreWords(el) {
    let n = words(el);
    $$("details.deep, details.sol", el).forEach((d) => { n -= words(d); });
    return Math.max(0, n);
  }
  const minutes = (n) => Math.max(1, Math.round(n / WPM));

  // Duración de cada «Más a fondo» en su cabecera.
  $$("details.deep > summary").forEach((s) => {
    const meta = document.createElement("span");
    meta.className = "deep-meta";
    meta.textContent = "≈ " + minutes(words(s.parentElement) - words(s)) + " min";
    s.appendChild(meta);
  });

  // Pestaña con el número de cada tema (el mismo que en el índice).
  temas.forEach((t) => {
    const head = t.querySelector(":scope > .tema-head");
    const tn = t.id && document.querySelector('.toc-tema[href="#' + t.id + '"] .tn');
    if (!head || !tn || !tn.textContent.trim()) return;
    const tab = document.createElement("span");
    tab.className = "tema-tab"; tab.setAttribute("aria-hidden", "true");
    tab.textContent = tn.textContent.trim();
    head.insertBefore(tab, head.firstChild);
  });

  // Mapa de cada tema: sus apartados de un vistazo, lo estudiado y cuánto se tarda en leerlo.
  const ESTUDIO = body.getAttribute("data-estudio-key");
  const maps = [];
  temas.filter((t) => t.classList.contains("guide")).forEach((t) => {
    const head = t.querySelector(":scope > .tema-head");
    const topics = $$(":scope > section.topic[id]", t);
    if (!head || topics.length < 2) return;
    const nav = document.createElement("nav");
    nav.className = "tema-map";
    const h2 = head.querySelector("h2");
    nav.setAttribute("aria-label", "Apartados" + (h2 ? " de «" + h2.textContent.trim() + "»" : ""));
    const ol = document.createElement("ol");
    topics.forEach((sec) => {
      const h3 = sec.querySelector(":scope > h3"); if (!h3) return;
      const num = h3.querySelector(".tnum");
      const title = Array.prototype.filter.call(h3.childNodes, (n) => n !== num && !(n.classList && n.classList.contains("tag"))).map((n) => n.textContent).join("").trim();
      const li = document.createElement("li"), a = document.createElement("a");
      a.href = "#" + sec.id;
      if (num) { const mn = document.createElement("span"); mn.className = "mn"; mn.textContent = num.textContent.trim(); a.appendChild(mn); }
      a.appendChild(document.createTextNode(title));
      li.appendChild(a); ol.appendChild(li);
    });
    nav.appendChild(ol);
    const meta = document.createElement("p");
    meta.className = "tema-meta";
    // Tiempo de lectura sólo donde se lee (no en los temas de herramientas interactivas).
    if (!t.querySelector(".tool")) {
      const read = document.createElement("span");
      read.textContent = topics.length + " apartados · ≈ " + minutes(coreWords(t)) + " min de lectura" + (t.querySelector("details.deep") ? " (sin «Más a fondo»)" : "");
      meta.appendChild(read);
    }
    let bar = null, count = null;
    if (ESTUDIO) {
      bar = document.createElement("span"); bar.className = "tema-bar"; bar.setAttribute("aria-hidden", "true");
      bar.appendChild(document.createElement("i"));
      count = document.createElement("span");
      meta.appendChild(bar); meta.appendChild(count);
    }
    if (meta.childNodes.length) nav.appendChild(meta);
    head.appendChild(nav);
    maps.push({ topics, links: $$("a", ol), bar, count });
  });

  // Leyenda: qué significa cada marca de la guía (sólo en guías con apartados de teoría).
  const lead = document.querySelector(".hero .lead");
  if (lead && temas.some((t) => t.classList.contains("guide"))) {
    const kinds = [];
    if (document.querySelector(".prose p > b, .prose li > b")) kinds.push(["hl", "Subrayado: concepto clave"]);
    if (document.querySelector(".box.warn")) kinds.push(["warn", "Ojo: trampas y errores típicos"]);
    if (document.querySelector(".box.tip")) kinds.push(["tip", "Ejemplo resuelto o truco"]);
    if (document.querySelector("details.deep")) kinds.push(["deep", "Más a fondo (plegado: ábrelo si lo necesitas)"]);
    if (kinds.length > 1) {
      const ul = document.createElement("ul");
      ul.className = "legend"; ul.setAttribute("aria-label", "Cómo leer esta guía");
      kinds.forEach(([k, txt]) => {
        const li = document.createElement("li");
        if (k === "hl") {
          const s = document.createElement("span"); s.className = "lg-hl"; s.textContent = "Subrayado"; li.appendChild(s);
          li.appendChild(document.createTextNode(txt.slice("Subrayado".length)));
        } else {
          const i = document.createElement("span"); i.className = "lg-ic"; i.style.setProperty("--ic", "var(--ic-" + k + ")");
          i.style.color = k === "warn" ? "var(--warn)" : k === "tip" ? "var(--true)" : "var(--accent)";
          li.appendChild(i); li.appendChild(document.createTextNode(txt));
        }
        ul.appendChild(li);
      });
      lead.insertAdjacentElement("afterend", ul);
    }
  }

  /* ---------- Apartados estudiados ----------
     Si el <body> tiene data-estudio-key, cada apartado de la guía lleva «Marcar como estudiado»; se guarda
     como { id: 1, …, _total: n } (la portada lo muestra) y se refleja en el índice y en el mapa del tema. */
  const studyTopics = $$("section.tema.guide > section.topic[id]");
  if (ESTUDIO && studyTopics.length) {
    const st = store(ESTUDIO) || {};
    st._total = studyTopics.length; store(ESTUDIO, st);
    const refreshMaps = () => maps.forEach((m) => {
      let n = 0;
      m.topics.forEach((sec, i) => { const on = !!st[sec.id]; if (on) n++; if (m.links[i]) m.links[i].classList.toggle("studied", on); });
      if (m.bar) m.bar.firstChild.style.setProperty("--p", Math.round(100 * n / m.topics.length) + "%");
      if (m.count) m.count.textContent = n + " de " + m.topics.length + " estudiados";
    });
    const sync = (sec) => {
      const on = !!st[sec.id], b = sec.querySelector(":scope > .study");
      sec.classList.toggle("studied", on);
      if (b) { b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? "Estudiado" : "Marcar como estudiado"; }
      const a = document.querySelector('.toc-topics a[href="#' + sec.id + '"]'); if (a) a.classList.toggle("studied", on);
    };
    studyTopics.forEach((sec) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "study";
      b.addEventListener("click", () => {
        if (st[sec.id]) delete st[sec.id]; else st[sec.id] = 1;
        st._total = studyTopics.length; store(ESTUDIO, st); sync(sec); refreshMaps();
      });
      sec.appendChild(b); sync(sec);
    });
    refreshMaps();
  }
})();
