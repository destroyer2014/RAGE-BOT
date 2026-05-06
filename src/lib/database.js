// ═══════════════════════════════════════════
//       RAGE-BOT — src/lib/database.js
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
