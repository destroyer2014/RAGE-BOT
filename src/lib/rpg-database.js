// ═══════════════════════════════════════════
//     RAGE-BOT — src/lib/rpg-database.js
//              v3.0.0
// ═══════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const RPG_FILE = join(DATA_DIR, "rpg.json");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function loadDB() {
  try {
    if (existsSync(RPG_FILE)) return JSON.parse(readFileSync(RPG_FILE, "utf-8"));
  } catch {}
  return { players: {}, guilds: {} };
}
function saveDB() {
  writeFileSync(RPG_FILE, JSON.stringify(db, null, 2), "utf-8");
}
export const db = loadDB();

// ── Calidades ────────────────────────────────
export const CALIDAD = {
  comun:     { nombre: "Común",     emoji: "⬜", color: "⬜", multiplicador: 1.0 },
  raro:      { nombre: "Raro",      emoji: "🟦", color: "🔵", multiplicador: 1.3 },
  epico:     { nombre: "Épico",     emoji: "🟪", color: "🟣", multiplicador: 1.6 },
  legendario:{ nombre: "Legendario",emoji: "🟨", color: "🟡", multiplicador: 2.0 },
  mitico:    { nombre: "Mítico",    emoji: "🟥", color: "🔴", multiplicador: 2.8 },
};

// ── Clases ───────────────────────────────────
export const CLASES = {
  guerrero:  { emoji: "⚔️",  hp: 160, atk: 22, def: 16, spd: 10, crit: 5,  desc: "Tanque con alto daño físico",    habilidad: "golpe_brutal" },
  mago:      { emoji: "🧙",  hp: 90,  atk: 38, def: 8,  spd: 15, crit: 8,  desc: "Alto daño mágico, poca defensa", habilidad: "explosion_magica" },
  arquero:   { emoji: "🏹",  hp: 115, atk: 27, def: 10, spd: 22, crit: 15, desc: "Veloz, preciso y letal",          habilidad: "lluvia_flechas" },
  asesino:   { emoji: "🗡️",  hp: 100, atk: 32, def: 8,  spd: 28, crit: 30, desc: "Críticos devastadores",          habilidad: "golpe_critico" },
  sacerdote: { emoji: "✨",  hp: 125, atk: 16, def: 13, spd: 12, crit: 3,  desc: "Cura y soporte",                 habilidad: "sanacion_divina" },
  paladín:   { emoji: "🛡️",  hp: 145, atk: 18, def: 22, spd: 9,  crit: 5,  desc: "Defensor sagrado",              habilidad: "escudo_sagrado" },
  nigromante:{ emoji: "💀",  hp: 105, atk: 35, def: 9,  spd: 14, crit: 10, desc: "Maestro de la oscuridad",        habilidad: "drenar_vida" },
};

// ── Habilidades por clase ────────────────────
export const HABILIDADES = {
  golpe_brutal:     { nombre: "Golpe Brutal",      emoji: "💥", desc: "Daño físico x2.5",        cooldown: 3 * 60 * 1000, tipo: "dano",   mult: 2.5 },
  explosion_magica: { nombre: "Explosión Mágica",  emoji: "🔮", desc: "Daño mágico x3",           cooldown: 4 * 60 * 1000, tipo: "dano",   mult: 3.0 },
  lluvia_flechas:   { nombre: "Lluvia de Flechas", emoji: "🏹", desc: "Ataca 3 veces seguidas",   cooldown: 3 * 60 * 1000, tipo: "multi",  mult: 1.0 },
  golpe_critico:    { nombre: "Golpe Crítico",      emoji: "⚡", desc: "Crítico garantizado x4",   cooldown: 2 * 60 * 1000, tipo: "critico",mult: 4.0 },
  sanacion_divina:  { nombre: "Sanación Divina",    emoji: "💚", desc: "Cura el 60% del HP máx",  cooldown: 5 * 60 * 1000, tipo: "cura",   mult: 0.6 },
  escudo_sagrado:   { nombre: "Escudo Sagrado",     emoji: "🛡️", desc: "Bloquea el próximo daño", cooldown: 4 * 60 * 1000, tipo: "escudo", mult: 1.0 },
  drenar_vida:      { nombre: "Drenar Vida",        emoji: "🩸", desc: "Roba HP al enemigo x2",   cooldown: 3 * 60 * 1000, tipo: "drenar", mult: 2.0 },
};

