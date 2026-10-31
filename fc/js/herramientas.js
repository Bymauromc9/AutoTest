/*!
 * herramientas.js — herramientas interactivas de la guía de prácticas de FC:
 *   · Bytes (tema 2): codifica un valor (enteros con signo en C2, sin signo, IEEE 754 simple y doble,
 *     texto ASCII/UTF-8) en bytes little o big endian, y decodifica una ristra de bytes a partir de un
 *     desplazamiento como hace la tabla de decodificación de okteta.
 *   · Red IP (tema 6): máscara, dirección de red, broadcast, rango de hosts y si dos IP están en la misma red.
 * Cada herramienta sólo se activa si su contenedor existe en la página. Requiere: assets/js/core.js.
 */
(function () {
  "use strict";
  const esc = window.App.esc;
  const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, "0");
  const bin8 = (n) => n.toString(2).padStart(8, "0");

  /* ======================= Bytes ======================= */
  const TYPES = {
    i8: { n: 1, label: "Entero con signo de 8 bits (C2)", set: (v, x) => v.setInt8(0, x), get: (v, o) => v.getInt8(o) },
    u8: { n: 1, label: "Entero sin signo de 8 bits", set: (v, x) => v.setUint8(0, x), get: (v, o) => v.getUint8(o) },
    i16: { n: 2, label: "Entero con signo de 16 bits (C2)", set: (v, x, le) => v.setInt16(0, x, le), get: (v, o, le) => v.getInt16(o, le) },
    u16: { n: 2, label: "Entero sin signo de 16 bits", set: (v, x, le) => v.setUint16(0, x, le), get: (v, o, le) => v.getUint16(o, le) },
    i32: { n: 4, label: "Entero con signo de 32 bits (C2)", set: (v, x, le) => v.setInt32(0, x, le), get: (v, o, le) => v.getInt32(o, le) },
    u32: { n: 4, label: "Entero sin signo de 32 bits", set: (v, x, le) => v.setUint32(0, x, le), get: (v, o, le) => v.getUint32(o, le) },
    f32: { n: 4, label: "Real IEEE 754 simple (32 bits)", set: (v, x, le) => v.setFloat32(0, x, le), get: (v, o, le) => v.getFloat32(o, le) },
    f64: { n: 8, label: "Real IEEE 754 doble (64 bits)", set: (v, x, le) => v.setFloat64(0, x, le), get: (v, o, le) => v.getFloat64(o, le) }
  };
  const RANGES = { i8: [-128, 127], u8: [0, 255], i16: [-32768, 32767], u16: [0, 65535], i32: [-2147483648, 2147483647], u32: [0, 4294967295] };

  function parseNum(s) { return Number(String(s).trim().replace(",", ".")); }
  function fmtReal(x) {
    if (!isFinite(x)) return isNaN(x) ? "NaN" : (x > 0 ? "+∞" : "−∞");
    const s = String(Number(x.toPrecision(9)));
    return s.replace(".", ",");
  }
  function fieldsIEEE(bytesBE, single) {
    const bits = bytesBE.map(bin8).join("");
    const ne = single ? 8 : 11, S = single ? 127 : 1023;
    const s = bits[0], e = bits.slice(1, 1 + ne), m = bits.slice(1 + ne);
    const ev = parseInt(e, 2);
    let kind = `e = ${ev} → E = ${ev} − ${S} = ${ev - S}; M = 1,${m.replace(/0+$/, "") || "0"}`;
    if (ev === 0) kind = /1/.test(m) ? "e = 0 y m ≠ 0: desnormalizado (M = 0,m; E = " + (1 - S) + ")" : "e = 0 y m = 0: cero";
    if (ev === (single ? 255 : 2047)) kind = /1/.test(m) ? "e todo a 1 y m ≠ 0: NaN" : "e todo a 1 y m = 0: infinito";
    return `<div class="ieee"><span class="f-s" title="signo">${s}</span><span class="f-e" title="exponente">${e}</span><span class="f-m" title="mantisa">${m}</span></div><p class="tool-note">s = ${s} · ${esc(kind)}</p>`;
  }

  function encode(type, raw, le) {
    if (type === "ascii" || type === "utf8") {
      const bytes = type === "utf8" ? Array.from(new TextEncoder().encode(raw)) : Array.from(raw).map((c) => c.charCodeAt(0));
      if (type === "ascii" && bytes.some((b) => b > 127)) return { err: "Hay caracteres fuera de ASCII (códigos mayores que 127). Usa UTF-8." };
      return { bytes, note: type === "utf8" ? "Cada carácter ASCII ocupa 1 byte; ñ, á, € ocupan 2 o 3." : "ASCII: 7 bits por carácter, guardado en un byte." };
    }
    const T = TYPES[type], x = parseNum(raw);
    if (raw.trim() === "" || isNaN(x)) return { err: "Escribe un número (puedes usar coma o punto decimal)." };
    if (RANGES[type]) {
      if (!Number.isInteger(x)) return { err: "Un entero no puede tener decimales." };
      const [lo, hi] = RANGES[type];
      if (x < lo || x > hi) return { err: `Fuera de rango: con este tipo sólo caben valores de ${lo} a ${hi}.` };
    }
    const buf = new DataView(new ArrayBuffer(T.n));
    T.set(buf, x, le);
    const bytes = Array.from(new Uint8Array(buf.buffer));
    const be = le ? bytes.slice().reverse() : bytes;
    let note = "";
    if (type === "f32" || type === "f64") {
      const back = T.get(buf, 0, le);
      note = fieldsIEEE(be, type === "f32") + (back !== x ? `<p class="tool-note">No es exacto: se guarda ${fmtReal(back)}.</p>` : "");
    } else if (x < 0) note = `<p class="tool-note">Negativo: se guarda en complemento a 2 (invertir los bits de ${-x} y sumar 1).</p>`;
    return { bytes, be, note };
  }

  function bytesTool(root) {
    root.innerHTML = `
      <div class="tool-grid">
        <section class="tool-part" aria-labelledby="tb-h1"><h4 id="tb-h1">Codificar un valor</h4>
          <label>Tipo <select id="tb-type">${Object.keys(TYPES).map((k) => `<option value="${k}"${k === "i32" ? " selected" : ""}>${TYPES[k].label}</option>`).join("")}<option value="ascii">Texto ASCII</option><option value="utf8">Texto UTF-8</option></select></label>
          <label>Valor <input id="tb-val" type="text" value="-140506" autocomplete="off" spellcheck="false"></label>
          <label class="chk"><input id="tb-le" type="checkbox" checked> Little endian (como x86 y los ficheros del boletín)</label>
          <div id="tb-out" class="tool-out" aria-live="polite"></div>
        </section>
        <section class="tool-part" aria-labelledby="tb-h2"><h4 id="tb-h2">Decodificar bytes (como okteta)</h4>
          <label>Bytes en hexadecimal <textarea id="tb-hex" rows="3" spellcheck="false">48 6F 6C 61 FA FF 00 00 01 00 00 00 00 40 52 B8 1E 85 EB 51 12 40</textarea></label>
          <div class="row"><label>Desplazamiento (offset) <input id="tb-off" type="text" value="0x04" autocomplete="off"></label>
          <label class="chk"><input id="tb-le2" type="checkbox" checked> Little endian</label></div>
          <p class="tool-note">Pulsa un byte del volcado para colocar el cursor en él.</p>
          <div id="tb-dump" class="dump"></div>
          <div id="tb-dec" class="tool-out" aria-live="polite"></div>
        </section>
      </div>`;
    const $ = (id) => root.querySelector("#" + id);
    function doEncode() {
      const r = encode($("tb-type").value, $("tb-val").value, $("tb-le").checked);
      if (r.err) { $("tb-out").innerHTML = `<p class="err">${esc(r.err)}</p>`; return; }
      $("tb-out").innerHTML = `<p class="bytes">${r.bytes.map((b, i) => `<span><small>+${i}</small>${hex2(b)}</span>`).join("")}</p>` +
        (r.be && r.bytes.length > 1 ? `<p class="tool-note">Valor en hexadecimal (orden natural, big endian): <b>${r.be.map(hex2).join("")}</b>${$("tb-le").checked ? " · en memoria van al revés porque es little endian" : ""}</p>` : "") +
        (r.bytes.length <= 4 ? `<p class="tool-note">Binario: ${(r.be || r.bytes).map(bin8).join(" ")}</p>` : "") + (r.note || "");
    }
    function parseHex() {
      const t = $("tb-hex").value.replace(/0x/gi, " ").replace(/[^0-9a-fA-F]/g, " ").trim();
      if (!t) return [];
      const parts = t.split(/\s+/).flatMap((p) => p.length > 2 ? p.match(/.{1,2}/g) : [p]);
      return parts.map((p) => parseInt(p, 16));
    }
    function doDecode() {
      const B = parseHex();
      let off = $("tb-off").value.trim();
      off = /^0x/i.test(off) ? parseInt(off, 16) : parseInt(off, 10);
      if (isNaN(off) || off < 0) off = 0;
      $("tb-dump").innerHTML = B.length ? `<table class="dumpt mat"><tbody>${Array.from({ length: Math.ceil(B.length / 8) }, (_, r) => `<tr><th>${hex2(r * 8).padStart(4, "0")}</th>${B.slice(r * 8, r * 8 + 8).map((b, k) => { const i = r * 8 + k; return `<td><button type="button" data-off="${i}" class="${i === off ? "cur" : ""}" title="offset ${i} (0x${hex2(i)})">${hex2(b)}</button></td>`; }).join("")}<td class="asc">${B.slice(r * 8, r * 8 + 8).map((b) => b >= 32 && b < 127 ? esc(String.fromCharCode(b)) : "·").join("")}</td></tr>`).join("")}</tbody></table>` : "";
      $("tb-dump").querySelectorAll("[data-off]").forEach((b) => b.onclick = () => { $("tb-off").value = "0x" + hex2(+b.dataset.off); doDecode(); });
      if (!B.length) { $("tb-dec").innerHTML = ""; return; }
      if (off >= B.length) { $("tb-dec").innerHTML = `<p class="err">El desplazamiento está fuera del fichero (tiene ${B.length} bytes).</p>`; return; }
      const v = new DataView(new Uint8Array(B).buffer), le = $("tb-le2").checked;
      const rows = Object.keys(TYPES).map((k) => {
        const T = TYPES[k];
        if (off + T.n > B.length) return `<tr><td>${T.label}</td><td class="na">faltan bytes</td></tr>`;
        const x = T.get(v, off, le);
        const used = B.slice(off, off + T.n).map(hex2).join(" ");
        return `<tr><td>${T.label}</td><td><b>${k[0] === "f" ? fmtReal(x) : x}</b> <span class="used">${used}</span></td></tr>`;
      });
      const txt = B.slice(off).map((b) => b >= 32 && b < 127 ? String.fromCharCode(b) : "·").join("");
      rows.push(`<tr><td>Caracteres ASCII desde aquí</td><td><code>${esc(txt.slice(0, 32))}</code></td></tr>`);
      $("tb-dec").innerHTML = `<div class="tablewrap"><table><thead><tr><th>Interpretado como…</th><th>Valor (bytes usados)</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
    }
    ["tb-type", "tb-val", "tb-le"].forEach((id) => { $(id).addEventListener("input", doEncode); $(id).addEventListener("change", doEncode); });
    ["tb-hex", "tb-off", "tb-le2"].forEach((id) => { $(id).addEventListener("input", doDecode); $(id).addEventListener("change", doDecode); });
    doEncode(); doDecode();
  }

  /* ======================= Red IP ======================= */
  function ip2int(s) {
    const m = /^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*$/.exec(s);
    if (!m) return null;
    const p = m.slice(1).map(Number);
    if (p.some((x) => x > 255)) return null;
    return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
  }
  const int2ip = (n) => [24, 16, 8, 0].map((k) => (n >>> k) & 255).join(".");
  const maskOf = (x) => x === 0 ? 0 : (0xFFFFFFFF << (32 - x)) >>> 0;
  function parseCidr(s, maskTxt) {
    s = s.trim();
    let ip, x;
    const m = /^(.+?)\s*\/\s*(\d{1,2})$/.exec(s);
    if (m) { ip = ip2int(m[1]); x = +m[2]; }
    else {
      ip = ip2int(s);
      const mk = ip2int(maskTxt || "");
      if (mk == null) return { err: "Escribe la IP con su prefijo (p. ej. 155.54.12.219/20) o rellena la máscara." };
      const b = mk.toString(2).padStart(32, "0");
      if (!/^1*0*$/.test(b)) return { err: "La máscara no es válida: debe tener todos los unos seguidos a la izquierda." };
      x = b.indexOf("0") === -1 ? 32 : b.indexOf("0");
    }
    if (ip == null) return { err: "La dirección IP no es válida: cuatro números de 0 a 255 separados por puntos." };
    if (x > 32) return { err: "El prefijo /x va de 0 a 32." };
    return { ip, x };
  }
  function binIP(n, x) {
    const b = n.toString(2).padStart(32, "0");
    return [0, 8, 16, 24].map((k) => b.slice(k, k + 8).split("").map((c, j) => `<span class="${k + j < x ? "net" : "host"}">${c}</span>`).join("")).join(".");
  }
  function ipTool(root) {
    root.innerHTML = `
      <div class="row"><label>Dirección IP (con /x) <input id="ti-ip" type="text" value="155.54.12.219/20" autocomplete="off" spellcheck="false"></label>
      <label>…o máscara <input id="ti-mask" type="text" value="" placeholder="255.255.240.0" autocomplete="off" spellcheck="false"></label>
      <label>Otra IP para comparar <input id="ti-other" type="text" value="155.54.3.7" autocomplete="off" spellcheck="false"></label></div>
      <div id="ti-out" class="tool-out" aria-live="polite"></div>`;
    const $ = (id) => root.querySelector("#" + id);
    function run() {
      const r = parseCidr($("ti-ip").value, $("ti-mask").value);
      if (r.err) { $("ti-out").innerHTML = `<p class="err">${esc(r.err)}</p>`; return; }
      const mk = maskOf(r.x), net = (r.ip & mk) >>> 0, bc = (net | (~mk >>> 0)) >>> 0;
      const total = 2 ** (32 - r.x), hosts = r.x >= 31 ? (r.x === 31 ? 2 : 1) : total - 2;
      let cmp = "";
      const o = ip2int($("ti-other").value);
      if ($("ti-other").value.trim()) {
        if (o == null) cmp = `<p class="err">La IP para comparar no es válida.</p>`;
        else {
          const same = ((o & mk) >>> 0) === net;
          cmp = `<p class="${same ? "okv" : "badv"}">${same ? "✔ Están en la misma red" : "✘ No están en la misma red"}</p><p class="tool-note">${esc($("ti-other").value.trim())} AND máscara = ${int2ip((o & mk) >>> 0)}${same ? " (el mismo netid): se comunican directamente." : `, distinto de ${int2ip(net)}: el paquete irá al router por defecto.`}</p>`;
        }
      }
      $("ti-out").innerHTML = `
        <div class="tablewrap"><table><tbody>
          <tr><td>Máscara /${r.x}</td><td><b>${int2ip(mk)}</b></td><td class="binc">${binIP(mk, r.x)}</td></tr>
          <tr><td>IP</td><td>${int2ip(r.ip)}</td><td class="binc">${binIP(r.ip, r.x)}</td></tr>
          <tr><td>Dirección de red (hostid a 0)</td><td><b>${int2ip(net)}/${r.x}</b></td><td class="binc">${binIP(net, r.x)}</td></tr>
          <tr><td>Broadcast (hostid a 1)</td><td><b>${int2ip(bc)}</b></td><td class="binc">${binIP(bc, r.x)}</td></tr>
          <tr><td>Hosts</td><td colspan="2">2<sup>${32 - r.x}</sup> = ${total.toLocaleString("es-ES")} direcciones − 2 = <b>${hosts.toLocaleString("es-ES")}</b>${r.x <= 30 ? ` · de ${int2ip(net + 1)} a ${int2ip(bc - 1)}` : ""}</td></tr>
        </tbody></table></div>
        <p class="tool-note"><span class="net">En azul</span>, los bits de red (netid); <span class="host">en gris</span>, los de host (hostid).</p>${cmp}`;
    }
    ["ti-ip", "ti-mask", "ti-other"].forEach((id) => $(id).addEventListener("input", run));
    run();
  }

  const tb = document.getElementById("tool-bytes"); if (tb) bytesTool(tb);
  const ti = document.getElementById("tool-ip"); if (ti) ipTool(ti);
})();
