/*!
 * ejercicios.js — páginas de ejercicios con soluciones: marca de «Hecho» por ejercicio (guardada en
 * localStorage con la clave del atributo data-storage-key del <body>), progreso por tema en el índice,
 * botón de reiniciar, índice plegable en móvil y resaltado del tema visible.
 */
(function () {
  var KEY = document.body.getAttribute('data-storage-key') || 'fli-ejercicios-hechos';
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
  reset.addEventListener('click', function () {
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
})();