// ── Zonas ────────────────────────────────────
export const ZONAS = {
  bosque: {
    nombre: "🌲 Bosque Oscuro", nivel: 1,
    dropRate: 0.20,
    enemigos: [
      { nombre: "Lobo Salvaje",    emoji: "🐺", hp: 45,  atk: 13, def: 5,  exp: 22,  oro: 16  },
      { nombre: "Goblin",          emoji: "👺", hp: 38,  atk: 11, def: 4,  exp: 16,  oro: 13  },
      { nombre: "Orco",            emoji: "👹", hp: 65,  atk: 16, def: 9,  exp: 32,  oro: 27  },
      { nombre: "Araña Venenosa",  emoji: "🕷️", hp: 50,  atk: 14, def: 6,  exp: 25,  oro: 20  },
    ],
  },
  cueva: {
    nombre: "⛏️ Cueva del Dragón", nivel: 5,
    dropRate: 0.30,
    enemigos: [
      { nombre: "Murciélago Gigante", emoji: "🦇", hp: 75,  atk: 22, def: 11, exp: 48,  oro: 38  },
      { nombre: "Troll de Piedra",    emoji: "🧌", hp: 110, atk: 27, def: 17, exp: 65,  oro: 55  },
      { nombre: "Dragón Joven",       emoji: "🐉", hp: 160, atk: 38, def: 22, exp: 110, oro: 90  },
      { nombre: "Golem de Roca",      emoji: "🪨", hp: 130, atk: 30, def: 25, exp: 80,  oro: 70  },
    ],
  },
  castillo: {
    nombre: "🏰 Castillo Maldito", nivel: 10,
    dropRate: 0.40,
    enemigos: [
      { nombre: "Caballero Negro", emoji: "🖤", hp: 130, atk: 33, def: 27, exp: 85,  oro: 70  },
      { nombre: "Vampiro Anciano", emoji: "🧛", hp: 150, atk: 38, def: 22, exp: 110, oro: 92  },
      { nombre: "Lich",            emoji: "💀", hp: 210, atk: 48, def: 32, exp: 160, oro: 130 },
      { nombre: "Espectro",        emoji: "👻", hp: 170, atk: 42, def: 18, exp: 130, oro: 110 },
    ],
  },
  volcan: {
    nombre: "🌋 Volcán del Caos", nivel: 20,
    dropRate: 0.55,
    enemigos: [
      { nombre: "Demonio de Fuego", emoji: "😈", hp: 210, atk: 53, def: 38, exp: 190, oro: 160 },
      { nombre: "Fénix Oscuro",     emoji: "🔥", hp: 265, atk: 65, def: 42, exp: 235, oro: 200 },
      { nombre: "Titán del Caos",   emoji: "⚡", hp: 370, atk: 75, def: 55, exp: 320, oro: 270 },
      { nombre: "Basilisco",        emoji: "🐍", hp: 300, atk: 60, def: 48, exp: 260, oro: 220 },
    ],
  },
  abismo: {
    nombre: "🌑 Abismo Eterno", nivel: 35,
    dropRate: 0.70,
    enemigos: [
      { nombre: "Ángel Caído",     emoji: "🖤", hp: 450, atk: 90,  def: 65, exp: 450, oro: 380 },
      { nombre: "Señor Demonio",   emoji: "👿", hp: 520, atk: 105, def: 70, exp: 530, oro: 450 },
      { nombre: "Dios Olvidado",   emoji: "🌑", hp: 700, atk: 130, def: 90, exp: 700, oro: 600 },
    ],
  },
};

// ── Tabla de drops por zona y calidad ────────
// Probabilidades: comun > raro > epico > legendario > mitico
export const DROP_TABLE = {
  bosque:   { comun: 0.60, raro: 0.30, epico: 0.08, legendario: 0.02, mitico: 0.00 },
  cueva:    { comun: 0.45, raro: 0.35, epico: 0.14, legendario: 0.05, mitico: 0.01 },
  castillo: { comun: 0.30, raro: 0.35, epico: 0.22, legendario: 0.10, mitico: 0.03 },
  volcan:   { comun: 0.15, raro: 0.30, epico: 0.30, legendario: 0.18, mitico: 0.07 },
  abismo:   { comun: 0.05, raro: 0.20, epico: 0.30, legendario: 0.30, mitico: 0.15 },
};

