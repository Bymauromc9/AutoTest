/*!
 * reportes.js — «Reportar un error» (botón con data-reportar de la barra superior; lo pone core.js).
 *
 * Abre un diálogo donde el usuario cuenta qué está mal. Con el mensaje se envía dónde estaba, para que el
 * administrador lo encuentre sin preguntar: la página (con el ancla del apartado visible), el título y un
 * contexto corto, que es (por orden) el texto que tenga seleccionado, la pregunta del test que esté en
 * pantalla o el apartado que esté leyendo. Se guarda en Firestore (reportes/<id>) y se revisa en el
 * panel de administración. Sólo con cuenta: las reglas exigen sesión y que la cuenta no esté bloqueada.
 * Requiere: assets/js/core.js y assets/js/cuentas.js.
 */
(function () {
  "use strict";
  if (!window.App || window.Reportes) return;
  const { esc, ROOT } = window.App;
  const MAX = { pagina: 300, titulo: 200, contexto: 600, texto: 1500 };
  const corta = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  /** Lo que el usuario estaba viendo al pulsar el botón. */
  function capturar() {
    const sel = String(window.getSelection ? window.getSelection() : "").trim();
    let contexto = "", ancla = "";
    // La pregunta del test que hay en pantalla.
    const q = Array.from(document.querySelectorAll(".qcard .qtext, .qcard .q")).find((el) => {
      const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight;
    });
    // El apartado que hay en el centro de la pantalla (guías, ejercicios, chuletas…).
    const centro = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const sec = centro && centro.closest && centro.closest("section.topic[id], .card[id], section.tema[id], section[id], article[id]");
    if (sec) {
      ancla = sec.id;
      const h = sec.querySelector("h2, h3, .card-title, .card-num");
      if (h) contexto = "Apartado: " + corta(h.textContent, 160);
    }
    if (q) contexto = "Pregunta: " + corta(q.textContent, 400);
    if (sel) contexto = "Texto seleccionado: «" + corta(sel, 400) + "»" + (contexto ? " · " + contexto : "");
    let pagina = location.href.indexOf(ROOT) === 0 ? location.href.slice(ROOT.length) : location.pathname + location.hash;
    if (ancla && !location.hash) pagina += "#" + ancla;
    return { pagina: corta(pagina, MAX.pagina), titulo: corta(document.title, MAX.titulo), contexto: corta(contexto, MAX.contexto) };
  }

  let dlg = null;
  function abrir() {
    const C = window.Cuentas, ses = C && C.actual();
    if (!C || !ses || ses.local) return;
    const ctx = capturar();
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "rep-dlg";
      dlg.setAttribute("aria-labelledby", "rep-t");
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = `<form method="dialog" class="rep-form" novalidate>
      <h2 id="rep-t">Reportar un error</h2>
      <p class="rep-sub">¿Algo mal en una pregunta, una solución o una explicación? Cuéntalo y lo revisamos.</p>
      <div class="rep-ctx"><b>Se enviará con</b>
        <span>${esc(ctx.titulo)}</span>
        ${ctx.contexto ? `<span>${esc(ctx.contexto)}</span>` : ""}
      </div>
      <label class="rep-field" for="rep-txt">Qué está mal
        <textarea id="rep-txt" rows="5" maxlength="${MAX.texto}" required placeholder="Por ejemplo: en la pregunta 3 la respuesta correcta debería ser la B porque…"></textarea>
        <small class="rep-count" aria-live="polite">0 / ${MAX.texto}</small>
      </label>
      <p class="rep-err" role="alert" hidden></p>
      <div class="rep-acts">
        <button type="button" class="rep-btn ghost" value="cancelar">Cancelar</button>
        <button type="submit" class="rep-btn" value="enviar">Enviar</button>
      </div>
    </form>`;
    const form = dlg.querySelector("form"), txt = dlg.querySelector("#rep-txt"), err = dlg.querySelector(".rep-err"), cnt = dlg.querySelector(".rep-count");
    txt.addEventListener("input", () => { cnt.textContent = txt.value.length + " / " + MAX.texto; });
    dlg.querySelector('[value="cancelar"]').onclick = () => dlg.close();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const texto = txt.value.trim();
      if (texto.length < 5) { err.textContent = "Escribe un poco más: qué está mal y, si puedes, cuál sería lo correcto."; err.hidden = false; txt.focus(); return; }
      err.hidden = true;
      form.querySelectorAll("button, textarea").forEach((x) => { x.disabled = true; });
      try {
        await enviar(ses, ctx, texto);
        dlg.close();
        C.toast("Gracias por avisar", "Tu reporte ha llegado: lo revisaremos lo antes posible.");
      } catch (ex) {
        err.textContent = ex.status === 403 ? "No se ha podido enviar: tu cuenta no puede mandar reportes ahora mismo." : (ex.message || "No se ha podido enviar. Prueba en un momento.");
        err.hidden = false;
        form.querySelectorAll("button, textarea").forEach((x) => { x.disabled = false; });
      }
    });
    dlg.showModal();
    txt.focus();
  }

  async function enviar(ses, ctx, texto) {
    const D = window.Cuentas.datos, s = await D.sesion();
    const v = D.valor;
    await D.escribir([{
      update: { name: D.ruta("reportes/" + D.nuevoId()), fields: {
        uid: v(s.uid), nombre: v(ses.nombre), pagina: v(ctx.pagina), titulo: v(ctx.titulo), contexto: v(ctx.contexto),
        texto: v(texto.slice(0, MAX.texto)), estado: v("abierto") } },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: "creado", setToServerValue: "REQUEST_TIME" }]
    }]);
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-reportar]");
    if (b) { e.preventDefault(); abrir(); }
  });
  window.Reportes = Object.freeze({ abrir });
})();
