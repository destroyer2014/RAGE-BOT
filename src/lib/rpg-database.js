// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/lib/rpg-database.js
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
  return { players: {}, guilds: {}, mercado: {} };
}
export function saveDB() {
  writeFileSync(RPG_FILE, JSON.stringify(db, null, 2), "utf-8");
}
export const db = loadDB();

// ── Calidades ────────────────────────────────
export const CALIDAD = {
  comun:     { nombre: "N",   emoji: "⬜", color: "⬜", multiplicador: 1.0 },
  raro:      { nombre: "R",   emoji: "🟦", color: "🔵", multiplicador: 1.3 },
  epico:     { nombre: "SR",  emoji: "🟪", color: "🟣", multiplicador: 1.6 },
  legendario:{ nombre: "SSR", emoji: "🟨", color: "🟡", multiplicador: 2.0 },
  mitico:    { nombre: "UR",  emoji: "🟥", color: "🔴", multiplicador: 2.8 },
};

// ── Clases ───────────────────────────────────
export const CLASES = {
  guerrero:  { emoji: "⚔️",  hp: 160, atk: 22, def: 16, spd: 10, crit: 5,  desc: "Tanque con alto daño físico",    habilidad: "golpe_brutal",      habilidades: ["golpe_heroico", "defensa_inquebrantable", "embestida"] },
  mago:      { emoji: "🧙",  hp: 90,  atk: 34, def: 8,  spd: 15, crit: 8,  desc: "Alto daño mágico, poca defensa", habilidad: "explosion_magica",   habilidades: ["esfera_arcana", "barrera_magica", "cometa_arcano"] },
  arquero:   { emoji: "🏹",  hp: 115, atk: 27, def: 10, spd: 22, crit: 10, desc: "Veloz, preciso y letal",          habilidad: "lluvia_flechas",     habilidades: ["lluvia_certera", "disparo_preciso", "evasion_rapida"] },
  asesino:   { emoji: "🗡️",  hp: 100, atk: 30, def: 8,  spd: 25, crit: 22, desc: "Críticos devastadores",          habilidad: "golpe_critico",      habilidades: ["asesinato_silencioso", "golpe_certero", "sombra_fugaz"] },
  sacerdote: { emoji: "✨",  hp: 125, atk: 16, def: 13, spd: 12, crit: 3,  desc: "Cura y soporte",                 habilidad: "sanacion_divina",    habilidades: ["sanacion_divina", "barrera_sagrada", "bendicion_celestial"] },
  paladín:   { emoji: "🛡️",  hp: 145, atk: 18, def: 22, spd: 9,  crit: 5,  desc: "Defensor sagrado",              habilidad: "escudo_sagrado",     habilidades: ["golpe_justiciero", "proteccion_sagrada", "aura_de_valor"] },
  nigromante:{ emoji: "💀",  hp: 105, atk: 35, def: 9,  spd: 14, crit: 10, desc: "Maestro de la oscuridad",        habilidad: "drenar_vida",        habilidades: ["invocacion_sombria", "drenaje_de_vida", "niebla_mortal"] },
  hombrelobo:{ emoji: "🐺",  hp: 145, atk: 32, def: 10, spd: 22, crit: 14, desc: "Bestia feroz: ATK y VEL devastadores", habilidad: "furia_bestial",    habilidades: ["furia_bestial", "aullido_letal", "regeneracion_salvaje", "embestida_salvaje"] },
  nomuerto:  { emoji: "🧟",  hp: 135, atk: 30, def: 15, spd: 10, crit: 8,  desc: "Resucita en combate, drena vida",   habilidad: "toque_de_la_muerte", habilidades: ["resurreccion_oscura", "toque_de_la_muerte", "maldicion_eterna", "ejercito_de_sombras"] },
};

// ── Habilidades por clase ────────────────────
export const HABILIDADES = {
  // ── Guerrero ─────────────────────────────
  golpe_brutal:              { nombre: "Golpe Brutal",              emoji: "💥", desc: "Daño físico x2.5",                         cooldown: 3 * 60 * 1000, tipo: "dano",    mult: 2.5 },
  golpe_heroico:             { nombre: "Golpe Heroico",             emoji: "⚔️", desc: "Ataque poderoso que inflige gran daño x2.8", cooldown: 3 * 60 * 1000, tipo: "dano",    mult: 2.8 },
  defensa_inquebrantable:    { nombre: "Defensa Inquebrantable",    emoji: "🛡️", desc: "Bloquea el próximo golpe recibido",          cooldown: 4 * 60 * 1000, tipo: "escudo",  mult: 1.0 },
  embestida:                 { nombre: "Embestida",                 emoji: "🐎", desc: "Carga y aplasta al enemigo x2.2",            cooldown: 3 * 60 * 1000, tipo: "dano",    mult: 2.2 },
  // ── Mago ─────────────────────────────────
  explosion_magica:          { nombre: "Explosión Mágica",          emoji: "🔮", desc: "Daño mágico x3",                            cooldown: 4 * 60 * 1000, tipo: "dano",    mult: 3.0 },
  esfera_arcana:             { nombre: "Esfera Arcana",             emoji: "🔮", desc: "Esfera de energía pura x3.2",               cooldown: 4 * 60 * 1000, tipo: "dano",    mult: 3.2 },
  barrera_magica:            { nombre: "Barrera Mágica",            emoji: "✨", desc: "Escudo arcano que bloquea el próximo ataque", cooldown: 4 * 60 * 1000, tipo: "escudo",  mult: 1.0 },
  cometa_arcano:             { nombre: "Cometa Arcano",             emoji: "☄️", desc: "Cometa de energía que aplasta x2.8",        cooldown: 4 * 60 * 1000, tipo: "dano",    mult: 2.8 },
  // ── Arquero ──────────────────────────────
  lluvia_flechas:            { nombre: "Lluvia de Flechas",         emoji: "🏹", desc: "Ataca 3 veces seguidas",                    cooldown: 3 * 60 * 1000, tipo: "multi",   mult: 1.0 },
  lluvia_certera:            { nombre: "Lluvia Certera",            emoji: "🏹", desc: "Múltiples flechas que acribillan x2.5",     cooldown: 3 * 60 * 1000, tipo: "multi",   mult: 1.0 },
  disparo_preciso:           { nombre: "Disparo Preciso",           emoji: "🎯", desc: "Apunta al punto débil, crítico x3.5",       cooldown: 3 * 60 * 1000, tipo: "critico", mult: 3.5 },
  evasion_rapida:            { nombre: "Evasión Rápida",            emoji: "💨", desc: "Esquiva el siguiente ataque",               cooldown: 3 * 60 * 1000, tipo: "escudo",  mult: 1.0 },
  // ── Asesino ──────────────────────────────
  golpe_critico:             { nombre: "Golpe Crítico",             emoji: "⚡", desc: "Crítico garantizado x4",                   cooldown: 2.5 * 60 * 1000, tipo: "critico", mult: 4.0 },
  asesinato_silencioso:      { nombre: "Asesinato Silencioso",      emoji: "🌑", desc: "Crítico garantizado desde las sombras x4.0", cooldown: 2 * 60 * 1000, tipo: "critico", mult: 4.0 },
  golpe_certero:             { nombre: "Golpe Certero",             emoji: "🗡️", desc: "Hiere en punto vital, daño x3",            cooldown: 2 * 60 * 1000, tipo: "dano",    mult: 3.0 },
  sombra_fugaz:              { nombre: "Sombra Fugaz",              emoji: "💜", desc: "Desaparece, bloquea el siguiente golpe",    cooldown: 3 * 60 * 1000, tipo: "escudo",  mult: 1.0 },
  // ── Sacerdote ────────────────────────────
  sanacion_divina:           { nombre: "Sanación Divina",           emoji: "💚", desc: "Cura el 60% del HP máx",                   cooldown: 5 * 60 * 1000, tipo: "cura",    mult: 0.6 },
  barrera_sagrada:           { nombre: "Barrera Sagrada",           emoji: "🔵", desc: "Escudo divino que bloquea el próximo golpe", cooldown: 4 * 60 * 1000, tipo: "escudo",  mult: 1.0 },
  bendicion_celestial:       { nombre: "Bendición Celestial",       emoji: "👼", desc: "Cura el 40% del HP máx",                   cooldown: 4 * 60 * 1000, tipo: "cura",    mult: 0.4 },
  // ── Paladín ──────────────────────────────
  escudo_sagrado:            { nombre: "Escudo Sagrado",            emoji: "🛡️", desc: "Bloquea el próximo daño",                  cooldown: 4 * 60 * 1000, tipo: "escudo",  mult: 1.0 },
  golpe_justiciero:          { nombre: "Golpe Justiciero",          emoji: "⚡", desc: "Ataque sagrado de luz x2.8",               cooldown: 3 * 60 * 1000, tipo: "dano",    mult: 2.8 },
  proteccion_sagrada:        { nombre: "Protección Sagrada",        emoji: "🛡️", desc: "Bloquea el próximo ataque recibido",        cooldown: 4 * 60 * 1000, tipo: "escudo",  mult: 1.0 },
  aura_de_valor:             { nombre: "Aura de Valor",             emoji: "🌟", desc: "Cura el 30% del HP máx",                   cooldown: 4 * 60 * 1000, tipo: "cura",    mult: 0.3 },
  // ── Nigromante ───────────────────────────
  drenar_vida:               { nombre: "Drenar Vida",               emoji: "🩸", desc: "Roba HP al enemigo x2",                    cooldown: 3 * 60 * 1000, tipo: "drenar",  mult: 2.0 },
  invocacion_sombria:        { nombre: "Invocación Sombría",        emoji: "💀", desc: "Espíritus oscuros atacan x2.5",            cooldown: 3 * 60 * 1000, tipo: "dano",    mult: 2.5 },
  drenaje_de_vida:           { nombre: "Drenaje de Vida",           emoji: "🩸", desc: "Absorbe vida del enemigo x2.2",            cooldown: 3 * 60 * 1000, tipo: "drenar",  mult: 2.2 },
  niebla_mortal:             { nombre: "Niebla Mortal",             emoji: "🌫️", desc: "Veneno que daña x1.8 y drena vida",        cooldown: 3 * 60 * 1000, tipo: "drenar",  mult: 1.8 },
  // ── Hombre Lobo ──────────────────────────
  furia_bestial:             { nombre: "Furia Bestial",              emoji: "🐺", desc: "Ataque salvaje en forma de bestia x3.0",    cooldown: 3 * 60 * 1000, tipo: "dano",    mult: 3.0 },
  aullido_letal:             { nombre: "Aullido Letal",              emoji: "🌕", desc: "Crítico garantizado que aterra x3.5",       cooldown: 3 * 60 * 1000, tipo: "critico", mult: 3.5 },
  regeneracion_salvaje:      { nombre: "Regeneración Salvaje",       emoji: "💚", desc: "Regenera el 40% del HP máx",               cooldown: 5 * 60 * 1000, tipo: "cura",    mult: 0.4 },
  embestida_salvaje:         { nombre: "Embestida Salvaje",          emoji: "💥", desc: "Carga brutal que aplasta al enemigo x2.8", cooldown: 3 * 60 * 1000, tipo: "dano",    mult: 2.8 },
  // ── No-Muerto ────────────────────────────
  resurreccion_oscura:       { nombre: "Resurrección Oscura",        emoji: "🧟", desc: "Resucita con 30% HP (una vez por combate)", cooldown: 0,             tipo: "revivir", mult: 0.3 },
  toque_de_la_muerte:        { nombre: "Toque de la Muerte",         emoji: "☠️", desc: "Daño oscuro x3 y drena vida",              cooldown: 3 * 60 * 1000, tipo: "drenar",  mult: 3.0 },
  maldicion_eterna:          { nombre: "Maldición Eterna",           emoji: "🪦", desc: "Maldice al enemigo, daño continuo x2",     cooldown: 4 * 60 * 1000, tipo: "dano",    mult: 2.0 },
  ejercito_de_sombras:       { nombre: "Ejército de Sombras",        emoji: "👻", desc: "Invoca muertos que atacan x2.5",           cooldown: 4 * 60 * 1000, tipo: "multi",   mult: 1.0 },
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
  espada_caos:      { nombre: "Espada del Caos",     emoji: "🌑", tipo: "arma", calidad: "mitico",    atk: 110, def: 15, precio: 9999, nivelReq: 35 },
  lanza_celestial:  { nombre: "Lanza Celestial",     emoji: "☄️", tipo: "arma", calidad: "mitico",    atk: 100, def: 20, precio: 9999, nivelReq: 35 },

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
  armadura_titan:   { nombre: "Armadura del Titán",  emoji: "⚡", tipo: "armadura", calidad: "mitico",    atk: 12, def: 88,  precio: 9999, nivelReq: 35 },
  manto_celestial:  { nombre: "Manto Celestial",     emoji: "☀️", tipo: "armadura", calidad: "mitico",    atk: 17, def: 80,  precio: 9999, nivelReq: 35 },

  // ── POCIONES ─────────────────────────────────
  pocion_menor:     { nombre: "Poción Menor",        emoji: "🧪", tipo: "pocion", calidad: "comun",     hp: 60,   precio: 50,  nivelReq: 1 },
  pocion_mayor:     { nombre: "Poción Mayor",        emoji: "💊", tipo: "pocion", calidad: "raro",      hp: 180,  precio: 150, nivelReq: 1 },
  pocion_superior:  { nombre: "Poción Superior",     emoji: "💉", tipo: "pocion", calidad: "epico",     hp: 400,  precio: 400, nivelReq: 1 },
  elixir:           { nombre: "Elixir de Vida",      emoji: "✨", tipo: "pocion", calidad: "legendario", hp: 9999, precio: 800, nivelReq: 1 },
  // ── Pociones de buff (1 hora) ────────────────────────────────
  pocion_fuerza:    { nombre: "Poción de Fuerza",    emoji: "💪", tipo: "pocion_buff", buff: "fuerza",  valor: 30, calidad: "raro",      precio: 300,  nivelReq: 1,  desc: "+30 ATK por 1 hora" },
  pocion_fuerza2:   { nombre: "Poción de Fuerza II", emoji: "🔥", tipo: "pocion_buff", buff: "fuerza",  valor: 70, calidad: "epico",     precio: 650,  nivelReq: 10, desc: "+70 ATK por 1 hora" },
  pocion_defensa:   { nombre: "Poción de Defensa",   emoji: "🛡️", tipo: "pocion_buff", buff: "defensa", valor: 30, calidad: "raro",      precio: 300,  nivelReq: 1,  desc: "+30 DEF por 1 hora" },
  pocion_defensa2:  { nombre: "Poción de Defensa II",emoji: "🔰", tipo: "pocion_buff", buff: "defensa", valor: 70, calidad: "epico",     precio: 650,  nivelReq: 10, desc: "+70 DEF por 1 hora" },
  pocion_suerte:    { nombre: "Poción de Suerte",    emoji: "🍀", tipo: "pocion_buff", buff: "suerte",  valor: 10, calidad: "raro",      precio: 350,  nivelReq: 1,  desc: "+10% drop y CRIT por 1 hora" },
  pocion_suerte2:   { nombre: "Poción de Suerte II", emoji: "⭐", tipo: "pocion_buff", buff: "suerte",  valor: 20, calidad: "epico",     precio: 750,  nivelReq: 10, desc: "+20% drop y CRIT por 1 hora" },
  pocion_vida:      { nombre: "Poción de Vida",      emoji: "❤️", tipo: "pocion_buff", buff: "vida",    valor: 200, calidad: "raro",     precio: 300,  nivelReq: 1,  desc: "+200 HP máximo por 1 hora" },
  pocion_vida2:     { nombre: "Poción de Vida II",   emoji: "💖", tipo: "pocion_buff", buff: "vida",    valor: 500, calidad: "epico",    precio: 650,  nivelReq: 10, desc: "+500 HP máximo por 1 hora" },

  // ── ACCESORIOS ───────────────────────────────
  amuleto_fuerza:   { nombre: "Amuleto de Fuerza",   emoji: "📿", tipo: "accesorio", calidad: "raro",      atk: 8,  def: 0,  precio: 500,  nivelReq: 5  },
  anillo_defensa:   { nombre: "Anillo de Defensa",   emoji: "💍", tipo: "accesorio", calidad: "raro",      atk: 0,  def: 8,  precio: 500,  nivelReq: 5  },
  colgante_epico:   { nombre: "Colgante Épico",      emoji: "🔮", tipo: "accesorio", calidad: "epico",     atk: 15, def: 10, precio: 1200, nivelReq: 15 },
  corona_dragon:    { nombre: "Corona del Dragón",   emoji: "👑", tipo: "accesorio", calidad: "legendario", atk: 18, def: 15, precio: 4000, nivelReq: 25 },

  // ── ORBES DE MEJORA ──────────────────────────
  // Orbe Azul: mejora stats del personaje (ATK, DEF, HP, SPD, CRIT) — nivel máx: 100
  orbe_azul:        { nombre: "Orbe Azul",           emoji: "🔵", tipo: "orbe_stat",   calidad: "raro",       precio: 300,  nivelReq: 1 },
  // Orbe Dorado: mejora stats de arma o armadura equipada — nivel máx: 100
  orbe_dorado:      { nombre: "Orbe Dorado",         emoji: "🟡", tipo: "orbe_equipo", calidad: "legendario", precio: 600,  nivelReq: 5 },
};

// Items que pueden dropearse (excluye items de tienda que no tienen sentido en drops)
// ── Mascotas ─────────────────────────────────
export const MASCOTAS = {
  lobo:      { nombre: "Lobo Gris",       emoji: "🐺", precio: 500,  bonus: { atk: 8,  def: 0,  crit: 3  }, desc: "Aumenta ATK y CRIT" },
  gato:      { nombre: "Gato Mágico",     emoji: "🐱", precio: 400,  bonus: { atk: 0,  def: 5,  crit: 0  }, desc: "Aumenta DEF" },
  dragon:    { nombre: "Dragón Bebé",     emoji: "🐉", precio: 1500, bonus: { atk: 15, def: 5,  crit: 5  }, desc: "Bonus de ATK/DEF/CRIT" },
  fenix:     { nombre: "Fénix",           emoji: "🦅", precio: 2000, bonus: { atk: 10, def: 10, crit: 8  }, desc: "Bonus balanceado alto" },
  slime:     { nombre: "Slime Amistoso",  emoji: "🟢", precio: 200,  bonus: { atk: 0,  def: 8,  crit: 0  }, desc: "Alta DEF, económico" },
  unicornio: { nombre: "Unicornio",       emoji: "🦄", precio: 1200, bonus: { atk: 5,  def: 5,  crit: 10 }, desc: "Alto CRIT" },
  esqueleto: { nombre: "Esqueleto Fiel",  emoji: "💀", precio: 800,  bonus: { atk: 12, def: 0,  crit: 5  }, desc: "Muy alto ATK" },
  hada:      { nombre: "Hada Curadora",   emoji: "🧚", precio: 900,  bonus: { atk: 0,  def: 8,  crit: 0  }, desc: "Recupera +10 HP extra al descansar" },
};

// ── Misiones dinámicas por nivel ─────────────
export function generarMisiones(nivel) {
  const escala = Math.floor(nivel / 5) + 1;
  const base = [
    { id: "explorar",  desc: "Explora cualquier zona 3 veces",         tipo: "exploraciones", meta: 3,  recompensa: { oro: 80  * escala, exp: 60  * escala } },
    { id: "matar",     desc: "Derrota 5 enemigos en combate",          tipo: "kills",         meta: 5,  recompensa: { oro: 100 * escala, exp: 80  * escala } },
    { id: "pvp",       desc: "Gana 1 duelo PvP",                       tipo: "pvp",           meta: 1,  recompensa: { oro: 150 * escala, exp: 120 * escala } },
    { id: "tienda",    desc: "Compra un ítem en la tienda",            tipo: "compra",        meta: 1,  recompensa: { oro: 70  * escala, exp: 50  * escala } },
    { id: "habilidad", desc: "Usa tu habilidad especial en combate",   tipo: "habilidad",     meta: 1,  recompensa: { oro: 90  * escala, exp: 70  * escala } },
    { id: "clan",      desc: "Dona oro o XP al banco de tu clan",      tipo: "donacion",      meta: 1,  recompensa: { oro: 120 * escala, exp: 90  * escala } },
  ];
  if (nivel >= 10) base.push(
    { id: "boss",    desc: "Participa en un ataque al Boss del grupo", tipo: "boss",    meta: 1, recompensa: { oro: 300 * escala, exp: 250 * escala } },
    { id: "drop",    desc: "Obtén 2 drops de exploración",             tipo: "drops",   meta: 2, recompensa: { oro: 180 * escala, exp: 140 * escala } },
  );
  // Elegir 3 misiones aleatorias distintas
  const elegidas = base.sort(() => Math.random() - 0.5).slice(0, 3);
  return elegidas.map(m => ({ ...m, progreso: 0, completada: false }));
}

