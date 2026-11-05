#!/usr/bin/env node
/*!
 * admin.js — administración de las cuentas de la web (Firebase), desde tu ordenador.
 *
 *   node admin.js listar                         todas las cuentas con sus puntos
 *   node admin.js resetear <usuario> <contraseña> pone una contraseña nueva (conserva puntos y progreso)
 *   node admin.js borrar <usuario>               borra la cuenta, sus puntos y su progreso (pide confirmación)
 *   node admin.js admin <usuario>                le da acceso al panel de administración (admin.html)
 *   node admin.js quitar-admin <usuario>         se lo quita
 *   node admin.js admins                         lista quién es administrador
 *   node admin.js reglas                         publica firestore.rules (guarda antes una copia de las publicadas)
 *
 * Ser administrador es una «custom claim» de Firebase (admin: true) que viaja en el token de la sesión:
 * las reglas de Firestore (firestore.rules) la exigen para escribir avisos, fechas de exámenes, corregir
 * puntos o ver los reportes. También se apunta en usuarios/<uid>.admin para que el panel lo muestre.
 * El cambio llega a la web cuando se renueva el token (como mucho en una hora) o al volver a entrar.
 *
 * Necesita la clave de administrador del proyecto en esta carpeta con el nombre clave-admin.json:
 *   Firebase → ⚙ Configuración del proyecto → Cuentas de servicio → «Generar nueva clave privada».
 * Esa clave da control total del proyecto: NO la compartas ni la subas a GitHub (.gitignore ya la excluye).
 *
 * Primera vez: en esta carpeta, `npm install`.
 */
"use strict";
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const PROYECTO = "web-ing-inf";
const DOMINIO = "usuarios.web-ing-inf.firebaseapp.com";   // igual que en assets/js/cuentas.js
const CLAVE = process.env.CLAVE_ADMIN || path.join(__dirname, "clave-admin.json");

/** Correo interno de un usuario: en minúsculas y sin tildes (como en la web). */
const correoDe = (n) => String(n || "").normalize("NFC").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@" + DOMINIO;

function salir(msg) { console.error("\n  " + msg + "\n"); process.exit(1); }

function iniciar() {
  let app, auth, firestore, reglas;
  try { app = require("firebase-admin/app"); auth = require("firebase-admin/auth"); firestore = require("firebase-admin/firestore"); reglas = require("firebase-admin/security-rules"); }
  catch (e) { salir("Falta instalar las dependencias. En esta carpeta ejecuta:  npm install"); }
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {               // pruebas con los emuladores
    app.initializeApp({ projectId: PROYECTO });
  } else {
    if (!fs.existsSync(CLAVE)) {
      salir("No encuentro la clave de administrador (" + path.basename(CLAVE) + ").\n\n" +
        "  1. Firebase → ⚙ Configuración del proyecto → Cuentas de servicio\n" +
        "  2. «Generar nueva clave privada» → se descarga un .json\n" +
        "  3. Muévelo a esta carpeta (" + __dirname + ") y llámalo clave-admin.json");
    }
    const cred = JSON.parse(fs.readFileSync(CLAVE, "utf8"));
    if (cred.project_id !== PROYECTO) salir("Esa clave es del proyecto «" + cred.project_id + "», no de «" + PROYECTO + "».");
    app.initializeApp({ credential: app.cert(cred), projectId: PROYECTO });
  }
  return { auth: auth.getAuth(), db: firestore.getFirestore(), reglas: () => reglas.getSecurityRules() };
}

function preguntar(txt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((ok) => rl.question(txt, (r) => { rl.close(); ok(r); }));
}
const fecha = (s) => s ? new Date(s).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" }) : "—";

/** Busca una cuenta por su nombre de usuario: { uid, correo, user|null, datos|null } */
async function buscar({ auth, db }, nombre) {
  const correo = correoDe(nombre);
  let user = null;
  try { user = await auth.getUserByEmail(correo); }
  catch (e) { if (e.code !== "auth/user-not-found") throw e; }
  let uid = user && user.uid, datos = null;
  if (uid) { const d = await db.collection("usuarios").doc(uid).get(); datos = d.exists ? d.data() : null; }
  else {
    // Sin cuenta pero con documento (p. ej. si se borró sólo en Authentication): se busca por el campo id.
    const q = await db.collection("usuarios").where("id", "==", correo.split("@")[0]).limit(1).get();
    if (!q.empty) { uid = q.docs[0].id; datos = q.docs[0].data(); }
  }
  return { uid, correo, user, datos };
}