// ── Tienda ───────────────────────────────────
export const TIENDA = {
  // ── ARMAS ───────────────────────────────────
  // Común
  espada_madera:    { nombre: "Espada de Madera",    emoji: "🪵", tipo: "arma", calidad: "comun",     atk: 6,  def: 0,  precio: 60,   nivelReq: 1  },
  espada_hierro:    { nombre: "Espada de Hierro",    emoji: "🗡️", tipo: "arma", calidad: "comun",     atk: 12, def: 0,  precio: 120,  nivelReq: 1  },
  arco_madera:      { nombre: "Arco de Madera",      emoji: "🏹", tipo: "arma", calidad: "comun",     atk: 10, def: 0,  precio: 100,  nivelReq: 1  },
  daga_rota:        { nombre: "Daga Rota",           emoji: "🔪", tipo: "arma", calidad: "comun",     atk: 8,  def: 0,  precio: 80,   nivelReq: 1  },
  // Raro
  espada_acero:     { nombre: "Espada de Acero",     emoji: "⚔️", tipo: "arma", calidad: "raro",      atk: 22, def: 0,  precio: 350,  nivelReq: 5  },
  arco_largo:       { nombre: "Arco Largo",          emoji: "🏹", tipo: "arma", calidad: "raro",      atk: 20, def: 0,  precio: 320,  nivelReq: 5  },
  baston_magico:    { nombre: "Bastón Mágico",       emoji: "🪄", tipo: "arma", calidad: "raro",      atk: 28, def: 0,  precio: 400,  nivelReq: 5  },
  hacha_acero:      { nombre: "Hacha de Acero",      emoji: "🪓", tipo: "arma", calidad: "raro",      atk: 25, def: 0,  precio: 380,  nivelReq: 5  },
  // Épico
  espada_runa:      { nombre: "Espada de Runas",     emoji: "🔱", tipo: "arma", calidad: "epico",     atk: 40, def: 5,  precio: 900,  nivelReq: 10 },
  arco_elfico:      { nombre: "Arco Élfico",         emoji: "✨", tipo: "arma", calidad: "epico",     atk: 38, def: 0,  precio: 850,  nivelReq: 10 },
  cetro_arcano:     { nombre: "Cetro Arcano",        emoji: "🔮", tipo: "arma", calidad: "epico",     atk: 50, def: 0,  precio: 1000, nivelReq: 10 },
  lanza_divina:     { nombre: "Lanza Divina",        emoji: "⚡", tipo: "arma", calidad: "epico",     atk: 45, def: 8,  precio: 950,  nivelReq: 12 },
  // Legendario
  excalibur:        { nombre: "Excalibur",           emoji: "🌟", tipo: "arma", calidad: "legendario", atk: 70, def: 10, precio: 3000, nivelReq: 20 },
  arco_fenix:       { nombre: "Arco del Fénix",      emoji: "🔥", tipo: "arma", calidad: "legendario", atk: 65, def: 5,  precio: 2800, nivelReq: 20 },
  baston_antiguo:   { nombre: "Bastón del Antiguo",  emoji: "🌙", tipo: "arma", calidad: "legendario", atk: 80, def: 0,  precio: 3200, nivelReq: 25 },
  // Mítico
  espada_caos:      { nombre: "Espada del Caos",     emoji: "🌑", tipo: "arma", calidad: "mitico",    atk: 120, def: 15, precio: 9999, nivelReq: 35 },
  lanza_celestial:  { nombre: "Lanza Celestial",     emoji: "☄️", tipo: "arma", calidad: "mitico",    atk: 110, def: 20, precio: 9999, nivelReq: 35 },

  // ── ARMADURAS ────────────────────────────────
  // Común
  armadura_tela:    { nombre: "Armadura de Tela",    emoji: "👘", tipo: "armadura", calidad: "comun",     atk: 0, def: 5,  precio: 70,   nivelReq: 1  },
  armadura_cuero:   { nombre: "Armadura de Cuero",   emoji: "🥋", tipo: "armadura", calidad: "comun",     atk: 0, def: 10, precio: 150,  nivelReq: 1  },
  // Raro
  armadura_hierro:  { nombre: "Armadura de Hierro",  emoji: "🛡️", tipo: "armadura", calidad: "raro",      atk: 0, def: 22, precio: 400,  nivelReq: 5  },
  cota_malla:       { nombre: "Cota de Malla",       emoji: "⛓️", tipo: "armadura", calidad: "raro",      atk: 0, def: 18, precio: 350,  nivelReq: 5  },
  // Épico
  armadura_acero:   { nombre: "Armadura de Acero",   emoji: "⚙️", tipo: "armadura", calidad: "epico",     atk: 0, def: 38, precio: 950,  nivelReq: 10 },
  armadura_runa:    { nombre: "Armadura de Runas",   emoji: "🔱", tipo: "armadura", calidad: "epico",     atk: 5, def: 45, precio: 1100, nivelReq: 12 },
  // Legendario
  armadura_dragon:  { nombre: "Armadura del Dragón", emoji: "🐉", tipo: "armadura", calidad: "legendario", atk: 8, def: 65, precio: 3500, nivelReq: 20 },
  manto_sombra:     { nombre: "Manto de Sombra",     emoji: "🌑", tipo: "armadura", calidad: "legendario", atk: 10, def: 55, precio: 3000, nivelReq: 22 },
  // Mítico
  armadura_titan:   { nombre: "Armadura del Titán",  emoji: "⚡", tipo: "armadura", calidad: "mitico",    atk: 15, def: 100, precio: 9999, nivelReq: 35 },
  manto_celestial:  { nombre: "Manto Celestial",     emoji: "☀️", tipo: "armadura", calidad: "mitico",    atk: 20, def: 90,  precio: 9999, nivelReq: 35 },

  // ── POCIONES ─────────────────────────────────
  pocion_menor:     { nombre: "Poción Menor",        emoji: "🧪", tipo: "pocion", calidad: "comun",     hp: 60,   precio: 50,  nivelReq: 1 },
  pocion_mayor:     { nombre: "Poción Mayor",        emoji: "💊", tipo: "pocion", calidad: "raro",      hp: 180,  precio: 150, nivelReq: 1 },
  pocion_superior:  { nombre: "Poción Superior",     emoji: "💉", tipo: "pocion", calidad: "epico",     hp: 400,  precio: 400, nivelReq: 1 },
  elixir:           { nombre: "Elixir de Vida",      emoji: "✨", tipo: "pocion", calidad: "legendario", hp: 9999, precio: 800, nivelReq: 1 },

  // ── ACCESORIOS ───────────────────────────────
  amuleto_fuerza:   { nombre: "Amuleto de Fuerza",   emoji: "📿", tipo: "accesorio", calidad: "raro",      atk: 8,  def: 0,  precio: 500,  nivelReq: 5  },
  anillo_defensa:   { nombre: "Anillo de Defensa",   emoji: "💍", tipo: "accesorio", calidad: "raro",      atk: 0,  def: 8,  precio: 500,  nivelReq: 5  },
  colgante_epico:   { nombre: "Colgante Épico",      emoji: "🔮", tipo: "accesorio", calidad: "epico",     atk: 15, def: 10, precio: 1200, nivelReq: 15 },
  corona_dragon:    { nombre: "Corona del Dragón",   emoji: "👑", tipo: "accesorio", calidad: "legendario", atk: 25, def: 20, precio: 4000, nivelReq: 25 },
};