export const DROP_POOL = {
  comun:      ["espada_madera","espada_hierro","arco_madera","daga_rota","armadura_tela","armadura_cuero","pocion_menor"],
  raro:       ["espada_acero","arco_largo","baston_magico","hacha_acero","armadura_hierro","cota_malla","pocion_mayor","amuleto_fuerza","anillo_defensa"],
  epico:      ["espada_runa","arco_elfico","cetro_arcano","lanza_divina","armadura_acero","armadura_runa","pocion_superior","colgante_epico"],
  legendario: ["excalibur","arco_fenix","baston_antiguo","armadura_dragon","manto_sombra","elixir","corona_dragon"],
  mitico:     ["espada_caos","lanza_celestial","armadura_titan","manto_celestial"],
};

// ── Sistema de drops ─────────────────────────
export function calcularDrop(zonaNombre, nivelJugador, multDrop = 1) {
  const zona = ZONAS[zonaNombre];
  const dropRateAjustado = Math.min(zona?.dropRate * multDrop, 0.95);
  if (!zona || Math.random() > dropRateAjustado) return null;

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
      mascota: null,
      misiones: { completadas: 0, activa: null, iniciada: 0 },
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

// ── Buff helper — limpia buffs expirados y retorna los activos ──
export function getBuffsActivos(player) {
  if (!player.buffs) player.buffs = {};
  const ahora = Date.now();
  for (const key of Object.keys(player.buffs)) {
    if (player.buffs[key].expira <= ahora) {
      // Revertir buff de vida al expirar
      if (key === "vida" && player.buffs[key].hpMaxBonus) {
        player.hpMax = Math.max(1, player.hpMax - player.buffs[key].hpMaxBonus);
        player.hp = Math.min(player.hp, player.hpMax);
      }
      delete player.buffs[key];
    }
  }
  return player.buffs;
}

export function getTotalAtk(player) {
  let bonus = 0;
  const equipo = player.equipo || {};
  if (equipo.arma) {
    const armaId = equipo.arma;
    const item = TIENDA[armaId]
      || TIENDA_CLASE[armaId]
      || (player._ssrItems && player._ssrItems[armaId]);
    bonus += (item?.atk || 0);
    const nivelMejora = (player.mejorasEquipo?.arma_atk || 0);
    bonus += nivelMejora * (MEJORA_EQUIPO_GANANCIA?.atk || 3);
  }
  if (equipo.armadura) {
    const armId = equipo.armadura;
    const itemArm = TIENDA[armId] || TIENDA_CLASE[armId] || (player._ssrItems && player._ssrItems[armId]);
    bonus += (itemArm?.atk || 0);
  }
  if (equipo.accesorio) bonus += (TIENDA[equipo.accesorio]?.atk || TIENDA_CLASE[equipo.accesorio]?.atk || 0);
  if (player.mascota) {
    const mascota = MASCOTAS[player.mascota]
      || (player._ssrMascotas && player._ssrMascotas[player.mascota]);
    if (mascota) bonus += (mascota.bonus?.atk || 0);
  }
  // Buff de poción de fuerza
  const buffs = getBuffsActivos(player);
  if (buffs.fuerza) bonus += buffs.fuerza.valor;
  return (player.atk || 0) + bonus;
}

export function getTotalDef(player) {
  let bonus = 0;
  const equipo = player.equipo || {};
  if (equipo.armadura) {
    const armId = equipo.armadura;
    const item = TIENDA[armId]
      || TIENDA_CLASE[armId]
      || (player._ssrItems && player._ssrItems[armId]);
    bonus += (item?.def || 0);
    const nivelMejora = (player.mejorasEquipo?.armadura_def || 0);
    bonus += nivelMejora * (MEJORA_EQUIPO_GANANCIA?.def || 2);
  }
  if (equipo.accesorio) bonus += (TIENDA[equipo.accesorio]?.def || TIENDA_CLASE[equipo.accesorio]?.def || 0);
  if (player.mascota) {
    const mascota = MASCOTAS[player.mascota]
      || (player._ssrMascotas && player._ssrMascotas[player.mascota]);
    if (mascota) bonus += (mascota.bonus?.def || 0);
  }
  // Buff de poción de defensa
  const buffs = getBuffsActivos(player);
  if (buffs.defensa) bonus += buffs.defensa.valor;
  return (player.def || 0) + bonus;
}

export function getGuild(nombre) { return db.guilds[nombre] || null; }
export function saveGuild(guild) { db.guilds[guild.nombre] = guild; saveDB(); }

// Nivel del clan basado en medallas donadas (100 medallas por nivel)
export function getNivelClan(clan) {
  return Math.floor((clan.medallasDonadas || 0) / 100) + 1;
}
// Costo en medallas para subir al siguiente nivel
export function costoSiguienteNivelClan(clan) {
  const nivel = getNivelClan(clan);
  return nivel * 100; // nivel 1->2: 100, 2->3: 200, etc.
}

export function getBossActivo() { return db.bossActivo || null; }
export function saveBossActivo(boss) { db.bossActivo = boss; saveDB(); }

export function getEventosDB() {
  if (!db.eventosActivos) db.eventosActivos = {};
  const ahora = Date.now();
  for (const tipo of Object.keys(db.eventosActivos)) {
    if (db.eventosActivos[tipo].expira <= ahora) delete db.eventosActivos[tipo];
  }
  return db.eventosActivos;
}
export function setEventoDB(tipo, evento) {
  if (!db.eventosActivos) db.eventosActivos = {};
  db.eventosActivos[tipo] = evento;
  saveDB();
}
export function clearEventosDB() { db.eventosActivos = {}; saveDB(); }

// ── Mercado de jugadores ──────────────────────
export function getMercado() {
  if (!db.mercado) db.mercado = [];
  // Limpiar publicaciones expiradas (48h)
  const ahora = Date.now();
  db.mercado = db.mercado.filter(p => ahora - p.fecha < 48 * 60 * 60 * 1000);
  return db.mercado;
}
export function saveMercado() { saveDB(); }
export function addListingMercado(listing) {
  if (!db.mercado) db.mercado = [];
  db.mercado.push(listing);
  saveDB();
}
export function removeListingMercado(id) {
  if (!db.mercado) db.mercado = [];
  const idx = db.mercado.findIndex(l => l.id === id);
  if (idx === -1) return false;
  db.mercado.splice(idx, 1);
  saveDB();
  return true;
}

// ══════════════════════════════════════════
//  SISTEMA GACHA
// ══════════════════════════════════════════

// Tasa de conversión oro → gemas
export const ORO_POR_GEMA = 1000; // 1000 oro = 10 💎

// Costos de invocación
export const GACHA_COSTOS = {
  normal:   10,   // 💎
  premium:  30,   // 💎
  multi:    90,   // 💎 (10 tiradas, ahorra 10💎)
};

// Pity: garantiza SSR cada N invocaciones sin SSR
export const GACHA_PITY = 50;

// ── Pool de recompensas por tier ────────────────────────────────
// Cada tier tiene: peso (mayor = más común), tipo, y datos de recompensa

// Armas SSR exclusivas del gacha (no están en tienda normal)
export const ARMAS_SSR = {
  espada_divina:    { nombre: "Espada Divina",       emoji: "✨", tipo: "arma", calidad: "ssr", atk: 130, def: 22, nivelReq: 1 },
  lanza_oscura:     { nombre: "Lanza de la Oscuridad", emoji: "🌑", tipo: "arma", calidad: "ssr", atk: 140, def: 13, nivelReq: 1 },
  arco_celestial:   { nombre: "Arco Celestial",      emoji: "🌟", tipo: "arma", calidad: "ssr", atk: 126, def: 9, nivelReq: 1 },
  cetro_abismal:    { nombre: "Cetro del Abismo",    emoji: "💜", tipo: "arma", calidad: "ssr", atk: 148, def: 5,  nivelReq: 1 },
  hacha_titan:      { nombre: "Hacha del Titán",     emoji: "⚡", tipo: "arma", calidad: "ssr", atk: 135, def: 18, nivelReq: 1 },
};

// Mascotas SSR exclusivas del gacha
export const MASCOTAS_SSR = {
  kitsune:   { nombre: "Kitsune de Fuego",   emoji: "🦊", bonus: { atk: 25, def: 13, crit: 13 }, desc: "Espíritu de fuego ancestral" },
  kraken:    { nombre: "Kraken Ancestral",   emoji: "🐙", bonus: { atk: 28, def: 16, crit: 8  }, desc: "Terror de los mares profundos" },
  serafin:   { nombre: "Serafín Sagrado",    emoji: "😇", bonus: { atk: 20, def: 22, crit: 10 }, desc: "Guardián celestial bendito" },
  sombra:    { nombre: "Espíritu Sombra",    emoji: "👤", bonus: { atk: 25, def: 10, crit: 25 }, desc: "Asesino de las tinieblas" },
};

// Pool gacha completo con pesos
// Estructura: { tipo, peso, ... datos }
// tipo puede ser: arma_ssr | mascota_ssr | arma | armadura | pocion | oro | exp

export const GACHA_POOL = {
  // ── SSR (1-2%) ─────────────────────────────
  arma_ssr:    { peso: 1,  label: "🌟 *[SSR]* Arma Legendaria",  tipo: "arma_ssr"    },
  mascota_ssr: { peso: 1,  label: "🌟 *[SSR]* Mascota Sagrada",  tipo: "mascota_ssr" },

  // ── SR (8-12%) ──────────────────────────────
  arma_sr:     { peso: 8,  label: "🟨 *[SR]* Arma Épica",        tipo: "arma_sr"     },
  mascota_sr:  { peso: 4,  label: "🟪 *[SR]* Mascota Rara",      tipo: "mascota_sr"  },

  // ── R (30%) ─────────────────────────────────
  arma_r:      { peso: 20, label: "🟦 *[R]* Arma Rara",          tipo: "arma_r"      },
  armadura_r:  { peso: 15, label: "🟦 *[R]* Armadura Rara",      tipo: "armadura_r"  },

  // ── N (recursos, ~56%) ──────────────────────
  oro_pequeño: { peso: 25, label: "💰 *[N]* Bolsa de Oro",       tipo: "oro",  cantidad: [50, 150]  },
  oro_grande:  { peso: 10, label: "💰 *[N]* Cofre de Oro",       tipo: "oro",  cantidad: [150, 350] },
  exp_pequeña: { peso: 20, label: "⭐ *[N]* Fragmento de XP",    tipo: "exp",  cantidad: [80,  200]  },
  exp_grande:  { peso: 8,  label: "⭐ *[N]* Cristal de XP",      tipo: "exp",  cantidad: [300, 600]  },
  pocion_r:    { peso: 8,  label: "💊 *[N]* Poción Mayor",       tipo: "item", itemId: "pocion_mayor" },
  pocion_sr:   { peso: 4,  label: "💉 *[SR]* Poción Superior",   tipo: "item", itemId: "pocion_superior" },
};

// Listas de armas por tier para el gacha
const ARMAS_SR_IDS  = ["espada_runa", "arco_elfico", "cetro_arcano", "lanza_divina", "armadura_runa", "armadura_acero"];
const ARMAS_R_IDS   = ["espada_acero", "arco_largo", "baston_magico", "hacha_acero"];
const ARMADURAS_R_IDS = ["armadura_hierro", "cota_malla"];
const MASCOTAS_SR_IDS = ["dragon", "fenix", "unicornio"]; // mascotas normales de alta calidad

// ── Función principal de tirada ─────────────────────────────────
export function realizarTirada(esPremium = false) {
  const pool = Object.entries(GACHA_POOL);

  // Premium sube el peso de SSR y SR un poco
  const ajuste = esPremium ? 1.5 : 1.0;
  const poolAjustado = pool.map(([key, entry]) => {
    const esAltoTier = key.startsWith("arma_ssr") || key.startsWith("mascota_ssr") || key.startsWith("arma_sr") || key.startsWith("mascota_sr");
    return [key, { ...entry, pesoEfectivo: esAltoTier ? entry.peso * ajuste : entry.peso }];
  });

  const totalPeso = poolAjustado.reduce((sum, [, e]) => sum + e.pesoEfectivo, 0);
  let roll = Math.random() * totalPeso;
  let elegido = poolAjustado[poolAjustado.length - 1];
  for (const entry of poolAjustado) {
    roll -= entry[1].pesoEfectivo;
    if (roll <= 0) { elegido = entry; break; }
  }

  const [key, data] = elegido;
  return resolverPremio(key, data);
}

export function resolverPremio(key, data) {
  const tipo = data.tipo;

  if (tipo === "arma_ssr") {
    const ids   = Object.keys(ARMAS_SSR);
    const id    = ids[Math.floor(Math.random() * ids.length)];
    const arma  = ARMAS_SSR[id];
    return { tipo, id: "ssr_" + id, label: data.label, display: `${arma.emoji} *${arma.nombre}*\n   ⚔️ ATK +${arma.atk} | 🛡️ DEF +${arma.def}`, esSSR: true };
  }
  if (tipo === "mascota_ssr") {
    const ids     = Object.keys(MASCOTAS_SSR);
    const id      = ids[Math.floor(Math.random() * ids.length)];
    const mascota = MASCOTAS_SSR[id];
    return { tipo, id: "ssr_mascota_" + id, label: data.label, display: `${mascota.emoji} *${mascota.nombre}*\n   ⚔️+${mascota.bonus.atk} 🛡️+${mascota.bonus.def} 🎯+${mascota.bonus.crit}%\n   _${mascota.desc}_`, esSSR: true };
  }
  if (tipo === "arma_sr") {
    const id   = ARMAS_SR_IDS[Math.floor(Math.random() * ARMAS_SR_IDS.length)];
    const item = TIENDA[id];
    return { tipo, id, label: data.label, display: `${item.emoji} *${item.nombre}*\n   ⚔️ ATK +${item.atk}`, esSSR: false };
  }
  if (tipo === "mascota_sr") {
    const id      = MASCOTAS_SR_IDS[Math.floor(Math.random() * MASCOTAS_SR_IDS.length)];
    const mascota = MASCOTAS[id];
    return { tipo, id: "mascota_" + id, label: data.label, display: `${mascota.emoji} *${mascota.nombre}*\n   ⚔️+${mascota.bonus.atk} 🛡️+${mascota.bonus.def} 🎯+${mascota.bonus.crit}%`, esSSR: false };
  }
  if (tipo === "arma_r") {
    const id   = ARMAS_R_IDS[Math.floor(Math.random() * ARMAS_R_IDS.length)];
    const item = TIENDA[id];
    return { tipo, id, label: data.label, display: `${item.emoji} *${item.nombre}*\n   ⚔️ ATK +${item.atk}`, esSSR: false };
  }
  if (tipo === "armadura_r") {
    const id   = ARMADURAS_R_IDS[Math.floor(Math.random() * ARMADURAS_R_IDS.length)];
    const item = TIENDA[id];
    return { tipo, id, label: data.label, display: `${item.emoji} *${item.nombre}*\n   🛡️ DEF +${item.def}`, esSSR: false };
  }
  if (tipo === "oro") {
    const [min, max] = data.cantidad;
    const cantidad = Math.floor(Math.random() * (max - min + 1)) + min;
    return { tipo, label: data.label, display: `💰 *${cantidad} oro*`, cantidad, esSSR: false };
  }
  if (tipo === "exp") {
    const [min, max] = data.cantidad;
    const cantidad = Math.floor(Math.random() * (max - min + 1)) + min;
    return { tipo, label: data.label, display: `⭐ *${cantidad} EXP*`, cantidad, esSSR: false };
  }
  if (tipo === "item") {
    const item = TIENDA[data.itemId];
    return { tipo, id: data.itemId, label: data.label, display: `${item.emoji} *${item.nombre}*`, esSSR: false };
  }
}

// ── Aplicar premio al jugador ───────────────────────────────────
export function aplicarPremio(player, premio) {
  const tipo = premio.tipo;
  if (tipo === "arma_ssr" || tipo === "arma_sr" || tipo === "arma_r" || tipo === "armadura_r") {
    // Agregar al inventario (puede ser SSR especial o item de tienda)
    player.inventario[premio.id] = (player.inventario[premio.id] || 0) + 1;
    // Si es SSR, también registrar en tienda virtual para que funcione !rpgequipar
    if (tipo === "arma_ssr") {
      const baseId = premio.id.replace("ssr_", "");
      if (!player._ssrItems) player._ssrItems = {};
      player._ssrItems[premio.id] = ARMAS_SSR[baseId];
    }
  } else if (tipo === "mascota_ssr") {
    const baseId = premio.id.replace("ssr_mascota_", "");
    player.inventario[premio.id] = (player.inventario[premio.id] || 0) + 1;
    if (!player._ssrMascotas) player._ssrMascotas = {};
    player._ssrMascotas[premio.id] = MASCOTAS_SSR[baseId];
  } else if (tipo === "mascota_sr") {
    player.inventario[premio.id] = (player.inventario[premio.id] || 0) + 1;
  } else if (tipo === "item") {
    player.inventario[premio.id] = (player.inventario[premio.id] || 0) + 1;
  } else if (tipo === "oro") {
    player.oro += premio.cantidad;
  } else if (tipo === "exp") {
    // exp se aplica fuera para poder detectar level up
  }
  savePlayer(player);
}

// ── Pity counter ────────────────────────────────────────────────
export function getPity(player) {
  return player.gachaPity || 0;
}
export function incrementPity(player) {
  player.gachaPity = (player.gachaPity || 0) + 1;
  savePlayer(player);
}
export function resetPity(player) {
  player.gachaPity = 0;
  savePlayer(player);
}

// ══════════════════════════════════════════
//  BANNERS SEPARADOS
// ══════════════════════════════════════════

// Pity independiente por banner
export function getPityBanner(player, banner) {
  if (!player.gachaPityBanners) player.gachaPityBanners = {};
  return player.gachaPityBanners[banner] || 0;
}
export function incrementPityBanner(player, banner) {
  if (!player.gachaPityBanners) player.gachaPityBanners = {};
  player.gachaPityBanners[banner] = (player.gachaPityBanners[banner] || 0) + 1;
  savePlayer(player);
}
export function resetPityBanner(player, banner) {
  if (!player.gachaPityBanners) player.gachaPityBanners = {};
  player.gachaPityBanners[banner] = 0;
  savePlayer(player);
}

// Costos banners (mismo esquema: x1=100💎, x10=1000💎)
export const BANNER_COSTOS = { x1: 10, x10: 500 };
export const BANNER_PITY   = 90; // SSR garantizado al 90

// Pool base de recursos compartidos (sin oro exagerado)
const BANNER_RECURSOS = [
  { peso: 22, label: "💰 *[N]* Bolsa de Oro",      tipo: "oro",  cantidad: [50,  150] },
  { peso: 8,  label: "💰 *[N]* Cofre de Oro",      tipo: "oro",  cantidad: [150, 300] },
  { peso: 18, label: "⭐ *[N]* Fragmento de XP",   tipo: "exp",  cantidad: [80,  200] },
  { peso: 7,  label: "⭐ *[N]* Cristal de XP",     tipo: "exp",  cantidad: [250, 500] },
  { peso: 8,  label: "💊 *[N]* Poción Mayor",      tipo: "item", itemId: "pocion_mayor"    },
  { peso: 4,  label: "💉 *[SR]* Poción Superior",  tipo: "item", itemId: "pocion_superior" },
];

// ── Banner Mascota ────────────────────────────────────────────
// SSR exclusivo de este banner: Mini Dragón Ancestral
export const BANNER_MASCOTA_SSR = {
  mini_dragon: {
    nombre: "Mini Dragón Ancestral",
    emoji: "🐲",
    bonus: { atk: 26, def: 16, crit: 16 },
    desc: "Dragón legendario de poder ancestral",
  },
};

export function tiradaBannerMascota(p, numTiradas) {
  const resultados = [];
  let leveledUpGlobal = false;

  for (let i = 0; i < numTiradas; i++) {
    const pity = getPityBanner(p, "mascota");
    let premio;

    // Pity al 90
    if (pity + 1 >= BANNER_PITY) {
      premio = _resolverMascotaSSR();
      resetPityBanner(p, "mascota");
    } else {
      // Rates: SSR ~1.5%, SR mascota ~8%, R item ~25%, N recursos ~65%
      const roll = Math.random() * 100;
      if (roll < 1.5) {
        premio = _resolverMascotaSSR();
        resetPityBanner(p, "mascota");
      } else if (roll < 9.5) {
        // SR: mascotas normales buenas
        const srIds = ["dragon", "fenix", "unicornio", "esqueleto"];
        const id = srIds[Math.floor(Math.random() * srIds.length)];
        const m  = MASCOTAS[id];
        premio = { tipo: "mascota_sr", id: "mascota_" + id, label: "🟨 *[SR]* Mascota Épica", display: `${m.emoji} *${m.nombre}*\n   ⚔️+${m.bonus.atk} 🛡️+${m.bonus.def} 🎯+${m.bonus.crit}%`, esSSR: false };
        incrementPityBanner(p, "mascota");
      } else if (roll < 34.5) {
        // R: mascotas normales básicas
        const rIds = ["lobo", "gato", "slime", "hada"];
        const id = rIds[Math.floor(Math.random() * rIds.length)];
        const m  = MASCOTAS[id];
        premio = { tipo: "mascota_r", id: "mascota_" + id, label: "🟦 *[R]* Mascota Rara", display: `${m.emoji} *${m.nombre}*\n   ⚔️+${m.bonus.atk} 🛡️+${m.bonus.def} 🎯+${m.bonus.crit}%`, esSSR: false };
        incrementPityBanner(p, "mascota");
      } else {
        premio = _resolverRecurso();
        incrementPityBanner(p, "mascota");
      }
    }

    // Aplicar
    if (premio.tipo === "exp") {
      const lvl = addExp(p, premio.cantidad);
      if (lvl) leveledUpGlobal = true;
    } else if (premio.tipo === "oro") {
      p.oro += premio.cantidad;
    } else if (premio.tipo === "item") {
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
    } else if (premio.tipo === "mascota_sr" || premio.tipo === "mascota_r") {
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
    } else if (premio.tipo === "mascota_ssr_banner") {
      const baseId = premio.id.replace("ssr_mascota_banner_", "");
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
      if (!p._ssrMascotas) p._ssrMascotas = {};
      p._ssrMascotas[premio.id] = BANNER_MASCOTA_SSR[baseId];
    }

    resultados.push(premio);
  }

  savePlayer(p);
  return { resultados, leveledUpGlobal };
}

function _resolverMascotaSSR() {
  const ids = Object.keys(BANNER_MASCOTA_SSR);
  const id  = ids[Math.floor(Math.random() * ids.length)];
  const m   = BANNER_MASCOTA_SSR[id];
  return {
    tipo: "mascota_ssr_banner",
    id: "ssr_mascota_banner_" + id,
    label: "🌟 *[SSR]* Mascota Legendaria",
    display: `${m.emoji} *${m.nombre}*\n   ⚔️+${m.bonus.atk} 🛡️+${m.bonus.def} 🎯+${m.bonus.crit}%\n   _${m.desc}_`,
    esSSR: true,
  };
}

// ── Banner Armadura ───────────────────────────────────────────
// SSR exclusivo de este banner: Peto Caballero Oscuro
export const BANNER_ARMADURA_SSR = {
  peto_caballero_oscuro: {
    nombre: "Peto Caballero Oscuro",
    emoji: "🖤",
    tipo: "armadura",
    atk: 18,
    def: 116,
    nivelReq: 1,
    desc: "Armadura forjada en las tinieblas eternas",
  },
};

export function tiradaBannerArmadura(p, numTiradas) {
  const resultados = [];
  let leveledUpGlobal = false;

  for (let i = 0; i < numTiradas; i++) {
    const pity = getPityBanner(p, "armadura");
    let premio;

    if (pity + 1 >= BANNER_PITY) {
      premio = _resolverArmaduraSSR();
      resetPityBanner(p, "armadura");
    } else {
      const roll = Math.random() * 100;
      if (roll < 1.5) {
        premio = _resolverArmaduraSSR();
        resetPityBanner(p, "armadura");
      } else if (roll < 9.5) {
        // SR: armaduras épicas/legendarias de tienda
        const srIds = ["armadura_dragon", "manto_sombra", "armadura_runa", "armadura_acero"];
        const id = srIds[Math.floor(Math.random() * srIds.length)];
        const item = TIENDA[id];
        premio = { tipo: "arma_sr", id, label: "🟨 *[SR]* Armadura Épica", display: `${item.emoji} *${item.nombre}*\n   🛡️ DEF +${item.def}`, esSSR: false };
        incrementPityBanner(p, "armadura");
      } else if (roll < 34.5) {
        // R: armaduras raras
        const rIds = ["armadura_hierro", "cota_malla", "armadura_cuero"];
        const id = rIds[Math.floor(Math.random() * rIds.length)];
        const item = TIENDA[id];
        premio = { tipo: "armadura_r", id, label: "🟦 *[R]* Armadura Rara", display: `${item.emoji} *${item.nombre}*\n   🛡️ DEF +${item.def}`, esSSR: false };
        incrementPityBanner(p, "armadura");
      } else {
        premio = _resolverRecurso();
        incrementPityBanner(p, "armadura");
      }
    }

    // Aplicar
    if (premio.tipo === "exp") {
      const lvl = addExp(p, premio.cantidad);
      if (lvl) leveledUpGlobal = true;
    } else if (premio.tipo === "oro") {
      p.oro += premio.cantidad;
    } else if (premio.tipo === "item") {
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
    } else if (premio.tipo === "arma_sr" || premio.tipo === "armadura_r") {
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
    } else if (premio.tipo === "armadura_ssr_banner") {
      const baseId = premio.id.replace("ssr_armadura_banner_", "");
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
      if (!p._ssrItems) p._ssrItems = {};
      p._ssrItems[premio.id] = BANNER_ARMADURA_SSR[baseId];
    }

    resultados.push(premio);
  }

  savePlayer(p);
  return { resultados, leveledUpGlobal };
}

function _resolverArmaduraSSR() {
  const ids = Object.keys(BANNER_ARMADURA_SSR);
  const id  = ids[Math.floor(Math.random() * ids.length)];
  const a   = BANNER_ARMADURA_SSR[id];
  return {
    tipo: "armadura_ssr_banner",
    id: "ssr_armadura_banner_" + id,
    label: "🌟 *[SSR]* Armadura Legendaria",
    display: `${a.emoji} *${a.nombre}*\n   ⚔️ ATK +${a.atk} | 🛡️ DEF +${a.def}\n   _${a.desc}_`,
    esSSR: true,
  };
}

function _resolverRecurso() {
  const pool = BANNER_RECURSOS;
  const total = pool.reduce((s, e) => s + e.peso, 0);
  let roll = Math.random() * total;
  let elegido = pool[pool.length - 1];
  for (const entry of pool) {
    roll -= entry.peso;
    if (roll <= 0) { elegido = entry; break; }
  }
  if (elegido.tipo === "oro") {
    const [mn, mx] = elegido.cantidad;
    const cant = Math.floor(Math.random() * (mx - mn + 1)) + mn;
    return { tipo: "oro", label: elegido.label, display: `💰 *${cant} oro*`, cantidad: cant, esSSR: false };
  }
  if (elegido.tipo === "exp") {
    const [mn, mx] = elegido.cantidad;
    const cant = Math.floor(Math.random() * (mx - mn + 1)) + mn;
    return { tipo: "exp", label: elegido.label, display: `⭐ *${cant} EXP*`, cantidad: cant, esSSR: false };
  }
  // item
  const item = TIENDA[elegido.itemId];
  return { tipo: "item", id: elegido.itemId, label: elegido.label, display: `${item.emoji} *${item.nombre}*`, esSSR: false };
}


// ══════════════════════════════════════════
//  BANNER ARMA — ESPADA DEL SEÑOR OSCURO
// ══════════════════════════════════════════

export const BANNER_ARMA_SSR = {
  espada_senor_oscuro: {
    nombre: "Espada del Señor Oscuro",
    emoji: "🗡️",
    tipo: "arma",
    calidad: "ssr",
    atk: 180,
    def: 30,
    nivelReq: 1,
    desc: "Forjada en las profundidades del abismo, consume la luz a su paso",
  },
};

export function tiradaBannerArma(p, numTiradas) {
  const resultados = [];
  let leveledUpGlobal = false;

  for (let i = 0; i < numTiradas; i++) {
    const pity = getPityBanner(p, "arma");
    let premio;

    if (pity + 1 >= BANNER_PITY) {
      premio = _resolverArmaSenorOscuro();
      resetPityBanner(p, "arma");
    } else {
      const roll = Math.random() * 100;
      if (roll < 1.5) {
        premio = _resolverArmaSenorOscuro();
        resetPityBanner(p, "arma");
      } else if (roll < 9.5) {
        // SR: armas épicas de tienda
        const srIds = ["espada_dorada", "hacha_runica", "lanza_oscura_t", "arco_elfico"];
        const validSr = srIds.filter(id => TIENDA[id]);
        const fallbackSr = ["espada_fuego", "espada_hielo", "hacha_guerra"];
        const pool = validSr.length ? validSr : fallbackSr;
        const id = pool[Math.floor(Math.random() * pool.length)];
        const item = TIENDA[id] || { emoji: "⚔️", nombre: "Arma Épica", atk: 60, def: 10 };
        premio = { tipo: "arma_sr", id, label: "🟨 *[SR]* Arma Épica", display: `${item.emoji} *${item.nombre}*
   ⚔️ ATK +${item.atk}`, esSSR: false };
        incrementPityBanner(p, "arma");
      } else if (roll < 34.5) {
        // R: armas raras
        const rIds = ["espada_acero", "hacha_hierro", "lanza_basica", "arco_madera"];
        const validR = rIds.filter(id => TIENDA[id]);
        const fallbackR = ["espada", "hacha", "lanza"];
        const pool = validR.length ? validR : fallbackR;
        const id = pool[Math.floor(Math.random() * pool.length)];
        const item = TIENDA[id] || { emoji: "⚔️", nombre: "Arma Rara", atk: 30, def: 5 };
        premio = { tipo: "arma_r", id, label: "🟦 *[R]* Arma Rara", display: `${item.emoji} *${item.nombre}*`, esSSR: false };
        incrementPityBanner(p, "arma");
      } else {
        // N: recursos (x10 garantiza al menos 1 SR+)
        premio = _resolverRecurso();
        // En x10 si es el último y no hubo SR+, forzar SR
        if (numTiradas === 10 && i === 9 && !resultados.some(r => r.esSSR || r.tipo === "arma_sr")) {
          const srIds2 = ["espada_fuego", "espada_hielo", "hacha_guerra"];
          const id2 = srIds2[Math.floor(Math.random() * srIds2.length)];
          const item2 = TIENDA[id2] || { emoji: "⚔️", nombre: "Arma Épica", atk: 60, def: 10 };
          premio = { tipo: "arma_sr", id: id2, label: "🟨 *[SR]* Arma Épica", display: `${item2.emoji} *${item2.nombre}*`, esSSR: false };
        }
        incrementPityBanner(p, "arma");
      }
    }

    // Aplicar premio
    if (premio.tipo === "oro") {
      p.oro = (p.oro || 0) + premio.cantidad;
    } else if (premio.tipo === "exp") {
      const lvl = addExp(p, premio.cantidad);
      if (lvl) leveledUpGlobal = true;
    } else if (premio.tipo === "item") {
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
    } else if (premio.tipo === "arma_sr" || premio.tipo === "arma_r") {
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
    } else if (premio.tipo === "armadura_ssr_banner") {
      // por si acaso
      const baseId = premio.id.replace("ssr_armadura_banner_", "");
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
      if (!p._ssrItems) p._ssrItems = {};
      p._ssrItems[premio.id] = BANNER_ARMADURA_SSR[baseId];
    } else if (premio.tipo === "arma_ssr_banner") {
      const baseId = premio.id.replace("ssr_arma_banner_", "");
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
      if (!p._ssrItems) p._ssrItems = {};
      p._ssrItems[premio.id] = BANNER_ARMA_SSR[baseId];
    }

    resultados.push(premio);
  }

  savePlayer(p);
  return { resultados, leveledUpGlobal };
}

function _resolverArmaSenorOscuro() {
  const ids = Object.keys(BANNER_ARMA_SSR);
  const id  = ids[Math.floor(Math.random() * ids.length)];
  const a   = BANNER_ARMA_SSR[id];
  return {
    tipo: "arma_ssr_banner",
    id: "ssr_arma_banner_" + id,
    label: "🌟 *[SSR]* Arma Legendaria",
    display: `${a.emoji} *${a.nombre}*
   ⚔️ ATK +${a.atk} | 🛡️ DEF +${a.def}
   _${a.desc}_`,
    esSSR: true,
  };
}

// ══════════════════════════════════════════
//  SISTEMA DE DUNGEONS
// ══════════════════════════════════════════

export const DUNGEON_COOLDOWN = 24 * 60 * 60 * 1000; // 1 día
export const DUNGEON_REVIVE_COSTO = 100; // gemas para revivir
export const DUNGEON_PISOS = 10;

// Enemigos por piso (escalan progresivamente)
export const DUNGEON_ENEMIGOS = [
  { nombre: "Rata Gigante",      emoji: "🐀", hpMult: 0.4,  atkMult: 0.5,  defMult: 0.3,  exp: 30,  oro: 25  }, // piso 1
  { nombre: "Goblin Armado",     emoji: "👺", hpMult: 0.6,  atkMult: 0.6,  defMult: 0.4,  exp: 45,  oro: 35  }, // piso 2
  { nombre: "Esqueleto Guerrero",emoji: "💀", hpMult: 0.8,  atkMult: 0.7,  defMult: 0.5,  exp: 60,  oro: 50  }, // piso 3
  { nombre: "Troll de Cueva",    emoji: "🧌", hpMult: 1.0,  atkMult: 0.8,  defMult: 0.6,  exp: 80,  oro: 65  }, // piso 4
  { nombre: "Vampiro Menor",     emoji: "🧛", hpMult: 1.2,  atkMult: 0.9,  defMult: 0.7,  exp: 100, oro: 80  }, // piso 5
  { nombre: "Caballero Oscuro",  emoji: "🖤", hpMult: 1.4,  atkMult: 1.0,  defMult: 0.85, exp: 130, oro: 105 }, // piso 6
  { nombre: "Mago Oscuro",       emoji: "🧙", hpMult: 1.6,  atkMult: 1.15, defMult: 0.9,  exp: 160, oro: 130 }, // piso 7
  { nombre: "Dragón Joven",      emoji: "🐉", hpMult: 1.9,  atkMult: 1.3,  defMult: 1.0,  exp: 200, oro: 165 }, // piso 8
  { nombre: "Demonio Antiguo",   emoji: "😈", hpMult: 2.2,  atkMult: 1.5,  defMult: 1.15, exp: 250, oro: 210 }, // piso 9
  { nombre: "👑 SEÑOR DEL ABISMO", emoji: "🌑", hpMult: 3.5, atkMult: 2.0, defMult: 1.5, exp: 500, oro: 400 }, // piso 10 — BOSS
];

// Recompensa por completar la dungeon completa
export const DUNGEON_RECOMPENSA_FINAL = {
  exp: 800,
  oro: [500, 1200],
  dropRate: 0.95,
  dropCalidades: { comun: 0.05, raro: 0.20, epico: 0.35, legendario: 0.30, mitico: 0.10 },
};

// Recompensa por piso (pequeña)
export const DUNGEON_RECOMPENSA_PISO = [
  { oro: [20,  50],  dropRate: 0.30, calidades: { comun: 0.70, raro: 0.25, epico: 0.05, legendario: 0, mitico: 0 } },
  { oro: [30,  70],  dropRate: 0.35, calidades: { comun: 0.60, raro: 0.30, epico: 0.08, legendario: 0.02, mitico: 0 } },
  { oro: [40,  90],  dropRate: 0.40, calidades: { comun: 0.50, raro: 0.35, epico: 0.12, legendario: 0.03, mitico: 0 } },
  { oro: [50,  110], dropRate: 0.45, calidades: { comun: 0.40, raro: 0.35, epico: 0.18, legendario: 0.06, mitico: 0.01 } },
  { oro: [70,  140], dropRate: 0.50, calidades: { comun: 0.30, raro: 0.35, epico: 0.22, legendario: 0.10, mitico: 0.03 } },
  { oro: [90,  180], dropRate: 0.55, calidades: { comun: 0.20, raro: 0.35, epico: 0.28, legendario: 0.13, mitico: 0.04 } },
  { oro: [120, 220], dropRate: 0.60, calidades: { comun: 0.10, raro: 0.30, epico: 0.32, legendario: 0.20, mitico: 0.08 } },
  { oro: [150, 280], dropRate: 0.65, calidades: { comun: 0.05, raro: 0.25, epico: 0.35, legendario: 0.25, mitico: 0.10 } },
  { oro: [200, 350], dropRate: 0.75, calidades: { comun: 0.03, raro: 0.20, epico: 0.32, legendario: 0.30, mitico: 0.15 } },
  { oro: [300, 500], dropRate: 0.95, calidades: { comun: 0, raro: 0.10, epico: 0.25, legendario: 0.40, mitico: 0.25 } },
];

export function getDungeonEstado(player) {
  return player.dungeon || { piso: 0, iniciada: 0, activa: false, pisoActual: 0 };
}

export function calcDungeonEnemigo(pisoIdx, playerHpMax, playerAtk, playerDef) {
  const e = DUNGEON_ENEMIGOS[pisoIdx];
  return {
    nombre: e.nombre,
    emoji: e.emoji,
    hp: Math.floor(playerHpMax * e.hpMult),
    hpMax: Math.floor(playerHpMax * e.hpMult),
    atk: Math.floor(playerAtk * e.atkMult),
    def: Math.floor(playerDef * e.defMult),
    exp: e.exp,
    oro: e.oro,
  };
}

export function calcDungeonDrop(pisoIdx) {
  const config = DUNGEON_RECOMPENSA_PISO[pisoIdx];
  const [mn, mx] = config.oro;
  const oro = Math.floor(Math.random() * (mx - mn + 1)) + mn;
  let item = null;
  if (Math.random() < config.dropRate) {
    const roll = Math.random();
    let acum = 0;
    let cal = "comun";
    for (const [c, p] of Object.entries(config.calidades)) {
      acum += p;
      if (roll <= acum) { cal = c; break; }
    }
    const pool = DROP_POOL[cal];
    if (pool && pool.length) {
      const itemId = pool[Math.floor(Math.random() * pool.length)];
      item = { itemId, calidad: cal, item: TIENDA[itemId] };
    }
  }
  return { oro, item };
}

export function calcDungeonRecompensaFinal() {
  const [mn, mx] = DUNGEON_RECOMPENSA_FINAL.oro;
  const oro = Math.floor(Math.random() * (mx - mn + 1)) + mn;
  let item = null;
  const roll = Math.random();
  let acum = 0;
  let cal = "epico";
  for (const [c, p] of Object.entries(DUNGEON_RECOMPENSA_FINAL.dropCalidades)) {
    acum += p;
    if (roll <= acum) { cal = c; break; }
  }
  const pool = DROP_POOL[cal];
  if (pool && pool.length) {
    const itemId = pool[Math.floor(Math.random() * pool.length)];
    item = { itemId, calidad: cal, item: TIENDA[itemId] };
  }
  return { oro, exp: DUNGEON_RECOMPENSA_FINAL.exp, item };
}

// ══════════════════════════════════════════
//  ACTIVIDADES & ARENA
// ══════════════════════════════════════════

export const ACTIVIDAD_COOLDOWN = 2 * 60 * 60 * 1000; // 2 horas

export const ACTIVIDADES = {
  pesca: {
    nombre: "Pesca", emoji: "🎣",
    desc: "Pescás en el río y conseguís recursos.",
    drops: [
      { peso: 30, tipo: "oro",  min: 30,  max: 90,  label: "💰 Monedas del río" },
      { peso: 25, tipo: "exp",  min: 20,  max: 60,  label: "⭐ Pesca productiva" },
      { peso: 20, tipo: "item", item: "pocion_menor", label: "🐟 Pez extraño (poción menor)" },
      { peso: 15, tipo: "dual", oroMin: 20, oroMax: 50, expMin: 15, expMax: 40, label: "🎣 Buena captura" },
      { peso: 10, tipo: "item", item: "pocion_mayor", label: "🦑 Pez legendario (poción mayor)" },
    ],
  },
  caza: {
    nombre: "Caza", emoji: "🏹",
    desc: "Salís al bosque a cazar criaturas.",
    drops: [
      { peso: 25, tipo: "oro",  min: 50,  max: 130, label: "💰 Venta de pieles" },
      { peso: 25, tipo: "exp",  min: 35,  max: 80,  label: "⭐ Cacería exitosa" },
      { peso: 20, tipo: "dual", oroMin: 30, oroMax: 80, expMin: 20, expMax: 50, label: "🦌 Buena presa" },
      { peso: 20, tipo: "item", item: "pocion_mayor", label: "🐗 Bestia rara (poción mayor)" },
      { peso: 10, tipo: "item", item: "elixir_fuerza", label: "🐲 Criatura mítica (elixir)" },
    ],
  },
  minar: {
    nombre: "Minería", emoji: "⛏️",
    desc: "Excavás la mina en busca de gemas. ¡Siempre encontrás algo!",
    // [NERF v2.5] Rangos reducidos ~50% en todos los tiers
    drops: [
      { peso: 40, tipo: "gemas", min: 1,   max: 3,   label: "🪨 Piedra con brillo (1-3 💎)" },
      { peso: 25, tipo: "gemas", min: 4,   max: 10,  label: "💎 Fragmento de gema (4-10 💎)" },
      { peso: 15, tipo: "gemas", min: 11,  max: 30,  label: "💎 Gema pequeña (11-30 💎)" },
      { peso: 10, tipo: "gemas", min: 31,  max: 60,  label: "💎💎 Gema brillante (31-60 💎)" },
      { peso: 7,  tipo: "gemas", min: 61,  max: 100, label: "💎💎 Gema rara (61-100 💎)" },
      { peso: 3,  tipo: "gemas", min: 101, max: 150, label: "💎💎💎 ¡Veta de gemas pura! (101-150 💎)" },
    ],
  },
  talar: {
    nombre: "Tala", emoji: "🪓",
    desc: "Talás árboles en el bosque sagrado.",
    drops: [
      { peso: 30, tipo: "oro",  min: 40,  max: 110, label: "💰 Madera vendida" },
      { peso: 25, tipo: "exp",  min: 25,  max: 65,  label: "⭐ Troncos de calidad" },
      { peso: 20, tipo: "dual", oroMin: 25, oroMax: 70, expMin: 15, expMax: 45, label: "🌲 Árbol ancestral" },
      { peso: 15, tipo: "item", item: "pocion_menor", label: "🌿 Hierba mágica (poción menor)" },
      { peso: 10, tipo: "item", item: "pocion_mayor", label: "🌳 Árbol sagrado (poción mayor)" },
    ],
  },
};

export function realizarActividad(player, actId) {
  const act = ACTIVIDADES[actId];
  if (!act) return null;

  const pool = act.drops;
  const total = pool.reduce((s, e) => s + e.peso, 0);
  let roll = Math.random() * total;
  let drop = pool[pool.length - 1];
  for (const d of pool) { roll -= d.peso; if (roll <= 0) { drop = d; break; } }

  // Escalar levemente por nivel
  const mult = 1 + (player.nivel - 1) * 0.05;
  const resultado = { tipo: drop.tipo, label: drop.label, emoji: act.emoji };

  if (drop.tipo === "oro") {
    resultado.oro = Math.floor((Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min) * mult);
    player.oro += resultado.oro;
  } else if (drop.tipo === "exp") {
    resultado.exp = Math.floor((Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min) * mult);
    const lvl = addExp(player, resultado.exp);
    resultado.levelUp = lvl;
  } else if (drop.tipo === "dual") {
    resultado.oro = Math.floor((Math.floor(Math.random() * (drop.oroMax - drop.oroMin + 1)) + drop.oroMin) * mult);
    resultado.exp = Math.floor((Math.floor(Math.random() * (drop.expMax - drop.expMin + 1)) + drop.expMin) * mult);
    player.oro += resultado.oro;
    const lvl = addExp(player, resultado.exp);
    resultado.levelUp = lvl;
  } else if (drop.tipo === "item") {
    resultado.item = drop.item;
    const itemData = TIENDA[drop.item];
    resultado.itemNombre = itemData?.nombre || drop.item;
    player.inventario[drop.item] = (player.inventario[drop.item] || 0) + 1;
  } else if (drop.tipo === "gemas") {
    resultado.gemas = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
    player.gemas = (player.gemas || 0) + resultado.gemas;
  }

  if (!player.actividadesCd) player.actividadesCd = {};
  player.actividadesCd[actId] = Date.now();
  if (!player.actividadesCount) player.actividadesCount = {};
  player.actividadesCount[actId] = (player.actividadesCount[actId] || 0) + 1;
  savePlayer(player);
  return resultado;
}

// ── Arena ─────────────────────────────────
export function getArenaStats(player) {
  if (!player.arena) player.arena = { puntos: 1000, victorias: 0, derrotas: 0 };
  return player.arena;
}

export function resolverArena(atacante, defensor) {
  const atkA = getTotalAtk(atacante) + Math.floor(Math.random() * 20);
  const defD = getTotalDef(defensor) + Math.floor(Math.random() * 10);
  const atkD = getTotalAtk(defensor) + Math.floor(Math.random() * 20);
  const defA = getTotalDef(atacante) + Math.floor(Math.random() * 10);

  const danoA = Math.max(1, atkA - defD);
  const danoD = Math.max(1, atkD - defA);

  const ganaAtacante = danoA >= danoD;

  getArenaStats(atacante);
  getArenaStats(defensor);

  if (ganaAtacante) {
    atacante.arena.puntos = Math.max(0, (atacante.arena.puntos || 1000) + 20);
    atacante.arena.victorias = (atacante.arena.victorias || 0) + 1;
    defensor.arena.puntos = Math.max(0, (defensor.arena.puntos || 1000) - 10);
    defensor.arena.derrotas = (defensor.arena.derrotas || 0) + 1;
  } else {
    defensor.arena.puntos = Math.max(0, (defensor.arena.puntos || 1000) + 20);
    defensor.arena.victorias = (defensor.arena.victorias || 0) + 1;
    atacante.arena.puntos = Math.max(0, (atacante.arena.puntos || 1000) - 10);
    atacante.arena.derrotas = (atacante.arena.derrotas || 0) + 1;
  }

  savePlayer(atacante);
  savePlayer(defensor);

  return { ganaAtacante, danoA, danoD };
}

export function getArenaTop() {
  const todos = db.players || {};
  return Object.values(todos)
    .filter(p => p.clase && p.arena)
    .sort((a, b) => (b.arena?.puntos || 0) - (a.arena?.puntos || 0))
    .slice(0, 10);
}

// ══════════════════════════════════════════
//  SISTEMA DE TÍTULOS
// ══════════════════════════════════════════

// Cada título tiene: id, emoji, nombre, descripción y condición
// priority: mayor número = se muestra primero (títulos más raros/importantes)
export const TITULOS = [
  // ── Top RPG ──────────────────────────────
  { id: "top1_rpg",    emoji: "👑", nombre: "El Legendario",    desc: "Top 1 del ranking RPG",        priority: 100 },
  { id: "top2_rpg",    emoji: "🥈", nombre: "El Campeón",       desc: "Top 2 del ranking RPG",        priority: 99  },
  { id: "top3_rpg",    emoji: "🥉", nombre: "El Élite",         desc: "Top 3 del ranking RPG",        priority: 98  },
  // ── Top Arena ────────────────────────────
  { id: "top1_arena",  emoji: "⚔️", nombre: "Rey de la Arena",  desc: "Top 1 de la arena PvP",       priority: 97  },
  { id: "top2_arena",  emoji: "🗡️", nombre: "Gladiador Mayor",  desc: "Top 2 de la arena PvP",       priority: 96  },
  { id: "top3_arena",  emoji: "🛡️", nombre: "Combatiente",      desc: "Top 3 de la arena PvP",       priority: 95  },
  // ── Nivel ────────────────────────────────
  { id: "nv50",        emoji: "🌑", nombre: "Ascendido",        desc: "Llegar al nivel 50",           priority: 80  },
  { id: "nv35",        emoji: "💜", nombre: "Veterano",         desc: "Llegar al nivel 35",           priority: 70  },
  { id: "nv20",        emoji: "🔵", nombre: "Aventurero",       desc: "Llegar al nivel 20",           priority: 60  },
  { id: "nv10",        emoji: "🟢", nombre: "Iniciado",         desc: "Llegar al nivel 10",           priority: 50  },
  // ── Kills / Exploración ──────────────────
  { id: "kills500",    emoji: "💀", nombre: "Exterminador",     desc: "500 enemigos derrotados",      priority: 75  },
  { id: "kills100",    emoji: "⚔️", nombre: "Cazador",          desc: "100 enemigos derrotados",      priority: 55  },
  { id: "kills50",     emoji: "🗡️", nombre: "Guerrero Fiel",    desc: "50 enemigos derrotados",       priority: 45  },
  { id: "exp200",      emoji: "🗺️", nombre: "Explorador Nato",  desc: "200 exploraciones",            priority: 65  },
  { id: "exp50",       emoji: "🌲", nombre: "Viajero",          desc: "50 exploraciones",             priority: 40  },
  // ── Actividades ──────────────────────────
  { id: "pesca100",    emoji: "🎣", nombre: "Maestro Pescador", desc: "100 pescas realizadas",        priority: 72  },
  { id: "pesca25",     emoji: "🐟", nombre: "Pescador",         desc: "25 pescas realizadas",         priority: 42  },
  { id: "caza100",     emoji: "🏹", nombre: "Gran Cazador",     desc: "100 cazas realizadas",         priority: 73  },
  { id: "caza25",      emoji: "🦌", nombre: "Rastreador",       desc: "25 cazas realizadas",          priority: 43  },
  { id: "minar100",    emoji: "💎", nombre: "Maestro Minero",   desc: "100 minería realizadas",       priority: 71  },
  { id: "minar25",     emoji: "⛏️", nombre: "Minero",           desc: "25 minerías realizadas",       priority: 41  },
  { id: "talar100",    emoji: "🌳", nombre: "Leñador Sagrado",  desc: "100 talas realizadas",         priority: 70  },
  { id: "talar25",     emoji: "🪓", nombre: "Talador",          desc: "25 talas realizadas",          priority: 40  },
  // ── Oro ──────────────────────────────────
  { id: "oro50k",      emoji: "🏆", nombre: "Magnate",          desc: "Acumular 50,000 oro",          priority: 85  },
  { id: "oro10k",      emoji: "💰", nombre: "Comerciante",      desc: "Acumular 10,000 oro",          priority: 62  },
  { id: "oro1k",       emoji: "🪙", nombre: "Ahorrador",        desc: "Acumular 1,000 oro",           priority: 35  },
  // ── Gemas ────────────────────────────────
  { id: "gemas500",    emoji: "💎", nombre: "Acumulador",       desc: "Tener 500 gemas",              priority: 83  },
  { id: "gemas100",    emoji: "🔮", nombre: "Coleccionista",    desc: "Tener 100 gemas",              priority: 58  },
  // ── Pareja ───────────────────────────────
  { id: "pareja_1d",   emoji: "💌", nombre: "Recién Prometidos",  desc: "1 día juntos como pareja",     priority: 30  },
  { id: "pareja_7d",   emoji: "💑", nombre: "Enamorados",         desc: "1 semana juntos como pareja",  priority: 36  },
  { id: "pareja_30d",  emoji: "💍", nombre: "Comprometidos",      desc: "1 mes juntos como pareja",     priority: 52  },
  { id: "pareja_90d",  emoji: "🌹", nombre: "Almas Afines",       desc: "3 meses juntos como pareja",   priority: 68  },
  { id: "pareja_180d", emoji: "💞", nombre: "Vínculo Eterno",     desc: "6 meses juntos como pareja",   priority: 78  },
  { id: "pareja_365d", emoji: "👫", nombre: "Legendarios del Amor", desc: "1 año juntos como pareja",   priority: 90  },
  // ── Jefes Mundiales ──────────────────────
  { id: "cazador_mundial", emoji: "🌍", nombre: "Cazador Mundial", desc: "Dar el golpe final a un Jefe Mundial", priority: 92 },
];

// Evalúa qué títulos tiene un jugador y devuelve el de mayor prioridad activo
export function calcularTitulo(player) {
  const desbloqueados = getTitulosDesbloqueados(player);
  if (!desbloqueados.length) return null;
  // Si tiene título equipado manualmente, usarlo (si aún lo tiene desbloqueado)
  if (player.tituloEquipado) {
    const manual = desbloqueados.find(t => t.id === player.tituloEquipado);
    if (manual) return manual;
    // Si ya no lo tiene (raro, pero por si acaso), limpiar y caer al automático
    player.tituloEquipado = null;
  }
  return desbloqueados.sort((a, b) => b.priority - a.priority)[0];
}

// Devuelve todos los títulos que el jugador ha desbloqueado (sin necesitar db para tops)
export function getTitulosDesbloqueados(player) {
  const ac = player.actividadesCount || {};
  const desbloqueados = [];
  const check = (id) => TITULOS.find(t => t.id === id);

  // Nivel
  if (player.nivel >= 50) desbloqueados.push(check("nv50"));
  else if (player.nivel >= 35) desbloqueados.push(check("nv35"));
  else if (player.nivel >= 20) desbloqueados.push(check("nv20"));
  else if (player.nivel >= 10) desbloqueados.push(check("nv10"));

  // Kills
  const kills = player.stats?.enemigosKill || 0;
  if (kills >= 500) desbloqueados.push(check("kills500"));
  else if (kills >= 100) desbloqueados.push(check("kills100"));
  else if (kills >= 50)  desbloqueados.push(check("kills50"));

  // Exploraciones
  const exps = player.stats?.exploraciones || 0;
  if (exps >= 200) desbloqueados.push(check("exp200"));
  else if (exps >= 50) desbloqueados.push(check("exp50"));

  // Actividades
  if ((ac.pesca  || 0) >= 100) desbloqueados.push(check("pesca100"));
  else if ((ac.pesca  || 0) >= 25) desbloqueados.push(check("pesca25"));
  if ((ac.caza   || 0) >= 100) desbloqueados.push(check("caza100"));
  else if ((ac.caza   || 0) >= 25)  desbloqueados.push(check("caza25"));
  if ((ac.minar  || 0) >= 100) desbloqueados.push(check("minar100"));
  else if ((ac.minar  || 0) >= 25)  desbloqueados.push(check("minar25"));
  if ((ac.talar  || 0) >= 100) desbloqueados.push(check("talar100"));
  else if ((ac.talar  || 0) >= 25)  desbloqueados.push(check("talar25"));

  // Oro
  if (player.oro >= 50000) desbloqueados.push(check("oro50k"));
  else if (player.oro >= 10000) desbloqueados.push(check("oro10k"));
  else if (player.oro >= 1000)  desbloqueados.push(check("oro1k"));

  // Gemas
  if ((player.gemas || 0) >= 500) desbloqueados.push(check("gemas500"));
  else if ((player.gemas || 0) >= 100) desbloqueados.push(check("gemas100"));

  // Tops (guardados en el jugador, se actualizan desde los comandos !rpgtop y !rpgarena top)
  if (player.topRpg === 1)    desbloqueados.push(check("top1_rpg"));
  else if (player.topRpg === 2) desbloqueados.push(check("top2_rpg"));
  else if (player.topRpg === 3) desbloqueados.push(check("top3_rpg"));

  if (player.topArena === 1)    desbloqueados.push(check("top1_arena"));
  else if (player.topArena === 2) desbloqueados.push(check("top2_arena"));
  else if (player.topArena === 3) desbloqueados.push(check("top3_arena"));

  // Pareja — títulos por tiempo juntos
  if (player.pareja && player.parejaDesde) {
    const diasJuntos = Math.floor((Date.now() - player.parejaDesde) / (24 * 60 * 60 * 1000));
    if (diasJuntos >= 365) desbloqueados.push(check("pareja_365d"));
    else if (diasJuntos >= 180) desbloqueados.push(check("pareja_180d"));
    else if (diasJuntos >= 90)  desbloqueados.push(check("pareja_90d"));
    else if (diasJuntos >= 30)  desbloqueados.push(check("pareja_30d"));
    else if (diasJuntos >= 7)   desbloqueados.push(check("pareja_7d"));
    else if (diasJuntos >= 1)   desbloqueados.push(check("pareja_1d"));
  }

  // Jefes Mundiales
  if (player._cazadorMundial) desbloqueados.push(check("cazador_mundial"));

  return desbloqueados.filter(Boolean);
}

// Actualiza topRpg en los top 3 jugadores del ranking
export function actualizarTopRpg() {
  const jugadores = Object.values(db.players)
    .filter(p => p.clase)
    .sort((a, b) => b.nivel - a.nivel || b.exp - a.exp);

  // Limpiar tops anteriores
  for (const p of Object.values(db.players)) {
    if (p.topRpg) { p.topRpg = null; }
  }
  [1, 2, 3].forEach(pos => {
    if (jugadores[pos - 1]) jugadores[pos - 1].topRpg = pos;
  });
  saveDB();
}

// Actualiza topArena en los top 3 jugadores de arena
export function actualizarTopArena() {
  const jugadores = Object.values(db.players)
    .filter(p => p.clase && p.arena)
    .sort((a, b) => (b.arena?.puntos || 0) - (a.arena?.puntos || 0));

  for (const p of Object.values(db.players)) {
    if (p.topArena) { p.topArena = null; }
  }
  [1, 2, 3].forEach(pos => {
    if (jugadores[pos - 1]) jugadores[pos - 1].topArena = pos;
  });
  saveDB();
}

// ══════════════════════════════════════════════
//  SISTEMA DE MEJORAS CON ORBES
// ══════════════════════════════════════════════

// Stats mejorables del personaje con Orbe Azul 🔵
export const MEJORA_STATS = ["atk", "def", "hp", "spd", "crit"];
export const MEJORA_STAT_EMOJI = { atk: "⚔️", def: "🛡️", hp: "❤️", spd: "💨", crit: "🎯" };
export const MEJORA_STAT_NOMBRE = { atk: "ATK", def: "DEF", hp: "HP Máx", spd: "DODGE", crit: "CRIT" };

// Stats mejorables del equipo con Orbe Dorado 🟡
export const MEJORA_EQUIPO_STATS = ["atk", "def"];

// Nivel máximo de mejora por stat
export const MEJORA_MAX_NIVEL = 100;

// Ganancia por nivel de mejora (plana)
export const MEJORA_STAT_GANANCIA = { atk: 2, def: 1, hp: 8, spd: 1, crit: 1 };
export const MEJORA_EQUIPO_GANANCIA = { atk: 3, def: 2 };

// Costo de mejora: orbes + oro. Escala exponencialmente.
// Nivel 1: 1 orbe + 100 oro | Nivel 50: 3 orbes + 5000 oro | Nivel 100: 5 orbes + 15000 oro
export function calcCostoMejora(nivelActual) {
  const sig = nivelActual + 1; // nivel al que se va a subir
  const orbes = 1 + Math.floor(sig / 25); // 1 orbe (nv1-24), 2 (nv25-49), 3 (nv50-74), 4 (nv75-99), 5 (nv100)
  const oro = Math.floor(100 * Math.pow(1.065, nivelActual));
  return { orbes, oro };
}

// Calcula el costo acumulado de N mejoras consecutivas desde nivelActual
export function calcCostoMejoraMultiple(nivelActual, cantidad) {
  let totalOrbes = 0;
  let totalOro = 0;
  let nivelFinal = nivelActual;
  let cantReal = 0;
  for (let i = 0; i < cantidad; i++) {
    if (nivelFinal >= MEJORA_MAX_NIVEL) break;
    const { orbes, oro } = calcCostoMejora(nivelFinal);
    totalOrbes += orbes;
    totalOro += oro;
    nivelFinal++;
    cantReal++;
  }
  return { totalOrbes, totalOro, nivelFinal, cantReal };
}

// Aplica N mejoras de stat del personaje con Orbe Azul
export function aplicarMejoraStatMultiple(player, stat, cantidad) {
  if (!MEJORA_STATS.includes(stat)) return { ok: false, msg: "❌ Stat inválido. Opciones: " + MEJORA_STATS.join(", ") };
  const mejoras = getMejorasStats(player);
  const nivelActual = mejoras[stat] || 0;
  if (nivelActual >= MEJORA_MAX_NIVEL) return { ok: false, msg: "✨ *" + MEJORA_STAT_NOMBRE[stat] + "* ya está en el nivel máximo (100)." };

  const { totalOrbes, totalOro, nivelFinal, cantReal } = calcCostoMejoraMultiple(nivelActual, cantidad);
  if (cantReal === 0) return { ok: false, msg: "✨ *" + MEJORA_STAT_NOMBRE[stat] + "* ya está en el nivel máximo (100)." };

  const invOrbes = player.inventario["orbe_azul"] || 0;
  if (invOrbes < totalOrbes) return { ok: false, msg: "❌ Necesitas *" + totalOrbes + " 🔵 Orbe Azul* para x" + cantReal + " mejoras (tienes " + invOrbes + ")." };
  if (player.oro < totalOro) return { ok: false, msg: "❌ Necesitas *" + totalOro + " 💰* para x" + cantReal + " mejoras (tienes " + player.oro + ")." };

  // Consumir recursos
  player.inventario["orbe_azul"] -= totalOrbes;
  player.oro -= totalOro;

  // Aplicar todas las mejoras
  const ganancia = MEJORA_STAT_GANANCIA[stat];
  mejoras[stat] = nivelFinal;
  player.mejoras = mejoras;
  const gananciaTotal = ganancia * cantReal;
  if (stat === "hp") {
    player.hpMax += gananciaTotal;
    player.hp = Math.min(player.hp + gananciaTotal, player.hpMax);
  } else {
    player[stat] = (player[stat] || 0) + gananciaTotal;
  }
  savePlayer(player);
  return {
    ok: true,
    cantReal,
    msg: "✅ *" + MEJORA_STAT_NOMBRE[stat] + "* mejorado *x" + cantReal + "* veces\n" +
         MEJORA_STAT_EMOJI[stat] + " +" + gananciaTotal + " " + MEJORA_STAT_NOMBRE[stat] + " total\n" +
         "📊 Nivel: *" + nivelActual + "* → *" + nivelFinal + "*\n" +
         "🔵 Orbes usados: " + totalOrbes + " | 💰 Oro usado: " + totalOro,
  };
}

// Aplica N mejoras de equipo con Orbe Dorado
export function aplicarMejoraEquipoMultiple(player, slot, stat, cantidad) {
  if (!["arma", "armadura"].includes(slot)) return { ok: false, msg: "❌ Slot inválido. Usa: arma o armadura" };
  if (!MEJORA_EQUIPO_STATS.includes(stat)) return { ok: false, msg: "❌ Stat inválido. Usa: atk o def" };
  const equipado = player.equipo?.[slot];
  if (!equipado) return { ok: false, msg: "❌ No tienes *" + slot + "* equipado." };

  const mejorasEq = getMejorasEquipo(player);
  const key = slot + "_" + stat;
  const nivelActual = mejorasEq[key] || 0;
  if (nivelActual >= MEJORA_MAX_NIVEL) return { ok: false, msg: "✨ El *" + slot + "* ya tiene " + stat.toUpperCase() + " en nivel máximo (100)." };

  const { totalOrbes, totalOro, nivelFinal, cantReal } = calcCostoMejoraMultiple(nivelActual, cantidad);
  if (cantReal === 0) return { ok: false, msg: "✨ El *" + slot + "* ya tiene " + stat.toUpperCase() + " en nivel máximo (100)." };

  const invOrbes = player.inventario["orbe_dorado"] || 0;
  if (invOrbes < totalOrbes) return { ok: false, msg: "❌ Necesitas *" + totalOrbes + " 🟡 Orbe Dorado* para x" + cantReal + " mejoras (tienes " + invOrbes + ")." };
  if (player.oro < totalOro) return { ok: false, msg: "❌ Necesitas *" + totalOro + " 💰* para x" + cantReal + " mejoras (tienes " + player.oro + ")." };

  // Consumir recursos
  player.inventario["orbe_dorado"] -= totalOrbes;
  player.oro -= totalOro;

  // Aplicar mejoras
  mejorasEq[key] = nivelFinal;
  player.mejorasEquipo = mejorasEq;
  const ganancia = MEJORA_EQUIPO_GANANCIA[stat];
  const gananciaTotal = ganancia * cantReal;
  savePlayer(player);

  const item = TIENDA[equipado] || TIENDA_CLASE[equipado] || (player._ssrItems && player._ssrItems[equipado]);
  const nombreItem = item?.nombre || equipado;
  return {
    ok: true,
    cantReal,
    msg: "✅ *" + nombreItem + "* — " + stat.toUpperCase() + " mejorado *x" + cantReal + "* veces\n" +
         (stat === "atk" ? "⚔️" : "🛡️") + " +" + gananciaTotal + " " + stat.toUpperCase() + " total\n" +
         "📊 Nivel: *" + nivelActual + "* → *" + nivelFinal + "*\n" +
         "🟡 Orbes usados: " + totalOrbes + " | 💰 Oro usado: " + totalOro,
  };
}

// Obtiene el objeto de mejoras del jugador (stats del personaje)
export function getMejorasStats(player) {
  if (!player.mejoras) player.mejoras = {};
  return player.mejoras;
}

// Obtiene el nivel de mejora de un stat del jugador
export function getNivelMejoraStat(player, stat) {
  return (getMejorasStats(player)[stat] || 0);
}

// Obtiene el objeto de mejoras del equipo
export function getMejorasEquipo(player) {
  if (!player.mejorasEquipo) player.mejorasEquipo = {};
  return player.mejorasEquipo;
}

// Obtiene el nivel de mejora de un stat para un item equipado (arma o armadura)
// key: "arma_atk", "arma_def", "armadura_atk", "armadura_def"
export function getNivelMejoraEquipo(player, slot, stat) {
  const key = slot + "_" + stat;
  return (getMejorasEquipo(player)[key] || 0);
}

// Aplica mejora de stat del personaje con Orbe Azul
// Retorna { ok, msg } 
export function aplicarMejoraStat(player, stat) {
  if (!MEJORA_STATS.includes(stat)) return { ok: false, msg: "❌ Stat inválido. Opciones: " + MEJORA_STATS.join(", ") };
  const mejoras = getMejorasStats(player);
  const nivelActual = mejoras[stat] || 0;
  if (nivelActual >= MEJORA_MAX_NIVEL) return { ok: false, msg: "✨ *" + MEJORA_STAT_NOMBRE[stat] + "* ya está en el nivel máximo (100)." };
  const { orbes, oro } = calcCostoMejora(nivelActual);
  const invOrbes = player.inventario["orbe_azul"] || 0;
  if (invOrbes < orbes) return { ok: false, msg: "❌ Necesitas *" + orbes + " 🔵 Orbe Azul* (tienes " + invOrbes + ")." };
  if (player.oro < oro) return { ok: false, msg: "❌ Necesitas *" + oro + " 💰* (tienes " + player.oro + ")." };

  // Consumir recursos
  player.inventario["orbe_azul"] -= orbes;
  player.oro -= oro;

  // Aplicar la mejora
  mejoras[stat] = nivelActual + 1;
  player.mejoras = mejoras;
  const ganancia = MEJORA_STAT_GANANCIA[stat];
  if (stat === "hp") {
    player.hpMax += ganancia;
    player.hp = Math.min(player.hp + ganancia, player.hpMax);
  } else {
    player[stat] = (player[stat] || 0) + ganancia;
  }
  savePlayer(player);
  return {
    ok: true,
    msg: "✅ *" + MEJORA_STAT_NOMBRE[stat] + "* mejorado al nivel *" + (nivelActual + 1) + "*\n" +
         MEJORA_STAT_EMOJI[stat] + " +" + ganancia + " " + MEJORA_STAT_NOMBRE[stat] + "\n" +
         "🔵 Orbes usados: " + orbes + " | 💰 Oro usado: " + oro,
  };
}

// Aplica mejora de equipo con Orbe Dorado
export function aplicarMejoraEquipo(player, slot, stat) {
  if (!["arma", "armadura"].includes(slot)) return { ok: false, msg: "❌ Slot inválido. Usa: arma o armadura" };
  if (!MEJORA_EQUIPO_STATS.includes(stat)) return { ok: false, msg: "❌ Stat inválido. Usa: atk o def" };
  const equipado = player.equipo?.[slot];
  if (!equipado) return { ok: false, msg: "❌ No tienes *" + slot + "* equipado." };

  const mejorasEq = getMejorasEquipo(player);
  const key = slot + "_" + stat;
  const nivelActual = mejorasEq[key] || 0;
  if (nivelActual >= MEJORA_MAX_NIVEL) return { ok: false, msg: "✨ El *" + slot + "* ya tiene " + stat.toUpperCase() + " en nivel máximo (100)." };

  const { orbes, oro } = calcCostoMejora(nivelActual);
  const invOrbes = player.inventario["orbe_dorado"] || 0;
  if (invOrbes < orbes) return { ok: false, msg: "❌ Necesitas *" + orbes + " 🟡 Orbe Dorado* (tienes " + invOrbes + ")." };
  if (player.oro < oro) return { ok: false, msg: "❌ Necesitas *" + oro + " 💰* (tienes " + player.oro + ")." };

  // Consumir recursos
  player.inventario["orbe_dorado"] -= orbes;
  player.oro -= oro;

  // Guardar la mejora
  mejorasEq[key] = nivelActual + 1;
  player.mejorasEquipo = mejorasEq;
  const ganancia = MEJORA_EQUIPO_GANANCIA[stat];
  savePlayer(player);

  // Obtener nombre del item
  const item = TIENDA[equipado] || (player._ssrItems && player._ssrItems[equipado]);
  const nombreItem = item?.nombre || equipado;
  return {
    ok: true,
    msg: "✅ *" + nombreItem + "* — " + stat.toUpperCase() + " mejorado al nivel *" + (nivelActual + 1) + "*\n" +
         (stat === "atk" ? "⚔️" : "🛡️") + " +" + ganancia + " " + stat.toUpperCase() + "\n" +
         "🟡 Orbes usados: " + orbes + " | 💰 Oro usado: " + oro,
  };
}

// Bonus de HP por equipo especial (ej. Armadura de Astaroth)
export function getTotalHpBonus(player) {
  let bonus = 0;
  const equipo = player.equipo || {};
  if (equipo.armadura) {
    const item = TIENDA[equipo.armadura] || TIENDA_CLASE[equipo.armadura] || (player._ssrItems && player._ssrItems[equipo.armadura]);
    bonus += (item?.hp || 0);
  }
  return bonus;
}

// Obtiene el bonus total de mejoras de equipo para un stat (suma arma + armadura)
export function getBonusMejoraEquipo(player, stat) {
  const mejorasEq = getMejorasEquipo(player);
  let total = 0;
  for (const slot of ["arma", "armadura"]) {
    const key = slot + "_" + stat;
    const nivel = mejorasEq[key] || 0;
    total += nivel * MEJORA_EQUIPO_GANANCIA[stat];
  }
  return total;
}

// ══════════════════════════════════════════════
//  SISTEMA DE CAMBIO DE CLASE
// ══════════════════════════════════════════════
export const CAMBIO_CLASE_COSTO_ORO  = 5000;
export const CAMBIO_CLASE_COSTO_GEMAS = 100;
export const CAMBIO_CLASE_PENALIDAD_XP = 0.50; // 50% de la XP actual del nivel se pierde

export function cambiarClase(player, nuevaClase) {
  if (!CLASES[nuevaClase]) return { ok: false, msg: "❌ Clase inválida." };
  if (player.clase === nuevaClase) return { ok: false, msg: "❌ Ya eres " + nuevaClase + "." };
  if (player.oro < CAMBIO_CLASE_COSTO_ORO) return { ok: false, msg: "❌ Necesitas *" + CAMBIO_CLASE_COSTO_ORO + " 💰* (tienes " + player.oro + ")." };
  if ((player.gemas || 0) < CAMBIO_CLASE_COSTO_GEMAS) return { ok: false, msg: "❌ Necesitas *" + CAMBIO_CLASE_COSTO_GEMAS + " 💎* (tienes " + (player.gemas || 0) + ")." };

  const claseAnterior = player.clase;
  const clase = CLASES[nuevaClase];

  // Cobrar costo
  player.oro -= CAMBIO_CLASE_COSTO_ORO;
  player.gemas -= CAMBIO_CLASE_COSTO_GEMAS;

  // Penalidad de XP: se pierde 50% de la XP acumulada del nivel actual
  const xpPerdida = Math.floor(player.exp * CAMBIO_CLASE_PENALIDAD_XP);
  player.exp = player.exp - xpPerdida;

  // Cambiar clase — se reajustan los stats base al de la nueva clase
  // Se conservan nivel, inventario, equipo, mejoras, clan, mascotas
  // Los stats base se recalculan: stats_nuevos = stats_clase_nueva + bonuses_de_nivel
  const nivelesGanados = player.nivel - 1;
  player.clase = nuevaClase;
  player.atk = clase.atk + (nivelesGanados * 2);
  player.def = clase.def + (nivelesGanados * 1);
  player.spd = clase.spd + (nivelesGanados * 1);
  player.crit = clase.crit;
  player.hpMax = clase.hp + (nivelesGanados * 12);
  player.hp = Math.min(player.hp, player.hpMax);

  // Resetear cooldown de habilidad
  player.habilidadUsada = 0;

  savePlayer(player);
  return {
    ok: true,
    claseAnterior,
    nuevaClase,
    xpPerdida,
    msg: "✅ *¡Clase cambiada!*\n" +
         CLASES[claseAnterior].emoji + " " + claseAnterior + " → " + clase.emoji + " *" + nuevaClase + "*\n\n" +
         "📊 *Nuevos stats base:*\n" +
         "❤️ HP: " + player.hpMax + " | ⚔️ ATK: " + player.atk + "\n" +
         "🛡️ DEF: " + player.def + " | 💨 VEL: " + player.spd + " | 🎯 CRIT: " + player.crit + "%\n\n" +
         "⚠️ XP perdida: *" + xpPerdida + "* (penalidad 50%)\n" +
         "💰 Oro restante: " + player.oro + " | 💎 Gemas: " + player.gemas,
  };
}

// ══════════════════════════════════════════════
//  TORRE DE LOS ELEGIDOS — 100 PISOS
// ══════════════════════════════════════════════


// ══════════════════════════════════════════════
//  GACHA EVENTO — Invocación Z (Colaboración)
// ══════════════════════════════════════════════

export const EVENTO_MONO_GOKU = {
  id:     "ssr_evento_mono_goku",
  nombre: "Mono Goku",
  emoji:  "🐒",
  bonus:  { atk: 40, def: 22, crit: 20 },
  desc:   "El legendario guerrero Saiyan en su forma más pura. Su energía Ki potencia todos tus ataques.",
};

export const EVENTO_COSTOS = { x1: 150, x100: 1500 };
export const EVENTO_PITY   = 9999; // Sin pity garantizado

export function getPityEvento(player) {
  return player._pityEvento || 0;
}
function incrementPityEvento(player) {
  player._pityEvento = (player._pityEvento || 0) + 1;
}
function resetPityEvento(player) {
  player._pityEvento = 0;
}

export function tiradaBannerEvento(p, numTiradas) {
  const resultados = [];
  let leveledUpGlobal = false;

  for (let i = 0; i < numTiradas; i++) {
    const pity = getPityEvento(p);
    let premio;

    if (pity + 1 >= EVENTO_PITY) {
      premio = _resolverEventoSSR();
      resetPityEvento(p);
    } else {
      const roll = Math.random() * 100;
      if (roll < 1.5) {
        premio = _resolverEventoSSR();
        resetPityEvento(p);
      } else if (roll < 9.5) {
        // SR: oro grande o exp grande
        const srOpts = [
          { tipo: "oro", cantidad: Math.floor(Math.random() * 300) + 300, label: "💰 *[SR]* Cofre de Oro",  display: "💰 Oro x" + (Math.floor(Math.random() * 300) + 300) },
          { tipo: "exp", cantidad: Math.floor(Math.random() * 400) + 300, label: "⭐ *[SR]* Cristal de XP", display: "⭐ EXP x" + (Math.floor(Math.random() * 400) + 300) },
        ];
        premio = srOpts[Math.floor(Math.random() * srOpts.length)];
        premio.esSSR = false;
        incrementPityEvento(p);
      } else if (roll < 34.5) {
        // R: recursos normales
        premio = _resolverRecursoEvento();
        incrementPityEvento(p);
      } else {
        // N: recursos básicos
        premio = _resolverRecursoEvento();
        incrementPityEvento(p);
      }
    }

    // Aplicar premio
    if (premio.tipo === "exp") {
      const lvl = addExp(p, premio.cantidad);
      if (lvl) leveledUpGlobal = true;
    } else if (premio.tipo === "oro") {
      p.oro = (p.oro || 0) + premio.cantidad;
    } else if (premio.tipo === "mascota_ssr_evento") {
      p.inventario[premio.id] = (p.inventario[premio.id] || 0) + 1;
      if (!p._ssrMascotas) p._ssrMascotas = {};
      p._ssrMascotas[premio.id] = { ...EVENTO_MONO_GOKU };
    }

    resultados.push(premio);
  }

  savePlayer(p);
  return { resultados, leveledUpGlobal };
}

function _resolverEventoSSR() {
  const m = EVENTO_MONO_GOKU;
  return {
    tipo:    "mascota_ssr_evento",
    id:      m.id,
    label:   "🌟 *[SSR]* Mascota Legendaria — EVENTO",
    display: `${m.emoji} *${m.nombre}*\n   ⚔️+${m.bonus.atk} 🛡️+${m.bonus.def} 🎯+${m.bonus.crit}%\n   _${m.desc}_`,
    esSSR:   true,
  };
}

function _resolverRecursoEvento() {
  const opts = [
    { tipo: "oro", cantidad: Math.floor(Math.random() * 150) + 50,  label: "💰 *[N]* Bolsa de Oro",    display: "💰 Oro",       esSSR: false },
    { tipo: "oro", cantidad: Math.floor(Math.random() * 300) + 150, label: "💰 *[N]* Cofre de Oro",    display: "💰 Oro",       esSSR: false },
    { tipo: "exp", cantidad: Math.floor(Math.random() * 200) + 80,  label: "⭐ *[N]* Fragmento de XP", display: "⭐ EXP",       esSSR: false },
    { tipo: "exp", cantidad: Math.floor(Math.random() * 400) + 200, label: "⭐ *[N]* Cristal de XP",   display: "⭐ EXP",       esSSR: false },
  ];
  return opts[Math.floor(Math.random() * opts.length)];
}

export const TORRE_MAX_PISOS = 100;
export const TORRE_MAX_GRUPO = 3;
export const TORRE_INVITE_TIMEOUT = 2 * 60 * 1000; // 2 minutos para aceptar

// Enemigos normales (pisos no-jefe), ciclan con escalado
export const TORRE_ENEMIGOS = [
  { nombre: "Guardia de Piedra",    emoji: "🪨", hpM: 0.5,  atkM: 0.4,  defM: 0.3  },
  { nombre: "Arquero Espectral",    emoji: "👻", hpM: 0.6,  atkM: 0.55, defM: 0.3  },
  { nombre: "Gólem de Hierro",      emoji: "🤖", hpM: 0.75, atkM: 0.5,  defM: 0.55 },
  { nombre: "Demonio Menor",        emoji: "😈", hpM: 0.8,  atkM: 0.65, defM: 0.4  },
  { nombre: "Guerrero Maldito",     emoji: "💀", hpM: 0.9,  atkM: 0.7,  defM: 0.5  },
  { nombre: "Dragón de Sombra",     emoji: "🐲", hpM: 1.0,  atkM: 0.8,  defM: 0.6  },
  { nombre: "Titán Corrupto",       emoji: "👹", hpM: 1.1,  atkM: 0.85, defM: 0.65 },
  { nombre: "Vampiro Ancestral",    emoji: "🧛", hpM: 1.2,  atkM: 0.95, defM: 0.7  },
];

// 20 jefes (piso 5, 10, 15 … 100)
// hpM/atkM/defM son multiplicadores sobre los stats del jugador
export const TORRE_JEFES = [
  // ── Pisos 1-20 ────────────────────────────
  { piso: 5,   nombre: "Rey Enano",                emoji: "⛏️",  hpM: 2.0,  atkM: 1.2,  defM: 1.0,  gemas: 10,  exp: 300,  oro: [200,350],     orbesAzul: 1,  orbesDorado: 0,  img: "assets/torre/jefes/boss_05_rey_enano.png",      desc: "Un monarca subterráneo forjado en acero y rencor. Su hacha parte montañas." },
  { piso: 10,  nombre: "Rey Slime",                emoji: "🟢",  hpM: 2.5,  atkM: 1.3,  defM: 0.8,  gemas: 15,  exp: 500,  oro: [350,550],     orbesAzul: 1,  orbesDorado: 0,  img: "assets/torre/jefes/boss_10_rey_slime.png",      desc: "Una masa amorfa de tamaño colosal. Absorbe golpes y se multiplica." },
  { piso: 15,  nombre: "Rey Gigante",              emoji: "🗿",  hpM: 3.0,  atkM: 1.5,  defM: 1.1,  gemas: 20,  exp: 700,  oro: [500,750],     orbesAzul: 2,  orbesDorado: 0,  img: "assets/torre/jefes/boss_15_rey_gigante.png",    desc: "Un coloso de carne y hueso que sacude la tierra con cada paso." },
  { piso: 20,  nombre: "Señor de los Lobos",       emoji: "🐺",  hpM: 3.2,  atkM: 1.6,  defM: 1.0,  gemas: 25,  exp: 900,  oro: [650,950],     orbesAzul: 2,  orbesDorado: 1,  img: "assets/torre/jefes/boss_20_senor_lobos.png",    desc: "Líder de una manada de bestias infernales. Sus colmillos corroen el alma." },
  // ── Pisos 21-40 ───────────────────────────
  { piso: 25,  nombre: "Valquiria Caída",          emoji: "⚔️",  hpM: 3.5,  atkM: 1.8,  defM: 1.2,  gemas: 30,  exp: 1100, oro: [800,1200],    orbesAzul: 2,  orbesDorado: 1,  img: "assets/torre/jefes/boss_25_valquiria.png",      desc: "Una guerrera divina corrompida. Vuela entre espadas y truenos." },
  { piso: 30,  nombre: "Hidra de las Nieblas",     emoji: "🐍",  hpM: 4.0,  atkM: 1.9,  defM: 1.1,  gemas: 35,  exp: 1400, oro: [1000,1500],   orbesAzul: 3,  orbesDorado: 1,  img: "assets/torre/jefes/boss_30_hidra.png",          desc: "Siete cabezas, siete muertes. Cada corte la hace más peligrosa." },
  { piso: 35,  nombre: "Lich Eterno",              emoji: "💀",  hpM: 4.2,  atkM: 2.0,  defM: 1.3,  gemas: 40,  exp: 1700, oro: [1200,1800],   orbesAzul: 3,  orbesDorado: 1,  img: "assets/torre/jefes/boss_35_lich.png",           desc: "Un archimago que vendió su alma por poder eterno. Nunca debería existir." },
  { piso: 40,  nombre: "Coloso de Magma",          emoji: "🌋",  hpM: 4.5,  atkM: 2.1,  defM: 1.4,  gemas: 45,  exp: 2000, oro: [1400,2100],   orbesAzul: 3,  orbesDorado: 2,  img: "assets/torre/jefes/boss_40_coloso_magma.png",   desc: "Nacido del núcleo del mundo. Su piel arde a miles de grados." },
  // ── Pisos 41-60 ───────────────────────────
  { piso: 45,  nombre: "Espectro del Abismo",      emoji: "🌑",  hpM: 4.8,  atkM: 2.3,  defM: 1.3,  gemas: 50,  exp: 2400, oro: [1700,2500],   orbesAzul: 4,  orbesDorado: 2,  img: "assets/torre/jefes/boss_45_espectro.png",       desc: "Una sombra sin forma nacida del vacío. Drena la voluntad de vivir." },
  { piso: 50,  nombre: "Dragón de Hielo",          emoji: "🐉",  hpM: 5.5,  atkM: 2.5,  defM: 1.6,  gemas: 60,  exp: 3000, oro: [2000,3000],   orbesAzul: 4,  orbesDorado: 2,  img: "assets/torre/jefes/boss_50_dragon_hielo.png",   desc: "Guardián del piso central. Su aliento congela el tiempo mismo." },
  { piso: 55,  nombre: "Heraldo de la Muerte",     emoji: "☠️",  hpM: 5.8,  atkM: 2.7,  defM: 1.5,  gemas: 65,  exp: 3500, oro: [2300,3400],   orbesAzul: 5,  orbesDorado: 2,  img: "assets/torre/jefes/boss_55_heraldo.png",        desc: "Mensajero del fin. Cada golpe suyo acerca un paso más a la tumba." },
  { piso: 60,  nombre: "Titán de las Sombras",     emoji: "👹",  hpM: 6.2,  atkM: 2.9,  defM: 1.7,  gemas: 70,  exp: 4000, oro: [2600,3900],   orbesAzul: 5,  orbesDorado: 3,  img: "assets/torre/jefes/boss_60_titan.png",          desc: "Una entidad primordial que predice todos tus movimientos." },
  // ── Pisos 61-80 ───────────────────────────
  { piso: 65,  nombre: "Leviatán Roto",            emoji: "🌊",  hpM: 6.6,  atkM: 3.1,  defM: 1.8,  gemas: 75,  exp: 4600, oro: [3000,4500],   orbesAzul: 6,  orbesDorado: 3,  img: "assets/torre/jefes/boss_65_leviatan.png",       desc: "Un dios del mar encadenado. Cada vez que rompe una cadena, más peligroso." },
  { piso: 70,  nombre: "Archidemonio Baal",        emoji: "😈",  hpM: 7.0,  atkM: 3.3,  defM: 1.9,  gemas: 80,  exp: 5200, oro: [3400,5000],   orbesAzul: 6,  orbesDorado: 3,  img: "assets/torre/jefes/boss_70_baal.png",           desc: "Príncipe del infierno. Su sola presencia quema el aire a su alrededor." },
  { piso: 75,  nombre: "Dios de la Guerra",        emoji: "⚡",  hpM: 7.5,  atkM: 3.6,  defM: 2.0,  gemas: 90,  exp: 6000, oro: [4000,6000],   orbesAzul: 7,  orbesDorado: 4,  img: "assets/torre/jefes/boss_75_dios_guerra.png",    desc: "Una deidad caída que aún cree gobernar el destino de los mortales." },
  { piso: 80,  nombre: "Fénix Oscuro",             emoji: "🔥",  hpM: 8.0,  atkM: 3.8,  defM: 2.0,  gemas: 95,  exp: 7000, oro: [4500,6800],   orbesAzul: 7,  orbesDorado: 4,  img: "assets/torre/jefes/boss_80_fenix_oscuro.png",   desc: "Resucita una vez con el 50% de HP. Incendia todo lo que toca." },
  // ── Pisos 81-100 ──────────────────────────
  { piso: 85,  nombre: "El Olvidado",              emoji: "🕳️",  hpM: 8.5,  atkM: 4.0,  defM: 2.2,  gemas: 100, exp: 8000, oro: [5000,7500],   orbesAzul: 8,  orbesDorado: 4,  img: "assets/torre/jefes/boss_85_el_olvidado.png",    desc: "Un ser tan antiguo que ni los dioses lo recuerdan. Distorsiona la realidad." },
  { piso: 90,  nombre: "Señor del Caos",           emoji: "🌀",  hpM: 9.0,  atkM: 4.3,  defM: 2.3,  gemas: 110, exp: 9000, oro: [5500,8500],   orbesAzul: 8,  orbesDorado: 5,  img: "assets/torre/jefes/boss_90_senor_caos.png",     desc: "La encarnación pura del caos. Sin forma, sin reglas, sin piedad." },
  { piso: 95,  nombre: "El Ángel Caído",           emoji: "🪽",  hpM: 9.5,  atkM: 4.6,  defM: 2.5,  gemas: 120, exp: 10000,oro: [6000,9000],   orbesAzul: 9,  orbesDorado: 5,  img: "assets/torre/jefes/boss_95_angel_caido.png",    desc: "Expulsado del cielo por buscar poder absoluto. Ahora solo existe para destruir." },
  { piso: 100, nombre: "ASTAROTH — El Primigenio", emoji: "👁️",  hpM: 12.0, atkM: 5.5,  defM: 3.0,  gemas: 500, exp: 50000,oro: [15000,25000], orbesAzul: 20, orbesDorado: 10, img: "assets/torre/jefes/boss_100_astaroth.png",      itemEspecial: "armadura_astaroth", desc: "El ser que construyó la torre. Existe desde antes que el tiempo. Nadie ha llegado hasta aquí... hasta ahora." },
];

// Armadura legendaria exclusiva de Astaroth (piso 100)
export const ARMADURA_ASTAROTH = {
  nombre: "Armadura de Astaroth",
  emoji: "👁️",
  tipo: "armadura",
  calidad: "mitico",
  atk: 80,
  def: 200,
  hp: 500,
  precio: 0, // no se vende
  nivelReq: 1,
  exclusiva: true,
  desc: "Forjada por el Primigenio en el alba del tiempo. Quien la viste lleva el peso de la eternidad.",
};

// Recompensa por piso normal (no-jefe)
export const TORRE_RECOMPENSA_PISO = { oro: [15, 40], exp: 80, gemChance: 0.05 };

// Cooldown entre intentos al morir
export const TORRE_COOLDOWN_MUERTE = 30 * 60 * 1000; // 30 minutos

// ── Funciones de estado ──────────────────────

export function getTorreEstado(player) {
  if (!player.torre) player.torre = {
    activa: false, pisoActual: 0, pisoMax: 0,
    grupoId: null, enemigo: null, muerteTs: 0,
  };
  return player.torre;
}

export function getTorreGrupo(groupId) {
  if (!db.torreGrupos) db.torreGrupos = {};
  return db.torreGrupos[groupId] || null;
}

export function saveTorreGrupo(groupId, grupo) {
  if (!db.torreGrupos) db.torreGrupos = {};
  if (grupo === null) {
    delete db.torreGrupos[groupId];
  } else {
    db.torreGrupos[groupId] = grupo;
  }
  writeFileSync(RPG_FILE, JSON.stringify(db, null, 2));
}

export function getTorreInvites() {
  if (!db.torreInvites) db.torreInvites = {};
  return db.torreInvites;
}

export function saveTorreInvite(targetId, invite) {
  if (!db.torreInvites) db.torreInvites = {};
  if (invite === null) {
    delete db.torreInvites[targetId];
  } else {
    db.torreInvites[targetId] = invite;
  }
  writeFileSync(RPG_FILE, JSON.stringify(db, null, 2));
}

// Retorna el jefe del piso o null si es piso normal
export function getTorreJefe(piso) {
  return TORRE_JEFES.find(j => j.piso === piso) || null;
}

// Calcula stats del enemigo del piso basado en stats del jugador líder
export function calcTorreEnemigo(piso, playerHpMax, playerAtk, playerDef) {
  const jefe = getTorreJefe(piso);
  if (jefe) {
    return {
      nombre: jefe.nombre, emoji: jefe.emoji, esJefe: true,
      hp: Math.floor(playerHpMax * jefe.hpM),
      hpMax: Math.floor(playerHpMax * jefe.hpM),
      atk: Math.floor(playerAtk * jefe.atkM),
      def: Math.floor(playerDef * jefe.defM),
      exp: jefe.exp, oro: jefe.oro, gemas: jefe.gemas,
      desc: jefe.desc,
    };
  }
  // Enemigo normal — cicla entre TORRE_ENEMIGOS con escalado por piso
  const idx = (piso - 1) % TORRE_ENEMIGOS.length;
  const e = TORRE_ENEMIGOS[idx];
  const escala = 1 + (piso - 1) * 0.08; // +8% por piso
  return {
    nombre: e.nombre, emoji: e.emoji, esJefe: false,
    hp: Math.floor(playerHpMax * e.hpM * escala),
    hpMax: Math.floor(playerHpMax * e.hpM * escala),
    atk: Math.floor(playerAtk * e.atkM * escala),
    def: Math.floor(playerDef * e.defM * escala),
    exp: Math.floor(80 * escala),
    oro: [Math.floor(15 * escala), Math.floor(40 * escala)],
    gemas: 0,
  };
}

// Calcula recompensa de piso normal
export function calcTorreRecompensaPiso(piso) {
  const escala = 1 + (piso - 1) * 0.06;
  const [mn, mx] = TORRE_RECOMPENSA_PISO.oro;
  const oro = Math.floor((Math.random() * (mx - mn) + mn) * escala);
  const exp = Math.floor(TORRE_RECOMPENSA_PISO.exp * escala);
  const gemas = Math.random() < TORRE_RECOMPENSA_PISO.gemChance ? 1 : 0;
  return { oro, exp, gemas };
}

// ═══════════════════════════════════════════════════════════════
//   SISTEMA DE TERRITORIOS
// ═══════════════════════════════════════════════════════════════

export const TERRITORIOS = {
  bastion_norte: {
    id: "bastion_norte", nombre: "Bastión del Norte", emoji: "🟣",
    descripcion: "Una fortaleza antigua en las tierras del norte. Dominarla da ventaja táctica sobre los clanes rivales.",
    bonus: { atk: 10, desc: "⚔️ ATK +10 en arena" },
    puntos: [
      { tipo: "fortaleza", nombre: "Gran Muralla Norte" },
      { tipo: "torre",     nombre: "Torre de Vigilancia" },
    ],
    adyacentes: ["bosque_esmeralda", "llanuras_doradas"],
  },
  bosque_esmeralda: {
    id: "bosque_esmeralda", nombre: "Bosque Esmeralda", emoji: "🟢",
    descripcion: "Un bosque mágico lleno de recursos. Controlarlo aumenta los drops de exploración.",
    bonus: { drop: 0.15, desc: "🎁 Drop +15% en exploración" },
    puntos: [
      { tipo: "aldea",     nombre: "Aldea de los Elfos" },
      { tipo: "santuario", nombre: "Santuario del Bosque" },
    ],
    adyacentes: ["bastion_norte", "tierras_ardientes", "lago_cristalino"],
  },
  tierras_ardientes: {
    id: "tierras_ardientes", nombre: "Tierras Ardientes", emoji: "🔴",
    descripcion: "Volcanes y lava forman este territorio hostil pero rico en minerales preciosos.",
    bonus: { oro: 0.20, desc: "💰 Oro +20% en exploración" },
    puntos: [
      { tipo: "mazmorra",  nombre: "Cavernas de Magma" },
      { tipo: "fortaleza", nombre: "Fortaleza Ígnea" },
    ],
    adyacentes: ["bosque_esmeralda", "llanuras_doradas", "la_capital"],
  },
  llanuras_doradas: {
    id: "llanuras_doradas", nombre: "Llanuras Doradas", emoji: "🟡",
    descripcion: "Vastas llanuras donde fluye el comercio. Dominarlas enriquece al clan.",
    bonus: { oro: 0.10, exp: 0.10, desc: "💰 Oro +10% | ⭐ EXP +10%" },
    puntos: [
      { tipo: "aldea",     nombre: "Ciudad Mercado" },
      { tipo: "aldea",     nombre: "Poblado del Sur" },
      { tipo: "torre",     nombre: "Torre del Vigía" },
    ],
    adyacentes: ["bastion_norte", "tierras_ardientes", "la_capital"],
  },
  lago_cristalino: {
    id: "lago_cristalino", nombre: "Lago Cristalino", emoji: "🔵",
    descripcion: "Un lago místico con aguas sanadoras. Sus propiedades mágicas aumentan la experiencia ganada.",
    bonus: { exp: 0.20, desc: "⭐ EXP +20% en exploración" },
    puntos: [
      { tipo: "santuario", nombre: "Templo de las Aguas" },
      { tipo: "mazmorra",  nombre: "Ruinas Sumergidas" },
    ],
    adyacentes: ["bosque_esmeralda", "la_capital"],
  },
  la_capital: {
    id: "la_capital", nombre: "La Capital", emoji: "⭐",
    descripcion: "El centro del poder. Controlarlo otorga beneficios a todas las áreas del juego.",
    bonus: { all: 0.10, desc: "✨ Oro +10% | EXP +10% | Drop +10% en todo" },
    puntos: [
      { tipo: "fortaleza", nombre: "Palacio Real" },
      { tipo: "santuario", nombre: "Gran Catedral" },
      { tipo: "aldea",     nombre: "Distrito Comercial" },
      { tipo: "torre",     nombre: "Torre del Trono" },
    ],
    adyacentes: ["tierras_ardientes", "llanuras_doradas", "lago_cristalino"],
  },
};

export function calcPuntosTerritorio(territorioId) {
  const _TIPOS = { fortaleza: 5, aldea: 2, santuario: 3, mazmorra: 3, torre: 1 };
  const t = TERRITORIOS[territorioId];
  if (!t) return 0;
  return t.puntos.reduce((sum, p) => sum + (_TIPOS[p.tipo] || 0), 0);
}

export function getTerritorios() {
  if (!db.territorios) db.territorios = {};
  return db.territorios;
}

export function getTerritorio(id) {
  return getTerritorios()[id] || null;
}

export function saveTerritorio(id, estado) {
  if (!db.territorios) db.territorios = {};
  db.territorios[id] = estado;
}

export function getTerritoriosDeClan(nombreClan) {
  const estados = getTerritorios();
  return Object.keys(TERRITORIOS).filter(id => estados[id]?.propietario === nombreClan);
}

export function getBonusTerritorio(player) {
  if (!player.clan) return {};
  const ids = getTerritoriosDeClan(player.clan);
  const bonus = { oro: 0, exp: 0, atk: 0, drop: 0, all: 0 };
  for (const id of ids) {
    const def = TERRITORIOS[id]?.bonus;
    if (!def) continue;
    if (def.oro)  bonus.oro  += def.oro;
    if (def.exp)  bonus.exp  += def.exp;
    if (def.atk)  bonus.atk  += def.atk;
    if (def.drop) bonus.drop += def.drop;
    if (def.all)  bonus.all  += def.all;
  }
  return bonus;
}

// ── Producción por territorio por hora ───────────────────────
// Cada territorio genera oro, gemas y exp acumulables
const PRODUCCION_BASE = {
  bastion_norte:     { oro: 80,  gemas: 2,  exp: 60,  medallas: 8  },
  bosque_esmeralda:  { oro: 60,  gemas: 3,  exp: 80,  medallas: 6  },
  tierras_ardientes: { oro: 120, gemas: 2,  exp: 50,  medallas: 10 },
  llanuras_doradas:  { oro: 100, gemas: 2,  exp: 70,  medallas: 8  },
  lago_cristalino:   { oro: 50,  gemas: 3,  exp: 100, medallas: 7  },
  la_capital:        { oro: 150, gemas: 5,  exp: 120, medallas: 15 },
};

// Acumular producción de territorios controlados por un clan (llamado cada hora por el scheduler)
export function tickTerritorios() {
  const estados = getTerritorios();
  const ahora = Date.now();

  for (const [id, estado] of Object.entries(estados)) {
    if (!estado?.propietario) continue;
    const prod = PRODUCCION_BASE[id];
    if (!prod) continue;

    // Inicializar acumulado si no existe
    if (!estado.acumulado) estado.acumulado = { oro: 0, gemas: 0, exp: 0 };

    // Varianza ±20%
    const v = () => 0.80 + Math.random() * 0.40;
    estado.acumulado.oro  += Math.floor(prod.oro  * v());
    estado.acumulado.gemas += Math.floor(prod.gemas * v());
    estado.acumulado.exp  += Math.floor(prod.exp  * v());
    estado.ultimoTick = ahora;

    saveTerritorio(id, estado);
  }
}

// Obtener todo lo acumulado de los territorios de un clan
export function getAcumuladoClan(nombreClan) {
  const estados = getTerritorios();
  const total = { oro: 0, gemas: 0, exp: 0, medallas: 0, territorios: [] };

  for (const [id, estado] of Object.entries(estados)) {
    if (estado?.propietario !== nombreClan) continue;
    if (!estado.acumulado) continue;
    total.oro      += estado.acumulado.oro      || 0;
    total.gemas    += estado.acumulado.gemas    || 0;
    total.exp      += estado.acumulado.exp      || 0;
    total.medallas += estado.acumulado.medallas || 0;
    total.territorios.push({ id, nombre: TERRITORIOS[id]?.nombre, acumulado: { ...estado.acumulado } });
  }

  return total;
}

// Reclamar y limpiar el acumulado de todos los territorios del clan
export function reclamarAcumuladoClan(nombreClan) {
  const estados = getTerritorios();
  const total = getAcumuladoClan(nombreClan);

  for (const [id, estado] of Object.entries(estados)) {
    if (estado?.propietario !== nombreClan) continue;
    estado.acumulado = { oro: 0, gemas: 0, exp: 0, medallas: 0 };
    saveTerritorio(id, estado);
  }

  return total;
}

// Reset semanal de territorios — libera todos los territorios
export function resetTerritoriosSemanal() {
  if (!db.territorios) return;
  db.territorios = {};
  db.bossTerritorios = {}; // Limpiar todos los bosses también
  if (!db.config) db.config = {};
  db.config.ultimoResetTerritorio = Date.now();
  saveDB();
}

// Verificar si hay que hacer reset semanal (cada 7 días desde el último reset)
export function checkResetSemanal() {
  if (!db.config) db.config = {};
  const ultimo = db.config.ultimoResetTerritorio || 0;
  const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - ultimo >= SIETE_DIAS) {
    resetTerritoriosSemanal();
    return true; // se hizo reset
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
//   BOSSES DE TERRITORIO
// ═══════════════════════════════════════════════════════════════

// Stats base de cada boss por territorio
export const BOSS_TERRITORIO = {
  bastion_norte:     { nombre: "Guardián del Bastión",   emoji: "🗿", hpMax: 8000,  atk: 320, def: 180, crit: 10 },
  bosque_esmeralda:  { nombre: "Bestia del Bosque",      emoji: "🐉", hpMax: 6000,  atk: 280, def: 140, crit: 12 },
  tierras_ardientes: { nombre: "Señor de las Llamas",    emoji: "🔥", hpMax: 10000, atk: 380, def: 200, crit: 8  },
  llanuras_doradas:  { nombre: "Coloso Dorado",          emoji: "⚔️", hpMax: 7000,  atk: 300, def: 160, crit: 10 },
  lago_cristalino:   { nombre: "Leviatán Cristalino",    emoji: "🌊", hpMax: 6500,  atk: 260, def: 220, crit: 15 },
  la_capital:        { nombre: "Dragón del Trono",       emoji: "👑", hpMax: 15000, atk: 450, def: 280, crit: 12 },
};

// Obtener boss activo de un territorio (guardado en db.bossTerritorios)
export function getBossTerritorio(territorioId) {
  if (!db.bossTerritorios) db.bossTerritorios = {};
  return db.bossTerritorios[territorioId] || null;
}

// Guardar boss de territorio
export function saveBossTerritorio(territorioId, boss) {
  if (!db.bossTerritorios) db.bossTerritorios = {};
  db.bossTerritorios[territorioId] = boss;
  saveDB();
}

// Inicializar boss de un territorio (normal o élite según si tiene dueño)
export function inicializarBossTerritorio(territorioId) {
  const base = BOSS_TERRITORIO[territorioId];
  if (!base) return null;
  const estado = getTerritorio(territorioId);
  const esElite = estado?.propietario ? true : false;

  const boss = {
    territorioId,
    nombre: esElite ? "⚡ " + base.nombre + " [ÉLITE]" : base.nombre,
    emoji: base.emoji,
    hpMax: esElite ? base.hpMax * 2 : base.hpMax,
    hp: esElite ? base.hpMax * 2 : base.hpMax,
    atk: esElite ? Math.floor(base.atk * 1.5) : base.atk,
    def: esElite ? Math.floor(base.def * 1.5) : base.def,
    crit: base.crit,
    esElite,
    clanAtacante: null,
    participantes: {},
  };

  saveBossTerritorio(territorioId, boss);
  return boss;
}

// Registrar daño de un jugador al boss
export function atacarBossTerritorio(territorioId, jid, dmg) {
  const boss = getBossTerritorio(territorioId);
  if (!boss) return null;
  boss.hp = Math.max(0, boss.hp - dmg);
  if (!boss.participantes) boss.participantes = {};
  boss.participantes[jid] = (boss.participantes[jid] || 0) + dmg;
  saveBossTerritorio(territorioId, boss);
  return boss;
}

// Cooldown de 12 horas para territorios conquistados
export function getTerritorioCooldown(territorioId) {
  const estado = getTerritorio(territorioId);
  if (!estado?.propietario) return 0;
  const conquistadoEn = estado.conquistadoEn || 0;
  const DOCE_HORAS = 12 * 60 * 60 * 1000;
  const restante = DOCE_HORAS - (Date.now() - conquistadoEn);
  return Math.max(0, restante);
}

// ═══════════════════════════════════════════════════════════════
//   HISTORIAL DE CONQUISTAS
// ═══════════════════════════════════════════════════════════════

export function getHistorialConquistas() {
  if (!db.historialConquistas) db.historialConquistas = [];
  return db.historialConquistas;
}

export function registrarConquista(territorioId, clanNombre, anteriorDueno) {
  if (!db.historialConquistas) db.historialConquistas = [];
  db.historialConquistas.unshift({
    territorioId,
    territorio: TERRITORIOS[territorioId]?.nombre || territorioId,
    emoji: TERRITORIOS[territorioId]?.emoji || "🏴",
    clan: clanNombre,
    anteriorDueno: anteriorDueno || null,
    fecha: Date.now(),
  });
  // Guardar solo los últimos 20 registros
  if (db.historialConquistas.length > 20) db.historialConquistas = db.historialConquistas.slice(0, 20);
  saveDB();
}

// ═══════════════════════════════════════════════════════════════
//   SISTEMA DE DEFENSA DE TERRITORIOS
// ═══════════════════════════════════════════════════════════════

// Tiempo que tiene el clan defensor para usar !rpgdefender (10 minutos)
export const DEFENSA_VENTANA_MS = 10 * 60 * 1000;

// Obtener el estado de defensa activa de un territorio
export function getDefensaTerritorio(territorioId) {
  if (!db.defensasTerritorios) db.defensasTerritorios = {};
  return db.defensasTerritorios[territorioId] || null;
}

// Guardar estado de defensa
export function saveDefensaTerritorio(territorioId, defensa) {
  if (!db.defensasTerritorios) db.defensasTerritorios = {};
  db.defensasTerritorios[territorioId] = defensa;
  saveDB();
}

// Eliminar defensa activa (cuando el boss muere o se reinicia)
export function clearDefensaTerritorio(territorioId) {
  if (!db.defensasTerritorios) db.defensasTerritorios = {};
  delete db.defensasTerritorios[territorioId];
  saveDB();
}

// Iniciar defensa: se crea cuando el Clan A usa !rpgconquistar sobre territorio ocupado
// Retorna el objeto de defensa creado
export function iniciarDefensaTerritorio(territorioId, clanDefensor) {
  const defensa = {
    territorioId,
    clanDefensor,
    iniciadaEn: Date.now(),
    ventanaExpira: Date.now() + DEFENSA_VENTANA_MS,
    defensores: {}, // jid -> bonusHP aportado
    hpBonus: 0,     // HP total añadido al boss por los defensores
  };
  saveDefensaTerritorio(territorioId, defensa);
  return defensa;
}

// Un miembro del clan defensor usa !rpgdefender
// Aporta un % de su DEF como HP bonus al boss
// Retorna { defensa, hpAportado, yaDefendio }
export function defenderTerritorio(territorioId, jid, defJugador) {
  const defensa = getDefensaTerritorio(territorioId);
  if (!defensa) return null;

  // Verificar que la ventana no haya expirado
  if (Date.now() > defensa.ventanaExpira) return null;

  // Cada jugador solo puede defender una vez por ataque
  if (defensa.defensores[jid] !== undefined) {
    return { defensa, hpAportado: 0, yaDefendio: true };
  }

  // El HP bonus es 80% de la DEF del jugador (mínimo 50)
  const hpAportado = Math.max(50, Math.floor(defJugador * 0.80));

  defensa.defensores[jid] = hpAportado;
  defensa.hpBonus += hpAportado;

  // Aplicar el HP bonus al boss activo del territorio
  if (!db.bossTerritorios) db.bossTerritorios = {};
  const boss = db.bossTerritorios[territorioId];
  if (boss && boss.hp > 0) {
    boss.hp    += hpAportado;
    boss.hpMax += hpAportado;
    db.bossTerritorios[territorioId] = boss;
  }

  saveDefensaTerritorio(territorioId, defensa);
  saveDB();
  return { defensa, hpAportado, yaDefendio: false };
}

// Verificar si la ventana de defensa ya expiró
export function defensaExpirada(territorioId) {
  const defensa = getDefensaTerritorio(territorioId);
  if (!defensa) return true;
  return Date.now() > defensa.ventanaExpira;
}

// ═══════════════════════════════════════════════════════════════
//   SISTEMA DE MEDALLAS DE HONOR DE CLAN
// ═══════════════════════════════════════════════════════════════

// ── Boss exclusivo del clan (solo miembros pueden atacarlo) ──────
export const BOSS_CLAN = {
  nombre: "Guardián del Clan",
  emoji: "🏅",
  hpBase: 8000,
  atkBase: 180,
  defBase: 80,
  crit: 8,
  escalaXNivel: 1.15, // multiplica stats según nivel del clan
};

export function getBossClan(clanNombre) {
  if (!db.bossClanes) db.bossClanes = {};
  return db.bossClanes[clanNombre] || null;
}

export function saveBossClan(clanNombre, boss) {
  if (!db.bossClanes) db.bossClanes = {};
  db.bossClanes[clanNombre] = boss;
  saveDB();
}

// Cooldown para respawn del boss clan (24h)
export const BOSS_CLAN_COOLDOWN = 24 * 60 * 60 * 1000;

export function inicializarBossClan(clanNombre) {
  const clan = db.guilds[clanNombre];
  if (!clan) return null;
  const nivelClan = Math.floor((clan.banco || 0) / 1000) + 1;
  const escala = Math.pow(BOSS_CLAN.escalaXNivel, Math.min(nivelClan - 1, 10));
  const hpMax = Math.floor(BOSS_CLAN.hpBase * escala);
  const boss = {
    clanNombre,
    nombre: `${BOSS_CLAN.emoji} ${BOSS_CLAN.nombre}`,
    emoji: BOSS_CLAN.emoji,
    hpMax,
    hp: hpMax,
    atk: Math.floor(BOSS_CLAN.atkBase * escala),
    def: Math.floor(BOSS_CLAN.defBase * escala),
    crit: BOSS_CLAN.crit,
    participantes: {},
    creadoEn: Date.now(),
    derrotadoEn: null,
  };
  saveBossClan(clanNombre, boss);
  return boss;
}

export function atacarBossClan(clanNombre, jid, dmg) {
  const boss = getBossClan(clanNombre);
  if (!boss) return null;
  boss.hp = Math.max(0, boss.hp - dmg);
  if (!boss.participantes) boss.participantes = {};
  boss.participantes[jid] = (boss.participantes[jid] || 0) + dmg;
  if (boss.hp <= 0 && !boss.derrotadoEn) boss.derrotadoEn = Date.now();
  saveBossClan(clanNombre, boss);
  return boss;
}

// ── Medallas de Honor ──────────────────────────────────────────
// Se obtienen en: boss clan, boss territorio, conquista de territorio, misión clan
export function getMedallas(jid) {
  const p = db.players[jid];
  return p ? (p.medallas || 0) : 0;
}

export function addMedallas(jid, cantidad) {
  const p = db.players[jid];
  if (!p) return;
  if (!p.medallas) p.medallas = 0;
  p.medallas += cantidad;
  saveDB();
}

export function quitarMedallas(jid, cantidad) {
  const p = db.players[jid];
  if (!p) return false;
  if ((p.medallas || 0) < cantidad) return false;
  p.medallas -= cantidad;
  saveDB();
  return true;
}


// ═══════════════════════════════════════════════════════════════
// TIENDAS POR CLASE — Ítems exclusivos por clase de héroe
// ═══════════════════════════════════════════════════════════════
export const TIENDA_CLASE = {

  // ─── GUERRERO ─────────────────────────────────────────────
  hacha_berserker:    { nombre: "Hacha Berserker",      emoji: "🪓", tipo: "arma",     calidad: "raro",       clase: "guerrero",   atk: 28, def: 2,   precio: 450,  nivelReq: 5  },
  martillo_titan:     { nombre: "Martillo del Titán",   emoji: "🔨", tipo: "arma",     calidad: "epico",      clase: "guerrero",   atk: 52, def: 5,   precio: 1100, nivelReq: 10 },
  espada_sangre:      { nombre: "Espada de Sangre",     emoji: "🗡️", tipo: "arma",     calidad: "legendario", clase: "guerrero",   atk: 85, def: 12,  precio: 3500, nivelReq: 20 },
  mandoble_caos:      { nombre: "Mandoble del Caos",    emoji: "⚔️", tipo: "arma",     calidad: "mitico",     clase: "guerrero",   atk: 117,def: 16,  precio: 9999, nivelReq: 35 },
  peto_guerrero:      { nombre: "Peto del Guerrero",    emoji: "🛡️", tipo: "armadura", calidad: "raro",       clase: "guerrero",   atk: 0,  def: 28,  precio: 480,  nivelReq: 5  },
  armadura_berserker: { nombre: "Armadura Berserker",   emoji: "⚙️", tipo: "armadura", calidad: "epico",      clase: "guerrero",   atk: 8,  def: 50,  precio: 1200, nivelReq: 10 },
  coraza_titan:       { nombre: "Coraza del Titán",     emoji: "🔱", tipo: "armadura", calidad: "legendario", clase: "guerrero",   atk: 12, def: 75,  precio: 3800, nivelReq: 20 },
  armadura_caos:      { nombre: "Armadura del Caos",    emoji: "🌑", tipo: "armadura", calidad: "mitico",     clase: "guerrero",   atk: 18, def: 103, precio: 9999, nivelReq: 35 },

  // ─── MAGO ─────────────────────────────────────────────────
  varita_arcana:      { nombre: "Varita Arcana",        emoji: "🪄", tipo: "arma",     calidad: "raro",       clase: "mago",       atk: 35, def: 0,   precio: 450,  nivelReq: 5  },
  orbe_poder:         { nombre: "Orbe de Poder",        emoji: "🔮", tipo: "arma",     calidad: "epico",      clase: "mago",       atk: 58, def: 0,   precio: 1100, nivelReq: 10 },
  tomo_antiguo:       { nombre: "Tomo del Antiguo",     emoji: "📖", tipo: "arma",     calidad: "legendario", clase: "mago",       atk: 90, def: 5,   precio: 3500, nivelReq: 20 },
  baston_origen:      { nombre: "Bastón del Origen",    emoji: "✨", tipo: "arma",     calidad: "mitico",     clase: "mago",       atk: 126,def: 7,   precio: 9999, nivelReq: 35 },
  ropa_arcana:        { nombre: "Ropa Arcana",          emoji: "👘", tipo: "armadura", calidad: "raro",       clase: "mago",       atk: 5,  def: 15,  precio: 420,  nivelReq: 5  },
  manto_arcano:       { nombre: "Manto Arcano",         emoji: "🌙", tipo: "armadura", calidad: "epico",      clase: "mago",       atk: 10, def: 28,  precio: 1000, nivelReq: 10 },
  vestidura_arcana:   { nombre: "Vestidura Arcana",     emoji: "🌟", tipo: "armadura", calidad: "legendario", clase: "mago",       atk: 18, def: 45,  precio: 3200, nivelReq: 20 },
  tunica_primordial:  { nombre: "Túnica Primordial",    emoji: "💫", tipo: "armadura", calidad: "mitico",     clase: "mago",       atk: 27, def: 63,  precio: 9999, nivelReq: 35 },

  // ─── ARQUERO ──────────────────────────────────────────────
  arco_cazador:       { nombre: "Arco del Cazador",     emoji: "🏹", tipo: "arma",     calidad: "raro",       clase: "arquero",    atk: 30, def: 0,   precio: 440,  nivelReq: 5  },
  arco_viento:        { nombre: "Arco del Viento",      emoji: "💨", tipo: "arma",     calidad: "epico",      clase: "arquero",    atk: 52, def: 3,   precio: 1050, nivelReq: 10 },
  arco_aguila:        { nombre: "Arco del Águila",      emoji: "🦅", tipo: "arma",     calidad: "legendario", clase: "arquero",    atk: 82, def: 8,   precio: 3400, nivelReq: 20 },
  arco_tormenta:      { nombre: "Arco de la Tormenta",  emoji: "⚡", tipo: "arma",     calidad: "mitico",     clase: "arquero",    atk: 128,def: 12,  precio: 9999, nivelReq: 35 },
  cuero_cazador:      { nombre: "Cuero del Cazador",    emoji: "🥋", tipo: "armadura", calidad: "raro",       clase: "arquero",    atk: 3,  def: 20,  precio: 430,  nivelReq: 5  },
  chaleco_viento:     { nombre: "Chaleco del Viento",   emoji: "💨", tipo: "armadura", calidad: "epico",      clase: "arquero",    atk: 6,  def: 35,  precio: 980,  nivelReq: 10 },
  armadura_aguila:    { nombre: "Armadura del Águila",  emoji: "🦅", tipo: "armadura", calidad: "legendario", clase: "arquero",    atk: 10, def: 58,  precio: 3300, nivelReq: 20 },
  coraza_tormenta:    { nombre: "Coraza de la Tormenta",emoji: "⚡", tipo: "armadura", calidad: "mitico",     clase: "arquero",    atk: 18, def: 95,  precio: 9999, nivelReq: 35 },

  // ─── ASESINO ──────────────────────────────────────────────
  daga_sombra:        { nombre: "Daga de Sombra",       emoji: "🌑", tipo: "arma",     calidad: "raro",       clase: "asesino",    atk: 32, def: 0,   precio: 460,  nivelReq: 5  },
  kunai_oscuro:       { nombre: "Kunai Oscuro",         emoji: "🔪", tipo: "arma",     calidad: "epico",      clase: "asesino",    atk: 55, def: 2,   precio: 1100, nivelReq: 10 },
  hoja_silenciosa:    { nombre: "Hoja Silenciosa",      emoji: "💀", tipo: "arma",     calidad: "legendario", clase: "asesino",    atk: 88, def: 5,   precio: 3600, nivelReq: 20 },
  gemelos_vacio:      { nombre: "Gemelos del Vacío",    emoji: "⚫", tipo: "arma",     calidad: "mitico",     clase: "asesino",    atk: 121,def: 7,   precio: 9999, nivelReq: 35 },
  cuero_sombra:       { nombre: "Cuero de Sombra",      emoji: "🖤", tipo: "armadura", calidad: "raro",       clase: "asesino",    atk: 4,  def: 18,  precio: 440,  nivelReq: 5  },
  manto_asesino:      { nombre: "Manto del Asesino",    emoji: "🌑", tipo: "armadura", calidad: "epico",      clase: "asesino",    atk: 8,  def: 32,  precio: 1000, nivelReq: 10 },
  sombra_tejida:      { nombre: "Sombra Tejida",        emoji: "💜", tipo: "armadura", calidad: "legendario", clase: "asesino",    atk: 14, def: 52,  precio: 3300, nivelReq: 20 },
  vacio_encarnado:    { nombre: "Vacío Encarnado",      emoji: "⚫", tipo: "armadura", calidad: "mitico",     clase: "asesino",    atk: 20, def: 79,  precio: 9999, nivelReq: 35 },

  // ─── SACERDOTE ────────────────────────────────────────────
  cayado_divino:      { nombre: "Cayado Divino",        emoji: "✨", tipo: "arma",     calidad: "raro",       clase: "sacerdote",  atk: 22, def: 5,   precio: 420,  nivelReq: 5  },
  cetro_sagrado:      { nombre: "Cetro Sagrado",        emoji: "🌟", tipo: "arma",     calidad: "epico",      clase: "sacerdote",  atk: 38, def: 10,  precio: 980,  nivelReq: 10 },
  reliquia_divina:    { nombre: "Reliquia Divina",      emoji: "👼", tipo: "arma",     calidad: "legendario", clase: "sacerdote",  atk: 62, def: 18,  precio: 3200, nivelReq: 20 },
  luz_primordial:     { nombre: "Luz Primordial",       emoji: "☀️", tipo: "arma",     calidad: "mitico",     clase: "sacerdote",  atk: 100,def: 28,  precio: 9999, nivelReq: 35 },
  vestido_sagrado:    { nombre: "Vestido Sagrado",      emoji: "⚪", tipo: "armadura", calidad: "raro",       clase: "sacerdote",  atk: 2,  def: 22,  precio: 430,  nivelReq: 5  },
  manto_divino:       { nombre: "Manto Divino",         emoji: "✨", tipo: "armadura", calidad: "epico",      clase: "sacerdote",  atk: 5,  def: 40,  precio: 1000, nivelReq: 10 },
  armadura_celestial: { nombre: "Armadura Celestial",   emoji: "🌟", tipo: "armadura", calidad: "legendario", clase: "sacerdote",  atk: 10, def: 62,  precio: 3300, nivelReq: 20 },
  sagrado_eterno:     { nombre: "Sagrado Eterno",       emoji: "☀️", tipo: "armadura", calidad: "mitico",     clase: "sacerdote",  atk: 18, def: 100, precio: 9999, nivelReq: 35 },

  // ─── PALADÍN ──────────────────────────────────────────────
  maza_sagrada:       { nombre: "Maza Sagrada",         emoji: "🔨", tipo: "arma",     calidad: "raro",       clase: "paladin",    atk: 26, def: 8,   precio: 450,  nivelReq: 5  },
  lanza_sagrada:      { nombre: "Lanza Sagrada",        emoji: "⚡", tipo: "arma",     calidad: "epico",      clase: "paladin",    atk: 45, def: 12,  precio: 1100, nivelReq: 10 },
  espadon_justicia:   { nombre: "Espadón de Justicia",  emoji: "🌟", tipo: "arma",     calidad: "legendario", clase: "paladin",    atk: 72, def: 20,  precio: 3500, nivelReq: 20 },
  juicio_divino:      { nombre: "Juicio Divino",        emoji: "☀️", tipo: "arma",     calidad: "mitico",     clase: "paladin",    atk: 115,def: 30,  precio: 9999, nivelReq: 35 },
  escudo_paladin:     { nombre: "Escudo del Paladín",   emoji: "🛡️", tipo: "armadura", calidad: "raro",       clase: "paladin",    atk: 0,  def: 32,  precio: 480,  nivelReq: 5  },
  peto_sagrado:       { nombre: "Peto Sagrado",         emoji: "🔵", tipo: "armadura", calidad: "epico",      clase: "paladin",    atk: 5,  def: 55,  precio: 1250, nivelReq: 10 },
  fortaleza_sagrada:  { nombre: "Fortaleza Sagrada",    emoji: "🌟", tipo: "armadura", calidad: "legendario", clase: "paladin",    atk: 10, def: 80,  precio: 3800, nivelReq: 20 },
  bastion_divino:     { nombre: "Bastión Divino",       emoji: "☀️", tipo: "armadura", calidad: "mitico",     clase: "paladin",    atk: 18, def: 120, precio: 9999, nivelReq: 35 },

  // ─── NIGROMANTE ───────────────────────────────────────────
  guadana_oscura:     { nombre: "Guadaña Oscura",       emoji: "⚰️", tipo: "arma",     calidad: "raro",       clase: "nigromante", atk: 34, def: 0,   precio: 460,  nivelReq: 5  },
  tomo_maldito:       { nombre: "Tomo Maldito",         emoji: "📕", tipo: "arma",     calidad: "epico",      clase: "nigromante", atk: 56, def: 2,   precio: 1100, nivelReq: 10 },
  baculo_muerte:      { nombre: "Báculo de la Muerte",  emoji: "💀", tipo: "arma",     calidad: "legendario", clase: "nigromante", atk: 88, def: 5,   precio: 3500, nivelReq: 20 },
  segadora_almas:     { nombre: "Segadora de Almas",    emoji: "🌑", tipo: "arma",     calidad: "mitico",     clase: "nigromante", atk: 138,def: 8,   precio: 9999, nivelReq: 35 },
  manto_muerto:       { nombre: "Manto del Muerto",     emoji: "🖤", tipo: "armadura", calidad: "raro",       clase: "nigromante", atk: 3,  def: 18,  precio: 440,  nivelReq: 5  },
  sudario_oscuro:     { nombre: "Sudario Oscuro",       emoji: "💀", tipo: "armadura", calidad: "epico",      clase: "nigromante", atk: 8,  def: 32,  precio: 1000, nivelReq: 10 },
  armadura_liche:     { nombre: "Armadura del Liche",   emoji: "☠️", tipo: "armadura", calidad: "legendario", clase: "nigromante", atk: 14, def: 55,  precio: 3300, nivelReq: 20 },
  coraza_muerte:      { nombre: "Coraza de la Muerte",  emoji: "🌑", tipo: "armadura", calidad: "mitico",     clase: "nigromante", atk: 22, def: 92,  precio: 9999, nivelReq: 35 },

  // ─── HOMBRE LOBO ──────────────────────────────────────────
  garras_bestia:      { nombre: "Garras de la Bestia",  emoji: "🐾", tipo: "arma",     calidad: "raro",       clase: "hombrelobo", atk: 33, def: 0,   precio: 460,  nivelReq: 5  },
  colmillos_luna:     { nombre: "Colmillos de Luna",    emoji: "🌕", tipo: "arma",     calidad: "epico",      clase: "hombrelobo", atk: 56, def: 3,   precio: 1100, nivelReq: 10 },
  zarpa_lunar:        { nombre: "Zarpa Lunar",          emoji: "🐺", tipo: "arma",     calidad: "legendario", clase: "hombrelobo", atk: 88, def: 8,   precio: 3500, nivelReq: 20 },
  furia_lunar:        { nombre: "Furia Lunar",          emoji: "🌑", tipo: "arma",     calidad: "mitico",     clase: "hombrelobo", atk: 121,def: 11,  precio: 9999, nivelReq: 35 },
  piel_bestia:        { nombre: "Piel de Bestia",       emoji: "🐺", tipo: "armadura", calidad: "raro",       clase: "hombrelobo", atk: 5,  def: 20,  precio: 450,  nivelReq: 5  },
  cuero_lunar:        { nombre: "Cuero Lunar",          emoji: "🌕", tipo: "armadura", calidad: "epico",      clase: "hombrelobo", atk: 10, def: 36,  precio: 1000, nivelReq: 10 },
  armadura_bestia:    { nombre: "Armadura de la Bestia",emoji: "🌑", tipo: "armadura", calidad: "legendario", clase: "hombrelobo", atk: 16, def: 60,  precio: 3400, nivelReq: 20 },
  piel_lunar:         { nombre: "Piel Lunar Primordial",emoji: "🌕", tipo: "armadura", calidad: "mitico",     clase: "hombrelobo", atk: 22, def: 88,  precio: 9999, nivelReq: 35 },

  // ─── NO-MUERTO ────────────────────────────────────────────
  huesosa_maldita:    { nombre: "Huesosa Maldita",      emoji: "🦴", tipo: "arma",     calidad: "raro",       clase: "nomuerto",   atk: 30, def: 2,   precio: 440,  nivelReq: 5  },
  espada_osea:        { nombre: "Espada Ósea",          emoji: "🧟", tipo: "arma",     calidad: "epico",      clase: "nomuerto",   atk: 52, def: 5,   precio: 1050, nivelReq: 10 },
  guadana_muerto:     { nombre: "Guadaña del Muerto",   emoji: "☠️", tipo: "arma",     calidad: "legendario", clase: "nomuerto",   atk: 84, def: 10,  precio: 3400, nivelReq: 20 },
  abismo_eterno:      { nombre: "Abismo Eterno",        emoji: "🌑", tipo: "arma",     calidad: "mitico",     clase: "nomuerto",   atk: 130,def: 15,  precio: 9999, nivelReq: 35 },
  harapos_oseos:      { nombre: "Harapos Óseos",        emoji: "🦴", tipo: "armadura", calidad: "raro",       clase: "nomuerto",   atk: 2,  def: 22,  precio: 430,  nivelReq: 5  },
  armadura_osea:      { nombre: "Armadura Ósea",        emoji: "🧟", tipo: "armadura", calidad: "epico",      clase: "nomuerto",   atk: 6,  def: 38,  precio: 980,  nivelReq: 10 },
  forja_muerta:       { nombre: "Forja Muerta",         emoji: "☠️", tipo: "armadura", calidad: "legendario", clase: "nomuerto",   atk: 12, def: 62,  precio: 3300, nivelReq: 20 },
  carcasa_abismal:    { nombre: "Carcasa Abismal",      emoji: "🌑", tipo: "armadura", calidad: "mitico",     clase: "nomuerto",   atk: 20, def: 100, precio: 9999, nivelReq: 35 },
};

// Verifica si un ítem es compatible con la clase del jugador
export function itemCompatibleConClase(itemId, player) {
  const item = TIENDA_CLASE[itemId] || TIENDA[itemId];
  if (!item) return false;
  if (!item.clase) return true; // ítems generales sin restricción
  return item.clase === player.clase;
}

// Obtener todos los ítems de una clase ordenados por precio
export function getItemsDeClase(claseId) {
  return Object.entries(TIENDA_CLASE)
    .filter(([, v]) => v.clase === claseId)
    .sort((a, b) => a[1].precio - b[1].precio);
}

// ── Tienda del Clan (con medallas de honor) ────────────────────
export const TIENDA_CLAN = {
  // Frutos de mejora de mascotas
  fruto_vigor_clan:     { nombre: "Fruto del Vigor",       emoji: "🍎", tipo: "fruto", frutoId: "fruto_vigor",     precio: 80,  desc: "+15 ATK a mascota" },
  fruto_escudo_clan:    { nombre: "Fruto del Escudo",      emoji: "🫐", tipo: "fruto", frutoId: "fruto_escudo",    precio: 80,  desc: "+15 DEF a mascota" },
  fruto_fortuna_clan:   { nombre: "Fruto de Fortuna",      emoji: "🍋", tipo: "fruto", frutoId: "fruto_fortuna",   precio: 150, desc: "+10 CRIT a mascota" },
  fruto_fenix_clan:     { nombre: "Fruto del Fénix",       emoji: "🍑", tipo: "fruto", frutoId: "fruto_fenix",     precio: 280, desc: "+25 ATK a mascota" },
  fruto_dragon_clan:    { nombre: "Fruto del Dragón",      emoji: "🍇", tipo: "fruto", frutoId: "fruto_dragón",    precio: 350, desc: "+20 DEF +20 ATK" },
  fruto_divino_clan:    { nombre: "Fruto Divino",          emoji: "🍓", tipo: "fruto", frutoId: "fruto_divino",    precio: 500, desc: "+30 ATK +15 CRIT" },
  // Piedras de nivel (suben nivel de jugador al usarse, como "piedra de XP masiva")
  piedra_menor:         { nombre: "Piedra de Ascensión I",  emoji: "💎", tipo: "piedra", xp: 500,   precio: 100, desc: "+500 XP al jugador" },
  piedra_mayor:         { nombre: "Piedra de Ascensión II", emoji: "💠", tipo: "piedra", xp: 1500,  precio: 250, desc: "+1500 XP al jugador" },
  piedra_epica:         { nombre: "Piedra de Ascensión III",emoji: "🔷", tipo: "piedra", xp: 4000,  precio: 600, desc: "+4000 XP al jugador" },
  // Cambio de medallas por diamantes
  // (se maneja como comando especial, no ítem directo)
};

// ── Misión diaria de clan ──────────────────────────────────────
export const MISIONES_CLAN_BASE = [
  { id: "mc_explorar",   desc: "Explora cualquier zona 5 veces",         tipo: "exploraciones", meta: 5,  recompensa: { medallas: 15, oro: 200 } },
  { id: "mc_matar",      desc: "Derrota 8 enemigos en combate",          tipo: "kills",         meta: 8,  recompensa: { medallas: 20, oro: 150 } },
  { id: "mc_pvp",        desc: "Gana 2 duelos PvP",                      tipo: "pvp",           meta: 2,  recompensa: { medallas: 30, oro: 300 } },
  { id: "mc_donar",      desc: "Dona oro o XP al banco del clan",        tipo: "donacion",      meta: 1,  recompensa: { medallas: 25, oro: 180 } },
  { id: "mc_boss",       desc: "Participa en el Boss del Clan",          tipo: "boss_clan",     meta: 1,  recompensa: { medallas: 50, oro: 500 } },
  { id: "mc_territorio", desc: "Ataca un boss de territorio",            tipo: "boss_terr",     meta: 1,  recompensa: { medallas: 40, oro: 400 } },
  { id: "mc_arena",      desc: "Participa en la Arena",                  tipo: "arena",         meta: 1,  recompensa: { medallas: 20, oro: 200 } },
  { id: "mc_habilidad",  desc: "Usa tu habilidad especial 3 veces",      tipo: "habilidad",     meta: 3,  recompensa: { medallas: 15, oro: 120 } },
];

export function getMisionClan(jid) {
  const p = db.players[jid];
  if (!p) return null;
  return p.misionClan || null;
}

export function generarMisionClan(jid) {
  const p = db.players[jid];
  if (!p) return null;
  // Elegir 1 misión aleatoria
  const mision = MISIONES_CLAN_BASE[Math.floor(Math.random() * MISIONES_CLAN_BASE.length)];
  p.misionClan = {
    ...mision,
    progreso: 0,
    completada: false,
    generadaEn: Date.now(),
    expiraEn: Date.now() + 24 * 60 * 60 * 1000,
  };
  saveDB();
  return p.misionClan;
}

export function avanzarMisionClan(jid, tipo, cantidad = 1) {
  const p = db.players[jid];
  if (!p || !p.misionClan) return null;
  const m = p.misionClan;
  if (m.completada) return m;
  if (Date.now() > m.expiraEn) { p.misionClan = null; saveDB(); return null; }
  if (m.tipo !== tipo) return m;
  m.progreso = Math.min(m.meta, m.progreso + cantidad);
  if (m.progreso >= m.meta && !m.completada) {
    m.completada = true;
    // Entregar recompensa automáticamente al completarse
    if (m.recompensa) {
      if (m.recompensa.medallas) {
        if (!p.medallas) p.medallas = 0;
        p.medallas += m.recompensa.medallas;
      }
      if (m.recompensa.oro) {
        if (!p.oro) p.oro = 0;
        p.oro += m.recompensa.oro;
      }
    }
    m._recompensaEntregada = true;
  }
  saveDB();
  return m;
}

// ═══════════════════════════════════════════
//   SISTEMA DE BUZÓN — inbox por jugador
// ═══════════════════════════════════════════

// Estructura de un mensaje en el buzón:
// { id, titulo, cuerpo, fecha, leido, recompensa: { oro, gemas, item, cantidad } | null }

export function getBuzon(jid) {
  if (!db.players[jid]) return [];
  if (!db.players[jid].buzon) db.players[jid].buzon = [];
  return db.players[jid].buzon;
}

export function enviarMensajeBuzon(jid, { titulo, cuerpo, recompensa = null }) {
  if (!db.players[jid] || !db.players[jid].clase) return false;
  if (!db.players[jid].buzon) db.players[jid].buzon = [];
  const msg = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    titulo,
    cuerpo,
    fecha: Date.now(),
    leido: false,
    recompensa,        // null o { oro, gemas, item, cantidad }
    reclamado: false,
  };
  db.players[jid].buzon.push(msg);
  saveDB();
  return msg;
}

export function leerMensajeBuzon(jid, index) {
  const buzon = getBuzon(jid);
  const msg = buzon[index];
  if (!msg) return null;
  msg.leido = true;
  saveDB();
  return msg;
}

export function reclamarRecompensaBuzon(jid, index) {
  const p = db.players[jid];
  const buzon = getBuzon(jid);
  const msg = buzon[index];
  if (!msg || !msg.recompensa || msg.reclamado) return null;
  const r = msg.recompensa;
  if (r.oro)   { if (!p.oro)   p.oro   = 0; p.oro   += r.oro;   }
  if (r.gemas) { if (!p.gemas) p.gemas = 0; p.gemas += r.gemas; }
  if (r.item && r.cantidad) {
    if (!p.inventario) p.inventario = {};
    p.inventario[r.item] = (p.inventario[r.item] || 0) + r.cantidad;
  }
  msg.reclamado = true;
  saveDB();
  return r;
}

export function mensajesSinLeer(jid) {
  const buzon = getBuzon(jid);
  return buzon.filter(m => !m.leido).length;
}

export function enviarBroadcastBuzon({ titulo, cuerpo, recompensa = null }) {
  const jugadores = Object.keys(db.players).filter(jid => db.players[jid].clase);
  for (const jid of jugadores) {
    enviarMensajeBuzon(jid, { titulo, cuerpo, recompensa });
  }
  return jugadores.length;
}

// ═══════════════════════════════════════════════════════════════
//   BANCO DE MEDALLAS DEL CLAN + ÁRBOL DE HABILIDADES
// ═══════════════════════════════════════════════════════════════

// Stats del árbol de habilidades del clan
// Cada stat tiene nivel 1-50, costo escala progresivamente
export const CLAN_SKILLS = {
  atk:    { nombre: "Ataque del Clan",   emoji: "⚔️",  desc: "+2 ATK por nivel para todos los miembros",  bonusPerLevel: 2  },
  def:    { nombre: "Defensa del Clan",  emoji: "🛡️",  desc: "+2 DEF por nivel para todos los miembros",  bonusPerLevel: 2  },
  damage: { nombre: "Daño Crítico",      emoji: "💥",  desc: "+1% CRIT por nivel para todos los miembros", bonusPerLevel: 1  },
  dodge:  { nombre: "Esquivar",          emoji: "💨",  desc: "+1% DODGE por nivel para todos los miembros",bonusPerLevel: 1  },
};

// Costo de medallas para subir cada nivel del árbol
// Nivel 1-10: 50 medallas, 11-20: 120, 21-30: 250, 31-40: 500, 41-50: 900
export function costoSkillClan(nivelActual) {
  const n = nivelActual + 1; // nivel al que sube
  if (n <= 10)  return 50;
  if (n <= 20)  return 120;
  if (n <= 30)  return 250;
  if (n <= 40)  return 500;
  return 900;
}

export function getClanSkills(clan) {
  if (!clan.skills) clan.skills = { atk: 0, def: 0, damage: 0, dodge: 0 };
  return clan.skills;
}

// Obtener bonus de skills del clan para un jugador
export function getClanSkillBonus(jid) {
  const p = db.players[jid];
  if (!p || !p.clan) return { atk: 0, def: 0, crit: 0, dodge: 0 };
  const clan = db.guilds[p.clan];
  if (!clan) return { atk: 0, def: 0, crit: 0, dodge: 0 };
  const s = getClanSkills(clan);
  return {
    atk:   (s.atk   || 0) * CLAN_SKILLS.atk.bonusPerLevel,
    def:   (s.def   || 0) * CLAN_SKILLS.def.bonusPerLevel,
    crit:  (s.damage|| 0) * CLAN_SKILLS.damage.bonusPerLevel,
    dodge: (s.dodge || 0) * CLAN_SKILLS.dodge.bonusPerLevel,
  };
}

// Donar medallas al banco del clan
export function donarMedallasClan(jid, cantidad) {
  const p = db.players[jid];
  if (!p || !p.clan) return { error: "Sin clan" };
  if ((p.medallas || 0) < cantidad) return { error: "Sin medallas suficientes" };
  const clan = db.guilds[p.clan];
  if (!clan) return { error: "Clan no encontrado" };
  p.medallas -= cantidad;
  if (!clan.bancoMedallas) clan.bancoMedallas = 0;
  clan.bancoMedallas += cantidad;
  if (!clan.donacionesMedallas) clan.donacionesMedallas = {};
  clan.donacionesMedallas[jid] = (clan.donacionesMedallas[jid] || 0) + cantidad;
  saveDB();
  return { ok: true, bancoMedallas: clan.bancoMedallas };
}

// Subir nivel de skill del clan (solo líder)
export function mejorarSkillClan(jid, stat) {
  const p = db.players[jid];
  if (!p || !p.clan) return { error: "Sin clan" };
  const clan = db.guilds[p.clan];
  if (!clan) return { error: "Clan no encontrado" };
  if (clan.lider !== jid) return { error: "Solo el líder puede mejorar habilidades" };
  if (!CLAN_SKILLS[stat]) return { error: "Stat inválido" };
  const skills = getClanSkills(clan);
  const nivelActual = skills[stat] || 0;
  if (nivelActual >= 50) return { error: "Ya está en el nivel máximo (50)" };
  const costo = costoSkillClan(nivelActual);
  if (!clan.bancoMedallas || clan.bancoMedallas < costo) return { error: `Medallas insuficientes. Necesitas *${costo}🏅*, el banco tiene *${clan.bancoMedallas || 0}🏅*` };
  clan.bancoMedallas -= costo;
  skills[stat] = nivelActual + 1;
  clan.skills = skills;
  saveDB();
  return { ok: true, nivelNuevo: skills[stat], costo, bancoMedallas: clan.bancoMedallas };
}

// Inicializar banco de medallas para clanes existentes
export function inicializarBancoMedallas(clan, cantidad = 2000) {
  if (!clan.bancoMedallas) clan.bancoMedallas = 0;
  clan.bancoMedallas += cantidad;
  if (!clan.skills) clan.skills = { atk: 0, def: 0, damage: 0, dodge: 0 };
  saveDB();
}