async function listar(fb) {
  const usuarios = new Map();
  (await fb.db.collection("usuarios").get()).forEach((d) => usuarios.set(d.id, d.data()));
  const filas = [];
  let token;
  do {
    const r = await fb.auth.listUsers(1000, token);
    r.users.forEach((u) => {
      const d = usuarios.get(u.uid) || {};
      usuarios.delete(u.uid);
      const estado = [u.disabled ? "desactivada" : "", d.bloqueado ? "bloqueada en el ranking" : ""].filter(Boolean).join(", ");
      filas.push({ usuario: d.nombre || (u.email || "").split("@")[0], puntos: d.puntos || 0, tests: d.tests || 0,
        creada: fecha(u.metadata.creationTime), "último acceso": fecha(u.metadata.lastSignInTime),
        rol: (u.customClaims || {}).admin ? "admin" : "", estado });
    });
    token = r.pageToken;
  } while (token);
  usuarios.forEach((d) => filas.push({ usuario: d.nombre, puntos: d.puntos || 0, tests: d.tests || 0, creada: "—", "último acceso": "—", rol: "", estado: "SIN CUENTA (fantasma)" }));
  filas.sort((a, b) => b.puntos - a.puntos);
  if (!filas.length) return console.log("\n  Todavía no hay ninguna cuenta.\n");
  console.log("\n  " + filas.length + (filas.length === 1 ? " cuenta" : " cuentas") + ":\n");
  console.table(filas);
}

async function resetear(fb, nombre, pass) {
  if (!nombre || !pass) salir("Uso:  node admin.js resetear <usuario> <contraseña nueva>");
  if (pass.length < 6) salir("La contraseña debe tener al menos 6 caracteres.");
  const c = await buscar(fb, nombre);
  if (!c.user) salir("No existe ninguna cuenta con el usuario «" + nombre + "».");
  await fb.auth.updateUser(c.user.uid, { password: pass });
  await fb.auth.revokeRefreshTokens(c.user.uid);       // cierra la sesión en todos sus dispositivos
  console.log("\n  ✔ Contraseña de «" + ((c.datos && c.datos.nombre) || nombre) + "» cambiada." +
    "\n    Conserva sus " + ((c.datos && c.datos.puntos) || 0) + " puntos y su progreso; tendrá que volver a entrar con la contraseña nueva.\n");
}

async function borrar(fb, nombre) {
  if (!nombre) salir("Uso:  node admin.js borrar <usuario>");
  const c = await buscar(fb, nombre);
  if (!c.uid) salir("No existe ninguna cuenta con el usuario «" + nombre + "».");
  const visible = (c.datos && c.datos.nombre) || nombre;
  console.log("\n  Vas a borrar la cuenta «" + visible + "»" + (c.datos ? " (" + (c.datos.puntos || 0) + " puntos, " + (c.datos.tests || 0) + " tests)" : "") +
    ": su usuario, sus puntos del ranking y su progreso guardado. No se puede deshacer.");
  const r = await preguntar("  Escribe el nombre de usuario para confirmar: ");
  if (correoDe(r) !== c.correo) salir("No coincide: no se ha borrado nada.");
  await fb.db.collection("usuarios").doc(c.uid).delete();
  await fb.db.collection("progreso").doc(c.uid).delete();
  if (c.user) await fb.auth.deleteUser(c.uid);
  console.log("\n  ✔ Cuenta «" + visible + "» borrada. Ese nombre de usuario vuelve a estar libre.\n");
}