// Items que pueden dropearse (excluye items de tienda que no tienen sentido en drops)
export const DROP_POOL = {
  comun:      ["espada_madera","espada_hierro","arco_madera","daga_rota","armadura_tela","armadura_cuero","pocion_menor"],
  raro:       ["espada_acero","arco_largo","baston_magico","hacha_acero","armadura_hierro","cota_malla","pocion_mayor","amuleto_fuerza","anillo_defensa"],
  epico:      ["espada_runa","arco_elfico","cetro_arcano","lanza_divina","armadura_acero","armadura_runa","pocion_superior","colgante_epico"],
  legendario: ["excalibur","arco_fenix","baston_antiguo","armadura_dragon","manto_sombra","elixir","corona_dragon"],
  mitico:     ["espada_caos","lanza_celestial","armadura_titan","manto_celestial"],
};

// ── Sistema de drops ─────────────────────────
export function calcularDrop(zonaNombre, nivelJugador) {
  const zona = ZONAS[zonaNombre];
  if (!zona || Math.random() > zona.dropRate) return null;

  const tabla = DROP_TABLE[zonaNombre];
  const bonusNivel = Math.min(nivelJugador * 0.005, 0.15); // bonus por nivel, max 15%

  // Ajustar probabilidades con bonus de nivel
  const probs = {
    comun:      Math.max(0, tabla.comun - bonusNivel * 2),
    raro:       tabla.raro,
    epico:      tabla.epico + bonusNivel,
    legendario: tabla.legendario + bonusNivel * 0.5,
    mitico:     tabla.mitico + bonusNivel * 0.2,
  };

  const roll = Math.random();
  let acum = 0;
  let calidadElegida = "comun";
  for (const [cal, prob] of Object.entries(probs)) {
    acum += prob;
    if (roll <= acum) { calidadElegida = cal; break; }
  }

  const pool = DROP_POOL[calidadElegida];
  const itemId = pool[Math.floor(Math.random() * pool.length)];
  return { itemId, calidad: calidadElegida, item: TIENDA[itemId] };
}

