/*!
 * calculadoras.js — calculadoras de la página de herramientas de FC (fc/practicas/herramientas.html):
 *   rendimiento y buses (tema 1) · conversor de bases y complemento a 2 con pasos, píxel de un PPM (tema 2) ·
 *   mapa de Karnaugh de 4 variables con implicantes primos (tema 3) · permisos chmod (tema 4).
 * El mini‑okteta y la calculadora IP están en fc/js/herramientas.js.
 * Cada calculadora se pinta en su contenedor (#calc-…) sólo si existe. Requiere: assets/js/core.js.
 */
(function () {
  "use strict";
  const esc = window.App.esc;
  const DIG = "0123456789ABCDEF";
  const $ = (id) => document.getElementById(id);
  const num = (s) => { const v = parseFloat(String(s).trim().replace(",", ".")); return isNaN(v) ? null : v; };
  const group = (b) => (b.match(/.{1,4}/g) || [b]).join(" ");
  const out = (el, html) => { el.innerHTML = html; };
  const field = (id, label, value, extra) => `<label for="${id}">${label}<input type="text" id="${id}" value="${esc(value)}" spellcheck="false" autocomplete="off"${extra || ""}></label>`;
  const select = (id, label, opts) => `<label for="${id}">${label}<select id="${id}">${opts.map((o) => `<option value="${o[0]}"${o[2] ? " selected" : ""}>${o[1]}</option>`).join("")}</select></label>`;
  function mount(id, html, inputs, fn) {
    const box = $(id); if (!box) return;
    box.innerHTML = html + `<div class="tool-out" aria-live="polite"><pre class="calc-out" id="${id}-out"></pre></div>`;
    const o = $(id + "-out");
    const run = () => { try { fn(o); } catch (e) { out(o, '<span class="err">Entrada no válida.</span>'); } };
    inputs.forEach((i) => { const e = $(i); if (e) { e.addEventListener("input", run); e.addEventListener("change", run); } });
    run();
  }

  /* ---------- Conversor de bases ---------- */
  function parseBase(str, b) {
    str = String(str).trim().replace(",", ".").toUpperCase().replace(/\s/g, "");
    let neg = false; if (str[0] === "-" || str[0] === "−") { neg = true; str = str.slice(1); }
    if (!str) return null;
    const p = str.split("."); if (p.length > 2) return null;
    let v = 0;
    for (const ch of p[0]) { const d = DIG.indexOf(ch); if (d < 0 || d >= b) return null; v = v * b + d; }
    if (p[1]) { let f = 1 / b; for (const ch of p[1]) { const d = DIG.indexOf(ch); if (d < 0 || d >= b) return null; v += d * f; f /= b; } }
    return neg ? -v : v;
  }
  function toBase(v, b, maxf) {
    const neg = v < 0; v = Math.abs(v);
    let i = Math.floor(v), f = v - i, s = "";
    if (i === 0) s = "0";
    while (i > 0) { s = DIG[i % b] + s; i = Math.floor(i / b); }
    let cut = false;
    if (f > 1e-12) { s += ","; let k = 0; while (f > 1e-12 && k < maxf) { f *= b; const d = Math.floor(f); s += DIG[d]; f -= d; k++; } cut = f > 1e-12; }
    return (neg ? "−" : "") + s + (cut ? "…" : "");
  }
  mount("calc-bases",
    `<div class="row">${field("cb-in", "Número", "19,375")}${select("cb-base", "Base de entrada", [["10", "Decimal", 1], ["2", "Binario"], ["8", "Octal"], ["16", "Hexadecimal"]])}</div>`,
    ["cb-in", "cb-base"], (o) => {
      const b = +$("cb-base").value, v = parseBase($("cb-in").value, b);
      if (v === null) return out(o, `<span class="err">Ese número no es válido en base ${b}.</span>`);
      const dec = (Math.round(v * 1e10) / 1e10).toString().replace(".", ",").replace("-", "−");
      out(o, `Decimal  <b>${dec}</b>\nBinario  <b>${toBase(v, 2, 24)}</b>\nOctal    <b>${toBase(v, 8, 12)}</b>\nHex      <b>${toBase(v, 16, 10)}</b>` +
        (/…/.test(toBase(v, 2, 24)) ? "\n\n«…»: la parte fraccionaria no termina en binario (como 0,1)." : ""));
    });

  /* ---------- Complemento a 2 con pasos ---------- */
  mount("calc-c2",
    `<div class="row">${field("c2-in", "Valor", "-100")}${select("c2-bits", "Bits", [["8", "8", 1], ["16", "16"], ["32", "32"], ["64", "64"]])}${select("c2-dir", "Operación", [["enc", "Decimal → C2", 1], ["dec", "Hex o binario → decimal"]])}</div>`,
    ["c2-in", "c2-bits", "c2-dir"], (o) => {
      const bits = +$("c2-bits").value, B = BigInt(bits), raw = $("c2-in").value.trim();
      if ($("c2-dir").value === "enc") {
        const v = BigInt(raw.replace(/[\s.]/g, "").replace("−", "-"));
        const max = (1n << (B - 1n)) - 1n, min = -(1n << (B - 1n));
        if (v > max || v < min) return out(o, `<span class="err">Fuera de rango para ${bits} bits: [${min}, ${max}].</span>`);
        const enc = ((v % (1n << B)) + (1n << B)) & ((1n << B) - 1n);
        const bin = enc.toString(2).padStart(bits, "0"), hex = enc.toString(16).toUpperCase().padStart(bits / 4, "0");
        const bytes = hex.match(/../g);
        let steps;
        if (v < 0n) {
          const abs = (-v).toString(2).padStart(bits, "0"), inv = abs.split("").map((c) => (c === "1" ? "0" : "1")).join("");
          steps = `\n\nPasos\n  |N| en binario  ${group(abs)}\n  invertir       ${group(inv)}\n  sumar 1        ${group(bin)}`;
        } else steps = "\n\nEs positivo: binario natural, sin complementar.";
        out(o, `Binario        <b>${group(bin)}</b>\nBig endian     <b>${bytes.join(" ")}</b>\nLittle endian  <b>${bytes.slice().reverse().join(" ")}</b>${steps}`);
      } else {
        let s = raw.replace(/[\s_]/g, "").toUpperCase(), v;
        if (/^[01]+$/.test(s) && s.length > 4) v = BigInt("0b" + s);
        else { s = s.replace(/^0X/, ""); if (!/^[0-9A-F]+$/.test(s)) return out(o, '<span class="err">Escribe el valor en hexadecimal (A1AC) o en binario.</span>'); v = BigInt("0x" + s); }
        const val = v & ((1n << B) - 1n), neg = (val & (1n << (B - 1n))) !== 0n, dec = neg ? val - (1n << B) : val;
        const bin = val.toString(2).padStart(bits, "0");
        out(o, `Binario       <b>${group(bin)}</b>\nBit de signo  <b>${bin[0]}</b> → ${neg ? "negativo" : "positivo"}\nDecimal       <b>${dec}</b>` +
          (neg ? "\n\nAl ser negativo: invertir, sumar 1 y poner el signo menos." : ""));
      }
    });

  /* ---------- Píxel de un PPM ---------- */
  mount("calc-ppm",
    `<div class="row">${field("pp-st", "Inicio de los píxeles (hex)", "1D")}${field("pp-w", "Anchura", "51", ' inputmode="numeric"')}</div>
     <div class="row">${field("pp-f", "Fila", "2", ' inputmode="numeric"')}${field("pp-c", "Columna", "2", ' inputmode="numeric"')}${field("pp-a", "…o una dirección (hex)", "", ' placeholder="155"')}</div>`,
    ["pp-st", "pp-w", "pp-f", "pp-c", "pp-a"], (o) => {
      const st = parseInt($("pp-st").value.replace(/^0x/i, ""), 16), w = parseInt($("pp-w").value, 10);
      if (isNaN(st) || !w) return out(o, '<span class="err">Indica el inicio en hexadecimal y la anchura.</span>');
      const H = (n, p) => "0x" + n.toString(16).toUpperCase().padStart(p || 0, "0");
      let s = "";
      const f = parseInt($("pp-f").value, 10), c = parseInt($("pp-c").value, 10);
      if (!isNaN(f) && !isNaN(c)) {
        const off = (f * w + c) * 3, a = st + off;
        s += `Píxel (${f},${c})\n  desplazamiento = (${f} × ${w} + ${c}) × 3 = ${off} = ${H(off)}\n  dirección      = ${H(st)} + ${H(off)} = <b>${H(a, 4)}</b>\n  ocupa 3 bytes (R, G, B) hasta ${H(a + 2, 4)}`;
      }
      const ar = $("pp-a").value.trim();
      if (ar) {
        const a = parseInt(ar.replace(/^0x/i, ""), 16);
        if (!isNaN(a) && a >= st) { const p = Math.floor((a - st) / 3); s += `\n\nDirección ${H(a)}\n  píxel nº ${p} → fila ${Math.floor(p / w)}, columna ${p % w}: <b>(${Math.floor(p / w)},${p % w})</b>\n  byte ${["R", "G", "B"][(a - st) % 3]} del píxel`; }
        else s += '\n\n<span class="err">La dirección debe ser hexadecimal y no menor que el inicio.</span>';
      }
      out(o, s || "Escribe fila y columna.");
    });

  /* ---------- Karnaugh de 4 variables ---------- */
  (function karnaugh() {
    const box = $("calc-km"); if (!box) return;
    const ORD = [0, 1, 3, 2];
    let kv = new Array(16).fill(0);
    [0, 2, 5, 7, 8, 10, 13, 15].forEach((m) => kv[m] = 1);
    box.innerHTML = `<p class="tool-note">Toca cada celda para pasar por 0 → 1 → X («no importa»). Columnas AB, filas CD, en código Gray. Simplifica por unos (suma de productos).</p>
      <div class="tablewrap km-wrap"><table class="kmap kmap-tool"><thead><tr><th class="corner">CD \\ AB</th>${ORD.map((c) => `<th>${c.toString(2).padStart(2, "0")}</th>`).join("")}</tr></thead>
      <tbody>${ORD.map((r) => `<tr><th>${r.toString(2).padStart(2, "0")}</th>${ORD.map((c) => { const m = c * 4 + r; return `<td><button type="button" data-m="${m}" aria-label="Minitérmino ${m}"></button></td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="row">${field("km-min", "Minitérminos", "")}${field("km-dc", "No importa (opcional)", "")}</div>
      <div class="row"><button type="button" class="btn-sol" id="km-load">Cargar en el mapa</button><button type="button" class="btn-sol" id="km-clear">Limpiar</button></div>
      <div class="tool-out" aria-live="polite"><pre class="calc-out" id="km-out"></pre></div>`;
    const paint = () => box.querySelectorAll("button[data-m]").forEach((b) => {
      const m = +b.dataset.m, v = kv[m];
      b.innerHTML = `<span class="kv">${v === "x" ? "X" : v}</span><span class="ki">${m}</span>`;
      b.parentElement.className = v === 1 ? "k1" : v === "x" ? "kx" : "k0";
      b.setAttribute("aria-label", `Minitérmino ${m}: ${v === "x" ? "no importa" : v}`);
    });
    box.querySelectorAll("button[data-m]").forEach((b) => b.addEventListener("click", () => {
      const m = +b.dataset.m; kv[m] = kv[m] === 0 ? 1 : kv[m] === 1 ? "x" : 0; paint(); solve();
    }));
    const parse = (s) => String(s).split(/[,\s]+/).map((x) => parseInt(x, 10)).filter((x) => !isNaN(x) && x >= 0 && x < 16);
    $("km-load").addEventListener("click", () => { kv = new Array(16).fill(0); parse($("km-min").value).forEach((m) => kv[m] = 1); parse($("km-dc").value).forEach((m) => kv[m] = "x"); paint(); solve(); });
    $("km-clear").addEventListener("click", () => { kv = new Array(16).fill(0); paint(); solve(); });
    function solve() {
      const o = $("km-out"), ones = [], dcs = [];
      kv.forEach((v, m) => { if (v === 1) ones.push(m); else if (v === "x") dcs.push(m); });
      $("km-min").value = ones.join(","); $("km-dc").value = dcs.join(",");
      if (!ones.length) return out(o, "F = <b>0</b> (no hay ningún 1).");
      if (ones.length + dcs.length === 16) return out(o, "F = <b>1</b> (todas las celdas son 1 o «no importa»).");
      // Quine–McCluskey: implicantes primos
      let cur = ones.concat(dcs).map((m) => ({ v: m, mask: 0, cov: [m] })), primes = [];
      while (cur.length) {
        const used = new Array(cur.length).fill(false), nxt = [], seen = {};
        for (let i = 0; i < cur.length; i++) for (let j = i + 1; j < cur.length; j++) {
          if (cur[i].mask !== cur[j].mask) continue;
          const d = cur[i].v ^ cur[j].v;
          if (d && (d & (d - 1)) === 0) {
            used[i] = used[j] = true;
            const nv = cur[i].v & ~d, nm = cur[i].mask | d, key = nv + "/" + nm;
            if (!seen[key]) { seen[key] = 1; nxt.push({ v: nv, mask: nm, cov: cur[i].cov.concat(cur[j].cov) }); }
          }
        }
        cur.forEach((t, i) => { if (!used[i]) primes.push(t); });
        cur = nxt;
      }
      const uniq = [], sp = {};
      primes.forEach((p) => { const k = p.v + "/" + p.mask; if (!sp[k]) { sp[k] = 1; uniq.push(p); } });
      const covers = (p) => ones.filter((m) => (m & ~p.mask) === p.v);
      const ess = [];
      ones.forEach((m) => { const c = uniq.filter((p) => (m & ~p.mask) === p.v); if (c.length === 1 && ess.indexOf(c[0]) < 0) ess.push(c[0]); });
      const left = new Set(ones); ess.forEach((p) => covers(p).forEach((m) => left.delete(m)));
      const chosen = ess.slice();
      while (left.size) {
        let best = null, bn = 0;
        uniq.forEach((p) => { if (chosen.indexOf(p) >= 0) return; const n = covers(p).filter((m) => left.has(m)).length; if (n > bn) { bn = n; best = p; } });
        if (!best) break; chosen.push(best); covers(best).forEach((m) => left.delete(m));
      }
      const name = (p) => { const L = ["A", "B", "C", "D"]; let s = ""; for (let b = 3; b >= 0; b--) { const bit = 1 << b; if (!(p.mask & bit)) s += L[3 - b] + ((p.v & bit) ? "" : "'") + "·"; } return s ? s.slice(0, -1) : "1"; };
      let h = `F = Σm(${ones.join(",")})${dcs.length ? " + d(" + dcs.join(",") + ")" : ""}\n\nF = <b>${chosen.map(name).join(" + ")}</b>\n\nImplicantes primos\n`;
      uniq.forEach((p) => { h += `  ${name(p).padEnd(12)} {${p.cov.slice().sort((a, b) => a - b).join(",")}}${ess.indexOf(p) >= 0 ? "  ← esencial" : ""}\n`; });
      h += `\nSólo con NAND\n  F = (${chosen.map((p) => "(" + name(p) + ")'").join(" · ")})'`;
      out(o, h);
    }
    paint(); solve();
  })();

  /* ---------- Permisos ---------- */
  mount("calc-chmod", `<div class="row">${field("ch-in", "Octal (754) o rwx (rwxr-xr--)", "754")}</div>`, ["ch-in"], (o) => {
    const raw = $("ch-in").value.trim(); let bits = null;
    if (/^[0-7]{3}$/.test(raw)) bits = raw.split("").map((d) => (+d).toString(2).padStart(3, "0")).join("");
    else if (/^[rwx-]{9}$/i.test(raw)) bits = raw.toLowerCase().split("").map((c, i) => (c === "-" ? "0" : c === "rwx"[i % 3] ? "1" : "?")).join("");
    if (!bits || bits.includes("?")) return out(o, '<span class="err">Tres dígitos octales (754) o nueve caracteres rwx en orden (rwxr-xr--).</span>');
    const oct = bits.match(/.{3}/g).map((g) => parseInt(g, 2)).join(""), sym = bits.split("").map((b, i) => (b === "1" ? "rwx"[i % 3] : "-")).join("");
    const who = ["propietario", "grupo", "resto"];
    let h = `Octal      <b>${oct}</b>   →  chmod ${oct} fichero\nSimbólico  <b>${sym}</b>\n\nEn un FICHERO\n`;
    sym.match(/.{3}/g).forEach((g, i) => { const p = []; if (g[0] === "r") p.push("leer"); if (g[1] === "w") p.push("modificar"); if (g[2] === "x") p.push("ejecutar"); h += `  ${who[i].padEnd(12)}${g}  ${p.join(", ") || "nada"}\n`; });
    h += "\nEn un DIRECTORIO\n";
    sym.match(/.{3}/g).forEach((g, i) => { const p = []; if (g[0] === "r") p.push("listar (ls)"); if (g[1] === "w") p.push("crear y borrar dentro"); if (g[2] === "x") p.push("entrar (cd)"); h += `  ${who[i].padEnd(12)}${p.join(", ") || "nada"}\n`; });
    out(o, h);
  });

  /* ---------- Rendimiento y buses ---------- */
  const t = (s) => s >= 1 ? +s.toFixed(4) + " s" : s >= 1e-3 ? +(s * 1e3).toFixed(4) + " ms" : s >= 1e-6 ? +(s * 1e6).toFixed(4) + " µs" : +(s * 1e9).toFixed(3) + " ns";
  const es = (n) => Number(n).toLocaleString("es-ES");
  mount("calc-cpu",
    `<div class="row">${field("cp-n", "Instrucciones", "4000000", ' inputmode="decimal"')}${field("cp-c", "Ciclos por instrucción (CPI)", "4,2", ' inputmode="decimal"')}${field("cp-f", "Frecuencia (Hz)", "800000", ' inputmode="decimal"')}</div>`,
    ["cp-n", "cp-c", "cp-f"], (o) => {
      const n = num($("cp-n").value), c = num($("cp-c").value), f = num($("cp-f").value);
      if (n === null || c === null || !f) return out(o, '<span class="err">Completa los tres campos (puedes usar 3e9 para 3 GHz).</span>');
      out(o, `t = (${es(n)} × ${es(c)}) ÷ ${es(f)} = <b>${t(n * c / f)}</b>\n\nDespejando: f = N × CPI ÷ t  ·  CPI = t × f ÷ N`);
    });
  mount("calc-bus",
    `<div class="row">${field("bu-w", "Anchura del bus (bits)", "128", ' inputmode="numeric"')}${field("bu-f", "Frecuencia del bus (Hz)", "100000000", ' inputmode="decimal"')}${field("bu-b", "Bloque (bytes)", "1024", ' inputmode="numeric"')}</div>`,
    ["bu-w", "bu-f", "bu-b"], (o) => {
      const w = num($("bu-w").value), f = num($("bu-f").value), b = num($("bu-b").value);
      if (!w || !f || b === null) return out(o, '<span class="err">Completa los tres campos.</span>');
      const bw = w / 8, tr = Math.ceil(b / bw);
      out(o, `Por transferencia  ${w} bits = <b>${bw} bytes</b>\nTransferencias     ${es(b)} ÷ ${bw} = <b>${tr}</b>\nCada ciclo         1 ÷ ${es(f)} = ${t(1 / f)}\n\nTiempo total       <b>${t(tr / f)}</b>\nAncho de banda     ${bw} × ${es(f)} = ${es(bw * f / 1e6)} MB/s`);
    });
})();
/* Las calculadoras cambian la altura de la página al pintarse: si se llegó con un ancla (#h-karnaugh), se vuelve a ella. */
(function () {
  const t = location.hash && document.getElementById(location.hash.slice(1));
  if (t) requestAnimationFrame(() => t.scrollIntoView({ behavior: "instant", block: "start" }));
})();
