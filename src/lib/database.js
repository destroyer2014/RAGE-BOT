// ═══════════════════════════════════════════
//       PRAGMATA BOT — src/lib/database.js
//   Sistema de niveles, XP y premium
// ═══════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../../data");
const USERS_FILE = join(DB_PATH, "users.json");

// ── Asegurar que exista la carpeta data ─────
if (!existsSync(DB_PATH)) mkdirSync(DB_PATH, { recursive: true });

// ── Cargar / guardar BD ─────────────────────
function loadDB() {
  if (!existsSync(USERS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveDB(db) {
  writeFileSync(USERS_FILE, JSON.stringify(db, null, 2));
}

// ── XP necesario por nivel ──────────────────
function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

// ── Obtener o crear usuario ─────────────────
export function getUser(jid) {
  const db = loadDB();
  const raw = (jid || "").replace(/:[0-9]+@/g, "@");
  const id = raw.split("@")[0] || "unknown";
  if (!id || id === "unknown") return { xp: 0, level: 1, premium: false, premiumExpiry: null, commandsUsed: 0 };
  // Prefer @s.whatsapp.net JIDs (real numbers) over @lid JIDs
  const isLid = (jid || "").includes("@lid");
  if (!db[id]) {
    db[id] = {
      jid: isLid ? jid : jid, // store original
      phone: isLid ? null : id, // real phone number if available
      xp: 0,
      level: 1,
      premium: false,
      premiumExpiry: null,
      commandsUsed: 0,
      createdAt: Date.now(),
    };
    saveDB(db);
  }
  // Update phone if we now have a real number
  if (!isLid && !db[id].phone) {
    db[id].phone = id;
    saveDB(db);
  }
  return db[id];
}

// ── Dar XP al usuario ───────────────────────
export function addXP(jid, amount = 10, pushName = null) {
  const db = loadDB();
  const raw = (jid || "").replace(/:[0-9]+@/g, "@");
  const id = raw.split("@")[0] || "unknown";
  if (!id || id === "unknown") return { leveledUp: false, newLevel: 1, xp: 0, nextXP: 100 };
  if (!db[id]) {
    db[id] = {
      jid,
      phone: jid.includes("@lid") ? null : id,
      xp: 0,
      level: 1,
      premium: false,
      premiumExpiry: null,
      commandsUsed: 0,
      createdAt: Date.now(),
    };
  }
  if (!db[id]) return { leveledUp: false, newLevel: 1, xp: 0, nextXP: 100 };

  db[id].xp = (db[id].xp || 0) + amount;
  db[id].commandsUsed = (db[id].commandsUsed || 0) + 1;
  if (pushName) db[id].name = pushName;

  // Verificar subida de nivel
  let leveledUp = false;
  let newLevel = db[id].level || 1;
  while (db[id].xp >= xpForLevel(newLevel)) {
    db[id].xp -= xpForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }
  db[id].level = newLevel;
  saveDB(db);

  return { leveledUp, newLevel, xp: db[id].xp, nextXP: xpForLevel(newLevel + 1) };
}

// ── Barra de progreso XP ────────────────────
export function xpBar(xp, nextXP, size = 10) {
  const pct = Math.min(xp / nextXP, 1);
  const filled = Math.round(pct * size);
  return "█".repeat(filled) + "░".repeat(size - filled);
}

// ── Dar premium ─────────────────────────────
export function setPremium(jid, active, days = 30) {
  const db = loadDB();
  const id = jid.split("@")[0];
  if (!db[id]) {
    db[id] = {
      jid,
      xp: 0,
      level: 1,
      premium: false,
      premiumExpiry: null,
      commandsUsed: 0,
      createdAt: Date.now(),
    };
  }
  db[id].premium = active;
  db[id].premiumExpiry = active
    ? Date.now() + days * 24 * 60 * 60 * 1000
    : null;
  saveDB(db);
}

// ── Verificar premium ───────────────────────
export function isPremium(jid) {
  if (!jid) return false;
  const user = getUser(jid);
  if (!user) return false;
  if (!user.premium) return false;
  if (user.premiumExpiry && Date.now() > user.premiumExpiry) {
    // Expiró
    const db = loadDB();
    const id = jid.split("@")[0];
    db[id].premium = false;
    db[id].premiumExpiry = null;
    saveDB(db);
    return false;
  }
  return true;
}

// ── Modificar XP manualmente (owner) ────────
export function setXP(jid, amount, mode = "add") {
  const db = loadDB();
  const raw = (jid || "").replace(/:[0-9]+@/g, "@");
  const id = raw.split("@")[0] || "unknown";
  if (!id || id === "unknown") return null;
  if (!db[id]) {
    db[id] = { jid, phone: jid.includes("@lid") ? null : id, xp: 0, level: 1, premium: false, premiumExpiry: null, commandsUsed: 0, createdAt: Date.now() };
  }
  if (mode === "add") {
    db[id].xp = (db[id].xp || 0) + amount;
  } else if (mode === "remove") {
    db[id].xp = Math.max(0, (db[id].xp || 0) - amount);
  } else if (mode === "set") {
    db[id].xp = Math.max(0, amount);
  }
  // Recalcular nivel completo
  let level = 1;
  let remaining = db[id].xp;
  for (let l = 1; l <= 200; l++) {
    const needed = xpForLevel(l);
    if (remaining >= needed) { remaining -= needed; level = l + 1; } else break;
  }
  db[id].xp = remaining;
  db[id].level = level;
  saveDB(db);
  return { xp: db[id].xp, level: db[id].level };
}

// ── Reset XP y nivel de todos los usuarios ──
export function resetAllXP() {
  const db = loadDB();
  for (const id of Object.keys(db)) {
    db[id].xp = 0;
    db[id].level = 1;
    db[id].commandsUsed = 0;
  }
  saveDB(db);
  return Object.keys(db).length;
}

// ── Top 10 usuarios ─────────────────────────
export function getTopUsers(limit = 10) {
  const db = loadDB();
  return Object.entries(db)
    .filter(([id]) => id !== "unknown")
    .map(([id, u]) => ({
      id,
      displayId: u.name || u.phone || id,
      ...u
    }))
    .filter(u => u.xp > 0)
    .sort((a, b) => (b.level * 10000 + b.xp) - (a.level * 10000 + a.xp))
    .slice(0, limit);
}

// ── Stats globales ──────────────────────────
export function getDiosUsers() {
  const db = loadDB();
  return Object.values(db).filter(u =>
    u.premium &&
    u.premiumPlan === "dios" &&
    u.premiumExpiry && Date.now() < u.premiumExpiry
  ).map(u => u.name || u.phone || "???");
}

export function getStats() {
  const db = loadDB();
  const users = Object.values(db);
  return {
    totalUsers: users.length,
    premiumUsers: users.filter((u) => u.premium).length,
    totalCommands: users.reduce((acc, u) => acc + (u.commandsUsed || 0), 0),
  };
}

export { xpForLevel };

// ── Planes premium ──────────────────────────
// semanal | plata | dorado | king | dios | creador
// nsfwLimit = límite diario de comandos !menunsfw (null = ilimitado)
export const PLANES = {
  semanal: { nombre: "Rage-Semanal", dias: 7,   xpBonus: 1.1, oroBonus: 1.0, dailyLimit: 30,  nsfwLimit: 30   },
  plata:   { nombre: "Rage-Plata",   dias: 15,  xpBonus: 1.2, oroBonus: 1.0, dailyLimit: 15,  nsfwLimit: 50   },
  dorado:  { nombre: "Rage-Dorado",  dias: 30,  xpBonus: 1.5, oroBonus: 1.3, dailyLimit: 30,  nsfwLimit: 80   },
  king:    { nombre: "King-Rage",    dias: 30,  xpBonus: 1.5, oroBonus: 1.3, dailyLimit: 60,  nsfwLimit: 150  },
  dios:    { nombre: "Dios-Rage",    dias: 30,  xpBonus: 2.0, oroBonus: 1.6, dailyLimit: null, nsfwLimit: null },  // null = ilimitado
  creador: { nombre: "Rage-Creador",  dias: 30,  xpBonus: 2.5, oroBonus: 2.0, dailyLimit: null, nsfwLimit: null },  // bot personalizado
};

// ── Límite diario NSFW ───────────────────────
// Para usuarios sin premium: 10 usos/día
// El contador se guarda en user.nsfwDailyUsed / user.nsfwDailyReset
export const FREE_NSFW_LIMIT = 10;

export function checkNsfwLimit(jid) {
  const db = loadDB();
  const raw = (jid || "").replace(/:[0-9]+@/g, "@");
  const id  = raw.split("@")[0] || "unknown";
  if (!id || id === "unknown") return { ok: true };

  // Owner no tiene límite
  // (el owner check se hace en el handler, aquí solo miramos el plan)

  if (!db[id]) {
    db[id] = { jid, phone: id, xp: 0, level: 1, premium: false, premiumExpiry: null, commandsUsed: 0, createdAt: Date.now() };
  }

  const user = db[id];

  // Resetear si pasó el día
  if (Date.now() > (user.nsfwDailyReset || 0)) {
    user.nsfwDailyUsed  = 0;
    user.nsfwDailyReset = Date.now() + 24 * 60 * 60 * 1000;
    db[id] = user;
    saveDB(db);
  }

  // Determinar límite según plan
  let limit;
  if (user.premium && user.premiumExpiry && Date.now() < user.premiumExpiry) {
    const plan = PLANES[user.premiumPlan];
    limit = plan ? plan.nsfwLimit : FREE_NSFW_LIMIT;
  } else {
    limit = FREE_NSFW_LIMIT;
  }

  // null = ilimitado (Dios-Rage)
  if (limit === null) return { ok: true, unlimited: true, used: user.nsfwDailyUsed || 0, limit: null, plan: user.premiumPlan };

  const used = user.nsfwDailyUsed || 0;
  if (used >= limit) {
    return { ok: false, used, limit, plan: user.premiumPlan || null };
  }

  // Consumir uso
  user.nsfwDailyUsed  = used + 1;
  user.nsfwDailyReset = user.nsfwDailyReset || Date.now() + 24 * 60 * 60 * 1000;
  db[id] = user;
  saveDB(db);
  return { ok: true, used: user.nsfwDailyUsed, limit, plan: user.premiumPlan || null };
}

export function setPremiumPlan(jid, plan) {
  if (!PLANES[plan]) return false;
  const db = loadDB();
  const raw = (jid || "").replace(/:[0-9]+@/g, "@");
  const id  = raw.split("@")[0] || "unknown";
  if (!id || id === "unknown") return false;
  if (!db[id]) {
    db[id] = { jid, phone: id, xp: 0, level: 1, premium: false, premiumExpiry: null, commandsUsed: 0, createdAt: Date.now() };
  }
  db[id].premium       = true;
  db[id].premiumPlan   = plan;
  db[id].premiumExpiry = Date.now() + PLANES[plan].dias * 24 * 60 * 60 * 1000;
  db[id].dailyLimit    = PLANES[plan].dailyLimit;   // null = ilimitado (Dios)
  db[id].dailyUsed     = 0;
  db[id].dailyReset    = Date.now() + 24 * 60 * 60 * 1000;
  if (!db[id].premiumHistory) db[id].premiumHistory = [];
  db[id].premiumHistory.push(Date.now());
  saveDB(db);
  return true;
}

export function getPremiumPlan(jid) {
  if (!jid) return null;
  const user = getUser(jid);
  if (!user || !user.premium) return null;
  if (user.premiumExpiry && Date.now() > user.premiumExpiry) return null;
  return user.premiumPlan || "plata";
}

export function isPlanAtLeast(jid, minPlan) {
  const order = ["plata","dorado","king","dios","creador"];
  const plan  = getPremiumPlan(jid);
  if (!plan) return false;
  return order.indexOf(plan) >= order.indexOf(minPlan);
}

// ── Rangos especiales (lesbiana / gei) ──────
export function setRangoEspecial(jid, rango) {
  const db = loadDB();
  const id = jid.split("@")[0];
  if (!db[id]) {
    db[id] = { jid, xp: 0, level: 1, premium: false, premiumExpiry: null, commandsUsed: 0, createdAt: Date.now() };
  }
  const dias = 7;
  db[id].premium = true;
  db[id].premiumExpiry = Date.now() + dias * 24 * 60 * 60 * 1000;
  db[id].rangoEspecial = rango;         // "lesbiana" | "gei"
  db[id].rangoExpiry   = db[id].premiumExpiry;
  db[id].dailyLimit    = 10;            // máximo de comandos premium por día
  db[id].dailyUsed     = 0;
  db[id].dailyReset    = Date.now() + 24 * 60 * 60 * 1000;
  saveDB(db);
}

export function checkDailyLimit(jid) {
  const db = loadDB();
  const id = jid.split("@")[0];
  const user = db[id];

  // Sin plan asignado = sin límite tracking (owner, usuarios sin dailyLimit definido)
  if (!user) return { ok: true };

  // Ilimitado: plan Dios (dailyLimit === null explícito) o sin límite definido
  if (user.dailyLimit === null) return { ok: true, unlimited: true };
  if (!user.dailyLimit) return { ok: true };

  // Resetear contador si pasó el día
  if (Date.now() > (user.dailyReset || 0)) {
    user.dailyUsed  = 0;
    user.dailyReset = Date.now() + 24 * 60 * 60 * 1000;
    saveDB(db);
  }

  if (user.dailyUsed >= user.dailyLimit) {
    return { ok: false, used: user.dailyUsed, limit: user.dailyLimit, plan: user.premiumPlan };
  }
  user.dailyUsed = (user.dailyUsed || 0) + 1;
  saveDB(db);
  return { ok: true, used: user.dailyUsed, limit: user.dailyLimit, plan: user.premiumPlan };
}

// ── Configuración de grupos ──────────────────
const GROUPS_FILE = join(DB_PATH, "groups.json");

function loadGroups() {
  try { return JSON.parse(readFileSync(GROUPS_FILE, "utf8")); } catch { return {}; }
}
function saveGroups(db) { writeFileSync(GROUPS_FILE, JSON.stringify(db, null, 2)); }

export function getGroupConfig(groupId) {
  const db = loadGroups();
  return db[groupId] || { welcome: false, antilink: false };
}

export function setGroupConfig(groupId, key, value) {
  const db = loadGroups();
  if (!db[groupId]) db[groupId] = { welcome: false, antilink: false };
  db[groupId][key] = value;
  saveGroups(db);
}

// ── Estadísticas de grupo (contadores de mensajes) ────────────
const STATS_FILE = join(__dirname, "../../data/group-stats.json");
function loadStats() {
  if (!existsSync(STATS_FILE)) return {};
  try { return JSON.parse(readFileSync(STATS_FILE, "utf-8")); } catch { return {}; }
}
function saveStats(db) { writeFileSync(STATS_FILE, JSON.stringify(db, null, 2)); }

export function trackMessage(groupId, senderJid) {
  const db  = loadStats();
  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][hoy]) db[groupId][hoy] = {};
  const id = senderJid.split("@")[0];
  db[groupId][hoy][id] = (db[groupId][hoy][id] || 0) + 1;
  saveStats(db);
}

export function getGroupStats(groupId, dias = 7) {
  const db = loadStats();
  if (!db[groupId]) return { total: 0, porUsuario: {}, porDia: {} };
  const hoy   = new Date();
  const porUsuario = {};
  const porDia     = {};
  for (let i = 0; i < dias; i++) {
    const d = new Date(hoy); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (!db[groupId][key]) continue;
    porDia[key] = Object.values(db[groupId][key]).reduce((a, b) => a + b, 0);
    for (const [user, count] of Object.entries(db[groupId][key])) {
      porUsuario[user] = (porUsuario[user] || 0) + count;
    }
  }
  const total = Object.values(porDia).reduce((a, b) => a + b, 0);
  return { total, porUsuario, porDia };
}
