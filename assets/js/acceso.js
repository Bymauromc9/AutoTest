/*!
 * acceso.js — página cuenta.html: elegir una cuenta de este dispositivo, entrar, crear una cuenta o
 * (si el servidor no tiene cuentas) crear un perfil local. Con sesión, muestra «Tu cuenta».
 *   ?volver=<url>     a dónde ir después de entrar (lo pone core.js al pedir que entres)
 *   ?cambiar=1        elegir otra cuenta aunque ya haya una activa
 *   ?entrar=<nombre>  abre «Entrar» con ese usuario escrito
 */
(function () {
  "use strict";
  const { esc, icon, ROOT } = window.App;
  const C = window.Cuentas;
  const box = document.getElementById("acceso");
  if (!box || !C) return;
  const q = new URLSearchParams(location.search);
  const volver = (() => { const v = q.get("volver"); return v && v.indexOf(ROOT) === 0 && !/cuenta\.html/.test(v) ? v : ROOT + "index.html"; })();
  const fmt = C.fmt;
  let modo = q.get("entrar") ? "entrar" : null;           // entrar | crear (se decide al pintar)

  const titulo = (t, sub) => { document.getElementById("titulo").textContent = t; if (sub != null) document.getElementById("subtitulo").textContent = sub; };
  const av = (c, cls) => `<span class="cta-av${c.local ? " cta-av--local" : ""}${cls ? " " + cls : ""}" aria-hidden="true">${esc((c.nombre || "?").charAt(0).toUpperCase())}</span>`;
  const err = (form, msg) => { const p = form.querySelector(".cta-err"); p.textContent = msg; p.hidden = !msg; };
  const ocupado = (form, on) => form.querySelectorAll("button, input").forEach((x) => { x.disabled = on; });
  const ir = () => location.assign(volver);

  /* ---------------- Con sesión: «Tu cuenta» ---------------- */
  async function pintarYo(ses) {
    titulo("Tu cuenta", "");
    const d = await C.yo();
    box.innerHTML = `<section class="cta-card">
      <div class="cta-me">${av(ses, "cta-av--lg")}<div><h2>${esc(ses.nombre)}${ses.local ? '<span class="cta-tag">local</span>' : ""}</h2>
        <span class="muted">${ses.local ? "Perfil sólo de este navegador: no aparece en el ranking." : "Tu progreso se guarda en tu cuenta y te sigue a cualquier dispositivo."}</span></div></div>
      <div class="cta-stats">
        <div><b>${fmt(d.puntos)}</b><span>puntos</span></div>
        <div><b>${fmt(d.tests)}</b><span>tests hechos</span></div>
        <div><b>${d.posicion ? "#" + d.posicion : "—"}</b><span>en el ranking</span></div>
      </div>
      <div class="cta-actions">
        <a class="btn" href="${ROOT}index.html">${icon("home")}Mis asignaturas</a>
        <a class="btn ghost" href="${ROOT}ranking.html">${icon("trophy")}Ver el ranking</a>
      </div>
      <div class="cta-actions">
        <a class="btn ghost" href="?cambiar=1">${icon("swapuser")}Cambiar de cuenta</a>
        <button type="button" class="btn danger" id="salir">${icon("logout")}Cerrar sesión</button>
      </div>
    </section>`;
    document.getElementById("salir").onclick = async (e) => {
      e.currentTarget.disabled = true;
      await C.salir();
      location.replace(ROOT + "cuenta.html");
    };
  }

  /* ---------------- Sin sesión (o cambiando): elegir, entrar o crear ---------------- */
  async function pintarAcceso() {
    const online = await C.servidor();
    const ses = C.actual();
    const cuentas = C.lista().filter((c) => c.local || c.token || online);
    const suelto = C.progresoSuelto();
    if (!modo) modo = cuentas.length ? "entrar" : "crear";
    titulo(ses ? "Cambiar de cuenta" : cuentas.length ? "¿Quién eres?" : "Crea tu cuenta",
      cuentas.length ? "Elige tu cuenta, entra con otra o crea una nueva." : "Cada uno con su cuenta: tu progreso se guarda en ella y tus tests suman puntos en el ranking.");

    const lista = cuentas.length ? `<section class="cta-card"><h2>Cuentas en este dispositivo</h2><ul class="cta-list">${cuentas.map((c) => `
      <li class="cta-item" data-id="${esc(c.id)}">
        <div class="cta-item__row">
          <button type="button" class="cta-item__pick">${av(c)}<span class="cta-item__who"><b>${esc(c.nombre)}${c.local ? '<span class="cta-tag">local</span>' : ""}${ses && ses.id === c.id ? '<span class="cta-tag">activa</span>' : ""}</b>
            <small>${fmt(c.puntos)} puntos${c.local ? "" : c.token ? "" : " · pide contraseña"}</small></span></button>
          ${ses && ses.id === c.id ? "" : `<button type="button" class="cta-item__x" title="Quitar de este dispositivo" aria-label="Quitar ${esc(c.nombre)} de este dispositivo">×</button>`}
        </div>
        <form class="cta-item__pass" hidden><input type="password" autocomplete="current-password" placeholder="Contraseña de ${esc(c.nombre)}" aria-label="Contraseña de ${esc(c.nombre)}" required><button class="btn" type="submit">Entrar</button><p class="cta-err" hidden></p></form>
      </li>`).join("")}</ul></section>` : "";

    const adoptar = suelto ? `<label class="cta-check"><input type="checkbox" name="adoptar" checked><span>Guardar en esta cuenta el progreso que ya tienes en este navegador (notas, ejercicios hechos…).</span></label>` : "";
    let formas;
    if (online) {
      formas = `<section class="cta-card">
        <div class="cta-seg" role="group" aria-label="Entrar o crear cuenta">
          <button type="button" data-m="entrar" aria-pressed="${modo === "entrar"}">Entrar</button>
          <button type="button" data-m="crear" aria-pressed="${modo === "crear"}">Crear cuenta</button>
        </div>
        <form class="cta-form" id="f-entrar"${modo === "entrar" ? "" : " hidden"}>
          <label class="cta-field">Usuario<input type="text" name="nombre" autocomplete="username" autocapitalize="none" spellcheck="false" required value="${esc(q.get("entrar") || "")}"></label>
          <label class="cta-field">Contraseña<input type="password" name="pass" autocomplete="current-password" required></label>
          <p class="cta-err" hidden></p>
          <button class="btn" type="submit">Entrar</button>
        </form>
        <form class="cta-form" id="f-crear"${modo === "crear" ? "" : " hidden"}>
          <label class="cta-field">Usuario <small>Es el nombre que verán los demás en el ranking. De 3 a 20 letras o números, sin espacios.</small>
            <input type="text" name="nombre" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="20" required></label>
          <label class="cta-field">Contraseña <small>Al menos 6 caracteres.</small><input type="password" name="pass" autocomplete="new-password" minlength="6" required></label>
          <label class="cta-field">Repite la contraseña<input type="password" name="pass2" autocomplete="new-password" minlength="6" required></label>
          ${adoptar}
          <p class="cta-err" hidden></p>
          <button class="btn" type="submit">Crear cuenta y entrar</button>
        </form>
      </section>`;
    } else {
      formas = `<section class="cta-card">
        <p class="callout warn">${location.protocol === "file:" ? "Has abierto la web desde un archivo, así que no hay conexión con el servidor de cuentas." : "El servidor de cuentas no está disponible ahora mismo."}
          Puedes crear un <b>perfil local</b>: guarda tu progreso sólo en este navegador y no entra en el ranking.</p>
        <form class="cta-form" id="f-local">
          <label class="cta-field">Tu nombre<input type="text" name="nombre" autocapitalize="none" spellcheck="false" minlength="3" maxlength="20" required></label>
          ${adoptar}
          <p class="cta-err" hidden></p>
          <button class="btn" type="submit">Crear perfil y entrar</button>
        </form>
      </section>`;
    }
    const atras = ses ? `<a class="btn ghost" href="${ROOT}cuenta.html">Volver a ${esc(ses.nombre)}</a>` : "";
    box.innerHTML = `<div class="wrap" style="gap:16px">${lista}${cuentas.length ? '<div class="cta-or">o</div>' : ""}${formas}${atras}</div>`;

    /* Cuentas recordadas */
    box.querySelectorAll(".cta-item").forEach((li) => {
      const id = li.dataset.id, pass = li.querySelector(".cta-item__pass");
      li.querySelector(".cta-item__pick").onclick = async () => {
        if (ses && ses.id === id) return ir();
        try { await C.elegir(id); ir(); }
        catch (e) {
          if (e.status === 401) { pass.hidden = false; pass.querySelector("input").focus(); }
          else C.toast("No se ha podido entrar", e.message);
        }
      };
      const x = li.querySelector(".cta-item__x");
      if (x) x.onclick = () => {
        const c = C.lista().find((y) => y.id === id);
        if (c && c.local && !confirmar(`Quitar el perfil local «${c.nombre}» borra su progreso de este navegador. ¿Seguir?`)) return;
        C.olvidar(id); pintarAcceso();
      };
      pass.onsubmit = async (ev) => {
        ev.preventDefault();
        const c = C.lista().find((y) => y.id === id);
        ocupado(pass, true); err(pass, "");
        try { await C.entrar(c.nombre, pass.querySelector("input").value); ir(); }
        catch (e) { ocupado(pass, false); err(pass, e.message); }
      };
    });

    /* Entrar / crear */
    box.querySelectorAll(".cta-seg button").forEach((b) => b.onclick = () => { modo = b.dataset.m; pintarAcceso().then(() => { const f = document.querySelector(modo === "entrar" ? "#f-entrar" : "#f-crear"); if (f) f.querySelector("input").focus(); }); });
    const fe = document.getElementById("f-entrar");
    if (fe) fe.onsubmit = async (ev) => {
      ev.preventDefault(); err(fe, ""); ocupado(fe, true);
      try { await C.entrar(fe.nombre.value, fe.pass.value); ir(); }
      catch (e) { ocupado(fe, false); err(fe, e.message); }
    };
    const fc = document.getElementById("f-crear");
    if (fc) fc.onsubmit = async (ev) => {
      ev.preventDefault(); err(fc, "");
      if (fc.pass.value !== fc.pass2.value) return err(fc, "Las dos contraseñas no coinciden.");
      ocupado(fc, true);
      try { await C.registrar(fc.nombre.value, fc.pass.value, fc.adoptar ? fc.adoptar.checked : false); ir(); }
      catch (e) { ocupado(fc, false); err(fc, e.message); }
    };
    const fl = document.getElementById("f-local");
    if (fl) fl.onsubmit = async (ev) => {
      ev.preventDefault(); err(fl, ""); ocupado(fl, true);
      try { await C.crearLocal(fl.nombre.value, fl.adoptar ? fl.adoptar.checked : false); ir(); }
      catch (e) { ocupado(fl, false); err(fl, e.message); }
    };
  }
  // Confirmación sin diálogos del navegador: segunda pulsación en 4 s.
  let pendiente = null;
  function confirmar(msg) {
    if (pendiente && Date.now() - pendiente < 4000) { pendiente = null; return true; }
    pendiente = Date.now(); C.toast("Pulsa otra vez para confirmar", msg); return false;
  }

  const ses = C.actual();
  if (ses && !q.has("cambiar")) pintarYo(ses); else pintarAcceso();
})();
