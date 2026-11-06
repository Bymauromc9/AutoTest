/*!
 * sage.js — SageMath dentro de la web (lo usa AMD; sirve para cualquier asignatura).
 *
 * Todas las celdas de una página comparten UNA sesión de SageMath, como un cuaderno de Jupyter: lo que se
 * define en una celda se puede usar en las demás. Hay dos clases de celdas (las genera scripts/amd/generar.py):
 *
 *   · Celdas de la resolución:  <div class="sage"><p class="sage-t">Título</p><pre><code>código</code></pre>…</div>
 *     Se ven como código (se copian y se imprimen); «Ejecutar» las convierte en un editor.
 *   · Cuaderno de cada ejercicio:  <div class="sage-nb" data-nb="id-del-ejercicio"></div>
 *     Celdas para escribir tus propias órdenes al hacer el ejercicio. Se añaden, se quitan y se ejecutan una a
 *     una o todas; el código se guarda en este navegador («sage-cuaderno:<página>», no viaja con la cuenta).
 *
 * El código se ejecuta en SageMathCell (https://sagecell.sagemath.org), el servicio público del proyecto
 * SageMath. Su cliente sólo se descarga al ejecutar la primera celda o abrir el primer cuaderno.
 *
 * Ficheros de la sesión: el <body> los declara así
 *   data-sage-datos="amd/practicas/datos/p1/"                carpeta de los datos de la página
 *   data-sage-ficheros="matrices.sobj,/amd/sage/geometria.py" nombres en esa carpeta, o rutas desde la raíz («/…»)
 *   data-sage-prep="from geometria import *"                 código que se ejecuta después
 * Al abrir la sesión, una celda oculta deja los ficheros en la carpeta de trabajo y ejecuta data-sage-prep. El
 * navegador lee los ficheros de esta misma web y se los manda (así funcionan antes de subirlos a GitHub y en un
 * servidor local); los de más de 2 MB, o todos si la página se abre con doble clic (file://), los descarga el
 * propio servidor de raw.githubusercontent.com: los núcleos de SageMathCell sólo pueden conectarse a unos pocos
 * sitios (GitHub sí, Vercel no; ver contrib/vm/compute_node/root/firewall en sagemath/sagecell).
 *
 * Dos detalles de SageMathCell que aquí se esquivan (ver js/session.js y js/cell.js de sagemath/sagecell):
 *   · El código que se pide mientras el núcleo se está conectando se ejecuta y se pinta en la PRIMERA celda que
 *     abrió la sesión. Por eso ninguna celda se ejecuta hasta que el núcleo está abierto (Motor.listo()).
 *   · El núcleo se cierra tras 15 minutos sin uso (o 30 en total): sagecell.kernels[k] vuelve a null y la
 *     siguiente ejecución abriría uno vacío. Motor.listo() lo detecta, abre otro y repite la preparación.
 *   Para que nada se salte esa espera, el botón de SageMathCell va oculto y Mayús+Intro lo atiende este fichero.
 *
 * Requiere: assets/js/core.js (App.ROOT y App.store).
 */
