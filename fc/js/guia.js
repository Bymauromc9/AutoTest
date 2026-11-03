/*!
 * guia.js — guías de teoría y prácticas de FC. Basado en fli/js/ejercicios.js y fli/l1/js/l1.js:
 *   · marca «Hecho» por ejercicio (localStorage, clave del atributo data-storage-key del <body>),
 *     progreso por parte en el índice y botón de reiniciar;
 *   · índice plegable en móvil y resaltado de la parte visible (que se recuerda en data-visto-key,
 *     para mostrarla en la portada de FC);
 *   · resoluciones plegables: abrir/cerrar todas, abrir la enlazada y abrirlas todas al imprimir.
 * Requiere: assets/js/core.js.
 */
(function () {
  var KEY = document.body.getAttribute('data-storage-key') || 'fc-practicas-hechos';
  var done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { done = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} }

  var boxes = Array.prototype.slice.call(document.querySelectorAll('.card.ex input[type=checkbox]'));
  function refresh() {
    var per = {}, tot = {}, all = 0;
    boxes.forEach(function (b) {
      var card = b.closest('.card');
      var t = card.getAttribute('data-tema');
      tot[t] = (tot[t] || 0) + 1;
      card.classList.toggle('is-done', b.checked);
      if (b.checked) { per[t] = (per[t] || 0) + 1; all++; }
    });
    document.querySelectorAll('[data-prog]').forEach(function (el) {
      var t = el.getAttribute('data-prog'), n = per[t] || 0;
      el.textContent = n + '/' + tot[t];
      el.classList.toggle('complete', n === tot[t]);
    });
    var dt = document.getElementById('done-total'); if (dt) dt.textContent = all;
  }
  boxes.forEach(function (b) {
    b.checked = !!done[b.getAttribute('data-key')];
    b.addEventListener('change', function () {
      if (b.checked) done[b.getAttribute('data-key')] = 1; else delete done[b.getAttribute('data-key')];
      save(); refresh();
    });
  });
  refresh();

  var reset = document.getElementById('reset'), armed = false, timer;
  if (reset) reset.addEventListener('click', function () {
    if (!armed) {
      armed = true; reset.classList.add('confirm'); reset.textContent = 'Pulsa otra vez para borrar';
      timer = setTimeout(function () { armed = false; reset.classList.remove('confirm'); reset.textContent = 'Reiniciar progreso'; }, 3000);
      return;
    }
    clearTimeout(timer); armed = false; done = {}; save();
    boxes.forEach(function (b) { b.checked = false; }); refresh();
    reset.classList.remove('confirm'); reset.textContent = 'Progreso borrado';
    setTimeout(function () { reset.textContent = 'Reiniciar progreso'; }, 1800);
  });

  var side = document.getElementById('side'), tog = document.getElementById('toc-toggle');
  tog.addEventListener('click', function () {
    var open = side.classList.toggle('open');
    tog.setAttribute('aria-expanded', open ? 'true' : 'false');
    tog.textContent = open ? 'Cerrar' : 'Índice';
  });
  side.querySelectorAll('.toc a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 900px)').matches) { side.classList.remove('open'); tog.setAttribute('aria-expanded', 'false'); tog.textContent = 'Índice'; }
    });
  });

  // resaltar el tema visible en el índice
  if ('IntersectionObserver' in window) {
    var links = {};
    document.querySelectorAll('.toc-tema, .toc-sols a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          var l = links[en.target.id]; if (l) l.classList.add('active');
        }
      });
    }, { rootMargin: '-30% 0px -65% 0px' });
    document.querySelectorAll('section.tema').forEach(function (s) { io.observe(s); });
  }

  // recordar la última parte vista (la portada de FC la muestra)
  var VISTO = document.body.getAttribute('data-visto-key');
  if (VISTO && 'IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var h = en.target.querySelector('.tema-head h2');
        if (h) window.App.store(VISTO, { id: en.target.id, label: h.textContent });
      });
    }, { rootMargin: '-30% 0px -65% 0px' });
    document.querySelectorAll('section.tema').forEach(function (s) { io2.observe(s); });
  }

  // resoluciones plegables
  var sols = Array.prototype.slice.call(document.querySelectorAll('details.sol'));
  document.querySelectorAll('[data-sol]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('data-sol') === 'open';
      sols.forEach(function (d) { d.open = open; });
    });
  });
  function openTarget() {
    var id = location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    var d = el && (el.matches('details.sol') ? el : el.querySelector && el.querySelector('details.sol'));
    if (d) d.open = true;
  }
  window.addEventListener('hashchange', openTarget);
  openTarget();
  var was = [];
  window.addEventListener('beforeprint', function () { was = sols.map(function (d) { return d.open; }); sols.forEach(function (d) { d.open = true; }); });
  window.addEventListener('afterprint', function () { sols.forEach(function (d, i) { d.open = was[i]; }); });
})();

/* ---------- Apartados estudiados y parte actual en el índice móvil ----------
   · Si el <body> tiene data-estudio-key, cada apartado de la guía (section.topic) lleva un botón
     «Marcar como estudiado»; se guarda en localStorage como { id: 1, …, _total: n } (la portada lo muestra)
     y el índice marca con ✓ los apartados estudiados.
   · En el móvil, junto al nombre del índice fijo se ve la parte que hay en pantalla. */
(function () {
  "use strict";
  var KEY = document.body.getAttribute("data-estudio-key");
  var topics = Array.prototype.slice.call(document.querySelectorAll("section.tema.guide > section.topic[id]"));
  if (KEY && topics.length) {
    var st = window.App.store(KEY) || {};
    st._total = topics.length; window.App.store(KEY, st);
    var sync = function (sec) {
      var on = !!st[sec.id], b = sec.querySelector(":scope > .study");
      sec.classList.toggle("studied", on);
      if (b) { b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? "Estudiado" : "Marcar como estudiado"; }
      var a = document.querySelector('.toc-topics a[href="#' + sec.id + '"]'); if (a) a.classList.toggle("studied", on);
    };
    topics.forEach(function (sec) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "study";
      b.addEventListener("click", function () {
        if (st[sec.id]) delete st[sec.id]; else st[sec.id] = 1;
        st._total = topics.length; window.App.store(KEY, st); sync(sec);
      });
      sec.appendChild(b); sync(sec);
    });
  }
  var brand = document.querySelector(".side-brand");
  if (brand && "IntersectionObserver" in window) {
    var cur = document.createElement("span"); cur.className = "side-cur"; brand.appendChild(cur);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var h = en.target.querySelector(".tema-head h2, .divider h2, h2");
        cur.textContent = h ? "· " + h.textContent.trim() : "";
      });
    }, { rootMargin: "-25% 0px -70% 0px" });
    document.querySelectorAll("section.tema, .divider").forEach(function (s) { io.observe(s); });
  }
})();