// ── Funciones de jugador ─────────────────────
export function getPlayer(jid, pushName = null) {
  if (!db.players[jid]) {
    // Usar número limpio como nombre por defecto (sin @lid)
    const defaultNombre = jid.includes("@lid")
      ? "Usuario" + jid.split("@")[0].slice(-4)
      : jid.split("@")[0];
    db.players[jid] = {
      jid, clase: null, nombre: defaultNombre,
      nivel: 1, exp: 0, expMax: 100,
      hp: 100, hpMax: 100,
      atk: 10, def: 5, spd: 10, crit: 5,
      oro: 100, gemas: 0,
      inventario: {},
      equipo: { arma: null, armadura: null, accesorio: null },
      misiones: { completadas: 0 },
      stats: { batallas: 0, victorias: 0, exploraciones: 0, enemigosKill: 0, dropsObtenidos: 0 },
      habilidadUsada: 0,
      clan: null,
      ultimaExploracion: 0,
      ultimaMision: 0,
      ultimoDescanso: 0,
      creado: Date.now(),
    };
    saveDB();
  }
  // Actualizar nombre si tenemos pushName y no es un número largo (LID)
  if (pushName && !/^[0-9]{10,}$/.test(pushName)) {
    db.players[jid].nombre = pushName;
    saveDB();
  }
  return db.players[jid];
}

export function savePlayer(player) {
  db.players[player.jid] = player;
  saveDB();
}

export function calcExpMax(nivel) {
  return Math.floor(100 * Math.pow(1.5, nivel - 1));
}

export function addExp(player, exp) {
  player.exp += exp;
  let leveledUp = false;
  while (player.exp >= player.expMax) {
    player.exp -= player.expMax;
    player.nivel++;
    player.expMax = calcExpMax(player.nivel);
    player.hpMax += 12;
    player.atk += 2;
    player.def += 1;
    player.spd += 1;
    player.hp = player.hpMax;
    leveledUp = true;
  }
  savePlayer(player);
  return leveledUp;
}

export function getTotalAtk(player) {
  let bonus = 0;
  if (player.equipo.arma)      bonus += (TIENDA[player.equipo.arma]?.atk || 0);
  if (player.equipo.accesorio) bonus += (TIENDA[player.equipo.accesorio]?.atk || 0);
  return player.atk + bonus;
}

export function getTotalDef(player) {
  let bonus = 0;
  if (player.equipo.armadura)  bonus += (TIENDA[player.equipo.armadura]?.def || 0);
  if (player.equipo.accesorio) bonus += (TIENDA[player.equipo.accesorio]?.def || 0);
  return player.def + bonus;
}

export function getGuild(nombre) { return db.guilds[nombre] || null; }
export function saveGuild(guild) { db.guilds[guild.nombre] = guild; saveDB(); }
