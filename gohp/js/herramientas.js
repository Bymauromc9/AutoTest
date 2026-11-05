/*!
 * herramientas.js — calculadoras de GOHP (gohp/practicas/herramientas.html):
 *   punto muerto y beneficio objetivo · fabricar o comprar · productividad y tasa de variación (tema 6) ·
 *   pay-back, coste-beneficio, VAN y TIR · coste efectivo y TAE de un descuento o préstamo (tema 8).
 * Cada calculadora se pinta en su contenedor (#calc-…) sólo si existe. Requiere: assets/js/core.js.
 */
(function () {
  "use strict";
  const esc = window.App.esc;
  const $ = (id) => document.getElementById(id);
  // Admite «1.000,5», «1000,5», «1000.5» y «−3»
  function num(s) {
    let t = String(s == null ? "" : s).trim().replace(/\s/g, "").replace("−", "-");
    if (!t) return null;
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
    const v = Number(t);
    return isFinite(v) ? v : null;
  }
  const nf = (d) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: d, useGrouping: true });
  const F = (v, d = 2) => (v < 0 ? "−" : "") + nf(d).format(Math.abs(v)).replace(/ /g, " ");
  const E = (v, d = 2) => F(v, d) + " €";
  const P = (v, d = 2) => F(v * 100, d) + " %";
  const sign = (v, txt) => `<span class="${v < 0 ? "neg" : "pos"}">${txt}</span>`;
  const field = (id, label, value) => `<label for="${id}">${label}<input type="text" inputmode="decimal" id="${id}" value="${esc(value)}" spellcheck="false" autocomplete="off"></label>`;
  const select = (id, label, opts) => `<label for="${id}">${label}<select id="${id}">${opts.map((o) => `<option value="${o[0]}"${o[2] ? " selected" : ""}>${o[1]}</option>`).join("")}</select></label>`;
  const row = (...f) => `<div class="row">${f.join("")}</div>`;
  const ERR = (t) => `<span class="err">${t}</span>`;
  function mount(id, html, fn) {
    const box = $(id); if (!box) return;
    box.innerHTML = html + `<div class="tool-out" aria-live="polite"><pre class="calc-out" id="${id}-out"></pre></div>`;
    const o = $(id + "-out");
    const run = () => { try { o.innerHTML = fn(); } catch (e) { o.innerHTML = ERR(e && e.message ? e.message : "Entrada no válida."); } };
    box.querySelectorAll("input,select").forEach((e) => { e.addEventListener("input", run); e.addEventListener("change", run); });
    run();
  }
  function need(ids) {
    return ids.map((i) => { const v = num($(i).value); if (v === null) throw new Error("Rellena todos los campos obligatorios con números."); return v; });
  }
  const opt = (i) => num($(i).value);

  /* ---------- Punto muerto y beneficio ---------- */
  mount("calc-pm",
    row(field("pm-cf", "Costes fijos (CF)", "18030,36"), field("pm-cvu", "Coste variable unitario (CVu)", "15,03"), field("pm-p", "Precio (P)", "24,04")) +
    row(field("pm-q", "Unidades vendidas (opcional)", "3500"), field("pm-b", "Beneficio objetivo (opcional)", ""), field("pm-cap", "Capacidad (opcional)", "3500")),
    () => {
      const [cf, cvu, p] = need(["pm-cf", "pm-cvu", "pm-p"]);
      const q = opt("pm-q"), b = opt("pm-b"), cap = opt("pm-cap");
      const m = p - cvu;
      if (m <= 0) return ERR("El precio no supera el coste variable unitario: cada unidad pierde dinero y no hay punto muerto.");
      const q0 = cf / m, qe = Math.ceil(q0 - 1e-9);
      let s = `Margen de contribución = P − CVu = ${F(p)} − ${F(cvu)} = <b>${F(m)}</b>\n`;
      s += `Q* = CF ÷ (P − CVu) = ${F(cf)} ÷ ${F(m)} = ${F(q0, 4)}  →  <b>${F(qe, 0)} unidades</b>\n`;
      s += `En euros: Q* · P = ${E(q0 * p)}  (con ${F(qe, 0)} u: ${E(qe * p)})\n`;
      if (cap !== null) s += `Capacidad ${F(cap, 0)} u → ${q0 <= cap ? "el punto muerto es alcanzable" : "<b>no llega al punto muerto</b>"}; con producción constante se alcanza en el mes ${F(q0 / (cap / 12), 2)}\n`;
      if (q !== null) { const bq = m * q - cf; s += `\nB(${F(q, 0)}) = ${F(m)} · ${F(q, 0)} − ${F(cf)} = ${sign(bq, "<b>" + E(bq) + "</b>")}\n`; }
      if (b !== null) {
        const qb = (cf + b) / m;
        s += `\nPara B = ${E(b)}: Q = (CF + B) ÷ (P − CVu) = <b>${F(qb, 2)} u</b> (${F(Math.ceil(qb - 1e-9), 0)} u)\n`;
        if (cap !== null) {
          if (qb > cap) s += `  ¡Supera la capacidad (${F(cap, 0)} u)! Precio necesario con Q = capacidad: P = CVu + (CF + B) ÷ Q = <b>${E(cvu + (cf + b) / cap)}</b>\n`;
          else s += `  Cabe en la capacidad (${F(cap, 0)} u).\n`;
        }
      }
      return s.trimEnd();
    });

  /* ---------- Fabricar o comprar ---------- */
  mount("calc-fc",
    row(field("fc-q", "Unidades necesarias", "8000"), field("fc-pc", "Precio de compra por unidad", "15")) +
    row(field("fc-cf", "Costes fijos de fabricar", "70000"), field("fc-cvu", "Coste variable unitario de fabricar", "5")),
    () => {
      const [q, pc, cf, cvu] = need(["fc-q", "fc-pc", "fc-cf", "fc-cvu"]);
      const comprar = pc * q, fabricar = cf + cvu * q;
      let s = `Comprar  = ${F(pc)} · ${F(q, 0)} = ${E(comprar)}\nFabricar = ${F(cf)} + ${F(cvu)} · ${F(q, 0)} = ${E(fabricar)}\n`;
      if (pc > cvu) s += `Punto de indiferencia = CF ÷ (Pcompra − CVu) = <b>${F(cf / (pc - cvu), 2)} unidades</b>\n`;
      else s += `Comprar cuesta menos por unidad que fabricar: siempre conviene comprar.\n`;
      const d = Math.abs(comprar - fabricar);
      s += d < 1e-9 ? `\n<b>Indiferente</b>: cuestan lo mismo.` : `\nConviene <b>${fabricar < comprar ? "fabricar" : "comprar"}</b> (ahorra ${E(d)}).`;
      return s;
    });

  /* ---------- Productividad ---------- */
  mount("calc-prod",
    `<p class="tool-note">Para la productividad global, escribe el valor de la producción y el coste de los factores en euros (a los mismos precios los dos periodos).</p>` +
    row(field("pr-o1", "Producción · periodo 1", "5000000"), field("pr-i1", "Factor · periodo 1", "590000")) +
    row(field("pr-o2", "Producción · periodo 2 (opcional)", "6000000"), field("pr-i2", "Factor · periodo 2 (opcional)", "581000")),
    () => {
      const [o1, i1] = need(["pr-o1", "pr-i1"]);
      if (i1 === 0) return ERR("El factor no puede ser 0.");
      const p1 = o1 / i1;
      let s = `P₁ = ${F(o1)} ÷ ${F(i1)} = <b>${F(p1, 4)}</b>\n`;
      const o2 = opt("pr-o2"), i2 = opt("pr-i2");
      if (o2 !== null && i2 !== null && i2 !== 0) {
        const p2 = o2 / i2, t = (p2 - p1) / p1;
        s += `P₂ = ${F(o2)} ÷ ${F(i2)} = <b>${F(p2, 4)}</b>\nTasa de variación = (P₂ − P₁) ÷ P₁ = ${sign(t, "<b>" + (t > 0 ? "+" : "") + P(t) + "</b>")}`;
      }
      return s.trimEnd();
    });

  /* ---------- Inversión: pay-back, C-B, VAN, TIR ---------- */
  function parseFlows(s, min) {
    const parts = String(s).split(/[;\n]|,\s+|\s{2,}|\t/).map((x) => x.trim()).filter(Boolean);
    const v = parts.map(num);
    if (v.length < min || v.some((x) => x === null)) throw new Error("Escribe el desembolso y los flujos de cada año separados por «;» (p. ej. 40; 55; 120).");
    return v;
  }
  const van = (fl, k) => fl.reduce((a, q, t) => a + q / Math.pow(1 + k, t), 0);
  function tir(fl) {
    let lo = -0.99, hi = 1;
    while (van(fl, hi) > 0 && hi < 1e6) hi *= 2;
    if (van(fl, lo) * van(fl, hi) > 0) return null;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (van(fl, m) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  mount("calc-inv",
    `<p class="tool-note">Desembolso inicial (en positivo) y flujos netos de cada año (cobros − pagos), separados por punto y coma. Si hay valor residual, súmalo al último flujo.</p>` +
    row(field("iv-a", "Desembolso inicial A", "100"), field("iv-k", "Coste de capital k (%)", "5")) +
    row(field("iv-q", "Flujos netos Q₁; Q₂; …", "40; 55; 120")),
    () => {
      const [a, kp] = need(["iv-a", "iv-k"]);
      const q = parseFlows($("iv-q").value, 1);
      const k = kp / 100, fl = [-Math.abs(a), ...q], A = Math.abs(a);
      const sum = q.reduce((x, y) => x + y, 0), n = q.length;
      let acc = 0, pb = null;
      for (let t = 0; t < n; t++) { if (acc + q[t] >= A && q[t] > 0) { pb = t + (A - acc) / q[t]; break; } acc += q[t]; }
      let s = "";
      if (pb === null) s += `Plazo de recuperación: <b>no se recupera</b> en ${n} años\n`;
      else { const y = Math.floor(pb + 1e-12), d = Math.round((pb - y) * 365); s += `Plazo de recuperación = <b>${F(pb, 3)} años</b> ≈ ${y} año${y === 1 ? "" : "s"} y ${d} días\n`; }
      s += `Coste-beneficio total = ΣQ ÷ A = ${F(sum)} ÷ ${F(A)} = <b>${F(sum / A, 3)}</b>\n`;
      s += `Coste-beneficio medio anual = (ΣQ ÷ n) ÷ A = ${F(sum / n, 3)} ÷ ${F(A)} = <b>${F(sum / n / A, 3)}</b>\n\n`;
      const terms = q.map((x, t) => `${F(x)}/${F(1 + k, 4)}${t ? "<sup>" + (t + 1) + "</sup>" : ""}`).join(" + ");
      const v = van(fl, k);
      s += `VAN(${F(kp)} %) = −${F(A)} + ${terms}\n        = ${sign(v, "<b>" + F(v, 2) + "</b>")} → ${v > 0 ? "efectuable" : v < 0 ? "no efectuable" : "indiferente"}\n`;
      const r = tir(fl);
      s += r === null ? `TIR: no hay una única tasa con estos flujos` : `TIR = <b>${P(r)}</b> → ${r > k ? "mayor" : "menor"} que k = ${F(kp)} %`;
      return s;
    });

  /* ---------- Coste efectivo y TAE ---------- */
  mount("calc-tae",
    row(field("ta-n", "Nominal", "20000"), field("ta-i", "Interés nominal anual (%)", "16"), field("ta-d", "Duración (días)", "30")) +
    row(select("ta-m", "Intereses", [["ant", "Por anticipado (descuento)", 1], ["fin", "Al final"]]), field("ta-c", "Comisión (‰ del nominal)", "4"), field("ta-g", "Otros gastos (€)", "42")),
    () => {
      const [N, ip, d] = need(["ta-n", "ta-i", "ta-d"]);
      const cm = opt("ta-c") || 0, g = opt("ta-g") || 0, ant = $("ta-m").value === "ant";
      if (d <= 0) return ERR("La duración debe ser mayor que 0.");
      const I = N * ip / 100 * d / 360, C = N * cm / 1000;
      const rec = N - C - g - (ant ? I : 0), dev = N + (ant ? 0 : I);
      if (rec <= 0) return ERR("Con estos gastos no recibirías nada.");
      const i = dev / rec - 1, per = 360 / d, tae = Math.pow(1 + i, per) - 1;
      let s = `Intereses = ${F(N)} · ${F(ip)} % · ${F(d, 0)}/360 = ${E(I)}\nComisión = ${F(cm)} ‰ · ${F(N)} = ${E(C)}   ·   Otros gastos = ${E(g)}\n\n`;
      s += `Recibes  = ${F(N)}${ant ? " − " + F(I) : ""} − ${F(C)} − ${F(g)} = <b>${E(rec)}</b>\nDevuelves = <b>${E(dev)}</b>\n\n`;
      s += `i del periodo = ${F(dev)} ÷ ${F(rec)} − 1 = <b>${P(i, 3)}</b>\n`;
      s += `TAE = (1 + i)<sup>${F(per, 2)}</sup> − 1 = <b>${P(tae)}</b>  (frente al ${F(ip)} % nominal)`;
      return s;
    });
})();