(function () {
  "use strict";
  const App = window.App;
  const SERVIDOR = "https://sagecell.sagemath.org/";
  // Repositorio de la web: de ahí descarga el servidor los ficheros grandes (si cambia, cámbialo aquí).
  const GITHUB = "https://raw.githubusercontent.com/Bymauromc9/AutoTest/master/";
  const MAX_FICHERO = 2 * 1024 * 1024;        // bytes que el navegador manda por fichero; si pesa más, GitHub
  const MAX_TOTAL = 6 * 1024 * 1024;          // bytes que el navegador manda en total
  const ESPERA_CLIENTE = 25000;               // ms para cargar el cliente de SageMathCell
  const ESPERA_NUCLEO = 60000;                // ms para que el núcleo abra
  const body = document.body;
  const PAGINA = body.dataset.sageKey || location.pathname;
  const CLAVE = "sage:" + PAGINA;             // linkKey: todas las celdas de la página comparten núcleo
  const GUARDADO = "sage-cuaderno:" + PAGINA; // código de los cuadernos (sólo en este navegador)
  const OCULTAR = ["permalink", "language", "sessionFiles", "evalButton", "fullScreen"];
  const INICIO_CUADERNO = "# Escribe aquí tus órdenes de SageMath y pulsa Mayús + Intro\n";

  /* ======================= Utilidades ======================= */
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const raiz = () => (App && App.ROOT) || new URL(body.dataset.root || "./", location.href).href;
  const leer = (k) => (App && App.store ? App.store(k) : null);
  const guardar = (k, v) => { if (App && App.store) App.store(k, v); };
  const pyTexto = (s) => JSON.stringify(String(s));   // un literal JSON es también un literal de Python válido
  function retrasar(f, ms) { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; }
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function boton(cls, html, titulo) {
    const b = el("button", cls, html);
    b.type = "button";
    if (titulo) { b.title = titulo; b.setAttribute("aria-label", titulo); }
    return b;
  }
  let nIds = 0;
  const nuevoId = (p) => p + "-" + (++nIds);

  /* ======================= Cliente de SageMathCell ======================= */
  let promesaCliente = null;
  /** Carga embedded_sagecell.js una sola vez (si falla, se puede reintentar). */
  function cliente() {
    if (window.sagecell && window.sagecell.makeSagecell) return Promise.resolve(window.sagecell);
    if (!promesaCliente) {
      promesaCliente = new Promise((ok, mal) => {
        const s = document.createElement("script");
        const t = setTimeout(() => mal(new Error("SageMathCell no responde. Comprueba la conexión y vuelve a intentarlo.")), ESPERA_CLIENTE);
        s.src = SERVIDOR + "static/embedded_sagecell.js";
        s.async = true;
        s.onload = () => {
          clearTimeout(t);
          if (window.sagecell && window.sagecell.makeSagecell) ok(window.sagecell);
          else mal(new Error("SageMathCell no ha respondido como se esperaba."));
        };
        s.onerror = () => { clearTimeout(t); mal(new Error("No se ha podido conectar con SageMathCell (sagecell.sagemath.org).")); };
        document.head.appendChild(s);
      });
      promesaCliente.catch(() => { promesaCliente = null; });
    }
    return promesaCliente;
  }

  /* ======================= Ficheros de la sesión ======================= */
  /** Ficheros declarados en el <body>: { nombre, ruta } con la ruta desde la raíz de la web. */
  function ficheros() {
    const carpeta = (body.dataset.sageDatos || "").replace(/^\/+/, "");
    return (body.dataset.sageFicheros || "").split(",").map((f) => f.trim()).filter(Boolean).map((f) => {
      const ruta = f[0] === "/" ? f.slice(1) : carpeta + f;
      return { nombre: ruta.split("/").pop(), ruta };
    });
  }
  /** Contenido de un fichero de esta web en base64 ({ b64, bytes }), o null si no se puede o no conviene mandarlo. */
  async function base64DeLaWeb(ruta, cupo) {
    if (location.protocol === "file:") return null;            // sin servidor no se puede leer
    const max = Math.min(MAX_FICHERO, cupo);
    try {
      const r = await fetch(new URL(ruta, raiz()).href);
      if (!r.ok) return null;
      if ((Number(r.headers.get("content-length")) || 0) > max) { if (r.body) r.body.cancel(); return null; }
      const blob = await r.blob();
      if (blob.size > max) return null;
      const url = String(await new Promise((ok, mal) => {
        const fr = new FileReader();
        fr.onload = () => ok(fr.result);
        fr.onerror = () => mal(fr.error);
        fr.readAsDataURL(blob);
      }));
      return { b64: url.slice(url.indexOf(",") + 1), bytes: blob.size };
    } catch (e) {
      return null;
    }
  }
  /** Código (Python) de la celda oculta que prepara la sesión. Los fallos se avisan con líneas «⚠ …». */
  async function codigoPreparacion() {
    const lista = ficheros();
    const prep = (body.dataset.sagePrep || "").trim();
    const lineas = ["# Preparación de la sesión (assets/js/sage.js)"];
    if (lista.length) {
      lineas.push(
        "import os, base64, socket, urllib.request",
        "socket.setdefaulttimeout(60)",
        "def _sage_fichero(nombre, b64=None, url=None):",
        "    try:",
        "        if b64 is not None:",
        "            with open(nombre, 'wb') as f: f.write(base64.b64decode(b64))",
        "        elif not os.path.exists(nombre):",
        "            urllib.request.urlretrieve(url, nombre)",
        "    except Exception as e:",
        "        print('⚠ No se ha podido preparar ' + nombre + ':', e)");
      let cupo = MAX_TOTAL;
      for (const f of lista) {
        const web = await base64DeLaWeb(f.ruta, cupo);
        if (web) {
          cupo -= web.bytes;
          lineas.push(`_sage_fichero(${pyTexto(f.nombre)}, b64=${pyTexto(web.b64)})`);
        } else {
          lineas.push(`_sage_fichero(${pyTexto(f.nombre)}, url=${pyTexto(GITHUB + f.ruta)})`);
        }
      }
      lineas.push("del _sage_fichero");
      if (body.dataset.sageDatos) lineas.push(`DATOS = ${pyTexto(GITHUB + body.dataset.sageDatos.replace(/^\/+/, ""))}`);
    }
    if (prep) {
      lineas.push("try:", `    exec(preparse(${pyTexto(prep)}), globals())`,
        "except Exception as e:", `    print('⚠ Al ejecutar ' + ${pyTexto(prep.split("\n")[0])} + ':', type(e).__name__, e)`);
    }
    return lineas.join("\n") + "\n";
  }

  /* ======================= Motor: la sesión de la página ======================= */
  const Motor = (() => {
    let estado = "apagado";        // apagado · conectando · listo · cerrado · error
    let detalle = "";
    let enCurso = null;            // promesa de apertura en curso
    let oculto = null;             // celda oculta que abre el núcleo y prepara los ficheros
    let vigilando = false;
    const oyentes = new Set();

    function poner(e, d) { estado = e; detalle = d || ""; oyentes.forEach((f) => f(estado, detalle)); }
    /** El núcleo de la página (o null si no hay o se ha cerrado). */
    function nucleo() {
      const sc = window.sagecell;
      const i = sc && sc.linkKeys ? sc.linkKeys[CLAVE] : undefined;
      return i == null ? null : sc.kernels[i] || null;
    }
    function esperarNucleo() {
      return new Promise((ok, mal) => {
        const t0 = Date.now();
        (function mira() {
          const k = nucleo();
          if (k && k.opened) return ok();
          if (Date.now() - t0 > ESPERA_NUCLEO) return mal(new Error("El servidor de SageMath no responde. Prueba otra vez en un momento."));
          setTimeout(mira, 120);
        })();
      });
    }
    /** Avisos que deja la celda oculta al preparar la sesión: líneas «⚠ …» y errores. */
    function vigilarAvisos(caja) {
      const leerAvisos = () => {
        const lineas = (sel) => Array.from(caja.querySelectorAll(sel)).map((n) => n.textContent.trim());
        const t = lineas(".sagecell_stdout").join("\n").split("\n").filter((l) => l.startsWith("⚠"))
          .concat(lineas(".sagecell_stderr, .sagecell_pyerr")).filter(Boolean).join("\n");
        if (t && t !== detalle && estado === "listo") poner("listo", t);
      };
      new MutationObserver(retrasar(leerAvisos, 200)).observe(caja, { childList: true, subtree: true, characterData: true });
    }
    /** Si el servidor cierra la sesión, lo dice (la próxima ejecución abrirá otra). */
    function vigilarCierre() {
      if (vigilando) return;
      vigilando = true;
      setInterval(() => {
        if (estado === "listo" && !nucleo()) {
          poner("cerrado", "La sesión se ha cerrado tras un rato sin usarla. Al ejecutar se abre otra: vuelve a ejecutar las celdas que necesites.");
        }
      }, 4000);
    }
    async function abrir() {
      poner("conectando");
      const sc = await cliente();
      const codigo = await codigoPreparacion();
      if (oculto) oculto.remove();
      oculto = el("div", "sage-motor");
      oculto.id = nuevoId("sage-motor");
      oculto.hidden = true;
      body.appendChild(oculto);
      sc.makeSagecell({ inputLocation: "#" + oculto.id, code: codigo, autoeval: true, linkKey: CLAVE, hide: OCULTAR });
      await esperarNucleo();
      poner("listo");
      vigilarAvisos(oculto);
      vigilarCierre();
    }
    return Object.freeze({
      /** Resuelve cuando hay un núcleo abierto y preparado (lo abre si hace falta). */
      listo() {
        const k = nucleo();
        if (k && k.opened && !enCurso) { if (estado !== "listo") poner("listo"); return Promise.resolve(); }
        if (!enCurso) {
          enCurso = abrir().catch((e) => { poner("error", e.message); throw e; }).finally(() => { enCurso = null; });
        }
        return enCurso;
      },
      /** Llama a f(estado, detalle) ahora y cada vez que cambie. */
      suscribir(f) { oyentes.add(f); f(estado, detalle); return () => oyentes.delete(f); }
    });
  })();

  /* ======================= Editor: una celda de SageMathCell ======================= */
  /**
   * Monta un editor de SageMathCell en «editor» con su salida en «salida». Devuelve (cuando está listo)
   * { valor(), poner(código), enfocar(), alCambiar(f), ejecutar(), quitar() }.
   * Mayús+Intro (o Ctrl+Intro) dentro del editor lanza el evento «sage:ejecutar», que atiende quien lo monta.
   */
  async function crearEditor(editor, salida, codigo) {
    const sc = await cliente();
    editor.id = editor.id || nuevoId("sage-ed");
    salida.id = salida.id || nuevoId("sage-sal");
    const info = await new Promise((ok) => {
      sc.makeSagecell({
        inputLocation: "#" + editor.id, outputLocation: "#" + salida.id, code: codigo,
        linkKey: CLAVE, hide: OCULTAR, callback() { ok(this); }
      });
    });
    const cm = info.editorData;                          // instancia de CodeMirror
    if (cm && cm.setOption) cm.setOption("lineWrapping", true);   // sin desplazamiento lateral en el móvil
    const api = {
      valor: () => (cm && cm.getValue ? cm.getValue() : ""),
      poner: (c) => { if (cm && cm.setValue) cm.setValue(c); },
      enfocar: () => { if (cm && cm.focus) cm.focus(); },
      alCambiar: (f) => { if (cm && cm.on) cm.on("change", f); },
      /** Espera a que la sesión esté lista y ejecuta (el núcleo atiende las celdas en orden). */
      async ejecutar() {
        if (!api.valor().trim()) return;
        await Motor.listo();
        const b = editor.querySelector(".sagecell_evalButton");
        if (b) b.click();
      },
      quitar: () => { try { sc.deleteSagecell(info); } catch (e) { /* ya no está */ } }
    };
    // Se interceptan antes que SageMathCell, que ejecutaría sin esperar a que la sesión esté lista.
    const esIntro = (e) => e.key === "Enter" && (e.shiftKey || e.ctrlKey || e.metaKey);
    editor.addEventListener("keydown", (e) => {
      if (!esIntro(e)) return;
      e.preventDefault();
      e.stopPropagation();
      editor.dispatchEvent(new CustomEvent("sage:ejecutar", { bubbles: true }));
    }, true);
    editor.addEventListener("keyup", (e) => { if (esIntro(e)) e.stopPropagation(); }, true);
    return api;
  }

  /* ======================= Estado y mensajes ======================= */
  const TEXTO_ESTADO = { apagado: "Sin conectar", conectando: "Conectando…", listo: "Sesión lista", cerrado: "Sesión cerrada", error: "Sin conexión" };
  /** Pinta el estado de la sesión en «nodo» (un .sage-estado) y lo mantiene al día. */
  function mostrarEstado(nodo) {
    Motor.suscribir((estado, detalle) => {
      const aviso = estado === "listo" && detalle;
      nodo.dataset.estado = aviso ? "aviso" : estado;
      nodo.textContent = aviso ? "Sesión lista · con avisos" : TEXTO_ESTADO[estado];
      nodo.title = detalle || "";
    });
  }
  function mostrarMensaje(nodo, texto) {
    nodo.textContent = texto || "";
    nodo.hidden = !texto;
  }
  async function copiarTexto(texto, b, nodo) {
    try { await navigator.clipboard.writeText(texto); }
    catch (e) {
      const r = document.createRange(); r.selectNodeContents(nodo);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      try { document.execCommand("copy"); } catch (e2) { /* queda seleccionado para copiarlo a mano */ }
    }
    const antes = b.textContent;
    b.textContent = "Copiado";
    setTimeout(() => { b.textContent = antes; }, 1400);
  }

  /* ======================= Celdas de la resolución ======================= */
  function prepararSolucion(caja) {
    const pre = caja.querySelector(":scope > pre");
    if (!pre || caja.querySelector(".sage-bar")) return;
    const code = pre.querySelector("code") || pre;
    const original = code.textContent.replace(/\s+$/, "");
    const run = boton("sage-run", '<span aria-hidden="true">▶</span> Ejecutar');
    const copiar = boton("sage-copy", "Copiar");
    const reponer = boton("sage-reset", "Código original");
    const estado = el("span", "sage-estado");
    const barra = el("div", "sage-bar");
    const msg = el("p", "sage-msg");
    reponer.hidden = estado.hidden = msg.hidden = true;
    msg.setAttribute("role", "status");
    barra.append(run, copiar, reponer, estado);
    pre.after(barra);
    barra.after(msg);
    let editor = null;
    const etiqueta = (t) => { run.innerHTML = t; };
    async function ejecutar() {
      run.disabled = true;
      mostrarMensaje(msg, "");
      try {
        if (!editor) {
          etiqueta('<span aria-hidden="true">…</span> Abriendo SageMath');
          const zonaEd = el("div", "sage-editor"), zonaSal = el("div", "sage-salida");
          pre.after(zonaEd);
          barra.after(zonaSal);
          caja.classList.add("is-live");
          editor = await crearEditor(zonaEd, zonaSal, original);
          zonaEd.addEventListener("sage:ejecutar", ejecutar);
          reponer.hidden = estado.hidden = false;
          mostrarEstado(estado);
        }
        etiqueta('<span aria-hidden="true">…</span> Ejecutando');
        await editor.ejecutar();
      } catch (e) {
        mostrarMensaje(msg, e.message + " También puedes copiar el código y ejecutarlo en tu SageMath.");
      } finally {
        run.disabled = false;
        etiqueta('<span aria-hidden="true">▶</span> Ejecutar');
      }
    }
    run.addEventListener("click", ejecutar);
    reponer.addEventListener("click", () => { if (editor) { editor.poner(original); editor.enfocar(); } });
    copiar.addEventListener("click", () => copiarTexto(editor ? editor.valor() : original, copiar, code));
  }

  /* ======================= Cuadernos de los ejercicios ======================= */
  function cuadernosGuardados() { const g = leer(GUARDADO); return g && typeof g === "object" ? g : {}; }
  function guardarCuaderno(id, codigos) {
    const g = cuadernosGuardados();
    if (codigos.some((c) => c.trim() && c !== INICIO_CUADERNO)) g[id] = codigos;
    else delete g[id];
    guardar(GUARDADO, g);
  }
  function textoAyuda() {
    const nombres = ficheros().map((f) => "<code>" + esc(f.nombre) + "</code>");
    const prep = body.dataset.sagePrep;
    return "Escribe tus órdenes y ejecútalas con <kbd>Mayús</kbd> + <kbd>Intro</kbd>. Todas las celdas de la página comparten la sesión" +
      (nombres.length ? "; los ficheros de la práctica ya están en ella (" + nombres.join(", ") + ")" : "") +
      (prep ? " y ya se ha ejecutado <code>" + esc(prep) + "</code>" : "") + ". Tu código se guarda en este navegador.";
  }

  function prepararCuaderno(nb) {
    if (nb.dataset.listo) return;
    nb.dataset.listo = "1";
    const id = nb.dataset.nb;
    const previas = cuadernosGuardados()[id];
    const texto = previas && previas.length
      ? `Seguir con tu SageMath (${previas.length} ${previas.length === 1 ? "celda" : "celdas"})` : "Hacer el ejercicio en SageMath";
    nb.innerHTML = `<div class="nb-cab"><span class="nb-t">Tu SageMath</span><span class="sage-estado" hidden></span></div>` +
      `<div class="nb-cerrado"><button type="button" class="nb-abrir"><span aria-hidden="true">▶</span> ${texto}</button>` +
      `<span class="nb-nota">Celdas para escribir y ejecutar tus propias órdenes antes de mirar la resolución.</span></div>` +
      `<p class="sage-msg" role="status" hidden></p>`;
    const abrir = nb.querySelector(".nb-abrir");
    const msg = nb.querySelector(".sage-msg");
    abrir.addEventListener("click", async () => {
      abrir.disabled = true;
      abrir.innerHTML = '<span aria-hidden="true">…</span> Abriendo SageMath';
      mostrarMensaje(msg, "");
      try {
        await cliente();
        const estado = nb.querySelector(".sage-estado");
        estado.hidden = false;
        mostrarEstado(estado);
        montarCuaderno(nb, id, previas && previas.length ? previas : [INICIO_CUADERNO], msg);
      } catch (e) {
        abrir.disabled = false;
        abrir.innerHTML = '<span aria-hidden="true">▶</span> Reintentar';
        mostrarMensaje(msg, e.message);
      }
    });
  }

  function montarCuaderno(nb, id, codigos, msg) {
    nb.classList.add("is-open");
    nb.querySelector(".nb-cerrado").remove();
    const lista = el("ol", "nb-celdas");
    const anadir = boton("nb-add", '<span aria-hidden="true">＋</span> Añadir celda');
    const todas = boton("nb-all", '<span aria-hidden="true">▶▶</span> Ejecutar todas');
    const pie = el("div", "nb-pie");
    pie.append(anadir, todas);
    nb.querySelector(".nb-cab").after(lista, pie, el("p", "nb-ayuda", textoAyuda()));
    const celdas = [];                                   // [{ li, editor: Promise<api> }] en el orden de la página
    const salvar = retrasar(async () => {
      const eds = await Promise.all(celdas.map((c) => c.editor));
      guardarCuaderno(id, eds.map((e) => e.valor()));
    }, 400);
    function numerar() {
      celdas.forEach((c, i) => {
        c.li.querySelector(".nb-n").textContent = "[" + (i + 1) + "]";
        c.li.querySelector(".nb-quitar").disabled = celdas.length === 1;
      });
    }
    async function ejecutar(c) {
      const run = c.li.querySelector(".nb-run");
      run.disabled = true;
      mostrarMensaje(msg, "");
      try { await (await c.editor).ejecutar(); }
      catch (e) { mostrarMensaje(msg, e.message); }
      finally { run.disabled = false; }
    }
    async function quitar(c) {
      if (celdas.length === 1) return;
      celdas.splice(celdas.indexOf(c), 1);
      c.li.remove();
      numerar();
      salvar();
      (await c.editor).quitar();
    }
    /** Crea una celda con «codigo» en la posición «pos» (al final si no se da). */
    function nueva(codigo, pos, enfocar) {
      const li = el("li", "nb-celda");
      li.innerHTML = '<span class="nb-n" aria-hidden="true"></span><div class="nb-cuerpo"><div class="sage-editor"></div>' +
        '<div class="nb-barra"><button type="button" class="nb-run"><span aria-hidden="true">▶</span> Ejecutar</button>' +
        '<button type="button" class="nb-debajo" title="Añadir una celda debajo de esta">＋ Celda debajo</button>' +
        '<button type="button" class="nb-quitar" title="Quitar esta celda" aria-label="Quitar esta celda">✕</button></div>' +
        '<div class="sage-salida"></div></div>';
      const i = pos == null ? celdas.length : pos;
      lista.insertBefore(li, celdas[i] ? celdas[i].li : null);
      const c = { li, editor: null };
      c.editor = crearEditor(li.querySelector(".sage-editor"), li.querySelector(".sage-salida"), codigo).then((ed) => {
        ed.alCambiar(salvar);
        if (enfocar) ed.enfocar();
        return ed;
      });
      c.editor.catch((e) => mostrarMensaje(msg, e.message));
      celdas.splice(i, 0, c);
      li.querySelector(".nb-run").addEventListener("click", () => ejecutar(c));
      li.addEventListener("sage:ejecutar", () => ejecutar(c));
      li.querySelector(".nb-debajo").addEventListener("click", () => { nueva("", celdas.indexOf(c) + 1, true); salvar(); });
      li.querySelector(".nb-quitar").addEventListener("click", () => quitar(c));
      numerar();
    }
    codigos.forEach((cod) => nueva(cod));
    anadir.addEventListener("click", () => { nueva("", null, true); salvar(); });
    todas.addEventListener("click", async () => {
      todas.disabled = true;
      mostrarMensaje(msg, "");
      try {
        await Motor.listo();
        for (const c of celdas.slice()) await (await c.editor).ejecutar();   // el núcleo las atiende en orden
      } catch (e) {
        mostrarMensaje(msg, e.message);
      } finally {
        todas.disabled = false;
      }
    });
  }

  /* ======================= Arranque ======================= */
  function preparar() {
    document.querySelectorAll(".sage").forEach(prepararSolucion);
    document.querySelectorAll(".sage-nb[data-nb]").forEach(prepararCuaderno);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", preparar);
  else preparar();
  window.Sage = Object.freeze({ preparar, ficheros });
})();