/** Da o quita el rol de administrador: la claim admin del token y el campo admin del documento. */
async function hacerAdmin(fb, nombre, si) {
  if (!nombre) salir("Uso:  node admin.js " + (si ? "admin" : "quitar-admin") + " <usuario>");
  const c = await buscar(fb, nombre);
  if (!c.user) salir("No existe ninguna cuenta con el usuario «" + nombre + "».");
  const visible = (c.datos && c.datos.nombre) || nombre;
  const claims = Object.assign({}, c.user.customClaims || {});
  if (Boolean(claims.admin) === si) {
    console.log("\n  «" + visible + "» " + (si ? "ya era" : "no era") + " administrador: no hay nada que cambiar.\n");
    return;
  }
  if (si) claims.admin = true; else delete claims.admin;
  await fb.auth.setCustomUserClaims(c.uid, Object.keys(claims).length ? claims : null);
  if (c.datos) {
    const { FieldValue } = require("firebase-admin/firestore");
    await fb.db.collection("usuarios").doc(c.uid).update({ admin: si ? true : FieldValue.delete() });
  }
  console.log("\n  ✔ «" + visible + "» " + (si ? "ya es administrador." : "ya no es administrador.") +
    (si ? "\n    Al abrir admin.html (o «Tu cuenta») la web renueva su sesión y ya le deja entrar;" +
          "\n    el escudo de la barra superior le aparece en las demás páginas en menos de una hora.\n"
        : "\n    Su sesión actual puede seguir teniendo el permiso hasta una hora como mucho.\n"));
}

async function admins(fb) {
  const filas = [];
  let token;
  do {
    const r = await fb.auth.listUsers(1000, token);
    r.users.filter((u) => (u.customClaims || {}).admin).forEach((u) => filas.push({ usuario: (u.email || "").split("@")[0], "último acceso": fecha(u.metadata.lastSignInTime) }));
    token = r.pageToken;
  } while (token);
  if (!filas.length) return console.log("\n  Todavía no hay ningún administrador. Hazte uno con:  node admin.js admin <tu usuario>\n");
  console.log("\n  Administradores:\n");
  console.table(filas);
}

/** Publica ../../firestore.rules en el proyecto. Antes guarda las que hay publicadas en reglas-anteriores.rules. */
async function publicarReglas(fb) {
  const fichero = path.join(__dirname, "..", "..", "firestore.rules");
  if (!fs.existsSync(fichero)) salir("No encuentro " + fichero);
  const nuevas = fs.readFileSync(fichero, "utf8");
  const sr = fb.reglas();
  let actuales = null;
  try { actuales = await sr.getFirestoreRuleset(); } catch (e) { /* aún no hay reglas publicadas */ }
  if (actuales) {
    const viejas = actuales.source.map((f) => f.content).join("\n");
    if (viejas.trim() === nuevas.trim()) return console.log("\n  Las reglas publicadas ya son las de firestore.rules: no hay nada que cambiar.\n");
    fs.writeFileSync(path.join(__dirname, "reglas-anteriores.rules"), viejas);
    console.log("\n  Copia de las reglas publicadas ahora (" + (actuales.createTime || "") + ") en reglas-anteriores.rules");
  }
  const r = await preguntar("  ¿Publicar firestore.rules en «" + PROYECTO + "»? Escribe «si» para confirmar: ");
  if (r.trim().toLowerCase() !== "si" && r.trim().toLowerCase() !== "sí") return console.log("\n  Cancelado.\n");
  const rs = await sr.releaseFirestoreRulesetFromSource(nuevas);
  console.log("\n  Reglas publicadas (" + rs.name.split("/").pop() + "). Tardan un minuto en aplicarse.\n");
}

(async () => {
  const [cmd, ...args] = process.argv.slice(2);
  const ayuda = "Uso:\n" +
    "    node admin.js listar\n" +
    "    node admin.js resetear <usuario> <contraseña nueva>\n" +
    "    node admin.js borrar <usuario>\n" +
    "    node admin.js admin <usuario>\n" +
    "    node admin.js quitar-admin <usuario>\n" +
    "    node admin.js admins\n" +
    "    node admin.js reglas";
  if (!["listar", "resetear", "borrar", "admin", "quitar-admin", "admins", "reglas"].includes(cmd)) salir(ayuda);
  const fb = iniciar();
  try {
    if (cmd === "listar") await listar(fb);
    if (cmd === "resetear") await resetear(fb, args[0], args.slice(1).join(" "));
    if (cmd === "borrar") await borrar(fb, args[0]);
    if (cmd === "admin") await hacerAdmin(fb, args[0], true);
    if (cmd === "quitar-admin") await hacerAdmin(fb, args[0], false);
    if (cmd === "admins") await admins(fb);
    if (cmd === "reglas") await publicarReglas(fb);
    process.exit(0);
  } catch (e) {
    salir("Error: " + (e.message || e));
  }
})();
