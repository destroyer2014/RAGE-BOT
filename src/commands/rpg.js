// ═══════════════════════════════════════════
//        PRAGMATA BOT — src/commands/rpg.js
//           Sistema RPG completo v3.0
// ═══════════════════════════════════════════

import { broadcastGrupos } from "../lib/sockGlobal.js";
import {
  db, getPlayer, savePlayer, addExp, calcularDrop,
  getTotalAtk, getTotalDef, CLASES, ZONAS, TIENDA, HABILIDADES,
  DROP_POOL, CALIDAD, getGuild, saveGuild, getBossActivo, saveBossActivo,
  getEventosDB, setEventoDB, clearEventosDB, MASCOTAS, generarMisiones,
  getMercado, saveMercado, addListingMercado, removeListingMercado,
  ORO_POR_GEMA, ARMAS_SSR, MASCOTAS_SSR,
  getPityBanner, incrementPityBanner, resetPityBanner,
  BANNER_COSTOS, BANNER_PITY,
  tiradaBannerMascota, tiradaBannerArmadura, tiradaBannerArma,
  tiradaBannerEvento, EVENTO_MONO_GOKU, EVENTO_COSTOS, EVENTO_PITY, getPityEvento,
  BANNER_ARMA_SSR,
  DUNGEON_COOLDOWN, DUNGEON_REVIVE_COSTO, DUNGEON_PISOS,
  DUNGEON_ENEMIGOS, getDungeonEstado, calcDungeonEnemigo,
  calcDungeonDrop, calcDungeonRecompensaFinal,
  ACTIVIDADES, ACTIVIDAD_COOLDOWN, realizarActividad,
  getArenaStats, resolverArena, getArenaTop,
  calcularTitulo, getTitulosDesbloqueados, actualizarTopRpg, actualizarTopArena, TITULOS,
  MEJORA_STATS, MEJORA_STAT_EMOJI, MEJORA_STAT_NOMBRE, MEJORA_MAX_NIVEL,
  MEJORA_STAT_GANANCIA, MEJORA_EQUIPO_GANANCIA,
  calcCostoMejora, calcCostoMejoraMultiple, getNivelMejoraStat, getNivelMejoraEquipo,
  aplicarMejoraStat, aplicarMejoraEquipo, aplicarMejoraStatMultiple, aplicarMejoraEquipoMultiple,
  CAMBIO_CLASE_COSTO_ORO, CAMBIO_CLASE_COSTO_GEMAS, CAMBIO_CLASE_PENALIDAD_XP, cambiarClase,
  TORRE_MAX_GRUPO, TORRE_INVITE_TIMEOUT, TORRE_JEFES, TORRE_MAX_PISOS, TORRE_COOLDOWN_MUERTE,
  getTorreEstado, getTorreGrupo, saveTorreGrupo, getTorreInvites, saveTorreInvite,
  getTorreJefe, calcTorreEnemigo, calcTorreRecompensaPiso, ARMADURA_ASTAROTH,
  TERRITORIOS, calcPuntosTerritorio,
  getTerritorios, getTerritorio, saveTerritorio,
  getTerritoriosDeClan, getBonusTerritorio,
  getAcumuladoClan, reclamarAcumuladoClan, checkResetSemanal,
  BOSS_TERRITORIO, getBossTerritorio, saveBossTerritorio,
  inicializarBossTerritorio, atacarBossTerritorio, getTerritorioCooldown,
  getHistorialConquistas, registrarConquista,
  DEFENSA_VENTANA_MS, getDefensaTerritorio, saveDefensaTerritorio,
  clearDefensaTerritorio, iniciarDefensaTerritorio, defenderTerritorio, defensaExpirada,
  // Medallas de Honor
  getMedallas, addMedallas, quitarMedallas,
  getNivelClan, costoSiguienteNivelClan,
  // Boss del Clan
  BOSS_CLAN_COOLDOWN, getBossClan, inicializarBossClan, atacarBossClan,
  // Tienda del Clan
  TIENDA_CLAN,
  // Misión de Clan
  getMisionClan, generarMisionClan, avanzarMisionClan,
  // Buzón
  getBuzon, leerMensajeBuzon, reclamarRecompensaBuzon, mensajesSinLeer,
  // Clan skills
  CLAN_SKILLS, costoSkillClan, getClanSkills, getClanSkillBonus, donarMedallasClan, mejorarSkillClan, inicializarBancoMedallas,
  // Tienda por clase
  TIENDA_CLASE,
} from "../lib/rpg-database.js";
import axios from "axios";
import { isOwner } from "../lib/utils.js";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink, readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
const _execAsync = promisify(exec);

// ── TTS femenino Google (sin API key) ─────────────────────────
async function _divinaTTS(texto) {
  const encoded = encodeURIComponent(texto.substring(0, 200));
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encoded}`;
  const res = await axios.get(url, { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000 });
  const tmpMp3 = join(tmpdir(), `divina_${Date.now()}.mp3`);
  const tmpOgg = tmpMp3.replace(".mp3", ".ogg");
  await writeFile(tmpMp3, Buffer.from(res.data));
  await _execAsync(`ffmpeg -i "${tmpMp3}" -c:a libopus -b:a 64k "${tmpOgg}" -y`, { timeout: 15000 });
  const buf = await readFile(tmpOgg);
  try { await unlink(tmpMp3); } catch {}
  try { await unlink(tmpOgg); } catch {}
  return buf;
}

const CD_EXPLORACION = 2 * 60 * 1000;
const CD_MISION      = 24 * 60 * 60 * 1000;
const CD_DESCANSO    = 30 * 60 * 1000;

// ══════════════════════════════════════════
//  SISTEMA DE EVENTOS Y JEFES
// ══════════════════════════════════════════
// Estructura boss: { nombre, emoji, hpMax, hp, atk, def, recompensa, participantes: {} }

export function getEventoActivo(tipo) {
  const ev = getEventosDB()[tipo];
  if (!ev) return null;
  if (Date.now() > ev.expira) { const e = getEventosDB(); delete e[tipo]; clearEventosDB(); return null; }
  return ev;
}

export function getMultXP()  { const e = getEventoActivo("xp");    return e ? e.multiplicador : 1; }
export function getMultOro() { const e = getEventoActivo("oro");   return e ? e.multiplicador : 1; }
export function getMultDrop(){ const e = getEventoActivo("drop");  return e ? e.multiplicador : 1; }
export function getInvasion(){ return getEventoActivo("invasion"); }

function barra(actual, max, largo = 10) {
  const lleno = Math.round((actual / max) * largo);
  return "▓".repeat(Math.max(0, lleno)) + "░".repeat(Math.max(0, largo - lleno));
}

function calcCrit(player) {
  const clase = CLASES[player.clase];
  let crit = (player.crit || clase?.crit || 3); // base: clase o 3%
  // Bonus de mascota equipada
  if (player.mascota) {
    const mascota = MASCOTAS[player.mascota]
      || (player._ssrMascotas && player._ssrMascotas[player.mascota]);
    if (mascota) crit += (mascota.bonus?.crit || 0);
  }
  // Bonus de accesorio
  const acc = player.equipo?.accesorio;
  if (acc) crit += (TIENDA[acc]?.crit || 0);
  // Buff de suerte aplica +crit
  const buffs = player.buffs || {};
  if (buffs.suerte && buffs.suerte.expira > Date.now()) crit += buffs.suerte.valor;
  // Clan skill damage (crit)
  if (player.clan && db?.guilds?.[player.clan]?.skills?.damage) {
    crit += db.guilds[player.clan].skills.damage;
  }
  return Math.min(80, crit);
}

function calcDodge(player) {
  const spd = player.spd || 0;
  let dodge = Math.min(35, Math.floor(spd * 0.5));
  // Buff de suerte aplica +dodge
  const buffs = player.buffs || {};
  if (buffs.suerte && buffs.suerte.expira > Date.now()) dodge += buffs.suerte.valor;
  // Clan skill dodge
  if (player.clan && db?.guilds?.[player.clan]?.skills?.dodge) {
    dodge += db.guilds[player.clan].skills.dodge;
  }
  return Math.min(60, dodge); // cap sube a 60 con buffs
}

function simularCombate(atacante, defensor) {
  let hpA = atacante.hp, hpB = defensor.hp;
  const log = [];
  let turno = 1;
  while (hpA > 0 && hpB > 0 && turno <= 12) {
    const critA = Math.random() * 100 < (atacante.crit || 3);
    const critB = Math.random() * 100 < (defensor.crit || 3);
    const dodgeB = Math.random() * 100 < (defensor.dodge || 0);
    const dodgeA = Math.random() * 100 < (atacante.dodge || 0);
    const dmgA = dodgeB ? 0 : Math.max(1, Math.floor((atacante.atk - defensor.def * 0.4 + Math.random() * 8) * (critA ? 2 : 1)));
    const dmgB = dodgeA ? 0 : Math.max(1, Math.floor((defensor.atk - atacante.def * 0.4 + Math.random() * 8) * (critB ? 2 : 1)));
    hpB = Math.max(0, hpB - dmgA);
    log.push(dodgeB ? "💨 T" + turno + ": " + defensor.nombre + " ¡ESQUIVÓ!" : (critA ? "💥" : "⚔️") + " T" + turno + ": " + atacante.nombre + " → -" + dmgA + (critA ? " ¡CRÍTICO!" : ""));
    if (hpB <= 0) break;
    hpA = Math.max(0, hpA - dmgB);
    log.push(dodgeA ? "💨 T" + turno + ": " + atacante.nombre + " ¡ESQUIVÓ!" : (critB ? "💥" : "🛡️") + " T" + turno + ": " + defensor.nombre + " → -" + dmgB + (critB ? " ¡CRÍTICO!" : ""));
    turno++;
  }
  return { gano: hpA > 0, hpRestante: hpA, log: log.slice(-8) };
}

function calidadTag(calidad) {
  const c = CALIDAD[calidad];
  return c ? c.emoji + " *" + c.nombre + "*" : "";
}

// ── Protección divina contra atacar owners ─────────────────────
const _DIOS_INTENTOS = {}; // jid → intentos
const _DIOS_MSG = [
  "Estás intentando atacar a un dios más poderoso que Asharot. Te aconsejo que te detengas... o atente a las consecuencias.",
  "Insensato. Vuelves a desafiar a un ser divino. Esta es tu última advertencia.",
  "Lo elegiste tú. Que los dioses tengan piedad de tu alma... porque yo no la tendré.",
];

async function _checkDiosProteccion(atacanteJid, victimJid, p1, sock, from, msg, reply) {
  if (!isOwner(victimJid)) return false; // no es owner, dejar pasar
  const intentos = (_DIOS_INTENTOS[atacanteJid] || 0) + 1;
  _DIOS_INTENTOS[atacanteJid] = intentos;

  const numero = atacanteJid.split("@")[0];
  const msgIdx = Math.min(intentos - 1, 2);
  const texto = _DIOS_MSG[msgIdx];

  // Enviar mensaje de texto
  await reply(
    "⚡ *[ ADVERTENCIA DIVINA ]*\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "☠️ " + texto + "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "_Intentos: " + intentos + "/3_"
  );

  // Enviar audio de voz femenina
  try {
    const audioBuf = await _divinaTTS(texto);
    await sock.sendMessage(from, { audio: audioBuf, mimetype: "audio/ogg; codecs=opus", ptt: true }, { quoted: msg });
  } catch {}

  // Al tercer intento: matar al atacante
  if (intentos >= 3) {
    _DIOS_INTENTOS[atacanteJid] = 0;
    p1.hp = 0;
    savePlayer(p1);
    await sock.sendMessage(from, {
      text:
        "💀 *[ CASTIGO DIVINO ]*\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "@" + numero + " fue *fulminado* por desafiar a los dioses.\n" +
        "Se te advirtió tres veces.\n\n" +
        "☠️ *Has muerto.* Usa `!rpgdescansar` para recuperarte.\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "_Que esto sea una lección para los mortales._",
      mentions: [atacanteJid],
    }, { quoted: msg });
    try {
      const audioMuerte = await _divinaTTS("Se te advirtió tres veces, mortal. Ahora sufre las consecuencias de desafiar a un dios.");
      await sock.sendMessage(from, { audio: audioMuerte, mimetype: "audio/ogg; codecs=opus", ptt: true }, { quoted: msg });
    } catch {}
  }
  return true; // bloquear el ataque
}

const rpgCommands = [

  // ── Menú ──────────────────────────────────
  {
    name: "rpg",
    alias: ["rpgmenu"],
    description: "Menú RPG",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName}) => {
      await react("⚔️");
      const p = db.players[sender];
      const reg = p && p.clase;
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃      ⚔️  *RAGE  RPG*  ⚔️      ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n" +
        (reg
          ? "👤 *" + p.nombre + "* | " + (CLASES[p.clase]?.emoji||"") + " Nv." + p.nivel + "\n" +
            "❤️ " + p.hp + "/" + p.hpMax + " | 💰 " + p.oro + " oro\n"
          : "⚠️ No registrado — usa *!rpgregistro [clase]*\n") +
        "\n" +

        // ── PERSONAJE ──
        "╭─〔 👤 *PERSONAJE* 〕\n" +
        "│ `!rpgregistro [clase]` — Crear personaje\n" +
        "│ `!rpgcambiarclase [clase]` — Cambiar clase (5000💰+100💎)\n" +
        "│ `!rpgperfil` — Ver stats y equipo\n" +
        "│ `!rpgtitulos` — Tus títulos desbloqueados\n" +
        "│ `!rpgbanco` — Guardar/retirar oro en el banco\n" +
        "│ `!buzon` — 📬 Buzón de mensajes del sistema\n" +
        "╰──────────────────────⬣\n\n" +

        // ── COMBATE Y EXPLORACIÓN ──
        "╭─〔 ⚔️ *COMBATE & EXPLORACIÓN* 〕\n" +
        "│ `!rpgexplorar [zona]` — Explorar zona (2min CD)\n" +
        "│ `!rpghabilidad` — Usar habilidad de clase\n" +
        "│ `!rpgataccar @u` — Batalla PvP\n" +
        "│ `!rpgduelo @u [apuesta]` — Duelo con apuesta de oro\n" +
        "│ `!rpgcurar @u` — Curar aliado (solo Sacerdote)\n" +
        "│ `!rpgdescansar` — Recuperar HP (30min CD)\n" +
        "│ `!rpgafk` — Modo AFK (recolecta en segundo plano)\n" +
        "│ `!rpgmision` — Misión diaria (reset 24h)\n" +
        "╰──────────────────────⬣\n\n" +

        // ── INVENTARIO Y TIENDA ──
        "╭─〔 🎒 *INVENTARIO & TIENDA* 〕\n" +
        "│ `!rpginventario` — Resumen del inventario\n" +
        "│ `!invarmas` — Ver armas con stats\n" +
        "│ `!invarmaduras` — Ver armaduras con stats\n" +
        "│ `!invmascotas` — Ver mascotas con stats\n" +
        "│ `!invpociones` — Ver pociones\n" +
        "│ `!rpgtienda [n/r/sr/ssr/ur]` — Ver tienda por rareza\n" +
        "│ `!rpgcomprar [item]` — Comprar item\n" +
        "│ `!rpgusar [item]` — Usar poción o consumible\n" +
        "│ `!rpgvender [item] [cant/all]` — Vender item\n" +
        "│ `!rpgequipar [item]` — Equipar arma/armadura/accesorio\n" +
        "│ `!rpgdesequipar [slot]` — Desequipar arma/armadura/accesorio/mascota/todo\n" +
        "│ `!daritem @u [item] [cant]` — Dar item a otro jugador\n" +
        "│ `!rpgmercado` — Mercado de jugadores\n" +
        "╰──────────────────────⬣\n\n" +

        // ── MEJORAS ──
        "╭─〔 🔵🟡 *MEJORAS* 〕\n" +
        "│ `!rpgmejorar` — Subir stats (ATK/DEF/HP/SPD/CRIT)\n" +
        "│ `!rpgmejorarequipo` — Mejorar nivel de arma/armadura\n" +
        "│ _Materiales: `!rpgcomprar orbe_azul` / `orbe_dorado`_\n" +
        "╰──────────────────────⬣\n\n" +

        // ── MASCOTAS ──
        "╭─〔 🐾 *MASCOTAS* 〕\n" +
        "│ `!rpgmascota` — Ver tus mascotas\n" +
        "│ `!mascotanivel` — Subir nivel a mascota equipada\n" +
        "│ `!torremascota` — 🐾 Torre de Mascotas (ver info)\n" +
        "│ `!tmentrar` — Entrar a la Torre de Mascotas\n" +
        "│ `!tmatacar` — Atacar en Torre de Mascotas\n" +
        "│ `!tmavanzar` — Avanzar piso en Torre de Mascotas\n" +
        "│ `!tmfrutos` — Ver frutos disponibles\n" +
        "│ `!tmusar [fruto]` — Usar fruto en mascota\n" +
        "│ `!tmsalir` — Salir de la Torre de Mascotas\n" +
        "╰──────────────────────⬣\n\n" +

        // ── DUNGEON & TORRES ──
        "╭─〔 🗼 *DUNGEON & TORRES* 〕\n" +
        "│ `!rpgdungeon` — Dungeon por pisos (solo)\n" +
        "│ `!rpgarena` — Arena PvP por temporadas\n" +
        "│ `!rpgtorre` — 🗼 Torre de los Elegidos (ver info)\n" +
        "│ `!torrentrar` — Entrar a la Torre (solo o grupo)\n" +
        "│ `!invitartorre @u` — Invitar jugador a tu grupo\n" +
        "│ `!torreaceptar` — Aceptar invitación\n" +
        "│ `!torregrupo` — Ver estado del grupo\n" +
        "│ `!torreavanzar` — Avanzar al siguiente piso\n" +
        "│ `!torreatacar` — Atacar al jefe del piso\n" +
        "│ `!torreabandonar` — Abandonar la Torre\n" +
        "│ `!torregemas` — Reclamar gemas de progreso Torre\n" +
        "│ `!torreoro` — 💰 Torre de Oro (ver info)\n" +
        "│ `!otentrar` — Entrar a la Torre de Oro\n" +
        "│ `!otatacar` — Atacar en Torre de Oro\n" +
        "│ `!otavanzar` — Avanzar piso en Torre de Oro\n" +
        "│ `!otsalir` — Salir de la Torre de Oro\n" +
        "│ `!gtentrar` — Torre de Gemas (entrar)\n" +
        "│ `!gtatacar` — Torre de Gemas (atacar)\n" +
        "│ `!gtavanzar` — Torre de Gemas (avanzar)\n" +
        "│ `!gtsalir` — Torre de Gemas (salir)\n" +
        "╰──────────────────────⬣\n\n" +

        // ── CLANES ──
        "╭─〔 🏰 *CLANES* 〕\n" +
        "│ `!rpgclan` — Info de clanes / crear / unirse\n" +
        "│ `!clansubirnivel` — Subir nivel del clan\n" +
        "│ `!donarclanmedallas [cant]` — Donar medallas al banco del clan 🏅\n" +
        "│ `!misionclan` — Misión diaria del clan 🏅\n" +
        "│ `!medallas` — Ver tus Medallas de Honor 🏅\n" +
        "│ `!medallas2gemas` — Canjear 500🏅 = 100💎\n" +
        "│ `!bossclan` — Boss del Clan (invocar/estado)\n" +
        "│ `!rpgatacarbossclan` — Atacar al Boss del Clan\n" +
        "│ `!tiendaclan` — Tienda del Clan (con medallas)\n" +
        "│ `!clanhabilidades` — 🌟 Árbol de habilidades del clan\n" +
        "│ `!clanmejorar [atk/def/damage/dodge]` — Mejorar habilidad (líder)\n" +
        "╰──────────────────────⬣\n\n" +

        // ── TERRITORIOS ──
        "╭─〔 🗺️ *TERRITORIOS* 〕\n" +
        "│ `!rpgmapa` — Ver mapa y control de territorios\n" +
        "│ `!rpgterritorio [id]` — Detalles de un territorio\n" +
        "│ `!rpgbossterreno [id]` — Atacar boss de territorio\n" +
        "│ `!rpgbossstatus [id]` — Estado del boss de territorio\n" +
        "│ `!rpgconquistar [id]` — Iniciar conquista (líder)\n" +
        "│ `!rpgdefender [id]` — Defender territorio bajo ataque\n" +
        "│ `!rpgestadodefensa [id]` — Ver defensa activa\n" +
        "│ `!rpgrecolectar` — Cobrar producción del clan (líder)\n" +
        "│ `!rpgmisbonos` — Ver bonos activos de tu clan\n" +
        "│ `!rpghistorial` — Historial de conquistas\n" +
        "╰──────────────────────⬣\n\n" +

        // ── GACHA & BANNERS ──
        "╭─〔 💎 *GACHA & BANNERS* 〕\n" +
        "│ `!rpggemas` — Cambiar 1000💰 = 100💎 (5/día)\n" +
        "│ `!gachamascota` — 🐲 Banner Dragón Ancestral\n" +
        "│ `!gachaarmadura` — 🖤 Banner Caballero Oscuro\n" +
        "│ `!gachaarma` — 🗡️ Banner Espada del Señor Oscuro\n" +
        "│ `!ssrgoku` — 🐒 Invocación Z — Mono Goku [EVENTO]\n" +
        "│ _Todos los banners: x1=100💎 | x10=1000💎 | Pity=90_\n" +
        "╰──────────────────────⬣\n\n" +

        // ── SOCIAL & PAREJA ──
        "╭─〔 💑 *SOCIAL & PAREJA* 〕\n" +
        "│ `!merry @u` — 💍 Proponer matrimonio\n" +
        "│ `!aceptarboda` — Aceptar propuesta\n" +
        "│ `!rechazarboda` — Rechazar propuesta\n" +
        "│ `!divorcio` — Disolver matrimonio\n" +
        "│ `!verpareja` — Estado de tu pareja\n" +
        "│ `!darpro @u` — Dar premium a tu pareja\n" +
        "│ `!misionpareja` — Misión especial de pareja\n" +
        "│ `!revivirpareja` — Revivir a tu pareja (si murió)\n" +
        "╰──────────────────────⬣\n\n" +

        // ── RANKINGS ──
        "╭─〔 🏆 *RANKINGS* 〕\n" +
        "│ `!rpgtop` — Top nivel y XP\n" +
        "│ `!rpgtoppoder` — Top poder total\n" +
        "│ `!rpgtoppodermascota` — Top poder de mascota\n" +
        "│ `!rpgtoppoderarma` — Top poder de arma\n" +
        "│ `!rpgtoppoderamadura` — Top poder de armadura\n" +
        "╰──────────────────────⬣\n\n" +

        // ── ZONAS ──
        "╭─〔 🗺️ *ZONAS DE EXPLORACIÓN* 〕\n" +
        "│ 🌲 `bosque` — Nv.1+  | Drop 20%\n" +
        "│ ⛏️ `cueva`  — Nv.5+  | Drop 30%\n" +
        "│ 🏰 `castillo` — Nv.10+ | Drop 40%\n" +
        "│ 🌋 `volcan` — Nv.20+ | Drop 55%\n" +
        "│ 🌑 `abismo` — Nv.35+ | Drop 70%\n" +
        "╰──────────────────────⬣\n\n" +

        // ── CALIDADES ──
        "╭─〔 ✨ *RAREZA DE ITEMS* 〕\n" +
        "│ ⬜ N (Normal)  🟦 R (Raro)  🟪 SR (Super Raro)  🟨 SSR  🟥 UR (Ultra Raro)\n" +
        "╰──────────────────────⬣"
      );
    },
  },

  // ── Registro ──────────────────────────────
  {
    name: "rpgregistro",
    alias: ["rpgreg"],
    description: "Crear personaje — !rpgregistro [clase]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName}) => {
      const player = getPlayer(sender, pushName || msg?.pushName || null);
      if (player.clase) return reply("❌ Ya tienes personaje: " + (CLASES[player.clase]?.emoji||"") + " " + player.clase);
      const claseEleg = (args[0]||"").toLowerCase();
      if (!claseEleg || !CLASES[claseEleg]) {
        const lista = Object.entries(CLASES).map(([k,v]) => "│ `" + k + "` " + v.emoji + " — " + v.desc).join("\n");
        return reply("⚔️ *ELIGE TU CLASE*\n━━━━━━━━━━━━━━\n" + lista + "\n\nEj: `!rpgregistro guerrero`");
      }
      const clase = CLASES[claseEleg];
      // Usar pushName como nombre visible si está disponible
      const nombreVisible = pushName || msg?.pushName || null;
      if (nombreVisible) player.nombre = nombreVisible;
      Object.assign(player, {
        clase: claseEleg, hp: clase.hp, hpMax: clase.hp,
        atk: clase.atk, def: clase.def, spd: clase.spd, crit: clase.crit,
        expMax: 100, oro: 100,
      });
      savePlayer(player);
      await react("🎉");
      const hab = HABILIDADES[clase.habilidad];
      await reply(
        "🎉 *¡BIENVENIDO AL RAGE RPG!*\n━━━━━━━━━━━━━━\n" +
        clase.emoji + " Clase: *" + claseEleg.toUpperCase() + "*\n" +
        "❤️ HP: " + clase.hp + " | ⚔️ ATK: " + clase.atk + "\n" +
        "🛡️ DEF: " + clase.def + " | 💨 DODGE: " + Math.min(35, Math.floor(clase.spd * 0.5)) + "% | 🎯 CRIT: " + clase.crit + "%\n" +
        "💰 Oro inicial: 100\n\n" +
        "✨ *Habilidad especial:*\n" +
        hab.emoji + " *" + hab.nombre + "* — " + hab.desc + "\nUsa: `!rpghabilidad` en combate"
      );
      // ── Aviso del grupo RPG (solo 1 vez por jugador) ──
      if (!player.grupoRpgNotificado && config.rpgGroupLink) {
        player.grupoRpgNotificado = true;
        savePlayer(player);
        const nombreBienvenida = player.nombre || sender.split("@")[0];
        try {
          await sock.sendMessage(sender, {
            text:
              `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
              `┃  ⚔️  *RAGE RPG — GRUPO OFICIAL*  ⚔️  ┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
              `¡Bienvenido *${nombreBienvenida}*! 🎉\n\n` +
              `Únete al grupo oficial del RPG donde encontrarás:\n` +
              `│ 📢 Anuncios de eventos y actualizaciones\n` +
              `│ 🏆 Torneos y competencias\n` +
              `│ 💬 Comunidad de jugadores\n` +
              `│ 🎁 Sorteos y códigos exclusivos\n` +
              `│ 🛡️ Soporte directo\n\n` +
              `🔗 *Únete aquí:*\n${config.rpgGroupLink}\n\n` +
              `_¡Te esperamos, aventurero!_ ⚔️`
          });
        } catch {}
      }
    },
  },

  // ── Perfil ────────────────────────────────
  {
    name: "rpgperfil",
    alias: ["rpgstats", "rpgme"],
    description: "Ver perfil RPG con tarjeta visual",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, sock, from, msg, pushName }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0] || sender;
      const p = db.players[target];
      if (!p || !p.clase) return reply("❌ Sin personaje RPG.");
      const clase  = CLASES[p.clase];
      const arma = p.equipo.arma
        ? TIENDA[p.equipo.arma] || TIENDA_CLASE[p.equipo.arma] || (p._ssrItems && p._ssrItems[p.equipo.arma]) || null
        : null;
      const arm = p.equipo.armadura
        ? TIENDA[p.equipo.armadura] || TIENDA_CLASE[p.equipo.armadura] || (p._ssrItems && p._ssrItems[p.equipo.armadura]) || null
        : null;
      const acc    = p.equipo.accesorio ? TIENDA[p.equipo.accesorio] : null;
      const mascota = p.mascota
        ? MASCOTAS[p.mascota]
          || (p._ssrMascotas && p._ssrMascotas[p.mascota])
          || null
        : null;
      await react("📊");

      // ── Intentar generar tarjeta visual con evogb ──
      const backgrounds = {
        guerrero:  "https://i.imgur.com/8JIUX5m.jpg",
        mago:      "https://i.imgur.com/3QkQpTL.jpg",
        arquero:   "https://i.imgur.com/2VsJHoO.jpg",
        asesino:   "https://i.imgur.com/KQbXvDH.jpg",
        sacerdote: "https://i.imgur.com/9XkQpTL.jpg",
        paladín:   "https://i.imgur.com/7VsJHoO.jpg",
        nigromante:"https://i.imgur.com/5KQbXvD.jpg",
      };
      // Avatar: URL estática que termina en .png (evogb valida extensión)
      const avatarUrl = `https://api.multiavatar.com/${encodeURIComponent(p.nombre)}.png`;
      const bgUrl     = backgrounds[p.clase] || "https://i.imgur.com/8JIUX5m.jpg";

      try {
        const r = await axios.get("https://api.evogb.org/generate/rank", {
          params: {
            nivel:      "recomendado",
            username:   p.nombre,
            avatar:     avatarUrl,
            background: bgUrl,
            needxp:     p.expMax,
            currxp:     p.exp,
            apikey:     "evogb-Rk23OCHp",
          },
          responseType: "arraybuffer",
          timeout: 12000,
        });
        // Debug: verificar content-type
        const ct = r.headers["content-type"] || "";
        console.log("[RPGPERFIL] status:", r.status, "content-type:", ct, "size:", r.data?.byteLength);
        if (!ct.includes("image")) {
          const txt = Buffer.from(r.data).toString("utf-8").slice(0, 200);
          console.error("[RPGPERFIL] evogb no devolvió imagen:", ct, txt);
          throw new Error("not image");
        }
        const buf = Buffer.from(r.data);
        const caption =
          `${clase.emoji} *${p.nombre}* — Nv.*${p.nivel}* ${p.clase.toUpperCase()}\n` +
          `⚔️ ATK: *${getTotalAtk(p)}* | 🛡️ DEF: *${getTotalDef(p)}* | ❤️ HP: *${p.hp}/${p.hpMax}*\n` +
          `💰 Oro: *${p.oro}* | 🏆 Victorias: *${p.stats.victorias}*` +
          (mascota ? `\n🐾 Mascota: *${mascota.emoji} ${mascota.nombre}*` : "") +
          (() => { const t = calcularTitulo(p); return t ? `\n🎖️ *${t.emoji} ${t.nombre}*` : ""; })() +
          (p.clan  ? `\n🏰 Clan: *${p.clan}*` : "");
        await sock.sendMessage(from, { image: buf, caption }, { quoted: msg });
        return;
      } catch {}

      // ── Fallback: respuesta en texto ──────────
      await reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃ ${clase.emoji} *${p.nombre.toUpperCase()}* ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `🎭 Clase: *${p.clase.toUpperCase()}* | ⭐ Nivel: *${p.nivel}*\n` +
        `📊 EXP: [${barra(p.exp, p.expMax)}] ${p.exp}/${p.expMax}\n\n` +
        `❤️ HP: [${barra(p.hp, p.hpMax)}] ${p.hp}/${p.hpMax}\n` +
        `⚔️ ATK: *${getTotalAtk(p)}* | 🛡️ DEF: *${getTotalDef(p)}*\n` +
        `💨 DODGE: *${calcDodge(p)}%* (SPD: ${p.spd}) | 🎯 CRIT: *${calcCrit(p)}%*\n\n` +
        `💰 Oro: *${p.oro}* | 💎 Gemas: *${p.gemas}* | 🏅 Medallas: *${p.medallas || 0}*\n` +
        (mascota ? `🐾 Mascota: *${mascota.emoji} ${mascota.nombre}*\n` : "") +
        (() => { const t = calcularTitulo(p); return t ? `🎖️ Título: *${t.emoji} ${t.nombre}*\n` : ""; })() +
        `\n━━━ EQUIPO ━━━\n` +
        `🗡️ ${arma ? (arma.calidad === "ssr" ? "🌟 *[SSR]*" : calidadTag(arma.calidad)) + " " + arma.emoji + " " + arma.nombre : "Sin arma"}\n` +
        `🛡️ ${arm  ? (arm.calidad  === "ssr" ? "🌟 *[SSR]*" : calidadTag(arm.calidad))  + " " + arm.emoji  + " " + arm.nombre  : "Sin armadura"}\n` +
        `📿 ${acc  ? calidadTag(acc.calidad)   + " " + acc.emoji  + " " + acc.nombre  : "Sin accesorio"}\n\n` +
        `━━━ STATS ━━━\n` +
        `⚔️ Batallas: ${p.stats.batallas} | 🏆 Victorias: ${p.stats.victorias}\n` +
        `🗺️ Exploraciones: ${p.stats.exploraciones} | 💀 Kills: ${p.stats.enemigosKill}\n` +
        `🎁 Drops: ${p.stats.dropsObtenidos || 0}` +
        (p.clan ? `\n🏰 Clan: *${p.clan}*` : "")
      );
    },
  },

  // ── Explorar ──────────────────────────────
  {
    name: "rpgexplorar",
    alias: ["explorar", "rpgexp"],
    description: "Explorar zona — !rpgexplorar [zona]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName}) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const zonaNombre = (args[0]||"bosque").toLowerCase();
      const zona = ZONAS[zonaNombre];
      if (!zona) return reply("❌ Zona inválida. Usa: bosque, cueva, castillo, volcan, abismo");
      if (p.nivel < zona.nivel) return reply("❌ Necesitas nivel *" + zona.nivel + "* para entrar a " + zona.nombre + ".");
      const ahora = Date.now();
      if (ahora - p.ultimaExploracion < CD_EXPLORACION) {
        const rest = Math.ceil((CD_EXPLORACION - (ahora - p.ultimaExploracion)) / 60000);
        return reply("⏳ Espera *" + rest + " min* antes de explorar de nuevo.");
      }
      if (p.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar` o una poción.");

      await react("🗺️");
      const enemigoBase = zona.enemigos[Math.floor(Math.random() * zona.enemigos.length)];
      // Aplicar multiplicador de invasión si está activo
      const invasion = getInvasion();
      const enemigo = invasion ? {
        ...enemigoBase,
        hp:  Math.floor(enemigoBase.hp  * invasion.multiplicador),
        atk: Math.floor(enemigoBase.atk * invasion.multiplicador),
        def: Math.floor(enemigoBase.def * invasion.multiplicador),
        oro: Math.floor(enemigoBase.oro * invasion.multiplicador),
        exp: Math.floor(enemigoBase.exp * invasion.multiplicador),
      } : enemigoBase;
      const resultado = simularCombate(
        { nombre: p.nombre, hp: p.hp, atk: getTotalAtk(p), def: getTotalDef(p), crit: calcCrit(p), dodge: calcDodge(p) },
        { nombre: enemigo.nombre + (invasion ? " 👿" : ""), hp: enemigo.hp, atk: enemigo.atk, def: enemigo.def, crit: invasion ? 10 : 5, dodge: 0 }
      );

      p.stats.exploraciones++;
      p.ultimaExploracion = ahora;

      if (resultado.gano) {
        p.stats.enemigosKill++;
        p.oro += enemigo.oro;
        p.hp = Math.max(1, resultado.hpRestante);
        const multXP  = getMultXP();
        const multOro = getMultOro();
        const xpGain  = Math.floor(enemigo.exp * multXP);
        // Oro general +50%, y nivel 1-10 recibe +30% adicional encima
        const multOroNivel = p.nivel <= 10 ? 1.80 : 1.50;

        // Bonus de territorio del clan
        const bonusTerr = getBonusTerritorio(p);
        const multTerrOro  = 1 + (bonusTerr.oro  || 0) + (bonusTerr.all || 0);
        const multTerrExp  = 1 + (bonusTerr.exp  || 0) + (bonusTerr.all || 0);
        const multTerrDrop = 1 + (bonusTerr.drop || 0) + (bonusTerr.all || 0);

        const oroGain = Math.floor(enemigo.oro * multOro * multOroNivel * multTerrOro);
        const bonusOroNivelTexto = p.nivel <= 10 ? " 🌱*(Bonus novato)*" : "";
        p.oro += oroGain - enemigo.oro; // ya se sumó enemigo.oro antes, ajustar diferencia
        const leveledUp = addExp(p, Math.floor(xpGain * multTerrExp));

        // Sistema de drops (con evento drop)
        const buffSuerte = (p.buffs?.suerte && p.buffs.suerte.expira > Date.now()) ? p.buffs.suerte.valor / 100 : 0;
        const multDrop = (getMultDrop() * multTerrDrop) + buffSuerte;
        const drop = calcularDrop(zonaNombre, p.nivel, multDrop);
        let dropTexto = "";
        if (drop) {
          p.inventario[drop.itemId] = (p.inventario[drop.itemId]||0) + 1;
          p.stats.dropsObtenidos = (p.stats.dropsObtenidos||0) + 1;
          dropTexto = "\n\n🎁 *¡ITEM DROPEADO!*\n" +
            calidadTag(drop.calidad) + " " + drop.item.emoji + " *" + drop.item.nombre + "*";
        }

        // Gemas con 20% de chance (1-15) — [NERF v2.5]
        if (Math.random() < 0.20) {
          const gemasExplora = Math.floor(Math.random() * 15) + 1;
          p.gemas = (p.gemas || 0) + gemasExplora;
          dropTexto += `\n💎 *+${gemasExplora} gemas*`;
        }

        savePlayer(p);
        // Progreso misión de clan
        avanzarMisionClan(sender, "exploraciones"); avanzarMisionClan(sender, "kills");
        const evTexto = [];
        if (getEventoActivo("xp"))   evTexto.push("⭐ XP x" + getMultXP());
        if (getEventoActivo("oro"))  evTexto.push("💰 Oro x" + getMultOro());
        if (getEventoActivo("drop")) evTexto.push("🎁 Drop x" + getMultDrop());
        const evBanner = evTexto.length ? "\n🌟 *EVENTO ACTIVO:* " + evTexto.join(" | ") : "";
        await reply(
          "🗺️ *" + zona.nombre + "*\n━━━━━━━━━━━━━━\n" +
          "Enemigo: " + enemigo.emoji + " *" + enemigo.nombre + "*\n\n" +
          resultado.log.join("\n") + "\n\n" +
          "🏆 *¡VICTORIA!*\n" +
          "💰 +" + oroGain + " oro" + bonusOroNivelTexto + " | ⭐ +" + xpGain + " EXP" +
          evBanner +
          "\n❤️ HP: " + p.hp + "/" + p.hpMax +
          dropTexto +
          (leveledUp ? "\n\n🎉 *¡SUBISTE AL NIVEL " + p.nivel + "!*\n❤️ HP restaurado" + (() => { const t = calcularTitulo(p); return t ? "\n🎖️ Título: " + t.emoji + " *" + t.nombre + "*" : ""; })() : "")
        );
      } else {
        p.hp = Math.floor(p.hpMax * 0.1);
        savePlayer(p);
        await reply(
          "🗺️ *" + zona.nombre + "*\n━━━━━━━━━━━━━━\n" +
          "Enemigo: " + enemigo.emoji + " *" + enemigo.nombre + "*\n\n" +
          resultado.log.join("\n") + "\n\n" +
          "💀 *¡DERROTA!*\nHP reducido al 10%.\nUsa `!rpgdescansar` o una poción."
        );
      }
    },
  },

  // ── Habilidad de clase ────────────────────
  {
    name: "rpghabilidad",
    alias: ["rpghab", "habilidad"],
    description: "Usar habilidad especial — !rpghabilidad [1/2/3]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const clase = CLASES[p.clase];
      const habs = clase.habilidades || [clase.habilidad];
      const ahora = Date.now();

      // Sin argumento → mostrar las 3 habilidades con cooldown
      if (!args[0]) {
        let texto =
          `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
          `┃  ✨ *HABILIDADES* ✨  ┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        habs.forEach((id, i) => {
          const h = HABILIDADES[id];
          if (!h) return;
          const cd = p[`habilidadUsada_${i}`] || 0;
          const resto = Math.max(0, Math.ceil((h.cooldown - (ahora - cd)) / 60000));
          const estado = resto > 0 ? `⏳ ${resto}min` : "✅ Lista";
          texto += `*${i + 1}.* ${h.emoji} *${h.nombre}*\n   _${h.desc}_\n   ${estado}\n\n`;
        });
        texto += `_Usa_ \`!rpghabilidad 1\`, \`2\` _o_ \`3\` _para activar._`;
        return reply(texto);
      }

      const idx = parseInt(args[0]) - 1;
      if (isNaN(idx) || idx < 0 || idx >= habs.length) return reply(`❌ Elige 1, 2 o 3.`);

      const habId = habs[idx];
      const hab = HABILIDADES[habId];
      if (!hab) return reply("❌ Habilidad no encontrada.");

      const cdKey = `habilidadUsada_${idx}`;
      if (ahora - (p[cdKey] || 0) < hab.cooldown) {
        const rest = Math.ceil((hab.cooldown - (ahora - p[cdKey])) / 60000);
        return reply(`⏳ *${hab.nombre}* en cooldown. Espera *${rest} min*.`);
      }
      if (p.hp <= 0) return reply("❌ Estás muerto.");

      p[cdKey] = ahora;
      // mantener compatibilidad con sistema legacy
      p.habilidadUsada = ahora;

      if (hab.tipo === "cura") {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const targetJid = mentioned[0];
        if (targetJid && targetJid !== sender) {
          const aliado = db.players[targetJid];
          if (!aliado || !aliado.clase) return reply("❌ Ese jugador no tiene personaje.");
          const cura = Math.floor(aliado.hpMax * hab.mult);
          aliado.hp = Math.min(aliado.hpMax, aliado.hp + cura);
          savePlayer(aliado);
          savePlayer(p);
          await react("💚");
          return sock.sendMessage(from, {
            text: `💚 *${hab.nombre}* (aliado)\n━━━━━━━━━━━━━━\n✨ @${sender.split("@")[0]} curó a @${targetJid.split("@")[0]}\n❤️ +${cura} HP\n❤️ HP aliado: ${aliado.hp}/${aliado.hpMax}`,
            mentions: [sender, targetJid],
          }, { quoted: msg });
        }
        const cura = Math.floor(p.hpMax * hab.mult);
        p.hp = Math.min(p.hpMax, p.hp + cura);
        savePlayer(p);
        await react("💚");
        return reply(`💚 *${hab.nombre}*\n━━━━━━━━━━━━━━\n❤️ +${cura} HP\n❤️ HP: ${p.hp}/${p.hpMax}`);
      }

      if (hab.tipo === "escudo") {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const targetJid = mentioned[0];
        if (targetJid && targetJid !== sender) {
          const aliado = db.players[targetJid];
          if (!aliado || !aliado.clase) return reply("❌ Ese jugador no tiene personaje.");
          aliado.escudoActivo = true;
          savePlayer(aliado);
          savePlayer(p);
          await react("🛡️");
          return sock.sendMessage(from, {
            text: `🛡️ *${hab.nombre}* (aliado)\n━━━━━━━━━━━━━━\n✨ @${sender.split("@")[0]} protegió a @${targetJid.split("@")[0]}\n🛡️ El próximo ataque que reciba será bloqueado.`,
            mentions: [sender, targetJid],
          }, { quoted: msg });
        }
        p.escudoActivo = true;
        savePlayer(p);
        await react("🛡️");
        return reply(`🛡️ *${hab.nombre}*\n━━━━━━━━━━━━━━\nEl próximo ataque que recibas será bloqueado.`);
      }

      if (hab.tipo === "revivir") {
        if (p._resurreccionUsada) return reply("❌ *Resurrección Oscura* ya fue usada en este combate.\nSolo puede activarse una vez. Espera a morir o reinicia en batalla.");
        p._resurreccionActiva = true;
        savePlayer(p);
        await react("🧟");
        return reply(`🧟 *${hab.nombre}*\n━━━━━━━━━━━━━━\n☠️ La próxima vez que caigas en combate, resucitarás con el 30% de HP.\n_Solo una vez por batalla._`);
      }

      // Daño, crítico, multi, drenar → buff para el siguiente ataque
      p.buffHabilidad = { tipo: hab.tipo, mult: hab.mult, nombre: hab.nombre, emoji: hab.emoji, expira: ahora + 60000 };
      savePlayer(p);
      avanzarMisionClan(sender, "habilidad");
      await react(hab.emoji);
      await reply(
        `${hab.emoji} *${hab.nombre}*\n━━━━━━━━━━━━━━\n${hab.desc}\n\n⚡ Buff activo por 60 segundos.\nUsa \`!rpgataccar @usuario\` para aplicarlo.`
      );
    },
  },

  // ── Curar aliado (sacerdote) ──────────────
  {
    name: "rpgcurar",
    alias: ["curar", "rpgheal"],
    description: "Cura a un aliado (solo sacerdote) — !rpgcurar @usuario",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, sock, from, pushName}) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (p.clase !== "sacerdote") return reply("❌ Solo el *Sacerdote* puede curar aliados.");
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned[0]) return reply("👤 Menciona a quien curar. Ej: `!rpgcurar @usuario`");
      const target = mentioned[0];
      const aliado = db.players[target];
      if (!aliado || !aliado.clase) return reply("❌ Ese jugador no tiene personaje.");
      if (p.hp <= 20) return reply("❌ Necesitas al menos 20 HP para curar.");

      const cura = Math.floor(aliado.hpMax * 0.40);
      aliado.hp = Math.min(aliado.hpMax, aliado.hp + cura);
      p.hp = Math.max(1, p.hp - 10); // curar cuesta HP al sacerdote
      savePlayer(aliado);
      savePlayer(p);
      await react("💚");
      await sock.sendMessage(from, {
        text: "💚 *SANACIÓN*\n━━━━━━━━━━━━━━\n✨ @" + sender.split("@")[0] + " curó a @" + target.split("@")[0] + "\n❤️ +" + cura + " HP\n❤️ HP aliado: " + aliado.hp + "/" + aliado.hpMax,
        mentions: [sender, target],
      }, { quoted: msg });
    },
  },

  // ── Descansar ─────────────────────────────
  {
    name: "rpgdescansar",
    alias: ["descansar", "rpgrest"],
    description: "Recuperar HP automáticamente — +10% HP/min hasta full",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, from, msg, pushName}) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");

      // Ya descansando
      if (p.descansandoEn) {
        const minPasados = Math.floor((Date.now() - p.descansandoEn) / 60000);
        return reply(
          "😴 *Ya estás descansando...*\n" +
          "━━━━━━━━━━━━━━\n" +
          "❤️ HP: " + p.hp + "/" + p.hpMax + "\n" +
          "⏳ Descansando hace *" + minPasados + " min*\n" +
          "_Te avisaré cuando tengas la vida completa._"
        );
      }

      if (p.hp >= p.hpMax) return reply("❤️ Ya tienes la vida al máximo!");

      const minsRestantes = Math.ceil(((p.hpMax - p.hp) / p.hpMax) / 0.10);
      p.descansandoEn   = Date.now();
      p.descansandoFrom = from;
      savePlayer(p);
      await react("😴");
      await reply(
        "😴 *DESCANSANDO...*\n" +
        "━━━━━━━━━━━━━━\n" +
        "❤️ HP: " + p.hp + "/" + p.hpMax + "\n" +
        "💊 Regenerando *+10% HP* por minuto\n" +
        "⏳ Estimado: ~*" + minsRestantes + " min* para vida completa\n\n" +
        "_Te notificaremos cuando estés al 100%._"
      );
    },
  },

  // ── PvP ───────────────────────────────────
  {
    name: "rpgataccar",
    alias: ["rpgpvp", "rpgatacar"],
    description: "Atacar jugador — !rpgataccar @usuario",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, sock, from, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const rival = mentioned[0];
      if (!rival) return reply("❌ Menciona a alguien. Ej: `!rpgataccar @usuario`");
      if (rival === sender) return reply("❌ No puedes atacarte a ti mismo.");
      const p1 = getPlayer(sender, pushName || msg?.pushName || null);
      const p2 = db.players[rival];
      if (!p1.clase) return reply("❌ Sin personaje.");
      if (!p2?.clase) return reply("❌ Ese jugador no tiene personaje.");
      // 🛡️ Protección divina — owners
      if (await _checkDiosProteccion(sender, rival, p1, sock, from, msg, reply)) return;
      if (p1.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar`.");
      if (p2.hp <= 0) return reply("❌ Ese jugador ya está muerto.");
      if (p1.afk) return reply("😴 Estás en modo AFK. Usa `!rpgafk off` primero.");
      if (p2.afk) return reply("🛡️ Ese jugador está AFK y no puede ser atacado.");
      // 🛡️ Protección nivel 5: jugadores bajo nivel 5 no pueden ser atacados
      if (p2.nivel < 5) return reply(`🛡️ *${p2.nombre}* está protegido/a.\nLos jugadores de nivel 1-4 no pueden ser atacados.`);
      // 🛡️ Protección nivel 5-9: no atacables por jugadores 20+ niveles por encima
      if (p2.nivel < 10 && p1.nivel >= p2.nivel + 20) return reply(`🛡️ *${p2.nombre}* está protegido/a.\nNo puedes atacar a jugadores tan por debajo de tu nivel.`);

      // Cooldown 3 minutos
      const PVP_CD = 3 * 60 * 1000;
      const ahoraPvp = Date.now();
      if (ahoraPvp - (p1.pvpCd || 0) < PVP_CD) {
        const segs = Math.ceil((PVP_CD - (ahoraPvp - p1.pvpCd)) / 1000);
        const txt = segs < 60 ? `${segs}s` : `${Math.ceil(segs/60)} min`;
        return reply(`⏳ Espera *${txt}* para volver a atacar.`);
      }
      p1.pvpCd = ahoraPvp;
      savePlayer(p1);

      // Aplicar buff de habilidad si está activo
      let atkFinal = getTotalAtk(p1);
      let buffTexto = "";
      if (p1.buffHabilidad && Date.now() < p1.buffHabilidad.expira) {
        const buff = p1.buffHabilidad;
        if (buff.tipo === "critico") atkFinal = Math.floor(atkFinal * buff.mult);
        if (buff.tipo === "dano")    atkFinal = Math.floor(atkFinal * buff.mult);
        if (buff.tipo === "multi")   atkFinal = Math.floor(atkFinal * 2.5); // 3 ataques simulados
        if (buff.tipo === "drenar")  atkFinal = Math.floor(atkFinal * buff.mult);
        buffTexto = "\n" + buff.emoji + " *¡" + buff.nombre + " activado!*";
        p1.buffHabilidad = null;
      }

      await react("⚔️");
      const resultado = simularCombate(
        { nombre: p1.nombre, hp: p1.hp, atk: atkFinal, def: getTotalDef(p1), crit: calcCrit(p1), dodge: calcDodge(p1) },
        { nombre: p2.nombre, hp: p2.hp, atk: getTotalAtk(p2), def: getTotalDef(p2), crit: calcCrit(p2), dodge: calcDodge(p2) }
      );

      p1.stats.batallas++; p2.stats.batallas++;
      // 💰 Bonus de oro para nivel 10+: roban 15% en lugar del 8%
      const pctRobo = p1.nivel >= 10 ? 0.15 : 0.08;
      const oroRobo = Math.floor(p2.oro * pctRobo);
      const bonusOroTexto = p1.nivel >= 10 ? " 💰 *(Bonus Nv.10+)*" : "";

      if (resultado.gano) {
        p1.stats.victorias++;
        p1.hp = Math.max(1, resultado.hpRestante);
        p2.hp = Math.floor(p2.hpMax * 0.1);
        p1.oro += oroRobo; p2.oro = Math.max(0, p2.oro - oroRobo);
        addExp(p1, 60);
        savePlayer(p1); savePlayer(p2);
        avanzarMisionClan(sender, "pvp");
        await sock.sendMessage(from, {
          text: "⚔️ *BATALLA PVP*\n━━━━━━━━━━━━━━\n" +
            "@" + sender.split("@")[0] + " vs @" + rival.split("@")[0] +
            buffTexto + "\n\n" +
            resultado.log.join("\n") + "\n\n" +
            "🏆 *¡@" + sender.split("@")[0] + " GANÓ!*\n💰 Robó " + oroRobo + " oro" + bonusOroTexto + " | ⭐ +60 EXP",
          mentions: [sender, rival],
        }, { quoted: msg });
      } else {
        // ── Resurrección Oscura (No-Muerto) ──
        if (p1._resurreccionActiva && !p1._resurreccionUsada) {
          p1._resurreccionActiva = false;
          p1._resurreccionUsada = true;
          p1.hp = Math.max(1, Math.floor(p1.hpMax * 0.3));
          p2.hp = Math.max(1, resultado.hpRestante);
          savePlayer(p1); savePlayer(p2);
          await sock.sendMessage(from, {
            text: "⚔️ *BATALLA PVP*\n━━━━━━━━━━━━━━\n" +
              "@" + sender.split("@")[0] + " vs @" + rival.split("@")[0] +
              buffTexto + "\n\n" +
              resultado.log.join("\n") + "\n\n" +
              "🧟 *¡RESURRECCIÓN OSCURA!* @" + sender.split("@")[0] + " resucita con " + p1.hp + " HP!\n" +
              "⚠️ La batalla continúa... usa `!rpgataccar` de nuevo.",
            mentions: [sender, rival],
          }, { quoted: msg });
          return;
        }
        p2.stats.victorias++;
        p1._resurreccionUsada = false;
        p1.hp = Math.floor(p1.hpMax * 0.1);
        p2.hp = Math.max(1, resultado.hpRestante);
        savePlayer(p1); savePlayer(p2);
        await sock.sendMessage(from, {
          text: "⚔️ *BATALLA PVP*\n━━━━━━━━━━━━━━\n" +
            "@" + sender.split("@")[0] + " vs @" + rival.split("@")[0] + "\n\n" +
            resultado.log.join("\n") + "\n\n" +
            "💀 *@" + sender.split("@")[0] + " fue derrotado.*",
          mentions: [sender, rival],
        }, { quoted: msg });
      }
    },
  },

  // ── Duelo con apuesta ─────────────────────
  {
    name: "rpgduelo",
    alias: ["duelo"],
    description: "Duelo con apuesta — !rpgduelo @usuario [oro]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, sock, from, args, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const rival = mentioned[0];
      const apuesta = parseInt(args[0]) || 0;
      if (!rival) return reply("❌ Menciona al rival. Ej: `!rpgduelo @usuario 200`");
      if (rival === sender) return reply("❌ No puedes duelarte contigo mismo.");
      const p1 = getPlayer(sender, pushName || msg?.pushName || null);
      const p2 = db.players[rival];
      if (!p1.clase) return reply("❌ Sin personaje.");
      if (!p2?.clase) return reply("❌ Ese jugador no tiene personaje.");
      if (p1.hp <= 0 || p2.hp <= 0) return reply("❌ Ambos deben tener HP para duelar.");
      if (p1.afk) return reply("😴 Estás en modo AFK. Usa `!rpgafk off` primero.");
      if (p2.afk) return reply("🛡️ Ese jugador está AFK y no puede duelar.");
      // 🛡️ Protección nivel 5: jugadores de nivel 1-4 no pueden ser retados a duelo
      if (p2.nivel < 5) return reply(`🛡️ *${p2.nombre}* está protegido/a.\nLos jugadores de nivel 1-4 no pueden ser atacados.`);

      // Cooldown 3 minutos
      const DUELO_CD = 3 * 60 * 1000;
      const ahoraDuelo = Date.now();
      if (ahoraDuelo - (p1.dueloCd || 0) < DUELO_CD) {
        const segs = Math.ceil((DUELO_CD - (ahoraDuelo - p1.dueloCd)) / 1000);
        const txt = segs < 60 ? `${segs}s` : `${Math.ceil(segs/60)} min`;
        return reply(`⏳ Espera *${txt}* para volver a duelar.`);
      }
      p1.dueloCd = ahoraDuelo;
      savePlayer(p1);

      if (apuesta > 0) {
        if (p1.oro < apuesta) return reply("❌ No tienes " + apuesta + " oro para apostar.");
        if (p2.oro < apuesta) return reply("❌ Tu rival no tiene suficiente oro.");
      }

      await react("⚔️");
      const resultado = simularCombate(
        { nombre: p1.nombre, hp: p1.hp, atk: getTotalAtk(p1), def: getTotalDef(p1), crit: p1.crit, dodge: calcDodge(p1) },
        { nombre: p2.nombre, hp: p2.hp, atk: getTotalAtk(p2), def: getTotalDef(p2), crit: calcCrit(p2), dodge: calcDodge(p2) }
      );

      p1.stats.batallas++; p2.stats.batallas++;
      const ganador = resultado.gano ? p1 : p2;
      const perdedor = resultado.gano ? p2 : p1;
      if (apuesta > 0) {
        ganador.oro += apuesta;
        perdedor.oro = Math.max(0, perdedor.oro - apuesta);
      }
      ganador.stats.victorias++;
      ganador.hp = Math.max(1, resultado.hpRestante);
      perdedor.hp = Math.floor(perdedor.hpMax * 0.15);
      addExp(ganador, 80);
      savePlayer(p1); savePlayer(p2);

      await sock.sendMessage(from, {
        text: "🏆 *DUELO OFICIAL*\n━━━━━━━━━━━━━━\n" +
          "@" + sender.split("@")[0] + " ⚔️ @" + rival.split("@")[0] +
          (apuesta > 0 ? "\n💰 Apuesta: *" + apuesta + " oro*" : "") + "\n\n" +
          resultado.log.join("\n") + "\n\n" +
          "🏆 *¡@" + ganador.nombre + " GANÓ!*\n" +
          (apuesta > 0 ? "💰 Gana " + apuesta + " oro\n" : "") +
          "⭐ +80 EXP",
        mentions: [sender, rival],
      }, { quoted: msg });
    },
  },

  // ── Inventario ────────────────────────────
  {
    name: "rpginventario",
    alias: ["rpginv"],
    description: "Ver inventario",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName}) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      await react("🎒");
      const items = Object.entries(p.inventario).filter(([,c]) => c > 0);
      if (!items.length) return reply("🎒 *INVENTARIO*\n━━━━━━━━━━━━━━\nVacío. Explora para obtener drops o compra en `!rpgtienda`.");

      // Contar por categoría
      let armas = 0, armaduras = 0, mascotas = 0, pociones = 0, otros = 0;
      for (const [id, cant] of items) {
        const item = TIENDA[id];
        if (!item) {
          if (id.startsWith("ssr_mascota_") || id.startsWith("mascota_")) mascotas += cant;
          else if (id.startsWith("ssr_")) armas += cant;
          else otros += cant;
          continue;
        }
        if (item.tipo === "arma") armas += cant;
        else if (item.tipo === "armadura") armaduras += cant;
        else if (item.tipo === "pocion") pociones += cant;
        else if (item.tipo === "mascota") mascotas += cant;
        else otros += cant;
      }

      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃        🎒  *INVENTARIO*        ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n" +
        `🗡️ Arma equipada: ${p.equipo.arma ? ((TIENDA[p.equipo.arma] || TIENDA_CLASE[p.equipo.arma] || (p._ssrItems && p._ssrItems[p.equipo.arma]))?.nombre || p.equipo.arma) : "Ninguna"}\n` +
        `🛡️ Armadura equipada: ${p.equipo.armadura ? ((TIENDA[p.equipo.armadura] || TIENDA_CLASE[p.equipo.armadura] || (p._ssrItems && p._ssrItems[p.equipo.armadura]))?.nombre || p.equipo.armadura) : "Ninguna"}\n` +
        `📿 Accesorio equipado: ${p.equipo.accesorio ? (TIENDA[p.equipo.accesorio]?.nombre || p.equipo.accesorio) : "Ninguno"}\n` +
        "━━━━━━━━━━━━━━\n" +
        `⚔️ Armas: *${armas}* | 🛡️ Armaduras: *${armaduras}*\n` +
        `🐾 Mascotas: *${mascotas}* | 🧪 Pociones: *${pociones}*\n` +
        `🔵 Orbe Azul: *${p.inventario["orbe_azul"]||0}* | 🟡 Orbe Dorado: *${p.inventario["orbe_dorado"]||0}*\n` +
        "━━━━━━━━━━━━━━\n" +
        "│ `!invarmas` — Ver armas\n" +
        "│ `!invarmaduras` — Ver armaduras\n" +
        "│ `!invmascotas` — Ver mascotas y sus stats\n" +
        "│ `!invpociones` — Ver pociones\n" +
        "╰──────────────────────⬣"
      );
    },
  },

  {
    name: "invarmas",
    alias: ["invarm", "misarmas"],
    description: "Ver armas en inventario con stats",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      await react("⚔️");
      const lineas = [];
      for (const [id, cant] of Object.entries(p.inventario)) {
        if (cant <= 0) continue;
        let item = TIENDA[id];
        if (item && item.tipo !== "arma") continue;
        if (!item && id.startsWith("ssr_") && !id.startsWith("ssr_mascota_")) {
          const baseId = id.replace("ssr_", "");
          item = (p._ssrItems && p._ssrItems[id]) || ARMAS_SSR[baseId];
          if (item) {
            const eq = p.equipo.arma === id ? " ✅" : "";
            lineas.push(`│ 🌟 *[SSR]* ${item.emoji} *${item.nombre}*${eq}\n│   ⚔️ ATK +${item.atk||item.bonus?.atk||0} | 🛡️ DEF +${item.atk||item.bonus?.def||0}\n│   ID: \`${id}\``);
          }
          continue;
        }
        if (!item) continue;
        const cal = CALIDAD[item.calidad];
        const eq = p.equipo.arma === id ? " ✅" : "";
        lineas.push(`│ ${cal.emoji} *[${cal.nombre}]* ${item.emoji} *${item.nombre}*${eq} x${cant}\n│   ⚔️ ATK +${item.atk||0} | 🛡️ DEF +${item.def||0} | Nv.${item.nivelReq}+\n│   ID: \`${id}\``);
      }
      if (!lineas.length) return reply("⚔️ No tienes armas en el inventario.");
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃      ⚔️  *MIS ARMAS*      ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n" +
        lineas.join("\n│\n") + "\n" +
        "╰──────────────────────⬣\n" +
        "_✅ = equipada | Equipa: `!rpgequipar [id]`_"
      );
    },
  },

  {
    name: "invarmaduras",
    alias: ["invarmad", "misarmaduras"],
    description: "Ver armaduras en inventario con stats",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      await react("🛡️");
      const lineas = [];
      for (const [id, cant] of Object.entries(p.inventario)) {
        if (cant <= 0) continue;
        const item = TIENDA[id];
        if (!item || item.tipo !== "armadura") continue;
        const cal = CALIDAD[item.calidad];
        const eq = p.equipo.armadura === id ? " ✅" : "";
        lineas.push(`│ ${cal.emoji} *[${cal.nombre}]* ${item.emoji} *${item.nombre}*${eq} x${cant}\n│   🛡️ DEF +${item.def||0} | ⚔️ ATK +${item.atk||0} | Nv.${item.nivelReq}+\n│   ID: \`${id}\``);
      }
      if (!lineas.length) return reply("🛡️ No tienes armaduras en el inventario.");
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃      🛡️  *MIS ARMADURAS*      ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n" +
        lineas.join("\n│\n") + "\n" +
        "╰──────────────────────⬣\n" +
        "_✅ = equipada | Equipa: `!rpgequipar [id]`_"
      );
    },
  },

  {
    name: "invmascotas",
    alias: ["mismascota", "mismascotas", "invmascota"],
    description: "Ver mascotas en inventario con stats",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      await react("🐾");
      const lineas = [];
      for (const [id, cant] of Object.entries(p.inventario)) {
        if (cant <= 0) continue;
        const eq = p.mascota === id ? " ✅" : "";
        // SSR mascota banner
        if (id.startsWith("ssr_mascota_")) {
          const datos = (p._ssrMascotas && p._ssrMascotas[id]);
          if (datos) {
            const nv = datos.nivel || 1;
            lineas.push(
              `│ 🌟 *[SSR]* ${datos.emoji} *${datos.nombre}*${eq}\n` +
              `│   ⭐ Nv.${nv} | ⚔️ ATK +${datos.bonus?.atk||0} | 🛡️ DEF +${datos.bonus?.def||0} | 🎯 CRIT +${datos.bonus?.crit||0}%\n` +
              `│   ID: \`${id}\``
            );
          }
          continue;
        }
        // Mascota normal
        if (id.startsWith("mascota_")) {
          const baseId = id.replace("mascota_", "");
          const m = MASCOTAS[baseId];
          if (m) {
            lineas.push(
              `│ 🐾 *[R]* ${m.emoji} *${m.nombre}*${eq}\n` +
              `│   ⚔️ ATK +${m.bonus?.atk||0} | 🛡️ DEF +${m.bonus?.def||0} | 🎯 CRIT +${m.bonus?.crit||0}%\n` +
              `│   💡 ${m.desc}\n` +
              `│   ID: \`${id}\``
            );
          }
          continue;
        }
        // Mascota de tienda
        const item = TIENDA[id];
        if (item && item.tipo === "mascota") {
          const m = MASCOTAS[id.replace("mascota_","")];
          lineas.push(
            `│ 🐾 ${item.emoji} *${item.nombre}*${eq} x${cant}\n` +
            `│   ⚔️ ATK +${m?.bonus?.atk||0} | 🛡️ DEF +${m?.bonus?.def||0} | 🎯 CRIT +${m?.bonus?.crit||0}%\n` +
            `│   ID: \`${id}\``
          );
        }
      }
      // Mascotas SSR en _ssrMascotas que no estén en inventario también
      if (p._ssrMascotas) {
        for (const [id, datos] of Object.entries(p._ssrMascotas)) {
          if (p.inventario[id] > 0) continue; // ya procesada
          const eq = p.mascota === id ? " ✅" : "";
          const nv = datos.nivel || 1;
          lineas.push(
            `│ 🌟 *[SSR]* ${datos.emoji} *${datos.nombre}*${eq}\n` +
            `│   ⭐ Nv.${nv} | ⚔️ ATK +${datos.bonus?.atk||0} | 🛡️ DEF +${datos.bonus?.def||0} | 🎯 CRIT +${datos.bonus?.crit||0}%\n` +
            `│   ID: \`${id}\``
          );
        }
      }
      if (!lineas.length) return reply("🐾 No tienes mascotas.\nObtén una en `!gachamascota` o comprando en `!rpgtienda`.");
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃      🐾  *MIS MASCOTAS*      ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n" +
        lineas.join("\n│\n") + "\n" +
        "╰──────────────────────⬣\n" +
        "_✅ = equipada | Equipa: `!rpgmascota equipar [id]`_"
      );
    },
  },

  {
    name: "invpociones",
    alias: ["mispociones", "invpocion"],
    description: "Ver pociones en inventario",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      await react("🧪");
      const lineas = [];
      for (const [id, cant] of Object.entries(p.inventario)) {
        if (cant <= 0) continue;
        const item = TIENDA[id];
        if (!item || (item.tipo !== "pocion" && item.tipo !== "pocion_buff")) continue;
        const cal = CALIDAD[item.calidad];
        const efectoTexto = item.tipo === "pocion_buff"
          ? item.desc
          : (item.hp >= 9999 ? "Cura HP completo" : "❤️ +" + item.hp + " HP");
        lineas.push(`│ ${cal.emoji} *[${cal.nombre}]* ${item.emoji} *${item.nombre}* x${cant}\n│   ${efectoTexto}\n│   Usa: \`!rpgusar ${id}\``);
      }
      if (!lineas.length) return reply("🧪 No tienes pociones.\nCompra en `!rpgtienda`.");
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃      🧪  *MIS POCIONES*      ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n" +
        lineas.join("\n│\n") + "\n" +
        "╰──────────────────────⬣\n" +
        `_❤️ HP actual: ${p.hp}/${p.hpMax}_`
      );
    },
  },

  // ── Tienda ────────────────────────────────
  {
    name: "rpgtienda",
    alias: ["tienda"],
    description: "Ver tienda — !rpgtienda [calidad]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName}) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      await react("🛒");
      const filtro = (args[0]||"").toLowerCase();
      const calidades = ["n","r","sr","ssr","ur"];
      const calidadMap = { n:"comun", r:"raro", sr:"epico", ssr:"legendario", ur:"mitico" };
      if (filtro && !calidades.includes(filtro)) {
        return reply("❌ Rareza inválida.\nOpciones: n, r, sr, ssr, ur");
      }
      const filtroReal = filtro ? calidadMap[filtro] : null;

      const fmt = ([id, v]) => {
        const cal = CALIDAD[v.calidad];
        return "│ `" + id + "` " + cal.emoji + " " + v.emoji + " *" + v.nombre + "* — " + v.precio + "💰 (Nv." + v.nivelReq + "+)";
      };

      const tipos = ["arma","armadura","accesorio","pocion","pocion_buff"];
      let texto = "🛒 *TIENDA RPG*\n━━━━━━━━━━━━━━\n💰 Tu oro: *" + p.oro + "*\n\n";

      for (const tipo of tipos) {
        let items = Object.entries(TIENDA).filter(([,v]) => v.tipo === tipo);
        if (filtroReal) items = items.filter(([,v]) => v.calidad === filtroReal);
        if (!items.length) continue;
        const emojis = { arma:"⚔️", armadura:"🛡️", accesorio:"📿", pocion:"🧪", pocion_buff:"✨" };
        texto += emojis[tipo] + " *" + tipo.toUpperCase() + "S*\n" + items.map(fmt).join("\n") + "\n\n";
      }

      // Siempre mostrar sección de Orbes
      if (!filtroReal || filtroReal === "raro" || filtroReal === "legendario") {
        texto += "🔵🟡 *ORBES DE MEJORA*\n" +
          "│ `orbe_azul` 🔵 *Orbe Azul* — 300💰 | Mejora stats del personaje\n" +
          "│ `orbe_dorado` 🟡 *Orbe Dorado* — 600💰 | Mejora arma/armadura\n\n";
      }
      texto += "Compra: `!rpgcomprar [id]`\nFiltrar: `!rpgtienda [n/r/sr/ssr/ur]`\nMejorar: `!rpgmejorar` / `!rpgmejorarequipo`";
      await reply(texto);
    },
  },

  // ── Comprar ───────────────────────────────
  {
    name: "rpgcomprar",
    alias: ["rpgbuy"],
    description: "Comprar item — !rpgcomprar [id] [cantidad]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName}) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const itemId = (args[0]||"").toLowerCase();
      // Buscar en TIENDA general y en TIENDA_CLASE
      const item = TIENDA[itemId] || TIENDA_CLASE[itemId];
      if (!item) return reply("❌ Item no existe. Usa `!rpgtienda` para ver el catálogo.");
      // Verificar restricción de clase
      if (item.clase && item.clase !== p.clase) {
        const claseNombre = item.clase.charAt(0).toUpperCase() + item.clase.slice(1);
        return reply("❌ *" + item.emoji + " " + item.nombre + "* es exclusivo para la clase *" + claseNombre + "*\nTu clase es *" + p.clase + "*. Usa `!rpgtienda` para ver tu tienda.");
      }
      if (p.nivel < (item.nivelReq||1)) return reply("❌ Necesitas nivel *" + item.nivelReq + "* para comprar este item.");

      // Cantidad (x1/x5/x10 solo para pociones y orbes)
      const tiposMulti = ["pocion", "pocion_buff", "orbe_stat", "orbe_equipo"];
      const cantidadRaw = parseInt(args[1]) || 1;
      let cantidad = 1;
      if (tiposMulti.includes(item.tipo)) {
        if (![1, 5, 10].includes(cantidadRaw)) {
          return reply("❌ Cantidad inválida. Para pociones y orbes puedes comprar: *x1, x5 o x10*\nEj: `!rpgcomprar orbe_azul 5`");
        }
        cantidad = cantidadRaw;
      }

      const costoTotal = item.precio * cantidad;
      if (p.oro < costoTotal) {
        const falta = costoTotal - p.oro;
        return reply(
          "❌ No tienes oro suficiente.\n" +
          "💰 Precio x" + cantidad + ": *" + costoTotal + "*\n" +
          "💰 Tienes: *" + p.oro + "*\n" +
          "💸 Te faltan: *" + falta + "*"
        );
      }

      p.oro -= costoTotal;
      p.inventario[itemId] = (p.inventario[itemId]||0) + cantidad;
      savePlayer(p);
      await react("✅");

      if (cantidad > 1) {
        await reply(
          "✅ Compraste *x" + cantidad + "* " + calidadTag(item.calidad) + " " + item.emoji + " *" + item.nombre + "*\n" +
          "💰 Costo total: *" + costoTotal + "* (" + item.precio + " c/u)\n" +
          "💰 Oro restante: *" + p.oro + "*\n" +
          "🎒 Tienes ahora: *" + p.inventario[itemId] + "* en inventario"
        );
      } else {
        await reply("✅ Compraste " + calidadTag(item.calidad) + " " + item.emoji + " *" + item.nombre + "* por " + item.precio + "💰\n💰 Restante: " + p.oro);
      }
    },
  },

  // ── Usar poción ───────────────────────────
  {
    name: "rpgusar",
    alias: ["rpguse"],
    description: "Usar poción — !rpgusar [id]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName}) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const itemId = (args[0]||"").toLowerCase();
      const item = TIENDA[itemId];
      if (!item || (item.tipo !== "pocion" && item.tipo !== "pocion_buff"))
        return reply("❌ Solo puedes usar pociones. Ej: `!rpgusar pocion_fuerza`");
      if (!p.inventario[itemId] || p.inventario[itemId] <= 0) return reply("❌ No tienes ese item.");

      const HORA = 60 * 60 * 1000;

      // ── Poción de HP ──
      if (item.tipo === "pocion") {
        const cura = Math.min(item.hp, p.hpMax - p.hp);
        p.hp = Math.min(p.hpMax, p.hp + item.hp);
        p.inventario[itemId]--;
        savePlayer(p);
        await react("💊");
        return reply("💊 Usaste *" + item.emoji + " " + item.nombre + "*\n❤️ +" + cura + " HP\n❤️ HP: " + p.hp + "/" + p.hpMax);
      }

      // ── Pociones de buff ──
      if (!p.buffs) p.buffs = {};
      const buffActivo = p.buffs[item.buff];
      if (buffActivo && buffActivo.expira > Date.now())
        return reply("⚠️ Ya tienes activo un buff de *" + item.buff + "*. Espera a que expire.");

      const expira = Date.now() + HORA;
      p.buffs[item.buff] = { valor: item.valor, expira };

      // Buff de vida: aumentar hpMax
      if (item.buff === "vida") {
        p.hpMax += item.valor;
        p.hp = Math.min(p.hp + item.valor, p.hpMax);
        p.buffs[item.buff].hpMaxBonus = item.valor;
      }

      p.inventario[itemId]--;
      savePlayer(p);
      await react("✨");
      return reply(
        "✨ Usaste *" + item.emoji + " " + item.nombre + "*\n" +
        "⚡ *" + item.desc + "*\n" +
        "⏱️ Duración: *60 minutos*\n" +
        "_El efecto aplica automáticamente en combate y exploración._"
      );
    },
  },

  // ── Vender item ──────────────────────────────
  {
    name: "rpgvender",
    alias: ["rpgsell", "vender"],
    description: "Vender item del inventario — !rpgvender [id] [cantidad]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");

      const itemId = (args[0] || "").toLowerCase();

      if (!itemId) {
        await react("💰");
        const items = Object.entries(p.inventario).filter(([, c]) => c > 0);
        if (!items.length) return reply("🎒 Tu inventario está vacío.");
        const lista = items.map(([id, cant]) => {
          const item = TIENDA[id];
          if (!item) return null;
          const precioVenta = Math.floor(item.precio * 0.4);
          return "│ `" + id + "` " + item.emoji + " *" + item.nombre + "* x" + cant + " → " + precioVenta + "💰 c/u";
        }).filter(Boolean).join("\n");
        if (!lista) return reply("❌ No tienes items vendibles.");
        return reply(
          "💰 *VENDER ITEMS*\n━━━━━━━━━━━━━━\n" +
          "_Se paga el 40% del precio de tienda_\n\n" +
          lista + "\n\n" +
          "Ej: `!rpgvender espada_hierro` → vende 1\n" +
          "Ej: `!rpgvender pocion_menor 5` → vende 5\n" +
          "Ej: `!rpgvender pocion_menor all` → vende todo"
        );
      }

      const item = TIENDA[itemId];
      if (!item) return reply("❌ Item no reconocido. Usa `!rpgvender` para ver tu inventario.");
      if (!p.inventario[itemId] || p.inventario[itemId] <= 0) return reply("❌ No tienes *" + item.nombre + "* en tu inventario.");

      if (p.equipo.arma === itemId || p.equipo.armadura === itemId || p.equipo.accesorio === itemId) {
        return reply("❌ No puedes vender un item equipado. Desequípalo primero.");
      }

      const cantDisponible = p.inventario[itemId];
      const cantArg = (args[1] || "1").toLowerCase();
      const cantidad = cantArg === "all" ? cantDisponible : Math.min(parseInt(cantArg) || 1, cantDisponible);

      if (cantidad <= 0) return reply("❌ Cantidad inválida.");

      const precioVenta = Math.floor(item.precio * 0.4);
      const totalOro = precioVenta * cantidad;

      p.inventario[itemId] -= cantidad;
      p.oro += totalOro;
      savePlayer(p);

      await react("💰");
      await reply(
        "💰 *VENTA EXITOSA*\n━━━━━━━━━━━━━━\n" +
        item.emoji + " *" + item.nombre + "* x" + cantidad + "\n" +
        "💰 +" + totalOro + " oro (" + precioVenta + " c/u)\n" +
        "💰 Total en caja: *" + p.oro + "*"
      );
    },
  },

    // ── Equipar ───────────────────────────────
  {
    name: "rpgequipar",
    alias: ["rpgequip"],
    description: "Equipar item — !rpgequipar [id]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName}) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const itemId = (args[0]||"").toLowerCase();

      // Resolver el item: tienda normal, tienda clase, SSR arma gacha, SSR armadura banner, o item especial torre
      let item = TIENDA[itemId] || TIENDA_CLASE[itemId];
      let esSSR = false;
      if (!item) {
        // Buscar en _ssrItems (incluye armadura_astaroth y cualquier SSR)
        item = (p._ssrItems && p._ssrItems[itemId]) || null;
        if (item) esSSR = true;
      }
      if (!item && itemId.startsWith("ssr_") && !itemId.startsWith("ssr_mascota_")) {
        const baseId = itemId.replace("ssr_", "");
        item = ARMAS_SSR[baseId] || null;
        esSSR = !!item;
      }

      if (!item || item.tipo === "pocion" || item.tipo === "orbe_stat" || item.tipo === "orbe_equipo") return reply("❌ Ese item no se puede equipar.\n_Usa el ID exacto, ej: `armadura_astaroth`_");
      if (!p.inventario[itemId] || p.inventario[itemId] <= 0) return reply("❌ No tienes ese item en tu inventario.");
      if (p.nivel < (item.nivelReq||1)) return reply("❌ Necesitas nivel *" + item.nivelReq + "* para equipar esto.");
      if (item.tipo === "arma")      p.equipo.arma = itemId;
      if (item.tipo === "armadura")  p.equipo.armadura = itemId;
      if (item.tipo === "accesorio") p.equipo.accesorio = itemId;
      savePlayer(p);
      await react("⚔️");
      const tag = esSSR ? "🌟 *[SSR]*" : calidadTag(item.calidad);
      await reply(
        "✅ Equipaste " + tag + " " + item.emoji + " *" + item.nombre + "*\n" +
        "⚔️ ATK total: " + getTotalAtk(p) + " | 🛡️ DEF total: " + getTotalDef(p)
      );
    },
  },

  // ── Desequipar ───────────────────────────────
  {
    name: "rpgdesequipar",
    alias: ["rpgdesequip", "desequipar", "desequiparmascota"],
    description: "Desequipar arma, armadura, accesorio o mascota — !rpgdesequipar [arma/armadura/accesorio/mascota/todo]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const slot = (args[0] || "").toLowerCase();
      const slots = ["arma", "armadura", "accesorio", "mascota", "todo"];
      if (!slot || !slots.includes(slot)) {
        return reply(
          "❓ *!rpgdesequipar [slot]*\n━━━━━━━━━━━━━━\n" +
          "│ `!rpgdesequipar arma` — Desequipar arma\n" +
          "│ `!rpgdesequipar armadura` — Desequipar armadura\n" +
          "│ `!rpgdesequipar accesorio` — Desequipar accesorio\n" +
          "│ `!rpgdesequipar mascota` — Desequipar mascota\n" +
          "│ `!rpgdesequipar todo` — Desequipar todo\n" +
          "╰──────────────────────⬣"
        );
      }
      const cambios = [];
      if (slot === "arma" || slot === "todo") {
        if (p.equipo.arma) { cambios.push("🗡️ Arma"); p.equipo.arma = null; }
      }
      if (slot === "armadura" || slot === "todo") {
        if (p.equipo.armadura) { cambios.push("🛡️ Armadura"); p.equipo.armadura = null; }
      }
      if (slot === "accesorio" || slot === "todo") {
        if (p.equipo.accesorio) { cambios.push("📿 Accesorio"); p.equipo.accesorio = null; }
      }
      if (slot === "mascota" || slot === "todo") {
        if (p.mascota) { cambios.push("🐾 Mascota"); p.mascota = null; }
      }
      if (!cambios.length) return reply("⚠️ No tienes nada equipado en ese slot.");
      savePlayer(p);
      await react("🔓");
      await reply(
        "✅ *Desequipado:* " + cambios.join(", ") + "\n" +
        "⚔️ ATK: " + getTotalAtk(p) + " | 🛡️ DEF: " + getTotalDef(p)
      );
    },
  },

  // ── Cambio de Clase ──────────────────────────
  {
    name: "rpgcambiarclase",
    alias: ["rpgcambiar", "rpgchangeclass"],
    description: "Cambiar de clase — !rpgcambiarclase [clase]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const nuevaClase = (args[0] || "").toLowerCase();

      // Sin argumento: mostrar panel de cambio
      if (!nuevaClase) {
        await react("🔄");
        const lista = Object.entries(CLASES).map(([k, v]) =>
          "│ `" + k + "` " + v.emoji + " — " + v.desc
        ).join("\n");
        return reply(
          "╭━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🔄 *CAMBIO DE CLASE*  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "📋 Tu clase actual: " + (CLASES[p.clase]?.emoji || "") + " *" + p.clase + "*\n\n" +
          "⚠️ *Costo del cambio:*\n" +
          "│ 💰 " + CAMBIO_CLASE_COSTO_ORO + " oro\n" +
          "│ 💎 " + CAMBIO_CLASE_COSTO_GEMAS + " gemas\n" +
          "│ 📉 Pierdes el " + (CAMBIO_CLASE_PENALIDAD_XP * 100) + "% de tu XP actual\n\n" +
          "✅ *Se conserva:* nivel, inventario, equipo, mejoras, clan, mascota\n\n" +
          "╭─〔 📋 *CLASES DISPONIBLES* 〕\n" +
          lista + "\n" +
          "╰──────────────────────⬣\n\n" +
          "Ej: `!rpgcambiarclase hombrelobo`"
        );
      }

      const resultado = cambiarClase(p, nuevaClase);
      await react(resultado.ok ? "🔄" : "❌");
      await reply(resultado.msg);
    },
  },

  // ── Mejoras de Stats (Orbe Azul 🔵) ─────────
  {
    name: "rpgmejorar",
    alias: ["rpgmejora", "rpgupgrade"],
    description: "Mejorar stats con Orbe Azul — !rpgmejorar [stat]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const stat = (args[0] || "").toLowerCase();

      // Sin argumento: mostrar panel de mejoras
      if (!stat) {
        await react("🔵");
        const mejoras = p.mejoras || {};
        const orbesAzul = p.inventario["orbe_azul"] || 0;
        let lineas = MEJORA_STATS.map(s => {
          const nv = mejoras[s] || 0;
          const { orbes, oro } = calcCostoMejora(nv);
          const maxStr = nv >= MEJORA_MAX_NIVEL ? " *(MAX)*" : " → Nv." + (nv + 1) + ": " + orbes + "🔵 + " + oro + "💰";
          return "│ " + MEJORA_STAT_EMOJI[s] + " *" + MEJORA_STAT_NOMBRE[s] + "* Nv." + nv + maxStr;
        }).join("\n");
        return reply(
          "╭━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🔵 *MEJORAS DE STATS*  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🔵 Orbes Azul: *" + orbesAzul + "* | 💰 Oro: *" + p.oro + "*\n\n" +
          lineas + "\n\n" +
          "_Compra orbes: `!rpgcomprar orbe_azul [1/5/10]`_\n" +
          "_Mejorar x1: `!rpgmejorar [stat]`_\n" +
          "_Mejorar x5/x10: `!rpgmejorar [stat] 5`_\n" +
          "_Stats: atk, def, hp, spd, crit_"
        );
      }

      // Cantidad: x1 x5 x10
      const cantRaw = parseInt(args[1]) || 1;
      if (![1, 5, 10].includes(cantRaw)) return reply("❌ Cantidad inválida. Usa: *1, 5 o 10*\nEj: `!rpgmejorar atk 5`");

      let resultado;
      if (cantRaw === 1) {
        resultado = aplicarMejoraStat(p, stat);
      } else {
        resultado = aplicarMejoraStatMultiple(p, stat, cantRaw);
      }
      await react(resultado.ok ? "🔵" : "❌");
      await reply(resultado.msg);
    },
  },

  // ── Mejoras de Equipo (Orbe Dorado 🟡) ───────
  {
    name: "rpgmejorarequipo",
    alias: ["rpgmejoraeq", "rpgupgradeeq"],
    description: "Mejorar arma/armadura con Orbe Dorado — !rpgmejorarequipo [arma/armadura] [atk/def]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const slot = (args[0] || "").toLowerCase();
      const stat = (args[1] || "").toLowerCase();

      // Sin argumentos: mostrar panel de mejoras de equipo
      if (!slot) {
        await react("🟡");
        const mejorasEq = p.mejorasEquipo || {};
        const orbesDorado = p.inventario["orbe_dorado"] || 0;

        const slots = ["arma", "armadura"];
        const statsEq = ["atk", "def"];
        let lineas = [];
        for (const sl of slots) {
          const itemId = p.equipo?.[sl];
          const item = itemId ? (TIENDA[itemId] || (p._ssrItems && p._ssrItems[itemId])) : null;
          const nombreItem = item ? item.emoji + " " + item.nombre : "_(sin equipar)_";
          lineas.push("│ " + (sl === "arma" ? "🗡️" : "🛡️") + " *" + sl.toUpperCase() + "*: " + nombreItem);
          for (const st of statsEq) {
            const key = sl + "_" + st;
            const nv = mejorasEq[key] || 0;
            const { orbes, oro } = calcCostoMejora(nv);
            const maxStr = nv >= MEJORA_MAX_NIVEL ? " *(MAX)*" : " → Nv." + (nv + 1) + ": " + orbes + "🟡 + " + oro + "💰";
            lineas.push("│   " + (st === "atk" ? "⚔️" : "🛡️") + " " + st.toUpperCase() + " Nv." + nv + maxStr);
          }
        }
        return reply(
          "╭━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🟡 *MEJORAS DE EQUIPO*  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🟡 Orbes Dorado: *" + orbesDorado + "* | 💰 Oro: *" + p.oro + "*\n\n" +
          lineas.join("\n") + "\n\n" +
          "_Compra orbes: `!rpgcomprar orbe_dorado [1/5/10]`_\n" +
          "_Mejorar x1: `!rpgmejorarequipo [arma/armadura] [atk/def]`_\n" +
          "_Mejorar x5/x10: `!rpgmejorarequipo [arma/armadura] [atk/def] 5`_"
        );
      }

      // Cantidad: x1 x5 x10
      const cantRaw = parseInt(args[2]) || 1;
      if (![1, 5, 10].includes(cantRaw)) return reply("❌ Cantidad inválida. Usa: *1, 5 o 10*\nEj: `!rpgmejorarequipo arma atk 5`");

      let resultado;
      if (cantRaw === 1) {
        resultado = aplicarMejoraEquipo(p, slot, stat);
      } else {
        resultado = aplicarMejoraEquipoMultiple(p, slot, stat, cantRaw);
      }
      await react(resultado.ok ? "🟡" : "❌");
      await reply(resultado.msg);
    },
  },

  // ── Misión diaria ─────────────────────────
  {
    name: "rpgmision",
    alias: ["rpgdaily", "mision", "rpgmisiones"],
    description: "Misión diaria — !rpgmision",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const ahora = Date.now();
      const COOLDOWN = 24 * 60 * 60 * 1000;
      const ultima = p.misiones?.iniciada || 0;

      if (ahora - ultima < COOLDOWN) {
        const restMin = Math.ceil((COOLDOWN - (ahora - ultima)) / 60000);
        const h = Math.floor(restMin / 60);
        const m = restMin % 60;
        return reply(`⏳ Ya completaste tu misión diaria.\nVuelve en *${h}h ${m}min*.`);
      }

      // Recompensa escalada por nivel
      const oro = Math.floor((50 + p.nivel * 15) * (0.8 + Math.random() * 0.4));
      const exp = Math.floor((40 + p.nivel * 10) * (0.8 + Math.random() * 0.4));
      const gemas = p.nivel >= 5 ? Math.floor(Math.random() * 3) + 1 : 0;

      p.oro += oro;
      p.gemas = (p.gemas || 0) + gemas;
      if (!p.misiones) p.misiones = {};
      p.misiones.iniciada = ahora;
      p.misiones.completadas = (p.misiones.completadas || 0) + 1;
      // Bonus de medallas si el jugador tiene clan
      if (p.clan) { if (!p.medallas) p.medallas = 0; p.medallas += 5; }
      const leveledUp = addExp(p, exp);
      savePlayer(p);

      await react("🎁");
      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  🎁 *¡MISIÓN COMPLETADA!* 🎁  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        `✅ Defendiste el reino con éxito.\n\n` +
        `💰 +${oro} oro\n` +
        `⭐ +${exp} EXP\n` +
        (gemas > 0 ? `💎 +${gemas} gemas\n` : "") +
        (leveledUp ? `\n🎉 *¡SUBISTE AL NIVEL ${p.nivel}!*\n` : "") +
        `\n📊 Misiones totales: *${p.misiones.completadas}*\n` +
        `_Vuelve mañana para la próxima misión._`
      );
    },
  },

  // ── Mascotas ──────────────────────────────
  {
    name: "rpgmascota",
    alias: ["mascota", "pet"],
    description: "Sistema de mascotas — !rpgmascota [ver/comprar/equipar/soltar]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, args, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      if (!p.mascota) p.mascota = null;

      const subCmd = (args[0] || "ver").toLowerCase();

      // ── tienda de mascotas ────────────────────
      if (subCmd === "tienda" || subCmd === "lista") {
        const lista = Object.entries(MASCOTAS).map(([id, m]) => {
          const tienes = p.inventario["mascota_" + id];
          return `${m.emoji} *${m.nombre}* — ${m.precio}💰\n   ${m.desc}\n   ATK+${m.bonus.atk} DEF+${m.bonus.def} CRIT+${m.bonus.crit}%${tienes ? " ✅ (tienes)" : ""}`;
        }).join("\n\n");
        return reply(
          `🐾 *Tienda de Mascotas*\n━━━━━━━━━━━━━━\n` +
          `💰 Tu oro: *${p.oro}*\n\n${lista}\n\n` +
          `_Compra con !rpgmascota comprar [nombre]_`
        );
      }

      // ── ver mascota actual ────────────────────
      if (subCmd === "ver" || subCmd === "info") {
        if (!p.mascota) return reply(
          `🐾 *Mascota*\n━━━━━━━━━━━━━━\n` +
          `No tienes mascota equipada.\n\n` +
          `Usa *!rpgmascota tienda* para ver las disponibles.`
        );
        const m = MASCOTAS[p.mascota]
          || (p._ssrMascotas && p._ssrMascotas[p.mascota]);
        if (!m) {
          // mascota guardada pero ya no existe en ninguna tabla, limpiar
          p.mascota = null;
          savePlayer(p);
          return reply(`🐾 *Mascota*\n━━━━━━━━━━━━━━\nNo tienes mascota equipada.`);
        }
        return reply(
          `🐾 *Tu Mascota*\n━━━━━━━━━━━━━━\n` +
          `${m.emoji} *${m.nombre}*\n` +
          `📊 Bonus: ATK+${m.bonus.atk} | DEF+${m.bonus.def} | CRIT+${m.bonus.crit}%\n` +
          `📝 ${m.desc}`
        );
      }

      // ── comprar mascota ───────────────────────
      if (subCmd === "comprar") {
        const id = (args[1] || "").toLowerCase();
        const m  = MASCOTAS[id];
        if (!m) return reply(`❌ Mascota no válida. Usa *!rpgmascota tienda* para ver opciones.`);
        if (p.inventario["mascota_" + id]) return reply(`⚠️ Ya tienes un *${m.nombre}* en tu inventario.`);
        if (p.oro < m.precio) return reply(`❌ Necesitas *${m.precio}💰*. Tienes *${p.oro}💰*.`);
        p.oro -= m.precio;
        p.inventario["mascota_" + id] = 1;
        savePlayer(p);
        await react("🐾");
        return reply(
          `✅ *¡${m.emoji} ${m.nombre} comprado!*\n━━━━━━━━━━━━━━\n` +
          `Úsalo con *!rpgmascota equipar ${id}*`
        );
      }

      // ── equipar mascota ───────────────────────
      if (subCmd === "equipar") {
        const id = (args[1] || "").toLowerCase();

        // ── SSR banner: id completo tipo "ssr_mascota_banner_mini_dragon"
        if (id.startsWith("ssr_mascota_banner_")) {
          const datos = p._ssrMascotas && p._ssrMascotas[id];
          if (!datos) return reply(`❌ Mascota SSR no encontrada. Usa el ID completo que aparece en tu inventario.`);
          if (!p.inventario[id]) return reply(`❌ No tienes *${datos.nombre}* en tu inventario.`);
          p.mascota = id;
          savePlayer(p);
          await react("🐾");
          return reply(
            `🐾 *${datos.emoji} ${datos.nombre} equipado!*\n━━━━━━━━━━━━━━\n` +
            `✨ *[SSR]* Bonus activo: ATK+${datos.bonus.atk} | DEF+${datos.bonus.def} | CRIT+${datos.bonus.crit}%`
          );
        }

        // ── SSR evento: id tipo "ssr_evento_mono_goku"
        if (id.startsWith("ssr_evento_")) {
          const datos = p._ssrMascotas && p._ssrMascotas[id];
          if (!datos) return reply(`❌ Mascota SSR de evento no encontrada. Usa el ID exacto, ej: \`ssr_evento_mono_goku\``);
          if (!p.inventario[id] || p.inventario[id] <= 0) return reply(`❌ No tienes *${datos.nombre}* en tu inventario.`);
          p.mascota = id;
          savePlayer(p);
          await react("🐾");
          return reply(
            `🐾 *${datos.emoji} ${datos.nombre} equipado!*\n━━━━━━━━━━━━━━\n` +
            `✨ *[SSR EVENTO]* Bonus activo: ATK+${datos.bonus.atk} | DEF+${datos.bonus.def} | CRIT+${datos.bonus.crit}%`
          );
        }

        // ── mascota normal
        const m = MASCOTAS[id];
        if (!m) return reply(`❌ Mascota no válida.`);
        if (!p.inventario["mascota_" + id]) return reply(`❌ No tienes *${m.nombre}*. Cómprala con *!rpgmascota comprar ${id}*.`);
        p.mascota = id;
        savePlayer(p);
        await react("🐾");
        return reply(
          `🐾 *${m.emoji} ${m.nombre} equipado!*\n━━━━━━━━━━━━━━\n` +
          `Bonus activo: ATK+${m.bonus.atk} | DEF+${m.bonus.def} | CRIT+${m.bonus.crit}%`
        );
      }

      // ── soltar mascota ────────────────────────
      if (subCmd === "soltar") {
        if (!p.mascota) return reply("❌ No tienes mascota equipada.");
        // Resolver nombre ya sea SSR banner o normal
        const mData = MASCOTAS[p.mascota]
          || (p._ssrMascotas && p._ssrMascotas[p.mascota]);
        const nombreMascota = mData ? `${mData.emoji} ${mData.nombre}` : p.mascota;
        p.mascota = null;
        savePlayer(p);
        return reply(`✅ *${nombreMascota}* desequipado. Sus bonus ya no están activos.`);
      }

      // ── vender mascota ────────────────────────
      if (subCmd === "vender") {
        const id = (args[1] || "").toLowerCase();
        if (!id) return reply(
          "❓ Uso: `!rpgmascota vender [id]`\n" +
          "_Recibes el 50% del precio original._"
        );

        // SSR no se pueden vender
        if (id.startsWith("ssr_")) return reply("❌ Las mascotas *SSR* no se pueden vender.");

        const m = MASCOTAS[id];
        if (!m) return reply("❌ Mascota no válida. Usa `!rpgmascota tienda` para ver los IDs.");

        const invKey = "mascota_" + id;
        if (!p.inventario[invKey]) return reply("❌ No tienes *" + m.nombre + "* en tu inventario.");

        // Si la tiene equipada, desequipar primero
        if (p.mascota === id) {
          p.mascota = null;
        }

        const precioVenta = Math.floor(m.precio * 0.5);
        delete p.inventario[invKey];
        p.oro += precioVenta;
        savePlayer(p);
        await react("💰");
        return reply(
          "💰 *MASCOTA VENDIDA*\n━━━━━━━━━━━━━━\n" +
          m.emoji + " *" + m.nombre + "* vendida por *" + precioVenta + "💰*\n" +
          "_Precio de venta: 50% del valor original_\n\n" +
          "💰 Oro actual: *" + p.oro + "*"
        );
      }

      // ── regalar mascota ───────────────────────
      if (subCmd === "regalar") {
        const id = (args[1] || "").toLowerCase();
        const mencionado = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
          || msg?.message?.extendedTextMessage?.contextInfo?.participant;

        if (!id || !mencionado) return reply(
          "❓ Uso: `!rpgmascota regalar [id] @usuario`\n" +
          "_Ej: !rpgmascota regalar lobo @usuario_"
        );

        if (mencionado === sender) return reply("❌ No puedes regalarte una mascota a ti mismo.");

        // SSR no se pueden regalar
        if (id.startsWith("ssr_")) return reply("❌ Las mascotas *SSR* no se pueden regalar.");

        const m = MASCOTAS[id];
        if (!m) return reply("❌ Mascota no válida. Usa `!rpgmascota tienda` para ver los IDs.");

        const invKey = "mascota_" + id;
        if (!p.inventario[invKey]) return reply("❌ No tienes *" + m.nombre + "* en tu inventario.");

        const receptor = getPlayer(mencionado, null);
        if (!receptor.clase) return reply("❌ Ese usuario no tiene personaje RPG registrado.");

        // Verificar que el receptor no tenga ya esa mascota
        if (receptor.inventario[invKey]) return reply(
          "❌ *@" + mencionado.split("@")[0] + "* ya tiene un *" + m.nombre + "* en su inventario."
        );

        // Si la tiene equipada, desequipar primero
        if (p.mascota === id) p.mascota = null;

        // Transferir
        delete p.inventario[invKey];
        receptor.inventario[invKey] = 1;
        savePlayer(p);
        savePlayer(receptor);

        await react("🎁");
        await sock.sendMessage(from, {
          text:
            "🎁 *¡MASCOTA REGALADA!*\n━━━━━━━━━━━━━━\n" +
            m.emoji + " *" + m.nombre + "*\n\n" +
            "📤 De: *" + (p.nombre || sender.split("@")[0]) + "*\n" +
            "📥 Para: *@" + mencionado.split("@")[0] + "*\n\n" +
            "Usa `!rpgmascota equipar " + id + "` para activarla.",
          mentions: [mencionado],
        }, { quoted: msg });
        return;
      }

      return reply("❓ Uso: `!rpgmascota [tienda/comprar/equipar/soltar/ver/vender/regalar]`");
    },
  },

  // ── !rpggemas — conversión oro → gemas (5 cambios/día) ────────
  {
    name: "rpggemas",
    alias: ["oro2gemas", "oroagemas"],
    description: "Cambiar 1000 💰 por 100 💎 (máx 5 veces por día)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const ORO_COSTO  = 1000;
      const GEMAS_GIVE = 100;
      const MAX_DIARIO = 5;

      // Reset diario
      const ahora   = Date.now();
      const hoy     = new Date(ahora).toDateString();
      if (!p._oro2gemasData || p._oro2gemasData.dia !== hoy) {
        p._oro2gemasData = { dia: hoy, usos: 0 };
      }
      const d = p._oro2gemasData;

      if (d.usos >= MAX_DIARIO) {
        return reply(
          `❌ *Límite diario alcanzado.*\n` +
          `Ya realizaste *${MAX_DIARIO}/5* cambios hoy.\n` +
          `🔄 El límite se resetea mañana.`
        );
      }
      if (p.oro < ORO_COSTO) {
        return reply(
          `❌ No tienes suficiente oro.\n` +
          `💰 Necesitas: *${ORO_COSTO}*\n` +
          `💰 Tienes: *${p.oro}*`
        );
      }

      p.oro  -= ORO_COSTO;
      p.gemas = (p.gemas || 0) + GEMAS_GIVE;
      d.usos++;
      p._oro2gemasData = d;
      savePlayer(p);

      await react("💎");
      return reply(
        `✅ *¡Cambio realizado!*\n\n` +
        `💰 *-${ORO_COSTO} Oro*\n` +
        `💎 *+${GEMAS_GIVE} Diamantes*\n\n` +
        `💰 Oro restante: *${p.oro}*\n` +
        `💎 Diamantes totales: *${p.gemas}*\n` +
        `🔄 Cambios usados hoy: *${d.usos}/${MAX_DIARIO}*`
      );
    },
  },

  // ── Clan ──────────────────────────────────
  {
    name: "rpgclan",
    alias: ["clan"],
    description: "Sistema de clanes — !rpgclan [sub]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, sock, from, msg, pushName}) => {
      const p = getPlayer(sender, msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const sub = (args[0]||"").toLowerCase();
      const param = args.slice(1).join(" ").trim();

      // ── Sin subcomando: mostrar menú o info del clan propio
      if (!sub) {
        if (p.clan) {
          const clan = getGuild(p.clan);
          if (!clan) { p.clan = null; savePlayer(p); return reply("❌ Tu clan fue disuelto. Ya no perteneces a ninguno."); }
          const esLider = clan.lider === sender;
          const nivelClan = getNivelClan(clan);
          const miembrosInfo = clan.miembros.map(m => {
            const mp = db.players[m];
            return "│ " + (clan.lider === m ? "👑" : "⚔️") + " " + (mp?.nombre || "@" + m.split("@")[0]) + " — Nv." + (mp?.nivel||"?");
          }).join("\n");
          const terrIds = getTerritoriosDeClan(clan.nombre);
          const acumClan = getAcumuladoClan(clan.nombre);
          const terrStr = terrIds.length > 0
            ? terrIds.map(tid => {
                const acumT = getTerritorios()[tid]?.acumulado;
                const acumStr = acumT && (acumT.oro > 0 || acumT.gemas > 0)
                  ? " *(📦 " + acumT.oro + "💰 " + acumT.gemas + "💎 " + (acumT.medallas||0) + "🏅)*"
                  : "";
                return "│ " + (TERRITORIOS[tid]?.emoji||"🏴") + " " + (TERRITORIOS[tid]?.nombre||tid) + acumStr;
              }).join("\n")
            : "│ _Ninguno_";
          const acumTotalStr = terrIds.length > 0 && (acumClan.oro > 0 || acumClan.gemas > 0)
            ? "\n│ 📦 *Listo para recolectar:* 💰" + acumClan.oro + " 💎" + acumClan.gemas + " ⭐" + acumClan.exp + " 🏅" + (acumClan.medallas||0)
            : "";
          const bonusTotalClan = terrIds.length > 0
            ? "💰+" + Math.round(((getBonusTerritorio({clan: clan.nombre}).oro||0)+(getBonusTerritorio({clan: clan.nombre}).all||0))*100) + "% " +
              "⭐+" + Math.round(((getBonusTerritorio({clan: clan.nombre}).exp||0)+(getBonusTerritorio({clan: clan.nombre}).all||0))*100) + "% " +
              "🎁+" + Math.round(((getBonusTerritorio({clan: clan.nombre}).drop||0)+(getBonusTerritorio({clan: clan.nombre}).all||0))*100) + "%"
            : "_Sin bonos_";
          return sock.sendMessage(from, {
            text:
              "🏰 *CLAN: " + clan.nombre + "*\n" +
              "━━━━━━━━━━━━━━\n" +
              "👑 Líder: @" + clan.lider.split("@")[0] + "\n" +
              "🌟 Nivel clan: *" + nivelClan + "* | 🏅 Donadas: *" + (clan.medallasDonadas||0) + "*\n" +
              "👥 Miembros: *" + clan.miembros.length + "/10*\n" +
              "🏅 Banco medallas: *" + (clan.bancoMedallas||0) + "🏅*\n" +
              "🏅 Tus medallas: *" + (p.medallas||0) + "*\n" +
              "🏆 Guerras ganadas: *" + (clan.guerrasGanadas||0) + "*\n" +
              "━━━━━━━━━━━━━━\n" +
              miembrosInfo + "\n\n" +
              "╭─〔 🗺️ TERRITORIOS (" + terrIds.length + ") 〕\n" +
              terrStr + "\n" +
              "│ 📊 Bonos: " + bonusTotalClan + "\n" +
              acumTotalStr + "\n" +
              "╰──────────────────────⬣\n\n" +
              (esLider ? "👑 Eres el líder\n• `!rpgclan expulsar @u` → Expulsar\n• `!rpgclan promover @u` → Dar liderazgo\n• `!rpgclan disolver` → Disolver clan\n" : "") +
              "• `!donarclanmedallas [cant]` → Donar medallas al banco del clan\n" +
              "• `!clanhabilidades` → Ver árbol de habilidades del clan\n" +
              "• `!clansubirnivel` → Subir nivel del clan\n" +
              "• `!rpgclan guerra @clan` → Retar a otro clan",
            mentions: clan.miembros,
          }, { quoted: msg });
        }
        return reply(
          "🏰 *CLANES RPG*\n━━━━━━━━━━━━━━\n" +
          "No perteneces a ningún clan.\n\n" +
          "╭─〔 COMANDOS 〕\n" +
          "│ `!rpgclan crear [nombre]` → Crear (500💰)\n" +
          "│ `!rpgclan unirse [nombre]` → Unirse\n" +
          "│ `!rpgclan info [nombre]` → Ver info\n" +
          "│ `!rpgclan top` → Top clanes\n" +
          "╰──────────────────────⬣"
        );
      }

      // ── Crear clan
      if (sub === "crear") {
        if (!param) return reply("❌ Escribe el nombre. Ej: `!rpgclan crear Arcadia`");
        if (param.length > 20) return reply("❌ Nombre muy largo (máx 20 caracteres).");
        if (p.clan) return reply("❌ Ya perteneces al clan *" + p.clan + "*. Sal primero con `!rpgclan salir`.");
        if (p.oro < 500) return reply("❌ Necesitas *500💰* para crear un clan. Tienes " + p.oro + "💰.");
        if (getGuild(param)) return reply("❌ Ya existe un clan con ese nombre.");
        p.oro -= 500; p.clan = param;
        saveGuild({ nombre: param, lider: sender, miembros: [sender], banco: 0, medallasDonadas: 0, creado: Date.now(), guerrasGanadas: 0 });
        savePlayer(p);
        await react("🏰");
        return reply("🏰 *¡Clan " + param + " creado!*\n💰 Se descontaron 500 oro.\nUsa `!rpgclan` para ver el panel.");
      }

      // ── Unirse a clan
      if (sub === "unirse") {
        if (!param) return reply("❌ Escribe el nombre. Ej: `!rpgclan unirse Arcadia`");
        if (p.clan) return reply("❌ Ya perteneces al clan *" + p.clan + "*.");
        const clan = getGuild(param);
        if (!clan) return reply("❌ Clan *" + param + "* no encontrado.");
        if (clan.miembros.length >= 10) return reply("❌ El clan está lleno (máx 10 miembros).");
        clan.miembros.push(sender); p.clan = param;
        saveGuild(clan); savePlayer(p);
        await react("✅");
        return sock.sendMessage(from, {
          text: "✅ *@" + sender.split("@")[0] + " se unió al clan *" + param + "*!*\n👥 Miembros: " + clan.miembros.length + "/10",
          mentions: [sender],
        }, { quoted: msg });
      }

      // ── Info de un clan
      if (sub === "info") {
        const nombre = param || p.clan;
        if (!nombre) return reply("❌ Escribe el nombre del clan. Ej: `!rpgclan info Arcadia`");
        const clan = getGuild(nombre);
        if (!clan) return reply("❌ Clan *" + nombre + "* no encontrado.");
        const nivelClan = getNivelClan(clan);
        const miembrosInfo = clan.miembros.map(m => {
          const mp = db.players[m];
          return "│ " + (clan.lider === m ? "👑" : "⚔️") + " " + (mp?.nombre || m.split("@")[0]) + " — Nv." + (mp?.nivel||"?");
        }).join("\n");
        return reply(
          "🏰 *" + clan.nombre + "*\n━━━━━━━━━━━━━━\n" +
          "👑 Líder: " + (db.players[clan.lider]?.nombre || clan.lider.split("@")[0]) + "\n" +
          "🌟 Nivel: *" + nivelClan + "*\n" +
          "👥 Miembros: *" + clan.miembros.length + "/10*\n" +
          "🏅 Banco medallas: *" + (clan.bancoMedallas||0) + "🏅*\n" +
          "🏆 Guerras: *" + (clan.guerrasGanadas||0) + "* ganadas\n" +
          "━━━━━━━━━━━━━━\n" +
          miembrosInfo
        );
      }

      // ── Top clanes
      if (sub === "top") {
        const clanes = Object.values(db.guilds).sort((a,b) => (b.guerrasGanadas||0) - (a.guerrasGanadas||0) || (b.bancoMedallas||0) - (a.bancoMedallas||0)).slice(0, 5);
        if (!clanes.length) return reply("❌ No hay clanes aún.");
        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
        const lista = clanes.map((cl,i) => medals[i] + " *" + cl.nombre + "* — 👥" + cl.miembros.length + " | 🏆" + (cl.guerrasGanadas||0) + " | 🏅" + (cl.bancoMedallas||0)).join("\n");
        return reply("🏆 *TOP CLANES*\n━━━━━━━━━━━━━━\n" + lista);
      }

      // ── Salir del clan
      if (sub === "salir") {
        if (!p.clan) return reply("❌ No perteneces a ningún clan.");
        const clan = getGuild(p.clan);
        if (clan) {
          if (clan.lider === sender && clan.miembros.length > 1) return reply("❌ Eres el líder. Pasa el liderazgo primero con `!rpgclan promover @usuario`, o disuelve el clan con `!rpgclan disolver`.");
          clan.miembros = clan.miembros.filter(m => m !== sender);
          if (clan.miembros.length === 0) { delete db.guilds[clan.nombre]; }
          else saveGuild(clan);
        }
        p.clan = null; savePlayer(p);
        await react("👋");
        return reply("👋 Saliste del clan *" + (clan?.nombre||"") + "*.");
      }

      // ── Depositar oro al banco del clan
      if (sub === "depositar") {
        if (!p.clan) return reply("❌ No perteneces a ningún clan.");
        const cantidad = parseInt(param);
        if (!cantidad || cantidad <= 0) return reply("❌ Ej: `!rpgclan depositar 200`");
        if (p.oro < cantidad) return reply("❌ No tienes suficiente oro. Tienes " + p.oro + "💰.");
        const clan = getGuild(p.clan);
        if (!clan) return reply("❌ Clan no encontrado.");
        p.oro -= cantidad; clan.banco += cantidad;
        savePlayer(p); saveGuild(clan);
        await react("💰");
        return reply("💰 Depositaste *" + cantidad + "* oro al banco del clan *" + clan.nombre + "*\n🏦 Banco total: *" + clan.banco + "* oro");
      }

      // ── Retirar oro del banco del clan
      if (sub === "retirar") {
        if (!p.clan) return reply("❌ No perteneces a ningún clan.");
        const cantidad = parseInt(param);
        if (!cantidad || cantidad <= 0) return reply("❌ Ej: `!rpgclan retirar 500`");
        const clan = getGuild(p.clan);
        if (!clan) return reply("❌ Clan no encontrado.");
        if (clan.banco < cantidad) return reply(`❌ El banco del clan solo tiene *${clan.banco}💰*.`);

        // Límite diario de 1500 oro por miembro
        const LIMITE_DIARIO = 1500;
        const hoy = new Date().toDateString();
        if (!p.clanRetiros) p.clanRetiros = {};
        if (p.clanRetiros.fecha !== hoy) {
          p.clanRetiros.fecha = hoy;
          p.clanRetiros.total = 0;
        }
        const retiradoHoy = p.clanRetiros.total || 0;
        const disponible = LIMITE_DIARIO - retiradoHoy;
        if (disponible <= 0) return reply(`⏳ Ya retiraste tu límite diario de *${LIMITE_DIARIO}💰*.
Vuelve mañana.`);
        const cantidadFinal = Math.min(cantidad, disponible);
        if (cantidadFinal < cantidad) {
          await reply(`⚠️ Solo puedes retirar *${cantidadFinal}💰* más hoy (límite: ${LIMITE_DIARIO}/día).
Retirando ${cantidadFinal}💰...`);
        }

        clan.banco -= cantidadFinal;
        p.oro += cantidadFinal;
        p.clanRetiros.total = retiradoHoy + cantidadFinal;
        savePlayer(p); saveGuild(clan);
        await react("💸");
        return reply(
          `💸 Retiraste *${cantidadFinal}💰* del banco del clan *${clan.nombre}*
` +
          `💰 Tu oro: *${p.oro}*
` +
          `🏦 Banco clan: *${clan.banco}💰*
` +
          `📊 Retirado hoy: *${p.clanRetiros.total}/${LIMITE_DIARIO}💰*`
        );
      }

      // ── Expulsar (solo líder)
      if (sub === "expulsar") {
        if (!p.clan) return reply("❌ No perteneces a ningún clan.");
        const clan = getGuild(p.clan);
        if (!clan || clan.lider !== sender) return reply("❌ Solo el líder puede expulsar.");
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0];
        if (!target) return reply("❌ Menciona al usuario. Ej: `!rpgclan expulsar @usuario`");
        if (target === sender) return reply("❌ No puedes expulsarte a ti mismo.");
        if (!clan.miembros.includes(target)) return reply("❌ Ese usuario no está en el clan.");
        clan.miembros = clan.miembros.filter(m => m !== target);
        const tp = db.players[target];
        if (tp) { tp.clan = null; savePlayer(tp); }
        saveGuild(clan);
        await react("🚫");
        return sock.sendMessage(from, {
          text: "🚫 *@" + target.split("@")[0] + "* fue expulsado del clan *" + clan.nombre + "*.",
          mentions: [target],
        }, { quoted: msg });
      }

      // ── Promover nuevo líder
      if (sub === "promover") {
        if (!p.clan) return reply("❌ No perteneces a ningún clan.");
        const clan = getGuild(p.clan);
        if (!clan || clan.lider !== sender) return reply("❌ Solo el líder puede promover.");
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0];
        if (!target) return reply("❌ Menciona al nuevo líder.");
        if (!clan.miembros.includes(target)) return reply("❌ Ese usuario no está en el clan.");
        clan.lider = target;
        saveGuild(clan);
        await react("👑");
        return sock.sendMessage(from, {
          text: "👑 *@" + target.split("@")[0] + "* es el nuevo líder del clan *" + clan.nombre + "*.",
          mentions: [target],
        }, { quoted: msg });
      }

      // ── Disolver clan (solo líder)
      if (sub === "disolver") {
        if (!p.clan) return reply("❌ No perteneces a ningún clan.");
        const clan = getGuild(p.clan);
        if (!clan || clan.lider !== sender) return reply("❌ Solo el líder puede disolver el clan.");
        // Quitar clan a todos los miembros
        for (const jid of clan.miembros) {
          const mp = db.players[jid];
          if (mp) { mp.clan = null; savePlayer(mp); }
        }
        delete db.guilds[clan.nombre];
        await react("💥");
        return reply("💥 El clan *" + clan.nombre + "* fue disuelto.");
      }

      // ── Guerra entre clanes
      if (sub === "guerra") {
        if (!p.clan) return reply("❌ No perteneces a ningún clan.");
        const clan = getGuild(p.clan);
        if (!clan || clan.lider !== sender) return reply("❌ Solo el líder puede declarar guerra.");
        if (!param) return reply("❌ Escribe el clan rival. Ej: `!rpgclan guerra Arcadia`");
        if (param === p.clan) return reply("❌ No puedes guerrear contra tu propio clan.");
        const rival = getGuild(param);
        if (!rival) return reply("❌ Clan *" + param + "* no encontrado.");
        if (rival.miembros.length === 0) return reply("❌ El clan rival está vacío.");

        // Calcular poder de cada clan (suma de ATK+DEF+nivel de todos los miembros)
        const poderClan = (cl) => cl.miembros.reduce((total, jid) => {
          const mp = db.players[jid];
          if (!mp) return total;
          return total + getTotalAtk(mp) + getTotalDef(mp) + mp.nivel * 5;
        }, 0) + Math.floor(cl.banco / 100);

        const poderA = poderClan(clan) + Math.floor(Math.random() * 100);
        const poderB = poderClan(rival) + Math.floor(Math.random() * 100);
        const gano = poderA >= poderB;
        const ganador = gano ? clan : rival;
        const perdedor = gano ? rival : clan;

        // Sin pérdida de oro: la guerra solo otorga gloria (guerrasGanadas)
        ganador.guerrasGanadas = (ganador.guerrasGanadas||0) + 1;
        saveGuild(clan); saveGuild(rival);

        await react("⚔️");
        return reply(
          "⚔️ *GUERRA DE CLANES*\n━━━━━━━━━━━━━━\n" +
          "🏰 *" + clan.nombre + "* (Poder: " + poderA + ")\n" +
          "VS\n" +
          "🏰 *" + rival.nombre + "* (Poder: " + poderB + ")\n\n" +
          "🏆 *¡" + ganador.nombre + " GANÓ!*\n" +
          "🎖️ Victoria registrada — ningún clan pierde oro"
        );
      }

      await reply("❌ Subcomando inválido.\nUsa: crear, unirse, info, top, salir, depositar, expulsar, promover, disolver, guerra");
    },
  },


    // ── Donar medallas al banco del clan ─────────
  {
    name: "donarclanmedallas",
    alias: ["donarmedallas", "clanmedallas"],
    description: "Donar medallas al banco del clan — !donarclanmedallas [cantidad]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan.");
      const cantidad = parseInt(args[0]);
      if (!cantidad || cantidad <= 0) return reply("❌ Indica la cantidad. Ej: `!donarclanmedallas 200`");
      const result = donarMedallasClan(sender, cantidad);
      if (result.error) return reply("❌ " + result.error);
      const clan = getGuild(p.clan);
      await react("🏅");
      avanzarMisionClan(sender, "donacion");
      return reply(
        `🏅 *Donación de medallas exitosa*\n━━━━━━━━━━━━━━\n` +
        `🏰 Clan: *${clan.nombre}*\n` +
        `🏅 Donaste: *${cantidad}* medallas\n` +
        `🏦 Banco del clan: *${result.bancoMedallas}🏅*\n` +
        `📊 Total donado por ti: *${clan.donacionesMedallas?.[sender] || 0}🏅*`
      );
    },
  },

  // ── Ver árbol de habilidades del clan ─────────
  {
    name: "clanhabilidades",
    alias: ["clanskills", "arbolclan", "habilidadesclan"],
    description: "Ver árbol de habilidades del clan",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan.");
      const clan = getGuild(p.clan);
      if (!clan) return reply("❌ Clan no encontrado.");
      const skills = getClanSkills(clan);
      await react("🌟");
      const lineas = Object.entries(CLAN_SKILLS).map(([key, skill]) => {
        const nv = skills[key] || 0;
        const bonus = nv * skill.bonusPerLevel;
        const costo = nv < 50 ? costoSkillClan(nv) : "MAX";
        const barra = "█".repeat(Math.floor(nv / 5)) + "░".repeat(10 - Math.floor(nv / 5));
        return `│ ${skill.emoji} *${skill.nombre}*\n│   Nv.*${nv}*/50 [${barra}]\n│   Bonus actual: +${bonus}${key === "damage" || key === "dodge" ? "%" : ""} | Siguiente: ${costo === "MAX" ? "MAX" : costo + "🏅"}`;
      });
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃    🌟  *ÁRBOL DE HABILIDADES*    ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n" +
        `🏰 Clan: *${clan.nombre}*\n` +
        `🏦 Banco de medallas: *${clan.bancoMedallas || 0}🏅*\n` +
        "━━━━━━━━━━━━━━\n" +
        lineas.join("\n│\n") + "\n" +
        "╰──────────────────────⬣\n\n" +
        "_Solo el líder puede mejorar con `!clanmejorar [stat]`_\n" +
        "_Stats: atk · def · damage · dodge_"
      );
    },
  },

  // ── Mejorar habilidad del clan (solo líder) ───
  {
    name: "clanmejorar",
    alias: ["mejorarclan", "clanupgrade"],
    description: "Mejorar habilidad del clan [Líder] — !clanmejorar [atk/def/damage/dodge]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan.");
      const stat = (args[0] || "").toLowerCase();
      if (!stat || !CLAN_SKILLS[stat]) {
        return reply(
          "❓ *!clanmejorar [stat]*\n━━━━━━━━━━━━━━\n" +
          "│ `!clanmejorar atk` — ⚔️ Aumentar ATK del clan\n" +
          "│ `!clanmejorar def` — 🛡️ Aumentar DEF del clan\n" +
          "│ `!clanmejorar damage` — 💥 Aumentar CRIT del clan\n" +
          "│ `!clanmejorar dodge` — 💨 Aumentar DODGE del clan\n" +
          "╰──────────────────────⬣\n" +
          "_Usa `!clanhabilidades` para ver niveles y costos_"
        );
      }
      const result = mejorarSkillClan(sender, stat);
      if (result.error) return reply("❌ " + result.error);
      const skill = CLAN_SKILLS[stat];
      const bonusTotal = result.nivelNuevo * skill.bonusPerLevel;
      await react("⬆️");
      await reply(
        `✅ *¡Habilidad mejorada!*\n━━━━━━━━━━━━━━\n` +
        `${skill.emoji} *${skill.nombre}* → Nv.*${result.nivelNuevo}*/50\n` +
        `📈 Bonus total: +${bonusTotal}${stat === "damage" || stat === "dodge" ? "%" : ""} para todos los miembros\n` +
        `🏅 Costo pagado: *${result.costo}🏅*\n` +
        `🏦 Banco restante: *${result.bancoMedallas}🏅*`
      );
    },
  },

  // ── Regalar ítem a otro jugador ──────────────
  {
    name: "daritem",
    alias: ["regalaritem", "gifitem"],
    description: "Regalar un ítem a otro jugador",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0];
      if (!target) return reply("❌ Menciona al jugador. Ej: `!daritem @usuario espada_hierro`");
      if (target === sender) return reply("❌ No puedes regalarte ítems a ti mismo.");

      const itemId = args.find(a => !a.includes("@"));
      if (!itemId) return reply("❌ Indica el ítem. Ej: `!daritem @usuario espada_hierro`\nUsa `!rpginventario` para ver tus ítems.");

      if (!p.inventario[itemId] || p.inventario[itemId] <= 0)
        return reply(`❌ No tienes *${itemId}* en tu inventario.`);

      // Verificar que el ítem existe en TIENDA
      if (!TIENDA[itemId]) return reply(`❌ Ítem *${itemId}* no reconocido.`);

      const receptor = getPlayer(target, null);
      if (!receptor.clase) return reply("❌ Ese jugador no tiene personaje registrado.");

      // Transferir ítem
      p.inventario[itemId]--;
      if (p.inventario[itemId] === 0) delete p.inventario[itemId];
      receptor.inventario[itemId] = (receptor.inventario[itemId] || 0) + 1;

      savePlayer(p); savePlayer(receptor);
      await react("🎁");
      return sock.sendMessage(from, {
        text:
          `🎁 *¡Ítem regalado!*\n━━━━━━━━━━━━━━\n` +
          `📦 Ítem: *${TIENDA[itemId].emoji} ${TIENDA[itemId].nombre}*\n` +
          `👤 De: *${p.nombre}*\n` +
          `🎯 Para: *@${target.split("@")[0]}*`,
        mentions: [target],
      }, { quoted: msg });
    },
  },

  // ── Mercado de jugadores ──────────────────
  {
    name: "rpgmercado",
    alias: ["mercado", "market"],
    description: "Mercado entre jugadores — compra/vende ítems",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, args, sender, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      // Cargar mercado desde DB
      if (!db.mercado) db.mercado = {};
      const mercado = db.mercado;
      const subCmd  = (args[0] || "ver").toLowerCase();

      // ── ver mercado ───────────────────────────
      if (subCmd === "ver" || subCmd === "lista") {
        const publicaciones = Object.entries(mercado);
        if (!publicaciones.length) return reply(
          `🏪 *Mercado de Jugadores*\n━━━━━━━━━━━━━━\n` +
          `No hay ítems en venta.\n\n` +
          `Vende con: *!rpgmercado vender [item] [precio]*`
        );
        const lista = publicaciones.slice(0, 10).map(([id, pub], i) => {
          const item = TIENDA[pub.itemId];
          const cal  = CALIDAD[pub.calidad || "comun"];
          return `${i+1}. ${cal.emoji} *${item?.nombre || pub.itemId}* — ${pub.precio}💰\n   👤 ${pub.vendedor} | ID: \`${id}\``;
        }).join("\n\n");
        return reply(
          `🏪 *Mercado de Jugadores*\n━━━━━━━━━━━━━━\n${lista}\n\n` +
          `💡 Compra con: *!rpgmercado comprar [ID]*\n` +
          `📦 Vende con: *!rpgmercado vender [item] [precio]*`
        );
      }

      // ── publicar ítem ─────────────────────────
      if (subCmd === "vender" || subCmd === "publicar") {
        const itemId  = args[1];
        const precio  = parseInt(args[2]);
        if (!itemId || !precio || precio <= 0)
          return reply("❌ Uso: *!rpgmercado vender [item] [precio]*\nEj: `!rpgmercado vender espada_hierro 200`");
        if (!TIENDA[itemId]) return reply(`❌ Ítem *${itemId}* no existe.`);
        if (!p.inventario[itemId] || p.inventario[itemId] <= 0)
          return reply(`❌ No tienes *${TIENDA[itemId].nombre}* en tu inventario.`);
        if (precio < 10) return reply("❌ El precio mínimo es 10💰.");
        if (precio > 999999) return reply("❌ Precio máximo: 999,999💰.");

        // Verificar que no tenga más de 3 publicaciones activas
        const misPublicaciones = Object.values(mercado).filter(p2 => p2.vendedorJid === sender);
        if (misPublicaciones.length >= 3) return reply("❌ Máximo 3 publicaciones activas. Retira una primero.");

        const pubId = `${sender.split("@")[0]}_${itemId}_${Date.now()}`.slice(-20);
        p.inventario[itemId]--;
        if (p.inventario[itemId] === 0) delete p.inventario[itemId];
        mercado[pubId] = {
          vendedor: p.nombre, vendedorJid: sender,
          itemId, calidad: p.inventario[`${itemId}_cal`] || "comun",
          precio, fecha: Date.now(),
        };
        db.mercado = mercado;
        savePlayer(p);
        await react("🏪");
        return reply(
          `✅ *Ítem publicado en el mercado*\n━━━━━━━━━━━━━━\n` +
          `📦 ${TIENDA[itemId].emoji} *${TIENDA[itemId].nombre}*\n` +
          `💰 Precio: *${precio}*\n` +
          `🆔 ID: \`${pubId}\`\n\n` +
          `_Los compradores usan: !rpgmercado comprar ${pubId}_`
        );
      }

      // ── comprar del mercado ───────────────────
      if (subCmd === "comprar") {
        const pubId = args[1];
        if (!pubId) return reply("❌ Indica el ID. Ej: `!rpgmercado comprar [ID]`");
        const pub = mercado[pubId];
        if (!pub) return reply("❌ Publicación no encontrada o ya vendida.");
        if (pub.vendedorJid === sender) return reply("❌ No puedes comprarte tu propio ítem.");
        if (p.oro < pub.precio) return reply(`❌ Necesitas *${pub.precio}💰*. Tienes *${p.oro}💰*.`);

        const item = TIENDA[pub.itemId];
        p.oro -= pub.precio;
        p.inventario[pub.itemId] = (p.inventario[pub.itemId] || 0) + 1;

        // Dar oro al vendedor
        const vendedor = db.players[pub.vendedorJid];
        if (vendedor) {
          vendedor.oro += pub.precio;
          db.players[pub.vendedorJid] = vendedor;
        }

        delete mercado[pubId];
        db.mercado = mercado;
        savePlayer(p);

        // Notificar al vendedor
        try {
          await sock.sendMessage(pub.vendedorJid, {
            text: `🏪 *¡Venta exitosa!*\n${item.emoji} *${item.nombre}* vendido a *${p.nombre}*\n💰 +${pub.precio} oro`
          });
        } catch {}

        await react("🛒");
        return reply(
          `🛒 *¡Compra exitosa!*\n━━━━━━━━━━━━━━\n` +
          `📦 ${item.emoji} *${item.nombre}*\n` +
          `💰 Pagaste: *${pub.precio}*\n` +
          `💰 Oro restante: *${p.oro}*`
        );
      }

      // ── retirar publicación ───────────────────
      if (subCmd === "retirar" || subCmd === "cancelar") {
        const pubId = args[1];
        if (!pubId) return reply("❌ Indica el ID. Ej: `!rpgmercado retirar [ID]`");
        const pub = mercado[pubId];
        if (!pub) return reply("❌ Publicación no encontrada.");
        if (pub.vendedorJid !== sender) return reply("❌ Esa publicación no es tuya.");

        p.inventario[pub.itemId] = (p.inventario[pub.itemId] || 0) + 1;
        delete mercado[pubId];
        db.mercado = mercado;
        savePlayer(p);

        await react("📦");
        return reply(`✅ Publicación retirada. *${TIENDA[pub.itemId]?.nombre}* devuelto a tu inventario.`);
      }

      // ── mis publicaciones ─────────────────────
      if (subCmd === "mis" || subCmd === "mias") {
        const mias = Object.entries(mercado).filter(([, pub]) => pub.vendedorJid === sender);
        if (!mias.length) return reply("📦 No tienes ítems publicados en el mercado.");
        const lista = mias.map(([id, pub]) => {
          const item = TIENDA[pub.itemId];
          return `• ${item?.emoji} *${item?.nombre}* — ${pub.precio}💰\n  ID: \`${id}\``;
        }).join("\n\n");
        return reply(`🏪 *Tus publicaciones*\n━━━━━━━━━━━━━━\n${lista}\n\n_Retira con: !rpgmercado retirar [ID]_`);
      }

      return reply(
        `🏪 *Mercado de Jugadores*\n━━━━━━━━━━━━━━\n` +
        `• *!rpgmercado ver* — Ver ítems en venta\n` +
        `• *!rpgmercado vender [item] [precio]* — Publicar ítem\n` +
        `• *!rpgmercado comprar [ID]* — Comprar ítem\n` +
        `• *!rpgmercado retirar [ID]* — Retirar publicación\n` +
        `• *!rpgmercado mis* — Ver tus publicaciones`
      );
    },
  },

  // ── Títulos ───────────────────────────────
  {
    name: "rpgtitulos",
    alias: ["titulos", "rpgtitulo"],
    description: "Ver y equipar títulos — !rpgtitulos [equipar/desequipar] [id]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const sub = (args[0] || "ver").toLowerCase();

      // ── Equipar título ────────────────────
      if (sub === "equipar") {
        const id = (args[1] || "").toLowerCase();
        if (!id) return reply("❌ Indica el ID del título. Ej: `!rpgtitulos equipar cazador`\nUsa `!rpgtitulos` para ver tus IDs.");
        const desbloqueados = getTitulosDesbloqueados(p);
        const titulo = desbloqueados.find(t => t.id === id);
        if (!titulo) return reply(`❌ No tienes el título *${id}* o no existe.\nUsa \`!rpgtitulos\` para ver los que tienes.`);
        p.tituloEquipado = id;
        savePlayer(p);
        await react("🎖️");
        return reply(`🎖️ Título equipado: ${titulo.emoji} *${titulo.nombre}*`);
      }

      // ── Desequipar título ─────────────────
      if (sub === "desequipar" || sub === "quitar") {
        if (!p.tituloEquipado) return reply("❌ No tienes ningún título equipado manualmente.");
        p.tituloEquipado = null;
        savePlayer(p);
        await react("✅");
        return reply("✅ Título desequipado. Se usará el automático por prioridad.");
      }

      // ── Ver títulos ───────────────────────
      await react("🎖️");
      const desbloqueados = getTitulosDesbloqueados(p);
      const activo = calcularTitulo(p);
      if (!desbloqueados.length) {
        return reply(
          "🎖️ *TÍTULOS*\n━━━━━━━━━━━━━━\n" +
          "No tienes títulos aún.\n\n" +
          "_Explora, combate, pesca y sube de nivel para desbloquearlos._"
        );
      }
      const lista = desbloqueados
        .sort((a, b) => b.priority - a.priority)
        .map(t => `${t.id === activo?.id ? "✅" : "▫️"} ${t.emoji} *${t.nombre}* — _${t.desc}_\n   ID: \`${t.id}\``)
        .join("\n\n");
      const modoTexto = p.tituloEquipado ? "manual" : "automático";
      return reply(
        "🎖️ *TUS TÍTULOS*\n━━━━━━━━━━━━━━\n" +
        (activo ? `✨ Activo (${modoTexto}): ${activo.emoji} *${activo.nombre}*\n\n` : "") +
        lista + "\n\n" +
        `_Total: ${desbloqueados.length} título(s)_\n` +
        "_Equipa con: `!rpgtitulos equipar [id]`_"
      );
    },
  },

  // ── Top ───────────────────────────────────
  {
    name: "rpgtop",
    freeAllowed: true,
    alias: ["rpgranking"],
    description: "Ranking de jugadores",
    category: "RPG ⚔️",
    execute: async ({ reply, react, msg, pushName}) => {
      await react("🏆");
      actualizarTopRpg();
      const jugadores = Object.values(db.players).filter(p => p.clase)
        .sort((a,b) => b.nivel - a.nivel || b.exp - a.exp).slice(0, 10);
      if (!jugadores.length) return reply("❌ No hay jugadores aún.");
      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lista = jugadores.map((p,i) => {
        // Nombre: usar el registrado, evitar números largos (LIDs)
        const nombreMostrar = p.nombre && !/^[0-9]{10,}$/.test(p.nombre)
          ? p.nombre
          : "@" + p.jid.split("@")[0];
        // Clase con nombre completo
        const claseInfo = CLASES[p.clase];
        const claseNombre = claseInfo ? (claseInfo.emoji + " " + p.clase.charAt(0).toUpperCase() + p.clase.slice(1)) : "Sin clase";
        const titulo = calcularTitulo(p);
        const tituloStr = titulo ? ` ${titulo.emoji} _${titulo.nombre}_` : "";
        return medals[i] + " *" + nombreMostrar + "*" + tituloStr + " — " + claseNombre + "\n   Nv." + p.nivel + " | 🏆 " + p.stats.victorias + " victorias | 💀 " + p.stats.enemigosKill + " kills";
      }).join("\n\n");
      await reply("🏆 *TOP JUGADORES RPG*\n━━━━━━━━━━━━━━\n" + lista);
    },
  },

  // ── Admin: Dar EXP ────────────────────────
  {
    name: "rpgdarexp",
    alias: ["rpgaddexp"],
    description: "Dar EXP a usuario [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, msg, args, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0];
      const cantidad = parseInt(args.find(a => /^\d+$/.test(a)));
      if (!target) return reply("👤 Menciona al usuario. Ej: `!rpgdarexp @usuario 500`");
      if (!cantidad || cantidad <= 0) return reply("🔢 Cantidad inválida. Ej: `!rpgdarexp @usuario 500`");
      const p = db.players[target];
      if (!p?.clase) return reply("❌ Sin personaje RPG.");
      const leveledUp = addExp(p, cantidad);
      await react("⭐");
      await reply("⭐ +*" + cantidad + "* EXP a @" + target.split("@")[0] + (leveledUp ? "\n🎉 ¡Subió al nivel " + p.nivel + "!" : ""));
    },
  },

  // ── Admin: Dar Oro ────────────────────────
  {
    name: "rpgdaroro",
    alias: ["rpgaddoro"],
    description: "Dar oro a usuario [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, msg, args, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0];
      const cantidad = parseInt(args.find(a => /^\d+$/.test(a)));
      if (!target) return reply("👤 Menciona al usuario. Ej: `!rpgdaroro @usuario 1000`");
      if (!cantidad || cantidad <= 0) return reply("🔢 Cantidad inválida. Ej: `!rpgdaroro @usuario 1000`");
      const p = db.players[target];
      if (!p?.clase) return reply("❌ Sin personaje RPG.");
      p.oro += cantidad;
      savePlayer(p);
      await react("💰");
      await reply("💰 +*" + cantidad + "* oro a @" + target.split("@")[0] + "\n💰 Total: " + p.oro);
    },
  },

  // ── Admin: Quitar EXP ─────────────────────
  {
    name: "rpgquitarexp",
    alias: ["rpgremoveexp"],
    description: "Quitar EXP a usuario [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, msg, args, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0];
      const cantidad = parseInt(args.find(a => /^\d+$/.test(a)));
      if (!target || !cantidad || cantidad <= 0) return reply("Ej: `!rpgquitarexp @usuario 200`");
      const p = db.players[target];
      if (!p?.clase) return reply("❌ Sin personaje RPG.");
      p.exp = Math.max(0, p.exp - cantidad);
      savePlayer(p);
      await react("⬇️");
      await reply("⬇️ -*" + cantidad + "* EXP a @" + target.split("@")[0]);
    },
  },

  // ── Admin: Quitar Oro ─────────────────────
  {
    name: "rpgquitaroro",
    alias: ["rpgremoveoro"],
    description: "Quitar oro a usuario [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, msg, args, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0];
      const cantidad = parseInt(args.find(a => /^\d+$/.test(a)));
      if (!target || !cantidad || cantidad <= 0) return reply("Ej: `!rpgquitaroro @usuario 500`");
      const p = db.players[target];
      if (!p?.clase) return reply("❌ Sin personaje RPG.");
      p.oro = Math.max(0, p.oro - cantidad);
      savePlayer(p);
      await react("⬇️");
      await reply("⬇️ -*" + cantidad + "* oro a @" + target.split("@")[0] + "\n💰 Restante: " + p.oro);
    },
  },

  // ══════════════════════════════════════════
  // OWNER — EVENTOS
  // ══════════════════════════════════════════

  // ── !eventoxp ─────────────────────────────
  {
    name: "eventoxp",
    alias: ["eventoexp", "xpevento"],
    description: "Activa evento XP doble [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, sock, args, from, msg, pushName}) => {
      const horas = parseInt(args[0]) || 2;
      if (horas < 1 || horas > 24) return reply("❌ Horas válidas: 1–24");
      const mult = parseFloat(args[1]) || 2;
      setEventoDB("xp", {
        tipo: "xp", nombre: "XP Doble", emoji: "⭐",
        multiplicador: mult,
        expira: Date.now() + horas * 60 * 60 * 1000,
      });
      await react("⭐");
      const textoXP =
        "🌟 *¡EVENTO ACTIVADO!*\n" +
        "━━━━━━━━━━━━━━\n" +
        "⭐ *XP x" + mult + "* durante *" + horas + " hora(s)*\n\n" +
        "¡Explora, duéla y gana misiones para aprovechar el bonus!\n" +
        "⏳ Termina en: *" + horas + "h*\n\n" +
        "_Usa_ `!rpgexplorar` _para aprovecharlo_ 🗺️";
      const totalXP = await broadcastGrupos(textoXP);
      await reply("✅ Evento XP activado y avisado en *" + totalXP + "* grupos.");
    },
  },

  // ── !eventooro ────────────────────────────
  {
    name: "eventooro",
    alias: ["eventogold", "goldEvento"],
    description: "Activa evento Oro doble [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, sock, args, from, msg, pushName}) => {
      const horas = parseInt(args[0]) || 2;
      if (horas < 1 || horas > 24) return reply("❌ Horas válidas: 1–24");
      const mult = parseFloat(args[1]) || 2;
      setEventoDB("oro", {
        tipo: "oro", nombre: "Oro Doble", emoji: "💰",
        multiplicador: mult,
        expira: Date.now() + horas * 60 * 60 * 1000,
      });
      await react("💰");
      const textoOro =
        "🌟 *¡EVENTO ACTIVADO!*\n" +
        "━━━━━━━━━━━━━━\n" +
        "💰 *Oro x" + mult + "* durante *" + horas + " hora(s)*\n\n" +
        "¡Derrota enemigos y acumula el doble de oro!\n" +
        "⏳ Termina en: *" + horas + "h*\n\n" +
        "_Usa_ `!rpgexplorar` _para aprovecharlo_ 🗺️";
      const totalOro = await broadcastGrupos(textoOro);
      await reply("✅ Evento Oro activado y avisado en *" + totalOro + "* grupos.");
    },
  },

  // ── !eventodrop ───────────────────────────
  {
    name: "eventodrop",
    alias: ["eventodrop", "dropevento"],
    description: "Activa evento Drop aumentado [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, sock, args, from, msg, pushName}) => {
      const horas = parseInt(args[0]) || 2;
      if (horas < 1 || horas > 24) return reply("❌ Horas válidas: 1–24");
      setEventoDB("drop", {
        tipo: "drop", nombre: "Drop Garantizado", emoji: "🎁",
        multiplicador: 2,
        expira: Date.now() + horas * 60 * 60 * 1000,
      });
      await react("🎁");
      const textoDrop =
        "🌟 *¡EVENTO ACTIVADO!*\n" +
        "━━━━━━━━━━━━━━\n" +
        "🎁 *Drop x2* durante *" + horas + " hora(s)*\n\n" +
        "¡El doble de probabilidad de obtener items raros!\n" +
        "⏳ Termina en: *" + horas + "h*\n\n" +
        "_Usa_ `!rpgexplorar` _para aprovecharlo_ 🗺️";
      const totalDrop = await broadcastGrupos(textoDrop);
      await reply("✅ Evento Drop activado y avisado en *" + totalDrop + "* grupos.");
    },
  },

  // ── !eventoinvasion ───────────────────────
  {
    name: "eventoinvasion",
    alias: ["invasion", "rpginvasion"],
    description: "Activa evento Invasión (enemigos más fuertes, más recompensa) [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, sock, args, from, msg, pushName}) => {
      const horas = parseInt(args[0]) || 3;
      if (horas < 1 || horas > 12) return reply("❌ Horas válidas: 1–12");
      setEventoDB("invasion", {
        tipo: "invasion", nombre: "Invasión Oscura", emoji: "👿",
        multiplicador: 1.5,
        expira: Date.now() + horas * 60 * 60 * 1000,
      });
      await react("👿");
      const textoInv =
        "🚨 *¡INVASIÓN OSCURA!*\n" +
        "━━━━━━━━━━━━━━\n" +
        "👿 Fuerzas del mal han invadido todas las zonas\n\n" +
        "⚠️ Los enemigos son *1.5x más fuertes*\n" +
        "💎 Pero las recompensas son *1.5x mayores*\n" +
        "🎁 Drop rate aumentado al doble\n\n" +
        "⏳ Duración: *" + horas + " hora(s)*\n\n" +
        "_¿Tienes el valor de enfrentarlos?_ ⚔️\n" +
        "_Usa_ `!rpgexplorar [zona]`";
      const totalInv = await broadcastGrupos(textoInv);
      await reply("✅ Invasión activada y avisada en *" + totalInv + "* grupos.");
    },
  },

  // ── !eventoapagar ─────────────────────────
  {
    name: "eventoapagar",
    alias: ["apagarevento", "stopevent"],
    description: "Desactiva todos los eventos activos [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, msg, pushName}) => {
      if (Object.keys(getEventosDB()).length === 0) return reply("❌ No hay eventos activos.");
      const lista = Object.values(getEventosDB()).map(e => e.emoji + " " + e.nombre).join("\n");
      clearEventosDB();
      await react("🔕");
      await reply("🔕 *Eventos desactivados:*\n" + lista);
    },
  },

  // ── !eventostatus ─────────────────────────
  {
    name: "eventostatus",
    alias: ["eventoactivo", "rpgeventos"],
    description: "Ver eventos activos actualmente",
    category: "RPG ⚔️",
    execute: async ({ reply, react, msg, pushName}) => {
      await react("📋");
      const activos = Object.entries(getEventosDB()).filter(([k]) => getEventoActivo(k));
      if (!activos.length) return reply("📋 No hay eventos activos ahora mismo.");
      const lista = activos.map(([, e]) => {
        const minutos = Math.ceil((e.expira - Date.now()) / 60000);
        const horas = minutos >= 60 ? Math.floor(minutos / 60) + "h " + (minutos % 60) + "min" : minutos + " min";
        return e.emoji + " *" + e.nombre + "* — ⏳ " + horas + " restantes";
      }).join("\n");
      await reply("🌟 *EVENTOS ACTIVOS*\n━━━━━━━━━━━━━━\n" + lista);
    },
  },

  // ══════════════════════════════════════════
  // ── Darse XP/Oro a sí mismo (owner) ─────────
  {
    name: "rpgxp",
    alias: ["darmeexp"],
    description: "Darte XP a ti mismo [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const cantidad = parseInt(args[0]);
      if (!cantidad || cantidad <= 0) return reply("❌ Indica la cantidad. Ej: `!rpgxp 9999`");
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const leveledUp = addExp(p, cantidad);
      savePlayer(p);
      await react("⭐");
      return reply(
        `⭐ *+${cantidad} XP*\n━━━━━━━━━━━━━━\n` +
        `XP actual: *${p.exp}*\n` +
        (leveledUp ? `🎉 *¡SUBISTE AL NIVEL ${p.nivel}!*` : `Siguiente nivel: *${p.expMax - p.exp} XP*`)
      );
    },
  },
  {
    name: "rpgoro",
    alias: ["darmeoro"],
    description: "Darte oro a ti mismo [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const cantidad = parseInt(args[0]);
      if (!cantidad || cantidad <= 0) return reply("❌ Indica la cantidad. Ej: `!rpgoro 9999`");
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      p.oro += cantidad;
      savePlayer(p);
      await react("💰");
      return reply(`💰 *+${cantidad} oro*\n━━━━━━━━━━━━━━\nOro total: *${p.oro}*`);
    },
  },

  // OWNER — BOSS
  // ══════════════════════════════════════════

  // ── !rpgbossactivar ───────────────────────
  {
    name: "rpgbossactivar",
    alias: ["activarboss", "spawnboss"],
    description: "Invoca un jefe para que los jugadores lo derroten [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, sock, from, args, msg, pushName}) => {
      if (getBossActivo()) return reply("❌ Ya hay un jefe activo: *" + getBossActivo().nombre + "* con " + getBossActivo().hp + "/" + getBossActivo().hpMax + " HP");
      const bosses = [
        // Nivel 1 — Fácil: stats jugador afectan 10%
        { nombre: "Slime Gigante",            emoji: "🟢", nivel: 1,  hpMax: 800,   atk: 20,  def: 8,   statPct: 0.15, recompensa: { oro: 200,   exp: 150,  drop: "comun"      } },
        // Nivel 2
        { nombre: "Troll del Bosque",         emoji: "🧌", nivel: 2,  hpMax: 2000,  atk: 45,  def: 22,  statPct: 0.15, recompensa: { oro: 450,   exp: 350,  drop: "raro"       } },
        // Nivel 3
        { nombre: "Dragón Joven",             emoji: "🐉", nivel: 3,  hpMax: 4000,  atk: 72,  def: 38,  statPct: 0.15, recompensa: { oro: 800,   exp: 620,  drop: "epico"      } },
        // Nivel 4
        { nombre: "Golem de Hierro",          emoji: "🤖", nivel: 4,  hpMax: 7000,  atk: 100, def: 60,  statPct: 0.15, recompensa: { oro: 1200,  exp: 950,  drop: "epico"      } },
        // Nivel 5
        { nombre: "Lich Eterno",              emoji: "💀", nivel: 5,  hpMax: 11000, atk: 130, def: 80,  statPct: 0.15, recompensa: { oro: 1800,  exp: 1400, drop: "legendario" } },
        // Nivel 6
        { nombre: "Fénix Oscuro",             emoji: "🔥", nivel: 6,  hpMax: 16000, atk: 165, def: 100, statPct: 0.15, recompensa: { oro: 2600,  exp: 2000, drop: "legendario" } },
        // Nivel 7
        { nombre: "Titán del Caos",           emoji: "⚡", nivel: 7,  hpMax: 22000, atk: 200, def: 125, statPct: 0.15, recompensa: { oro: 3500,  exp: 2800, drop: "legendario" } },
        // Nivel 8
        { nombre: "Señor Demonio",            emoji: "👿", nivel: 8,  hpMax: 30000, atk: 240, def: 155, statPct: 0.15, recompensa: { oro: 5000,  exp: 4000, drop: "mitico"     } },
        // Nivel 9
        { nombre: "Dios Caído",               emoji: "🌑", nivel: 9,  hpMax: 42000, atk: 290, def: 190, statPct: 0.15, recompensa: { oro: 7500,  exp: 6000, drop: "mitico"     } },
        // Nivel 10 — Legendario
        { nombre: "ASTAROTH — El Primigenio", emoji: "👁️", nivel: 10, hpMax: 65000, atk: 380, def: 250, statPct: 0.15, recompensa: { oro: 15000, exp: 12000, drop: "mitico" } },
      ];
      const idx = parseInt(args[0]);
      const boss = (!isNaN(idx) && idx >= 1 && idx <= bosses.length)
        ? bosses[idx - 1]
        : bosses[Math.floor(Math.random() * bosses.length)];

      saveBossActivo({ ...boss, hp: boss.hpMax, participantes: {} });

      await react("🐉");
      const nivelEstrellas = "⭐".repeat(boss.nivel) + (boss.nivel === 10 ? " 👁️" : "");
      const dificultadLabel = ["","Fácil","Fácil-Medio","Medio","Medio-Difícil","Difícil","Difícil","Muy Difícil","Muy Difícil","Extremo","LEGENDARIO"][boss.nivel] || "???";
      const textoBoss =
        "⚠️ *¡¡JEFE INVOCADO!!* ⚠️\n" +
        "━━━━━━━━━━━━━━\n" +
        boss.emoji + " *" + boss.nombre + "*\n" +
        "🏆 Nivel *" + boss.nivel + "/10* — " + dificultadLabel + "\n" +
        nivelEstrellas + "\n\n" +
        "❤️ HP: *" + boss.hpMax + "*\n" +
        "⚔️ ATK: *" + boss.atk + "* | 🛡️ DEF: *" + boss.def + "*\n" +
        "🔥 Dificultad escala con *" + Math.round(boss.statPct * 100) + "%* de tus stats\n\n" +
        "🎁 *Recompensa al caer:*\n" +
        "💰 " + boss.recompensa.oro + " oro | ⭐ " + boss.recompensa.exp + " EXP\n" +
        "📦 Drop garantizado: *" + boss.recompensa.drop.toUpperCase() + "*\n\n" +
        "⚔️ Usa `!rpgboss atacar` para atacarlo\n" +
        "_¡Todos los que participen reciben recompensa!_";
      const totalBoss = await broadcastGrupos(textoBoss);
      await reply("✅ Jefe invocado y avisado en *" + totalBoss + "* grupos.");
    },
  },

  // ── !rpgboss atacar ───────────────────────
  {
    name: "rpgboss",
    alias: ["boss"],
    description: "Atacar al jefe activo o ver su estado — !rpgboss [atacar/status]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, sock, from, msg, pushName}) => {
      const sub = (args[0] || "status").toLowerCase();

      if (sub === "status" || sub === "info") {
        if (!getBossActivo()) return reply("❌ No hay ningún jefe activo ahora mismo.\n_El owner puede invocar uno con_ `!rpgbossactivar`");
        const boss = getBossActivo();
        const pct = Math.round((boss.hp / boss.hpMax) * 100);
        const barra = "▓".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
        const participantes = Object.keys(boss.participantes).length;
        await reply(
          "⚔️ *JEFE ACTIVO*\n━━━━━━━━━━━━━━\n" +
          boss.emoji + " *" + boss.nombre + "*\n\n" +
          "❤️ HP: [" + barra + "] " + boss.hp + "/" + boss.hpMax + " (" + pct + "%)\n" +
          "⚔️ ATK: " + boss.atk + " | 🛡️ DEF: " + boss.def + "\n\n" +
          "👥 Participantes: *" + participantes + "*\n\n" +
          "🎁 Recompensa: 💰" + boss.recompensa.oro + " | ⭐" + boss.recompensa.exp + " | Drop " + boss.recompensa.drop.toUpperCase() + "\n\n" +
          "_Usa_ `!rpgboss atacar` _para atacar_"
        );
        return;
      }

      if (sub === "atacar") {
        if (!getBossActivo()) return reply("❌ No hay ningún jefe activo.");
        const p = db.players[sender];
        if (!p?.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
        if (p.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar`.");

        // Cooldown 30 segundos
        const BOSS_CD = 30 * 1000;
        const ahoraBoss = Date.now();
        if (ahoraBoss - (p.bossAtacarCd || 0) < BOSS_CD) {
          const segs = Math.ceil((BOSS_CD - (ahoraBoss - p.bossAtacarCd)) / 1000);
          return reply(`⏳ Puedes volver a atacar en *${segs}s*.`);
        }
        p.bossAtacarCd = ahoraBoss;
        savePlayer(p);

        const boss = getBossActivo();
        let atk = getTotalAtk(p);
        const def = getTotalDef(p);
        const critChance = calcCrit(p);
        const crit = Math.random() * 100 < critChance;

        // Aplicar buff de habilidad si está activo
        let buffTexto = "";
        if (p.buffHabilidad && Date.now() < p.buffHabilidad.expira) {
          const buff = p.buffHabilidad;
          if (buff.tipo === "critico") atk = Math.floor(atk * buff.mult);
          if (buff.tipo === "dano")    atk = Math.floor(atk * buff.mult);
          if (buff.tipo === "multi")   atk = Math.floor(atk * 2.5);
          if (buff.tipo === "drenar")  atk = Math.floor(atk * buff.mult);
          buffTexto = "\n" + buff.emoji + " *¡" + buff.nombre + " activado!*";
          p.buffHabilidad = null;
        }

        // statPct: el % de stats del jugador que influye en la dificultad del boss
        // A mayor nivel de boss, sus stats escalan con los del jugador (parcialmente)
        const statPct = boss.statPct || 0;
        // [NERF] Boss escala con nivel del PJ + 15% de sus stats
        const nivelMult = 1 + (p.nivel - 1) * 0.02; // +2% por nivel del PJ
        const bossAtkEfectivo = Math.floor((boss.atk + getTotalAtk(p) * statPct) * nivelMult);
        const bossDefEfectivo = Math.floor((boss.def + getTotalDef(p) * statPct) * nivelMult);

        // Daño del jugador al boss (contra DEF efectiva del boss)
        const dmgAlBoss = Math.max(1, Math.floor((atk - bossDefEfectivo * 0.3 + Math.random() * 15) * (crit ? 2 : 1)));
        boss.hp = Math.max(0, boss.hp - dmgAlBoss);

        // Daño del boss al jugador (con chance de esquivar)
        const esquivaBoss = Math.random() * 100 < calcDodge(p);
        const dmgAlJugador = esquivaBoss ? 0 : Math.max(1, Math.floor(bossAtkEfectivo - def * 0.4 + Math.random() * 20));
        p.hp = Math.max(0, p.hp - dmgAlJugador);

        // Registrar participante y daño total
        if (!boss.participantes[sender]) boss.participantes[sender] = 0;
        boss.participantes[sender] += dmgAlBoss;

        const pct = Math.round((boss.hp / boss.hpMax) * 100);
        const barra = "▓".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));

        // Boss derrotado
        if (boss.hp <= 0) {
          const participantes = Object.keys(boss.participantes);
          const pool = DROP_POOL[boss.recompensa.drop];

          // Repartir recompensa a todos
          const resMsgs = [];
          for (const jid of participantes) {
            const pp = db.players[jid];
            if (!pp) continue;
            pp.oro += boss.recompensa.oro;
            const leveledUp = addExp(pp, boss.recompensa.exp);
            const itemId = pool[Math.floor(Math.random() * pool.length)];
            pp.inventario[itemId] = (pp.inventario[itemId] || 0) + 1;
            savePlayer(pp);
            resMsgs.push("• @" + jid.split("@")[0] + " → 💰+" + boss.recompensa.oro + " | ⭐+" + boss.recompensa.exp + " | 📦" + (TIENDA[itemId]?.nombre || itemId));
          }

          saveBossActivo(null);
          await react("🏆");
          return await sock.sendMessage(from, {
            text:
              "💥 *¡¡" + boss.emoji + " " + boss.nombre + " HA SIDO DERROTADO!!*\n" +
              "━━━━━━━━━━━━━━\n" +
              "👥 *" + participantes.length + " guerrero(s)* lo vencieron\n\n" +
              "🎁 *Recompensas entregadas:*\n" +
              resMsgs.join("\n") +
              "\n\n🏆 _¡Bien hecho héroes!_",
            mentions: participantes,
          }, { quoted: msg });
        }

        savePlayer(p);
        saveBossActivo(boss);
        await react(esquivaBoss ? "💨" : crit ? "💥" : "⚔️");
        await sock.sendMessage(from, {
          text:
            "⚔️ *@" + sender.split("@")[0] + "* atacó a " + boss.emoji + " *" + boss.nombre + "*\n" +
            (crit ? "💥 *¡CRÍTICO!* " : "") + "Daño: *-" + dmgAlBoss + "*" + buffTexto + "\n" +
            (esquivaBoss ? "💨 *¡ESQUIVASTE* el contraataque del boss!\n" : "💢 " + boss.nombre + " contraataca: *-" + dmgAlJugador + " HP*\n") + "\n" +
            "❤️ Boss: [" + barra + "] " + boss.hp + "/" + boss.hpMax + " (" + pct + "%)\n" +
            "❤️ Tu HP: " + p.hp + "/" + p.hpMax + "\n" +
            "💥 Tu daño total: *" + boss.participantes[sender] + "*",
          mentions: [sender],
        }, { quoted: msg });
        return;
      }

      await reply("❌ Usa: `!rpgboss atacar` o `!rpgboss status`");
    },
  },

  // ── !rpgbossapagar ────────────────────────
  {
    name: "rpgbossapagar",
    alias: ["apagarboss", "stopboss"],
    description: "Elimina el jefe activo sin recompensa [OWNER]",
    category: "RPG ⚔️",
    ownerOnly: true,
    execute: async ({ reply, react, msg, pushName}) => {
      if (!getBossActivo()) return reply("❌ No hay jefe activo.");
      const nombre = getBossActivo().nombre;
      saveBossActivo(null);
      await react("🔕");
      await reply("🔕 Jefe *" + nombre + "* eliminado sin recompensa.");
    },
  },

  // ── Banner Arma Señor Oscuro ──────────────
  {
    name: "gachaarma",
    alias: ["bannerarma", "invocararma", "gachaespada"],
    description: "Banner Espada del Señor Oscuro — !gachaarma [x1/x10]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const sub = (args[0] || "").toLowerCase();
      const pity = getPityBanner(p, "arma");

      if (!sub || sub === "info" || sub === "ver") {
        const texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🗡️ *GACHA SEÑOR OSCURO*  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🌟 *SSR DESTACADO:*\n" +
          "🗡️ *Espada del Señor Oscuro* ★★★★★\n" +
          "   ⚔️+180 | 🛡️+30\n" +
          "   _Forjada en las profundidades del abismo_\n\n" +
          "╭─〔 🎲 *INVOCACIONES* 〕\n" +
          "│ `!gachaarma x1`  → 100💎 | 1 intento\n" +
          "│ `!gachaarma x10` → 1000💎 | 10 intentos\n" +
          "│                  ✅ Garantiza 1 SR+ en x10\n" +
          "╰──────────────────────⬣\n\n" +
          "╭─〔 📊 *RATES* 〕\n" +
          "│ 🌟 SSR Espada del Señor Oscuro: ~1.5%\n" +
          "│ 🟨 SR Armas Épicas: ~8%\n" +
          "│ 🟦 R Armas Raras: ~25%\n" +
          "│ 💰 N Recursos (oro/exp/pociones): ~65%\n" +
          "╰──────────────────────⬣\n\n" +
          `💎 Tus gemas: *${p.gemas || 0}*\n` +
          `🎰 Pity: *${pity}/${BANNER_PITY}* — SSR garantizado al ${BANNER_PITY}\n\n` +
          "_¡Probabilidad AUMENTADA en este banner!_";
        try {
          const { join } = await import("path");
          const { readFile } = await import("fs/promises");
          const { fileURLToPath } = await import("url");
          const __dirname2 = fileURLToPath(new URL(".", import.meta.url));
          const img = await readFile(join(__dirname2, "../../assets/banner-gachaarma.png"));
          await sock.sendMessage(from, { image: img, caption: texto, mimetype: "image/png" }, { quoted: msg });
        } catch {
          await reply(texto);
        }
        return;
      }

      if (!["x1", "x10"].includes(sub)) return reply("❌ Usa: `!gachaarma x1` o `!gachaarma x10`");

      const numTiradas = sub === "x10" ? 10 : 1;
      const costo = sub === "x10" ? 1000 : 100;

      if ((p.gemas || 0) < costo) {
        return reply(
          `❌ Necesitas *${costo}💎* para ${sub}.\n` +
          `Tienes: *${p.gemas || 0}💎*\n\n` +
          `_Gana gemas explorando, en actividades y en la torre._`
        );
      }

      p.gemas -= costo;
      await react("🎰");

      const { resultados, leveledUpGlobal } = tiradaBannerArma(p, numTiradas);
      const ssrs = resultados.filter(r => r.esSSR);

      if (sub === "x10") {
        let texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🗡️ *SEÑOR OSCURO 10x* 🗡️  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n";
        if (ssrs.length > 0) {
          texto += "✨✨✨ *¡¡SSR OBTENIDO!!* ✨✨✨\n";
          for (const s of ssrs) texto += `${s.label}\n${s.display}\n\n`;
        }
        texto += "📦 *Resultados:*\n";
        for (let i = 0; i < resultados.length; i++) {
          const r = resultados[i];
          texto += `${r.esSSR ? "🌟" : "▫️"} ${i + 1}. ${r.label.replace(/\*/g, "")} — ${r.display.replace(/\n\s*/g, " ")}\n`;
        }
        texto += `\n💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityBanner(p, "arma")}/${BANNER_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!* → Nv.${p.nivel}`;
        await reply(texto);
      } else {
        const r = resultados[0];
        let texto = r.esSSR
          ? "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n┃  ✨✨ *¡¡INCREÍBLE SSR!!* ✨✨  ┃\n╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" + `${r.label}\n${r.display}\n\n`
          : `🎰 *SEÑOR OSCURO x1*\n━━━━━━━━━━━━━━\n\n${r.label}\n${r.display}\n\n`;
        texto += `💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityBanner(p, "arma")}/${BANNER_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!*`;
        await reply(texto);
      }
    },
  },

  // ── Banner Mascota ────────────────────────
  {
    name: "gachamascota",
    alias: ["bannermascota", "invocarmascota"],
    description: "Banner Dragón Ancestral — !gachamascota [x1/x10]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const sub = (args[0] || "").toLowerCase();
      const pity = getPityBanner(p, "mascota");

      if (!sub || sub === "info" || sub === "ver") {
        const texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🐲 *GACHA DRAGÓN ANCESTRAL*  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🌟 *SSR DESTACADO:*\n" +
          "🐲 *Mini Dragón Ancestral* ★★★★★\n" +
          "   ⚔️+30 | 🛡️+18 | 🎯+18%\n" +
          "   _Dragón legendario de poder ancestral_\n\n" +
          "╭─〔 🎲 *INVOCACIONES* 〕\n" +
          "│ `!gachamascota x1`  → 10💎 | 1 intento\n" +
          "│ `!gachamascota x10` → 500💎 | 10 intentos\n" +
          "│                  ✅ Garantiza 1 SR+ en x10\n" +
          "╰──────────────────────⬣\n\n" +
          "╭─〔 📊 *RATES* 〕\n" +
          "│ 🌟 SSR Mini Dragón Ancestral: ~1.5%\n" +
          "│ 🟨 SR Mascotas Épicas: ~8%\n" +
          "│ 🟦 R Mascotas Raras: ~25%\n" +
          "│ 💰 N Recursos: ~65%\n" +
          "╰──────────────────────⬣\n\n" +
          `💎 Tus gemas: *${p.gemas || 0}*\n` +
          `🎰 Pity: *${pity}/${BANNER_PITY}* — SSR garantizado al ${BANNER_PITY}\n\n` +
          "_¡Probabilidad AUMENTADA en este banner!_";
        try {
          const { join } = await import("path");
          const { readFile } = await import("fs/promises");
          const { fileURLToPath } = await import("url");
          const __dirname2 = fileURLToPath(new URL(".", import.meta.url));
          const img = await readFile(join(__dirname2, "../../assets/banner-gachamascota.png"));
          await sock.sendMessage(from, { image: img, caption: texto, mimetype: "image/png" }, { quoted: msg });
        } catch {
          await reply(texto);
        }
        return;
      }

      if (!["x1", "x10"].includes(sub)) return reply("❌ Usa: `!gachamascota x1` o `!gachamascota x10`");

      const numTiradas = sub === "x10" ? 10 : 1;
      const costo = sub === "x10" ? BANNER_COSTOS.x10 : BANNER_COSTOS.x1;

      if ((p.gemas || 0) < costo) {
        return reply(
          `❌ Necesitas *${costo}💎* para ${sub}.\n` +
          `Tienes: *${p.gemas || 0}💎*\n\n` +
          `_Gana gemas explorando, en actividades y en la torre._`
        );
      }

      p.gemas -= costo;
      await react("🎰");

      const { resultados, leveledUpGlobal } = tiradaBannerMascota(p, numTiradas);
      const ssrs = resultados.filter(r => r.esSSR);

      if (sub === "x10") {
        let texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🐲 *DRAGÓN ANCESTRAL 10x* 🐲  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n";
        if (ssrs.length > 0) {
          texto += "✨✨✨ *¡¡SSR OBTENIDO!!* ✨✨✨\n";
          for (const s of ssrs) texto += `${s.label}\n${s.display}\n\n`;
        }
        texto += "📦 *Resultados:*\n";
        for (let i = 0; i < resultados.length; i++) {
          const r = resultados[i];
          texto += `${r.esSSR ? "🌟" : "▫️"} ${i + 1}. ${r.label.replace(/\*/g, "")} — ${r.display.replace(/\n\s*/g, " ")}\n`;
        }
        texto += `\n💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityBanner(p, "mascota")}/${BANNER_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!* → Nv.${p.nivel}`;
        await reply(texto);
      } else {
        const r = resultados[0];
        let texto = r.esSSR
          ? "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n┃  ✨✨ *¡¡INCREÍBLE SSR!!* ✨✨  ┃\n╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" + `${r.label}\n${r.display}\n\n`
          : `🎰 *DRAGÓN ANCESTRAL x1*\n━━━━━━━━━━━━━━\n\n${r.label}\n${r.display}\n\n`;
        texto += `💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityBanner(p, "mascota")}/${BANNER_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!*`;
        await reply(texto);
      }
    },
  },


  // ── SSR Goku — Presumir mascota ───────────
  {
    name: "ssrgoku",
    alias: ["monogoku"],
    description: "Ver la carta SSR Mono Goku y si la obtuviste",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const m = EVENTO_MONO_GOKU;
      const obtenido = !!(p.inventario?.[m.id] > 0);
      const texto =
        `${m.emoji} *${m.nombre}* ★★★★★\n` +
        "━━━━━━━━━━━━━━\n" +
        `⚔️ ATK +${m.bonus.atk} | 🛡️ DEF +${m.bonus.def} | 🎯 CRIT +${m.bonus.crit}%\n` +
        `📖 _${m.desc}_\n\n` +
        (obtenido
          ? "✅ *¡Obtenido!* Este guerrero Saiyan está en tu equipo."
          : "❌ _Aún no obtenido. Usa `!gachaevento` para invocar._");
      await react(obtenido ? "✅" : "❌");
      try {
        const { join } = await import("path");
        const { readFile } = await import("fs/promises");
        const { fileURLToPath } = await import("url");
        const __dirname2 = fileURLToPath(new URL(".", import.meta.url));
        const img = await readFile(join(__dirname2, "../../assets/mono-goku-ssr.png"));
        await sock.sendMessage(from, { image: img, caption: texto, mimetype: "image/png" }, { quoted: msg });
      } catch {
        await reply(texto);
      }
    },
  },
  // ── Banner Armadura ───────────────────────
  {
    name: "ssrgoku",
    alias: ["gachaevento", "invocacionz", "monogoku"],
    description: "Invocación Z — Banner colaboración Mono Goku SSR",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const sub  = (args[0] || "").toLowerCase();
      const pity = getPityEvento(p);
      const m    = EVENTO_MONO_GOKU;

      // ── Ver / Info / sin argumento ──
      if (!sub || sub === "info" || sub === "ver") {
        const obtenido = p.inventario?.[m.id] > 0;
        const texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🐒 *INVOCACIÓN Z — EVENTO*  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🌟 *SSR DESTACADO:*\n" +
          `${m.emoji} *${m.nombre}* ★★★★★\n` +
          `   ⚔️ ATK +${m.bonus.atk} | 🛡️ DEF +${m.bonus.def} | 🎯 CRIT +${m.bonus.crit}%\n` +
          `   _${m.desc}_\n\n` +
          `${obtenido ? "✅ *¡Ya obtuviste este SSR!*" : "❌ _Aún no obtenido_"}\n\n` +
          "╭─〔 🎲 *INVOCACIONES* 〕\n" +
          "│ `!ssrgoku x1`   → 150💎 | 1 intento\n" +
          "│ `!ssrgoku x100` → 1500💎 | 100 intentos\n" +
          "│               ✅ Garantiza SSR al 100\n" +
          "╰──────────────────────⬣\n\n" +
          "╭─〔 📊 *RATES* 〕\n" +
          `│ 🌟 SSR ${m.nombre}: ~1.5%\n` +
          "│ 💰 SR Oro/EXP: ~8%\n" +
          "│ 📦 N Recursos (oro/exp): ~90.5%\n" +
          "╰──────────────────────⬣\n\n" +
          `💎 Tus gemas: *${p.gemas || 0}*\n` +
          `🎰 Pity: *${pity}/${EVENTO_PITY}* — SSR garantizado al ${EVENTO_PITY}\n\n` +
          "_¡Banner de colaboración por tiempo limitado!_";
        try {
          const { join } = await import("path");
          const { readFile } = await import("fs/promises");
          const { fileURLToPath } = await import("url");
          const __dirname2 = fileURLToPath(new URL(".", import.meta.url));
          const img = await readFile(join(__dirname2, "../../assets/mono-goku-ssr.png"));
          await sock.sendMessage(from, { image: img, caption: texto, mimetype: "image/png" }, { quoted: msg });
        } catch {
          await reply(texto);
        }
        return;
      }

      if (!["x1", "x100"].includes(sub)) return reply("❌ Usa: `!ssrgoku x1` o `!ssrgoku x100`");

      const numTiradas = sub === "x100" ? 100 : 1;
      const costo      = sub === "x100" ? EVENTO_COSTOS.x100 : EVENTO_COSTOS.x1;

      if ((p.gemas || 0) < costo) {
        return reply(
          `❌ Necesitas *${costo}💎* para ${sub}.\n` +
          `Tienes: *${p.gemas || 0}💎*\n\n` +
          `_Gana gemas explorando, en la torre y dungeons._`
        );
      }

      p.gemas -= costo;
      await react("🎰");

      const { resultados, leveledUpGlobal } = tiradaBannerEvento(p, numTiradas);
      const ssrs = resultados.filter(r => r.esSSR);

      if (sub === "x100") {
        let texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🐒 *INVOCACIÓN Z 100x* 🐒  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n";
        if (ssrs.length > 0) {
          texto += "✨✨✨ *¡¡MONO GOKU SSR OBTENIDO!!* ✨✨✨\n\n";
          for (const s of ssrs) texto += `${s.label}\n${s.display}\n\n`;
        }
        // Solo mostrar resumen de recursos (no los 100 uno a uno)
        const totalOro = resultados.filter(r => r.tipo === "oro").reduce((a, r) => a + (r.cantidad || 0), 0);
        const totalExp = resultados.filter(r => r.tipo === "exp").reduce((a, r) => a + (r.cantidad || 0), 0);
        if (totalOro > 0) texto += `💰 Oro total: *+${totalOro}*\n`;
        if (totalExp > 0) texto += `⭐ EXP total: *+${totalExp}*\n`;
        texto += `\n💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityEvento(p)}/${EVENTO_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!* → Nv.${p.nivel}`;
        await reply(texto);
      } else {
        const r = resultados[0];
        let texto = r.esSSR
          ? "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n┃  ✨✨ *¡¡MONO GOKU SSR!!* ✨✨  ┃\n╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" + `${r.label}\n${r.display}\n\n`
          : `🎰 *INVOCACIÓN Z x1*\n━━━━━━━━━━━━━━\n\n${r.label}\n${r.display}\n\n`;
        texto += `💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityEvento(p)}/${EVENTO_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!*`;
        await reply(texto);
      }
    },
  },

  // ── Gacha Evento — Invocación Z ─────────────
  {
    name: "gachaevento",
    alias: ["invocacionz", "bannergoku"],
    description: "Invocación Z — Banner colaboración Mono Goku SSR",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const sub  = (args[0] || "").toLowerCase();
      const pity = getPityEvento(p);
      const m    = EVENTO_MONO_GOKU;

      // ── Ver info / sin argumento ──
      if (!sub || sub === "info" || sub === "ver") {
        const texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🐒 *INVOCACIÓN Z — EVENTO*  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🌟 *SSR DESTACADO:*\n" +
          `${m.emoji} *${m.nombre}* ★★★★★\n` +
          `   ⚔️ ATK +${m.bonus.atk} | 🛡️ DEF +${m.bonus.def} | 🎯 CRIT +${m.bonus.crit}%\n` +
          `   _${m.desc}_\n\n` +
          "╭─〔 🎲 *INVOCACIONES* 〕\n" +
          "│ `!gachaevento x1`   → 150💎 | 1 intento\n" +
          "│ `!gachaevento x100` → 1500💎 | 100 intentos\n" +
          "│                ✅ SSR garantizado al 100\n" +
          "╰──────────────────────⬣\n\n" +
          "╭─〔 📊 *RATES* 〕\n" +
          `│ 🌟 SSR ${m.nombre}: ~1.5%\n` +
          "│ 💰 SR Oro/EXP Grande: ~8%\n" +
          "│ 📦 N Recursos (oro/exp): ~90.5%\n" +
          "╰──────────────────────⬣\n\n" +
          `💎 Tus gemas: *${p.gemas || 0}*\n` +
          `🎰 Pity: *${pity}/${EVENTO_PITY}* — SSR garantizado al ${EVENTO_PITY}\n\n` +
          "_¡Banner de colaboración por tiempo limitado!_";
        try {
          const { join } = await import("path");
          const { readFile } = await import("fs/promises");
          const { fileURLToPath } = await import("url");
          const __dirname2 = fileURLToPath(new URL(".", import.meta.url));
          const img = await readFile(join(__dirname2, "../../assets/banner-invocacionz.png"));
          await sock.sendMessage(from, { image: img, caption: texto, mimetype: "image/png" }, { quoted: msg });
        } catch {
          await reply(texto);
        }
        return;
      }

      if (!["x1", "x100"].includes(sub)) return reply("❌ Usa: `!gachaevento x1` o `!gachaevento x100`");

      const numTiradas = sub === "x100" ? 100 : 1;
      const costo      = sub === "x100" ? EVENTO_COSTOS.x100 : EVENTO_COSTOS.x1;

      if ((p.gemas || 0) < costo) {
        return reply(
          `❌ Necesitas *${costo}💎* para ${sub}.\n` +
          `Tienes: *${p.gemas || 0}💎*\n\n` +
          `_Gana gemas explorando, en la torre y dungeons._`
        );
      }

      p.gemas -= costo;
      await react("🎰");

      const { resultados, leveledUpGlobal } = tiradaBannerEvento(p, numTiradas);
      const ssrs = resultados.filter(r => r.esSSR);

      if (sub === "x100") {
        let texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🐒 *INVOCACIÓN Z 100x* 🐒  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n";
        if (ssrs.length > 0) {
          texto += "✨✨✨ *¡¡MONO GOKU SSR OBTENIDO!!* ✨✨✨\n\n";
          for (const s of ssrs) texto += `${s.label}\n${s.display}\n\n`;
        }
        const totalOro = resultados.filter(r => r.tipo === "oro").reduce((a, r) => a + (r.cantidad || 0), 0);
        const totalExp = resultados.filter(r => r.tipo === "exp").reduce((a, r) => a + (r.cantidad || 0), 0);
        if (totalOro > 0) texto += `💰 Oro total: *+${totalOro}*\n`;
        if (totalExp > 0) texto += `⭐ EXP total: *+${totalExp}*\n`;
        texto += `\n💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityEvento(p)}/${EVENTO_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!* → Nv.${p.nivel}`;
        await reply(texto);
      } else {
        const r = resultados[0];
        let texto = r.esSSR
          ? "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n┃  ✨✨ *¡¡MONO GOKU SSR!!* ✨✨  ┃\n╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" + `${r.label}\n${r.display}\n\n`
          : `🎰 *INVOCACIÓN Z x1*\n━━━━━━━━━━━━━━\n\n${r.label}\n${r.display}\n\n`;
        texto += `💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityEvento(p)}/${EVENTO_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!*`;
        await reply(texto);
      }
    },
  },


  // ── SSR Goku — Presumir mascota ───────────
  {
    name: "ssrgoku",
    alias: ["monogoku"],
    description: "Ver la carta SSR Mono Goku y si la obtuviste",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const m = EVENTO_MONO_GOKU;
      const obtenido = !!(p.inventario?.[m.id] > 0);
      const texto =
        `${m.emoji} *${m.nombre}* ★★★★★\n` +
        "━━━━━━━━━━━━━━\n" +
        `⚔️ ATK +${m.bonus.atk} | 🛡️ DEF +${m.bonus.def} | 🎯 CRIT +${m.bonus.crit}%\n` +
        `📖 _${m.desc}_\n\n` +
        (obtenido
          ? "✅ *¡Obtenido!* Este guerrero Saiyan está en tu equipo."
          : "❌ _Aún no obtenido. Usa `!gachaevento` para invocar._");
      await react(obtenido ? "✅" : "❌");
      try {
        const { join } = await import("path");
        const { readFile } = await import("fs/promises");
        const { fileURLToPath } = await import("url");
        const __dirname2 = fileURLToPath(new URL(".", import.meta.url));
        const img = await readFile(join(__dirname2, "../../assets/mono-goku-ssr.png"));
        await sock.sendMessage(from, { image: img, caption: texto, mimetype: "image/png" }, { quoted: msg });
      } catch {
        await reply(texto);
      }
    },
  },
  // ── Banner Armadura ───────────────────────
  {
    name: "gachaarmadura",
    alias: ["bannerarmadura", "invocararmadura"],
    description: "Banner Peto Caballero Oscuro — !gachaarmadura [x1/x10]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, sock, from, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const sub = (args[0] || "").toLowerCase();
      const pity = getPityBanner(p, "armadura");

      if (!sub || sub === "info" || sub === "ver") {
        const texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🖤 *GACHA CABALLERO OSCURO*  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🌟 *SSR DESTACADO:*\n" +
          "🖤 *Peto Caballero Oscuro* ★★★★★\n" +
          "   ⚔️+20 | 🛡️+130\n" +
          "   _Armadura forjada en las tinieblas eternas_\n\n" +
          "╭─〔 🎲 *INVOCACIONES* 〕\n" +
          "│ `!gachaarmadura x1`  → 10💎 | 1 intento\n" +
          "│ `!gachaarmadura x10` → 500💎 | 10 intentos\n" +
          "│                    ✅ Garantiza 1 SR+ en x10\n" +
          "╰──────────────────────⬣\n\n" +
          "╭─〔 📊 *RATES* 〕\n" +
          "│ 🌟 SSR Peto Caballero Oscuro: ~1.5%\n" +
          "│ 🟨 SR Armaduras Épicas: ~8%\n" +
          "│ 🟦 R Armaduras Raras: ~25%\n" +
          "│ 💰 N Recursos: ~65%\n" +
          "╰──────────────────────⬣\n\n" +
          `💎 Tus gemas: *${p.gemas || 0}*\n` +
          `🎰 Pity: *${pity}/${BANNER_PITY}* — SSR garantizado al ${BANNER_PITY}\n\n` +
          "_¡Probabilidad AUMENTADA en este banner!_";
        try {
          const { join } = await import("path");
          const { readFile } = await import("fs/promises");
          const { fileURLToPath } = await import("url");
          const __dirname2 = fileURLToPath(new URL(".", import.meta.url));
          const img = await readFile(join(__dirname2, "../../assets/banner-gachaarmadura.png"));
          await sock.sendMessage(from, { image: img, caption: texto, mimetype: "image/png" }, { quoted: msg });
        } catch {
          await reply(texto);
        }
        return;
      }

      if (!["x1", "x10"].includes(sub)) return reply("❌ Usa: `!gachaarmadura x1` o `!gachaarmadura x10`");

      const numTiradas = sub === "x10" ? 10 : 1;
      const costo = sub === "x10" ? BANNER_COSTOS.x10 : BANNER_COSTOS.x1;

      if ((p.gemas || 0) < costo) {
        return reply(
          `❌ Necesitas *${costo}💎* para ${sub}.\n` +
          `Tienes: *${p.gemas || 0}💎*\n\n` +
          `_Gana gemas explorando, en actividades y en la torre._`
        );
      }

      p.gemas -= costo;
      await react("🎰");

      const { resultados, leveledUpGlobal } = tiradaBannerArmadura(p, numTiradas);
      const ssrs = resultados.filter(r => r.esSSR);

      if (sub === "x10") {
        let texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🖤 *CABALLERO OSCURO 10x* 🖤  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n";
        if (ssrs.length > 0) {
          texto += "✨✨✨ *¡¡SSR OBTENIDO!!* ✨✨✨\n";
          for (const s of ssrs) texto += `${s.label}\n${s.display}\n\n`;
        }
        texto += "📦 *Resultados:*\n";
        for (let i = 0; i < resultados.length; i++) {
          const r = resultados[i];
          texto += `${r.esSSR ? "🌟" : "▫️"} ${i + 1}. ${r.label.replace(/\*/g, "")} — ${r.display.replace(/\n\s*/g, " ")}\n`;
        }
        texto += `\n💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityBanner(p, "armadura")}/${BANNER_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!* → Nv.${p.nivel}`;
        await reply(texto);
      } else {
        const r = resultados[0];
        let texto = r.esSSR
          ? "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n┃  ✨✨ *¡¡INCREÍBLE SSR!!* ✨✨  ┃\n╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" + `${r.label}\n${r.display}\n\n`
          : `🎰 *CABALLERO OSCURO x1*\n━━━━━━━━━━━━━━\n\n${r.label}\n${r.display}\n\n`;
        texto += `💎 Gemas: *${p.gemas}* | 🎰 Pity: *${getPityBanner(p, "armadura")}/${BANNER_PITY}*`;
        if (leveledUpGlobal) texto += `\n🎉 *¡Subiste de nivel!*`;
        await reply(texto);
      }
    },
  },

  // ── Torre de los Elegidos ─────────────────
  {
    name: "rpgtorre",
    alias: ["torre", "towerrpg"],
    description: "Torre de los Elegidos — submenú del evento",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName, sock, from }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      await react("🗼");
      const reg = p && p.clase;
      const texto = (
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   🗼 *TORRE DE LOS ELEGIDOS* 🗼   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "⚔️ *¿Tienes lo que se necesita?*\n" +
        "_En el corazón del mundo conocido se alza una torre sin fin._\n" +
        "_Cien pisos. Cien pruebas. Solo los más fuertes llegan a la cima._\n" +
        "_Cada cinco pisos, un jefe aguarda. Cada derrota te devuelve al inicio._\n" +
        "_¿Entrarás solo... o forjarás una alianza?_\n\n" +
        "╭─〔 📋 *REGLAS* 〕\n" +
        "│ 🗼 100 pisos en total\n" +
        "│ ⚔️ Jefe cada 5 pisos (piso 5, 10, 15...100)\n" +
        "│ 📈 Dificultad aumenta con cada piso\n" +
        "│ 💾 Tu progreso se guarda al superar cada piso\n" +
        "│ 💀 Si mueres, vuelves al piso 1 (no pierdes inventario)\n" +
        "│ 👥 Máximo 3 jugadores por grupo\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 🎁 *RECOMPENSAS* 〕\n" +
        "│ 💰 Oro y EXP por cada piso superado\n" +
        "│ 💎 Gemas extra al vencer jefes\n" +
        "│ 🌟 Items exclusivos de la torre\n" +
        "│ 👑 Recompensa legendaria al completar los 100 pisos\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 🎮 *COMANDOS* 〕\n" +
        "│ `!rpgtorre` → Ver este menú\n" +
        "│ `!torrentrar` → Entrar solo a la torre\n" +
        "│ `!invitartorre @usuario` → Invitar a un jugador\n" +
        "│ `!torreaceptar` → Aceptar una invitación\n" +
        "│ `!torregrupo` → Ver tu grupo actual\n" +
        "│ `!torreavanzar` → Avanzar al siguiente piso\n" +
        "│ `!torreabandonar` → Salir de la torre\n" +
        "╰──────────────────────⬣\n\n" +
        (reg ? "📍 *Tu progreso:* Piso máximo alcanzado: *" + (p.torrePisoMax || 0) + "/100*" : "⚠️ Necesitas un personaje. Usa `!rpgregistro`.")
      );
      try {
        const { join } = await import("path");
        const { readFile } = await import("fs/promises");
        const { fileURLToPath } = await import("url");
        const __d = fileURLToPath(new URL(".", import.meta.url));
        const img = await readFile(join(__d, "../../assets/torre/torre.png"));
        await sock.sendMessage(from, { image: img, caption: texto, mimetype: "image/png" }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: texto }, { quoted: msg });
      }
    },
  },


  // ── Torre: Entrar solo ────────────────────
  {
    name: "torrentrar",
    alias: ["torreentrar", "rpgtorreentrar"],
    description: "Entrar solo a la Torre de los Elegidos",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Necesitas un personaje. Usa `!rpgregistro`.");
      const t = getTorreEstado(p);
      if (t.activa) return reply("⚠️ Ya estás en la torre (Piso " + t.pisoActual + "). Usa `!torreavanzar` para continuar.");
      const ahora = Date.now();
      if (t.muerteTs && ahora - t.muerteTs < TORRE_COOLDOWN_MUERTE) {
        const min = Math.ceil((TORRE_COOLDOWN_MUERTE - (ahora - t.muerteTs)) / 60000);
        return reply("💀 Moriste recientemente. Podrás reintentar en *" + min + " minutos*.");
      }
      // Iniciar torre — si tiene grupo, sincronizar a todos los miembros
      t.activa = true;
      t.pisoActual = 1;
      t.enemigo = null;
      t.combate = null;
      // Validar que el grupoId sigue existiendo
      if (t.grupoId && !getTorreGrupo(t.grupoId)) t.grupoId = null;
      p.torre = t;
      savePlayer(p);

      const grupoLider = t.grupoId ? getTorreGrupo(t.grupoId) : null;
      if (grupoLider) {
        for (const jid of grupoLider.miembros) {
          if (jid === sender) continue;
          const mp = getPlayer(jid, null);
          if (!mp.clase) continue;
          const mt = getTorreEstado(mp);
          mt.activa = true;
          mt.pisoActual = 1;
          mt.grupoId = t.grupoId;
          mt.combate = null;
          mp.torre = mt;
          savePlayer(mp);
        }
      }

      await react("🗼");
      await reply(
        "🗼 *¡Entraste a la Torre de los Elegidos!*\n━━━━━━━━━━━━━━\n" +
        "📍 Piso actual: *1 / 100*\n" +
        "🏆 Tu récord: Piso *" + (t.pisoMax || 0) + "*\n\n" +
        (grupoLider ? "👥 Grupo sincronizado (" + grupoLider.miembros.length + " miembros). ¡Todos pueden usar `!torreatacar`!\n" : "") +
        "⚔️ Usa `!torreavanzar` para enfrentar al enemigo del piso.\n" +
        "🚪 Usa `!torreabandonar` para salir (conservas tu progreso hasta el último piso superado)."
      );
    },
  },

  // ── Torre: Invitar jugador ────────────────
  {
    name: "invitartorre",
    alias: ["torreinvitar"],
    description: "Invitar a un jugador a tu grupo de torre — !invitartorre @usuario",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName, mentions }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const t = getTorreEstado(p);

      const targetId = (msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [])[0]
        || (mentions && mentions[0]);
      if (!targetId) return reply("❌ Menciona a un jugador. Ej: `!invitartorre @usuario`");
      if (targetId === sender) return reply("❌ No puedes invitarte a ti mismo.");

      const target = getPlayer(targetId, null);
      if (!target.clase) return reply("❌ Ese jugador no tiene personaje.");
      // Verificar que el target no esté ya en otro grupo
      const targetTorre = getTorreEstado(target);
      if (targetTorre.grupoId) {
        const grupoTarget = getTorreGrupo(targetTorre.grupoId);
        if (grupoTarget && grupoTarget.miembros.includes(targetId)) {
          return reply("❌ Ese jugador ya está en un grupo de torre.");
        }
        // grupoId colgado (grupo no existe o el jugador no está en sus miembros), limpiarlo
        targetTorre.grupoId = null;
        target.torre = targetTorre;
        savePlayer(target);
      }

      // Verificar o crear grupo
      let grupoId = t.grupoId;
      let grupo = grupoId ? getTorreGrupo(grupoId) : null;

      if (!grupo) {
        grupoId = "torre_" + sender.split("@")[0] + "_" + Date.now();
        grupo = { id: grupoId, lider: sender, miembros: [sender], piso: 1, activo: false };
      }
      if (grupo.lider !== sender) return reply("❌ Solo el líder puede invitar.");
      if (grupo.miembros.length >= TORRE_MAX_GRUPO) return reply("❌ El grupo ya tiene el máximo de " + TORRE_MAX_GRUPO + " jugadores.");
      if (grupo.miembros.includes(targetId)) return reply("❌ Ese jugador ya está en tu grupo.");

      // Guardar invitación
      saveTorreInvite(targetId, { grupoId, de: sender, nombreDe: p.nombre || sender.split("@")[0], ts: Date.now() });
      saveTorreGrupo(grupoId, grupo);

      // Actualizar grupoId del líder
      t.grupoId = grupoId;
      p.torre = t;
      savePlayer(p);

      await react("📨");
      await reply(
        "📨 *Invitación enviada*\n━━━━━━━━━━━━━━\n" +
        "👤 Invitaste a *@" + targetId.split("@")[0] + "* a tu grupo.\n" +
        "⏳ Tiene *2 minutos* para aceptar con `!torreaceptar`."
      );
    },
  },

  // ── Torre: Aceptar invitación ─────────────
  {
    name: "torreaceptar",
    alias: ["aceptartorre"],
    description: "Aceptar invitación a grupo de torre",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");

      const invites = getTorreInvites();
      const invite = invites[sender];
      if (!invite) return reply("❌ No tienes invitaciones pendientes.");
      if (Date.now() - invite.ts > TORRE_INVITE_TIMEOUT) {
        saveTorreInvite(sender, null);
        return reply("❌ La invitación expiró.");
      }

      const grupo = getTorreGrupo(invite.grupoId);
      if (!grupo) { saveTorreInvite(sender, null); return reply("❌ El grupo ya no existe."); }
      if (grupo.miembros.length >= TORRE_MAX_GRUPO) { saveTorreInvite(sender, null); return reply("❌ El grupo está lleno."); }

      grupo.miembros.push(sender);
      saveTorreGrupo(invite.grupoId, grupo);
      saveTorreInvite(sender, null);

      const t = getTorreEstado(p);
      t.grupoId = invite.grupoId;

      // Sincronizar estado de torre con el líder
      const liderPlayer = getPlayer(grupo.lider, null);
      const liderTorre = getTorreEstado(liderPlayer);
      if (liderTorre.activa) {
        t.activa = true;
        t.pisoActual = liderTorre.pisoActual;
      }

      p.torre = t;
      savePlayer(p);

      await react("✅");
      await reply(
        "✅ *¡Te uniste al grupo de " + invite.nombreDe + "!*\n━━━━━━━━━━━━━━\n" +
        "👥 Miembros: *" + grupo.miembros.length + " / " + TORRE_MAX_GRUPO + "*\n" +
        (liderTorre.activa
          ? "⚔️ El grupo ya está en la torre (Piso " + liderTorre.pisoActual + "). Usa `!torreatacar` para unirte al combate."
          : "El líder puede iniciar con `!torrentrar` o ya dentro con `!torreavanzar`.")
      );
    },
  },

  // ── Torre: Ver grupo / Salir de grupo ─────
  {
    name: "torregrupo",
    alias: ["rpgtorregrupo"],
    description: "Ver tu grupo actual de torre. Usa `!torregrupo salir` para abandonarlo.",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const t = getTorreEstado(p);

      // ── Subcomando: salir ──
      const args = (msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || "").trim().split(/\s+/);
      const sub = args[1]?.toLowerCase();

      if (sub === "salir") {
        if (!t.grupoId) return reply("👤 No estás en ningún grupo.");
        const grupo = getTorreGrupo(t.grupoId);

        // Grupo no existe o el jugador ya no está en sus miembros — solo limpiar grupoId propio
        if (!grupo || !grupo.miembros.includes(sender)) {
          t.grupoId = null;
          p.torre = t;
          savePlayer(p);
          await react("🚪");
          return reply("🚪 Saliste. Ya puedes unirte a otro grupo o jugar en solitario.");
        }

        const esLider = grupo.lider === sender;

        if (esLider) {
          // El líder disuelve el grupo: limpiar grupoId de todos los miembros
          for (const jid of grupo.miembros) {
            const m = getPlayer(jid, null);
            if (m) {
              const mt = getTorreEstado(m);
              mt.grupoId = null;
              m.torre = mt;
              savePlayer(m);
            }
          }
          saveTorreGrupo(t.grupoId, null);
          await react("💔");
          return reply(
            "💔 *Grupo disuelto*\n━━━━━━━━━━━━━━\n" +
            "El líder abandonó el grupo. Todos los miembros quedaron libres."
          );
        } else {
          // Miembro normal sale
          grupo.miembros = grupo.miembros.filter(id => id !== sender);
          saveTorreGrupo(t.grupoId, grupo);
          t.grupoId = null;
          p.torre = t;
          savePlayer(p);
          await react("🚪");
          return reply(
            "🚪 *Saliste del grupo*\n━━━━━━━━━━━━━━\n" +
            "Ahora eres libre de unirte a otro grupo o jugar en solitario."
          );
        }
      }

      // ── Ver grupo (comportamiento original) ──
      if (!t.grupoId) return reply("👤 Estás solo. Usa `!invitartorre @usuario` para formar grupo.");
      const grupo = getTorreGrupo(t.grupoId);
      if (!grupo || !grupo.miembros.includes(sender)) {
        // grupo no existe o el jugador ya no está en sus miembros — limpiar grupoId colgado
        t.grupoId = null;
        p.torre = t;
        savePlayer(p);
        return reply("👤 Estás solo. Usa `!invitartorre @usuario` para formar grupo.");
      }
      const lista = grupo.miembros.map((id) => {
        const m = getPlayer(id, null);
        return (id === grupo.lider ? "👑" : "⚔️") + " " + (m.nombre || id.split("@")[0]) + " Nv." + (m.nivel || 1);
      }).join("\n");
      await react("👥");
      await reply(
        "👥 *GRUPO DE TORRE*\n━━━━━━━━━━━━━━\n" +
        lista + "\n\n" +
        "📍 Piso del grupo: *" + (grupo.piso || 1) + "*\n" +
        (grupo.lider === sender
          ? "✅ Eres el líder. Usa `!torreavanzar` para avanzar.\n💡 Usa `!torregrupo salir` para disolver el grupo."
          : "⏳ Espera que el líder avance.\n💡 Usa `!torregrupo salir` para abandonar el grupo.")
      );
    },
  },

  // ── Torre: Avanzar (líder inicia el piso) ─
  {
    name: "torreavanzar",
    alias: ["rpgtorreavanzar"],
    description: "Iniciar el combate del siguiente piso (solo el líder)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName, sock, from }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const t = getTorreEstado(p);
      if (!t.activa) return reply("❌ No estás en la torre. Usa `!torrentrar`.");

      let grupo = t.grupoId ? getTorreGrupo(t.grupoId) : null;
      const esLider = !grupo || grupo.lider === sender;
      if (grupo && !esLider) return reply("⏳ Solo el líder puede avanzar. Usa `!torreatacar` para atacar al enemigo actual.");

      const combateActivo = grupo ? grupo.combate : t.combate;
      if (combateActivo && combateActivo.hp > 0) {
        return reply(
          "⚔️ *Ya hay un combate activo en el piso " + t.pisoActual + "*\n" +
          combateActivo.emoji + " *" + combateActivo.nombre + "* — HP: *" + combateActivo.hp + " / " + combateActivo.hpMax + "*\n" +
          "Usa `!torreatacar` para atacar."
        );
      }

      const piso = t.pisoActual;
      const jefe = getTorreJefe(piso);
      const enemigo = calcTorreEnemigo(piso, p.hpMax, getTotalAtk(p), getTotalDef(p));

      if (grupo) {
        grupo.combate = { ...enemigo, pisoOrigen: piso };
        saveTorreGrupo(t.grupoId, grupo);
      } else {
        t.combate = { ...enemigo, pisoOrigen: piso };
        p.torre = t;
        savePlayer(p);
      }

      if (jefe) {
        const bossTexto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  ⚠️ *¡JEFE DE PISO " + piso + "!* ⚠️  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          jefe.emoji + " *" + jefe.nombre.toUpperCase() + "*\n\n" +
          "╭─〔 📖 *DESCRIPCIÓN* 〕\n" +
          "│ _" + jefe.desc + "_\n" +
          "╰──────────────────────⬣\n\n" +
          "╭─〔 📊 *STATS* 〕\n" +
          "│ ❤️ HP:  *" + enemigo.hp + "*\n" +
          "│ ⚔️ ATK: *" + enemigo.atk + "*\n" +
          "│ 🛡️ DEF: *" + enemigo.def + "*\n" +
          "│ 💎 Gemas: *" + jefe.gemas + "*\n" +
          "│ ✨ EXP:   *" + jefe.exp + "*\n" +
          "│ 💰 Oro:   *" + jefe.oro[0] + " – " + jefe.oro[1] + "*\n" +
          (jefe.orbesAzul   ? "│ 🔵 Orbes Azul:   *" + jefe.orbesAzul  + "*\n" : "") +
          (jefe.orbesDorado ? "│ 🟡 Orbes Dorado: *" + jefe.orbesDorado + "*\n" : "") +
          (jefe.itemEspecial ? "│ 👁️ Drop especial: *Armadura de Astaroth*\n" : "") +
          "╰──────────────────────⬣\n\n" +
          "⚔️ _¡Usa `!torreatacar`" + (grupo ? " — todos los miembros pueden atacar!" : "!") + "_";
        try {
          const { join } = await import("path");
          const { readFile } = await import("fs/promises");
          const { fileURLToPath } = await import("url");
          const __d = fileURLToPath(new URL(".", import.meta.url));
          const imgBuf = await readFile(join(__d, "../../" + jefe.img));
          await sock.sendMessage(from, { image: imgBuf, caption: bossTexto, mimetype: "image/png" }, { quoted: msg });
        } catch {
          await reply(bossTexto);
        }
      } else {
        await react("⚔️");
        await reply(
          "⚔️ *PISO " + piso + " — COMBATE INICIADO*\n━━━━━━━━━━━━━━\n" +
          enemigo.emoji + " *" + enemigo.nombre + "*\n" +
          "❤️ HP: *" + enemigo.hp + "*  |  ⚔️ ATK: *" + enemigo.atk + "*  |  🛡️ DEF: *" + enemigo.def + "*\n\n" +
          "⚔️ _Usa `!torreatacar`" + (grupo ? " — todos los miembros pueden participar!" : "!") + "_"
        );
      }
    },
  },

  // ── Torre: Atacar (todos los miembros) ────
  {
    name: "torreatacar",
    alias: ["rpgtorreatacar"],
    description: "Atacar al enemigo del piso actual en la torre",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const t = getTorreEstado(p);
      if (!t.activa) return reply("❌ No estás en la torre. Usa `!torrentrar`.");

      let grupo = t.grupoId ? getTorreGrupo(t.grupoId) : null;
      if (grupo && !grupo.miembros.includes(sender)) return reply("❌ No eres miembro de este grupo de torre.");

      const combate = grupo ? grupo.combate : t.combate;
      if (!combate || combate.hp <= 0) {
        return reply("❌ No hay enemigo activo. " + (grupo && grupo.lider === sender ? "Usa `!torreavanzar` para iniciar el siguiente piso." : "Espera a que el líder use `!torreavanzar`."));
      }

      const piso = combate.pisoOrigen || t.pisoActual;
      const ATAQUE_CD = 15 * 1000;
      const ahora = Date.now();
      if (!p._torreAtaqueTs) p._torreAtaqueTs = 0;
      if (ahora - p._torreAtaqueTs < ATAQUE_CD) {
        const segs = Math.ceil((ATAQUE_CD - (ahora - p._torreAtaqueTs)) / 1000);
        return reply("⏳ Puedes volver a atacar en *" + segs + "s*.");
      }
      p._torreAtaqueTs = ahora;

      let atkJ = Math.max(1, getTotalAtk(p) - Math.floor(combate.def * 0.4));
      const esCrit = Math.random() * 100 < calcCrit(p);

      // Aplicar buff de habilidad si está activo
      let torreBuffTexto = "";
      if (p.buffHabilidad && Date.now() < p.buffHabilidad.expira) {
        const buff = p.buffHabilidad;
        if (buff.tipo === "critico") atkJ = Math.floor(atkJ * buff.mult);
        if (buff.tipo === "dano")    atkJ = Math.floor(atkJ * buff.mult);
        if (buff.tipo === "multi")   atkJ = Math.floor(atkJ * 2.5);
        if (buff.tipo === "drenar")  atkJ = Math.floor(atkJ * buff.mult);
        torreBuffTexto = " " + buff.emoji + " *¡" + buff.nombre + "!*";
        p.buffHabilidad = null;
      }

      const danoJ = esCrit ? Math.floor(atkJ * 1.8) : atkJ;
      combate.hp = Math.max(0, combate.hp - danoJ);

      const esquivaTorre = Math.random() * 100 < calcDodge(p);
      const atkE = Math.max(1, combate.atk - Math.floor(getTotalDef(p) * 0.4));
      p.hp = Math.max(0, p.hp - (esquivaTorre ? 0 : atkE));

      const nombreJ = p.nombre || sender.split("@")[0];
      let texto = (esCrit ? "💥 *¡CRÍTICO!* " : "⚔️ ") + "*" + nombreJ + "* ataca por *" + danoJ + "*" + torreBuffTexto + " dmg.\n" +
        combate.emoji + " " + combate.nombre + " HP: *" + combate.hp + " / " + combate.hpMax + "*\n" +
        (esquivaTorre ? "💨 *¡ESQUIVASTE* el ataque de " + combate.nombre + "!*\n" : combate.emoji + " " + combate.nombre + " contraataca por *" + atkE + "*. Tu HP: *" + p.hp + " / " + p.hpMax + "*\n");

      // ── Victoria ──────────────────────────────
      if (combate.hp <= 0) {
        const jefe = getTorreJefe(piso);
        let expBase = 0, oroBase = 0, gemasBase = 0;
        let orbesAzulDrop = 0, orbesDoradoDrop = 0, itemEspecialDrop = null;

        if (jefe) {
          const [oMin, oMax] = combate.oro;
          oroBase = Math.floor(Math.random() * (oMax - oMin) + oMin);
          expBase = combate.exp;
          gemasBase = combate.gemas;
          orbesAzulDrop = jefe.orbesAzul || 0;
          orbesDoradoDrop = jefe.orbesDorado || 0;
          itemEspecialDrop = jefe.itemEspecial || null;
        } else {
          const r = calcTorreRecompensaPiso(piso);
          oroBase = r.oro; expBase = r.exp; gemasBase = r.gemas;
        }

        const nuevoPiso = piso + 1;
        const esUltimoPiso = piso === TORRE_MAX_PISOS;
        const miembros = grupo ? grupo.miembros : [sender];
        let resumenMiembros = "";

        for (const jid of miembros) {
          const mp = getPlayer(jid, null);
          if (!mp.clase) continue;
          const mt = getTorreEstado(mp);
          const oroMiembro = Math.floor(oroBase / miembros.length);
          const expMiembro = Math.floor(expBase / miembros.length);
          mp.oro += oroMiembro;
          mp.gemas = (mp.gemas || 0) + gemasBase;
          mp.hp = Math.min(mp.hpMax, mp.hp + Math.floor(mp.hpMax * 0.3));
          if (!mp.inventario) mp.inventario = {};
          if (orbesAzulDrop > 0) mp.inventario["orbe_azul"] = (mp.inventario["orbe_azul"] || 0) + orbesAzulDrop;
          if (orbesDoradoDrop > 0) mp.inventario["orbe_dorado"] = (mp.inventario["orbe_dorado"] || 0) + orbesDoradoDrop;
          if (itemEspecialDrop === "armadura_astaroth") {
            if (!mp._ssrItems) mp._ssrItems = {};
            mp._ssrItems["armadura_astaroth"] = ARMADURA_ASTAROTH;
            mp.inventario["armadura_astaroth"] = (mp.inventario["armadura_astaroth"] || 0) + 1;
          }
          const resExp = addExp(mp, expMiembro);
          mt.pisoActual = nuevoPiso;
          if (piso > (mt.pisoMax || 0)) mt.pisoMax = piso;
          mt.activa = nuevoPiso <= TORRE_MAX_PISOS;
          mt.combate = null;
          if (!mt.activa) mt.grupoId = null;
          mp.torre = mt;
          if (!mp.torrePisoMax || piso > mp.torrePisoMax) mp.torrePisoMax = piso;
          savePlayer(mp);
          const tag = jid === sender ? "👤 *Tú*" : "👤 *" + (mp.nombre || jid.split("@")[0]) + "*";
          resumenMiembros += tag + ": +" + oroMiembro + "💰 +" + expMiembro + "✨" + (gemasBase ? " +" + gemasBase + "💎" : "") + (resExp.subioNivel ? " 🎉 Nv." + mp.nivel : "") + "\n";
        }

        if (grupo) { grupo.combate = null; grupo.piso = nuevoPiso; saveTorreGrupo(grupo.id, grupo); }

        await react(jefe ? "🏆" : "✅");
        texto += "\n" + (jefe ? "🏆 *¡JEFE DERROTADO!*" : "✅ *¡Piso " + piso + " superado!*") + "\n━━━━━━━━━━━━━━\n";
        texto += "💰 Recompensas (repartidas entre " + miembros.length + " miembro" + (miembros.length > 1 ? "s" : "") + "):\n" + resumenMiembros;
        if (orbesAzulDrop > 0) texto += "🔵 +" + orbesAzulDrop + " Orbe Azul (cada uno)\n";
        if (orbesDoradoDrop > 0) texto += "🟡 +" + orbesDoradoDrop + " Orbe Dorado (cada uno)\n";
        if (itemEspecialDrop === "armadura_astaroth") texto += "👁️ *¡ARMADURA DE ASTAROTH OBTENIDA!* ✨\n";
        texto += esUltimoPiso
          ? "\n👑 *¡COMPLETASTE LA TORRE DE LOS ELEGIDOS!* 🎊"
          : "\n📍 Siguiente piso: *" + nuevoPiso + " / 100*\n" + (grupo ? "Líder usa `!torreavanzar` para continuar." : "Usa `!torreavanzar` para continuar.");
        return reply(texto);
      }

      // ── Derrota del jugador ───────────────────
      if (p.hp <= 0) {
        t.activa = false;
        t.pisoActual = 0;
        t.muerteTs = ahora;
        t.combate = null;
        p.hp = Math.floor(p.hpMax * 0.1);
        p.torre = t;
        savePlayer(p);

        if (grupo && grupo.lider === sender) {
          saveTorreGrupo(grupo.id, null);
          for (const jid of grupo.miembros) {
            if (jid === sender) continue;
            const mp = getPlayer(jid, null);
            const mmt = getTorreEstado(mp);
            mmt.grupoId = null; mmt.activa = false; mmt.pisoActual = 0; mmt.muerteTs = ahora;
            mp.torre = mmt;
            savePlayer(mp);
          }
          await react("💀");
          return reply(
            "💀 *EL LÍDER HA CAÍDO — GRUPO DISUELTO*\n━━━━━━━━━━━━━━\n" +
            combate.emoji + " " + combate.nombre + " derrotó al líder en el piso *" + piso + "*.\n" +
            "😔 El grupo se disuelve. Todos vuelven a la entrada.\n" +
            "⏳ Podrás reintentar en *30 minutos*."
          );
        }

        if (grupo) {
          grupo.miembros = grupo.miembros.filter(m => m !== sender);
          if (grupo.miembros.length === 0) { grupo.combate = null; saveTorreGrupo(grupo.id, null); }
          else saveTorreGrupo(grupo.id, grupo);
        }
        await react("💀");
        return reply(
          "💀 *¡HAS CAÍDO!*\n━━━━━━━━━━━━━━\n" +
          combate.emoji + " " + combate.nombre + " te derrotó en el piso *" + piso + "*.\n" +
          "😔 Fuiste expulsado del grupo. El resto puede continuar.\n" +
          "🏆 Tu mejor piso: *" + (p.torrePisoMax || piso) + "*\n" +
          "⏳ Podrás reintentar en *30 minutos*."
        );
      }

      // ── Combate continúa ──────────────────────
      if (grupo) { grupo.combate = combate; saveTorreGrupo(grupo.id, grupo); }
      else { t.combate = combate; p.torre = t; }
      savePlayer(p);
      await react("⚔️");
      await reply(texto + "_Sigue atacando con `!torreatacar`._");
    },
  },


    // ── Torre: Abandonar ─────────────────────
  {
    name: "torreabandonar",
    alias: ["rpgtorreabandonar", "salirtorre"],
    description: "Abandonar la torre (guarda progreso del último piso superado)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const t = getTorreEstado(p);
      if (!t.activa) return reply("❌ No estás dentro de la torre.");
      const pisoGuardado = Math.max(0, t.pisoActual - 1);

      // Limpiar del grupo si aplica
      if (t.grupoId) {
        const grupoAband = getTorreGrupo(t.grupoId);
        if (grupoAband) {
          if (grupoAband.lider === sender) {
            // Líder abandona: disolver grupo
            for (const jid of grupoAband.miembros) {
              if (jid === sender) continue;
              const mp = getPlayer(jid, null);
              const mt = getTorreEstado(mp);
              mt.grupoId = null; mt.activa = false; mt.pisoActual = 0;
              mp.torre = mt;
              savePlayer(mp);
            }
            saveTorreGrupo(t.grupoId, null);
          } else {
            // Miembro abandona: solo salir del grupo
            grupoAband.miembros = grupoAband.miembros.filter(m => m !== sender);
            saveTorreGrupo(t.grupoId, grupoAband);
          }
        }
        t.grupoId = null;
      }

      t.activa = false;
      t.pisoActual = 0;
      t.combate = null;
      p.torre = t;
      savePlayer(p);
      await react("🚪");
      await reply(
        "🚪 *Saliste de la Torre*\n━━━━━━━━━━━━━━\n" +
        "💾 Progreso guardado hasta el piso *" + pisoGuardado + "*.\n" +
        "🏆 Tu récord: Piso *" + (p.torrePisoMax || 0) + "*\n" +
        "Vuelve cuando quieras con `!torrentrar`."
      );
    },
  },

  // ── Dungeon ───────────────────────────────
  {
    name: "rpgdungeon",
    alias: ["dungeon", "mazmorra"],
    description: "Dungeon de 10 pisos — !rpgdungeon [entrar/atacar/huir/revivir]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const sub = (args[0] || "").toLowerCase();
      const ahora = Date.now();
      const d = getDungeonEstado(p);

      // ── Info / menú ───────────────────────
      if (!sub) {
        const enCooldown = !d.activa && d.iniciada && (ahora - d.iniciada < DUNGEON_COOLDOWN);
        const restMin = enCooldown ? Math.ceil((DUNGEON_COOLDOWN - (ahora - d.iniciada)) / 60000) : 0;
        const restH = Math.floor(restMin / 60);
        const restM = restMin % 60;

        let texto =
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  ⚔️ *DUNGEON — ABISMO ETERNO* ⚔️  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🏰 *10 pisos de dificultad creciente*\n" +
          "💀 Al piso 10 te espera un *BOSS FINAL*\n" +
          "🎁 Recompensas por cada piso superado\n" +
          "💎 Si morís podés revivir por *100💎*\n\n";

        if (d.activa) {
          const enemigo = DUNGEON_ENEMIGOS[d.pisoActual];
          texto +=
            `⚔️ *DUNGEON ACTIVA — Piso ${d.pisoActual + 1}/${DUNGEON_PISOS}*\n` +
            `Enemigo actual: ${enemigo.emoji} *${enemigo.nombre}*\n\n` +
            "╭─〔 *COMANDOS* 〕\n" +
            "│ `!rpgdungeon atacar` → Atacar al enemigo\n" +
            "│ `!rpgdungeon huir` → Abandonar dungeon\n" +
            "╰──────────────────────⬣";
        } else if (enCooldown) {
          texto +=
            `⏳ *Cooldown:* ${restH}h ${restM}min\n` +
            `_Podrás entrar en ${restH}h ${restM}min_`;
        } else {
          texto +=
            "╭─〔 *COMANDOS* 〕\n" +
            "│ `!rpgdungeon entrar` → Comenzar dungeon\n" +
            "╰──────────────────────⬣\n\n" +
            `❤️ Tu HP actual: *${p.hp}/${p.hpMax}*\n` +
            "_Se recomienda entrar con HP completo_";
        }
        return reply(texto);
      }

      // ── Entrar ────────────────────────────
      if (sub === "entrar") {
        if (d.activa) return reply("❌ Ya estás en una dungeon. Usa `!rpgdungeon atacar`.");
        const enCooldown = d.iniciada && (ahora - d.iniciada < DUNGEON_COOLDOWN);
        if (enCooldown) {
          const restMin = Math.ceil((DUNGEON_COOLDOWN - (ahora - d.iniciada)) / 60000);
          return reply(`⏳ Dungeon en cooldown. Vuelve en *${Math.floor(restMin/60)}h ${restMin%60}min*.`);
        }
        if (p.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar` primero.");

        p.dungeon = { activa: true, pisoActual: 0, iniciada: ahora, hpAlEntrar: p.hp };
        savePlayer(p);
        await react("⚔️");

        const e = calcDungeonEnemigo(0, p.hpMax, getTotalAtk(p), getTotalDef(p));
        return reply(
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  ⚔️ *¡DUNGEON INICIADA!* ⚔️  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          `🏰 *Piso 1/${DUNGEON_PISOS}*\n\n` +
          `${e.emoji} *${e.nombre}* aparece ante ti!\n` +
          `❤️ HP: ${e.hp} | ⚔️ ATK: ${e.atk} | 🛡️ DEF: ${e.def}\n\n` +
          `Tu HP: ❤️ ${p.hp}/${p.hpMax}\n\n` +
          "Usa `!rpgdungeon atacar` para combatir."
        );
      }

      // ── Atacar ────────────────────────────
      if (sub === "atacar") {
        if (!d.activa) return reply("❌ No estás en una dungeon. Usa `!rpgdungeon entrar`.");

        const pisoIdx = d.pisoActual;
        const eBase = calcDungeonEnemigo(pisoIdx, p.hpMax, getTotalAtk(p), getTotalDef(p));

        // Estado del enemigo guardado o fresco
        if (!p.dungeon.enemigo) {
          p.dungeon.enemigo = { ...eBase };
        }
        const enemigo = p.dungeon.enemigo;

        // Calcular daño del jugador
        let atkP = getTotalAtk(p);
        const defE = enemigo.def;
        const esCrit = Math.random() * 100 < calcCrit(p);

        // Aplicar buff de habilidad si está activo
        let dungeonBuffTexto = "";
        if (p.buffHabilidad && Date.now() < p.buffHabilidad.expira) {
          const buff = p.buffHabilidad;
          if (buff.tipo === "critico") atkP = Math.floor(atkP * buff.mult);
          if (buff.tipo === "dano")    atkP = Math.floor(atkP * buff.mult);
          if (buff.tipo === "multi")   atkP = Math.floor(atkP * 2.5);
          if (buff.tipo === "drenar")  atkP = Math.floor(atkP * buff.mult);
          dungeonBuffTexto = "\n" + buff.emoji + " *¡" + buff.nombre + " activado!*";
          p.buffHabilidad = null;
        }

        let danoP = Math.max(1, atkP - defE + Math.floor(Math.random() * 8));
        if (esCrit) danoP = Math.floor(danoP * 2);

        // Daño del enemigo al jugador (con chance de esquivar)
        const atkE = enemigo.atk;
        const defP = getTotalDef(p);
        const esquivaDungeon = Math.random() * 100 < calcDodge(p);
        let danoE = (esquivaDungeon || p.escudoActivo) ? 0 : Math.max(1, atkE - defP + Math.floor(Math.random() * 6));
        if (p.escudoActivo) { p.escudoActivo = false; }

        enemigo.hp -= danoP;
        p.hp = Math.max(0, p.hp - danoE);

        const esBoss = pisoIdx === 9;
        let texto =
          `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
          `┃  ⚔️ *DUNGEON — Piso ${pisoIdx + 1}/${DUNGEON_PISOS}* ${esBoss ? "👑" : ""}  ┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
          `${enemigo.emoji} *${enemigo.nombre}*\n` +
          `❤️ HP: ${Math.max(0, enemigo.hp)}/${eBase.hpMax}\n\n` +
          `⚔️ Tu golpe: *-${danoP} HP*${esCrit ? " ✨ _CRÍTICO!_" : ""}${dungeonBuffTexto}\n` +
          (esquivaDungeon ? `💨 *¡ESQUIVASTE* el golpe del enemigo!\n` : `🗡️ Enemigo golpea: *-${danoE} HP*${danoE === 0 ? " 🛡️ _BLOQUEADO!_" : ""}\n`) +
          `\nTu HP: ❤️ ${p.hp}/${p.hpMax}\n\n`;

        // ── Jugador murió ─────────────────
        if (p.hp <= 0) {
          p.dungeon.activa = false;
          savePlayer(p);
          await react("💀");
          return reply(
            texto +
            "💀 *¡HAS MUERTO!*\n\n" +
            `Llegaste hasta el *Piso ${pisoIdx + 1}*.\n` +
            `Perdiste todo el progreso de esta run.\n\n` +
            `💎 ¿Querés revivir? Usa \`!rpgdungeon revivir\`\n` +
            `_Costo: ${DUNGEON_REVIVE_COSTO}💎 — Tienes: ${p.gemas || 0}💎_`
          );
        }

        // ── Enemigo derrotado ─────────────
        if (enemigo.hp <= 0) {
          const drop = calcDungeonDrop(pisoIdx);
          p.oro += drop.oro;
          const leveledUp = addExp(p, eBase.exp);
          let recompTexto = `💰 +${drop.oro} oro | ⭐ +${eBase.exp} EXP`;

          if (drop.item && drop.item.item) {
            const calEmoji = { comun:"⚪", raro:"🟢", epico:"🟣", legendario:"🟡", mitico:"🔴" };
            p.inventario[drop.item.itemId] = (p.inventario[drop.item.itemId] || 0) + 1;
            recompTexto += `\n${calEmoji[drop.item.calidad] || "⚪"} Drop: *${drop.item.item?.nombre || drop.item.itemId}* [${drop.item.calidad.toUpperCase()}]`;
          }
          if (leveledUp) recompTexto += `\n🎉 *¡SUBISTE DE NIVEL!* → Nv.${p.nivel}`;

          // ── Boss derrotado = dungeon completa ──
          if (esBoss) {
            const final = calcDungeonRecompensaFinal();
            p.oro += final.oro;
            addExp(p, final.exp);
            p.dungeon = { activa: false, pisoActual: 0, iniciada: ahora };
            if (final.item && final.item.item) {
              p.inventario[final.item.itemId] = (p.inventario[final.item.itemId] || 0) + 1;
            }
            savePlayer(p);
            await react("🏆");
            const calEmoji = { comun:"⚪", raro:"🟢", epico:"🟣", legendario:"🟡", mitico:"🔴" };
            return reply(
              texto +
              "👑 *¡¡BOSS DERROTADO!!* 🏆\n\n" +
              "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
              "┃  🏆 *¡DUNGEON COMPLETADA!* 🏆  ┃\n" +
              "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
              `🎁 *RECOMPENSA FINAL:*\n` +
              `💰 +${final.oro} oro\n` +
              `⭐ +${final.exp} EXP\n` +
              (final.item?.item ? `${calEmoji[final.item.calidad]} *${final.item.item.nombre}* [${final.item.calidad.toUpperCase()}]\n` : "") +
              `\n_La dungeon se reiniciará en 24h_`
            );
          }

          // ── Siguiente piso ────────────────
          p.dungeon.pisoActual = pisoIdx + 1;
          p.dungeon.enemigo = null;
          savePlayer(p);
          await react("✅");

          const sigPiso = pisoIdx + 1;
          const sigE = calcDungeonEnemigo(sigPiso, p.hpMax, getTotalAtk(p), getTotalDef(p));
          const esBossNext = sigPiso === 9;
          return reply(
            texto +
            `✅ *¡${enemigo.nombre} derrotado!*\n` +
            `🎁 ${recompTexto}\n\n` +
            "━━━━━━━━━━━━━━\n" +
            `🏰 *Piso ${sigPiso + 1}/${DUNGEON_PISOS}*${esBossNext ? " 👑 ¡BOSS FINAL!" : ""}\n` +
            `${sigE.emoji} *${sigE.nombre}* aparece!\n` +
            `❤️ HP: ${sigE.hp} | ⚔️ ATK: ${sigE.atk} | 🛡️ DEF: ${sigE.def}\n\n` +
            "Usa `!rpgdungeon atacar` para continuar."
          );
        }

        // ── Combate continúa ──────────────
        p.dungeon.enemigo = enemigo;
        savePlayer(p);
        await react("⚔️");
        texto += `El enemigo sigue en pie. Usa \`!rpgdungeon atacar\` para continuar.`;
        return reply(texto);
      }

      // ── Revivir ───────────────────────────
      if (sub === "revivir") {
        if (d.activa) return reply("❌ No estás muerto, estás en combate.");
        if (p.hp > 0) return reply("❌ No estás muerto.");
        if ((p.gemas || 0) < DUNGEON_REVIVE_COSTO) {
          return reply(`❌ Necesitas *${DUNGEON_REVIVE_COSTO}💎* para revivir.\nTienes: *${p.gemas || 0}💎*`);
        }
        p.gemas -= DUNGEON_REVIVE_COSTO;
        p.hp = Math.floor(p.hpMax * 0.5);
        p.dungeon = { ...d, activa: true };
        savePlayer(p);
        await react("💎");
        const e = calcDungeonEnemigo(d.pisoActual, p.hpMax, getTotalAtk(p), getTotalDef(p));
        p.dungeon.enemigo = { ...e };
        savePlayer(p);
        return reply(
          `💎 *¡REVIVISTE!* (-${DUNGEON_REVIVE_COSTO}💎)\n\n` +
          `❤️ HP restaurado: ${p.hp}/${p.hpMax}\n` +
          `🏰 Continúas en *Piso ${d.pisoActual + 1}*\n\n` +
          `${e.emoji} *${e.nombre}* te espera.\nUsa \`!rpgdungeon atacar\` para continuar.`
        );
      }

      // ── Huir ──────────────────────────────
      if (sub === "huir") {
        if (!d.activa) return reply("❌ No estás en una dungeon.");
        p.dungeon = { activa: false, pisoActual: 0, iniciada: ahora };
        savePlayer(p);
        await react("🏃");
        return reply(
          `🏃 *Huiste de la dungeon.*\n` +
          `Llegaste hasta el *Piso ${d.pisoActual + 1}*.\n\n` +
          `_La dungeon se reiniciará en 24h._`
        );
      }

      return reply("❌ Comando inválido. Usa: `!rpgdungeon` para ver opciones.");
    },
  },
];

// ══════════════════════════════════════════
//  ACTIVIDADES & ARENA
// ══════════════════════════════════════════

// Comando genérico para actividades
function _actividadCmd(actId) {
  const act = ACTIVIDADES[actId];
  return {
    name: `rpg${actId}`,
    alias: [actId],
    description: `${act.emoji} ${act.nombre} — !rpg${actId}`,
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

      const ahora = Date.now();
      const ultimo = p.actividadesCd?.[actId] || 0;
      if (ahora - ultimo < ACTIVIDAD_COOLDOWN) {
        const restMin = Math.ceil((ACTIVIDAD_COOLDOWN - (ahora - ultimo)) / 60000);
        const h = Math.floor(restMin / 60);
        const m = restMin % 60;
        return reply(`⏳ *${act.nombre}* en cooldown.\nVuelve en *${h}h ${m}min*.`);
      }

      await react(act.emoji);
      const r = realizarActividad(p, actId);

      // [NERF v2.5] Bonus extra de gemas por actividad eliminado.
      // Las gemas solo provienen del drop de minería (r.gemas).

      // Bonus de oro nv 1-10 en actividades (+50% del oro obtenido)
      let bonusOroActiv = 0;
      let bonusOroActivTexto = "";
      if (r.oro && p.nivel <= 10) {
        bonusOroActiv = Math.floor(r.oro * 0.50);
        p.oro = (p.oro || 0) + bonusOroActiv;
        bonusOroActivTexto = ` *(+${bonusOroActiv} 🌱 bonus novato)*`;
      }
      savePlayer(p);

      let recomp = "";
      if (r.oro)   recomp += `💰 +${r.oro + bonusOroActiv} oro${bonusOroActivTexto}\n`;
      if (r.exp)   recomp += `⭐ +${r.exp} EXP\n`;
      if (r.gemas) recomp += `💎 +${r.gemas} gemas\n`;
      if (r.item)  recomp += `🎒 Obtuviste: *${r.itemNombre}*\n`;
      if (r.levelUp) recomp += `🎉 *¡SUBISTE DE NIVEL!* → Nv.${p.nivel}\n`;

      return reply(
        `${act.emoji} *${act.nombre.toUpperCase()}*\n━━━━━━━━━━━━━━\n\n` +
        `_${r.label}_\n\n` +
        recomp +
        `\n💰 Oro: *${p.oro}* | 💎 Gemas: *${p.gemas || 0}* | ⏳ Cooldown: 2h`
      );
    },
  };
}

const actividadCommands = ["pesca", "caza", "minar", "talar"].map(_actividadCmd);

// Arena
const arenaCommand = {
  name: "rpgarena",
  alias: ["arena"],
  description: "⚔️ Arena PvP — !rpgarena [@usuario/top]",
  category: "RPG ⚔️",
  freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg, pushName }) => {
    const p = getPlayer(sender, pushName || msg?.pushName || null);
    const mentionedJid = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

    const sub = (args[0] || "").toLowerCase();

    // ── Top arena ─────────────────────────
    if (sub === "top") {
      actualizarTopArena();
      const top = getArenaTop();
      if (!top.length) return reply("❌ No hay jugadores en la arena aún.");
      const medallas = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      let texto =
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  ⚔️ *TOP ARENA* ⚔️  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n";
      top.forEach((jugador, i) => {
        const clase = CLASES[jugador.clase];
        const titulo = calcularTitulo(jugador);
        const tituloStr = titulo ? ` ${titulo.emoji} _${titulo.nombre}_` : "";
        texto += `${medallas[i]} *${jugador.nombre}*${tituloStr} ${clase?.emoji || ""}\n`;
        texto += `   🏆 ${jugador.arena.puntos} pts | ✅ ${jugador.arena.victorias}V ❌ ${jugador.arena.derrotas}D\n\n`;
      });
      const miStats = getArenaStats(p);
      texto += `━━━━━━━━━━━━━━\n👤 Tu posición:\n🏆 *${miStats.puntos} pts* | ✅ ${miStats.victorias}V ❌ ${miStats.derrotas}D`;
      return reply(texto);
    }

    // ── Info propia ───────────────────────
    if (!mentionedJid?.length) {
      const s = getArenaStats(p);
      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  ⚔️ *ARENA PvP* ⚔️  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        `👤 *${p.nombre}* ${CLASES[p.clase]?.emoji || ""}\n` +
        `🏆 Puntos: *${s.puntos}*\n` +
        `✅ Victorias: *${s.victorias}* | ❌ Derrotas: *${s.derrotas}*\n\n` +
        "╭─〔 *COMANDOS* 〕\n" +
        "│ `!rpgarena @usuario` → Retar a un jugador\n" +
        "│ `!rpgarena top` → Ver ranking\n" +
        "╰──────────────────────⬣\n\n" +
        "_Victoria: +20 pts | Derrota: -10 pts_"
      );
    }

    // ── Combate ───────────────────────────
    const rivalId = mentionedJid[0];
    if (rivalId === sender) return reply("❌ No podés retarte a vos mismo.");

    const rival = getPlayer(rivalId, null);
    if (!rival.clase) return reply("❌ El rival no tiene personaje.");
    // 🛡️ Protección divina — owners
    if (await _checkDiosProteccion(sender, rivalId, p, sock, from, msg, reply)) return;

    // Cooldown 5 minutos
    const ARENA_CD = 5 * 60 * 1000;
    const ahoraArena = Date.now();
    if (ahoraArena - (p.arenaCd || 0) < ARENA_CD) {
      const restMin = Math.ceil((ARENA_CD - (ahoraArena - p.arenaCd)) / 60000);
      const restSeg = Math.ceil((ARENA_CD - (ahoraArena - p.arenaCd)) / 1000);
      const msg2 = restSeg < 60 ? `${restSeg}s` : `${restMin} min`;
      return reply(`⏳ Ya retaste a alguien recientemente. Espera *${msg2}*.`);
    }
    p.arenaCd = ahoraArena;
    savePlayer(p);

    await react("⚔️");
    const { ganaAtacante, danoA, danoD } = resolverArena(p, rival);
    const ganador = ganaAtacante ? p : rival;
    const perdedor = ganaAtacante ? rival : p;
    const statsGan = getArenaStats(ganador);
    const statsPer = getArenaStats(perdedor);

    avanzarMisionClan(sender, "arena");
    return reply(
      "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
      "┃  ⚔️ *COMBATE DE ARENA* ⚔️  ┃\n" +
      "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
      `${CLASES[p.clase]?.emoji} *${p.nombre}* ⚔️ ${CLASES[rival.clase]?.emoji} *${rival.nombre}*\n\n` +
      `💥 ${p.nombre} infligió *${danoA}* de daño\n` +
      `💥 ${rival.nombre} infligió *${danoD}* de daño\n\n` +
      `🏆 *¡${ganador.nombre} GANA!*\n\n` +
      `${ganador.nombre}: *+20 pts* → ${statsGan.puntos} pts\n` +
      `${perdedor.nombre}: *-10 pts* → ${statsPer.puntos} pts`
    );
  },
};

rpgCommands.push(...actividadCommands, arenaCommand);

// ══════════════════════════════════════════
//  SUBMENÚS DE CLASES
// ══════════════════════════════════════════

const CLASE_INFO = {
  guerrero: {
    nombre: "Caballero",
    subtitulo: "Guerrero • Humano • Leal Neutral",
    bio: "Un caballero honorable que ha jurado proteger el reino y defender la justicia. Su espada y su escudo son símbolos de esperanza en tiempos oscuros.",
    rasgos: ["Entrenamiento en armaduras pesadas.", "Maestro del combate cuerpo a cuerpo.", "Juramento de proteger a los inocentes.", "Liderazgo natural."],
    habilidades: [
      { nombre: "Golpe Heroico", emoji: "⚔️", desc: "Ataque físico poderoso que inflige gran daño." },
      { nombre: "Defensa Inquebrantable", emoji: "🛡️", desc: "Se fortalece para resistir el próximo golpe." },
      { nombre: "Embestida", emoji: "🐎", desc: "Carga contra el enemigo aturdiendo y dañando." },
    ],
    img: "assets/clases/guerrero.png",
    cmd: "!rpgguerrero",
  },
  mago: {
    nombre: "Mago",
    subtitulo: "Humano • Sabio • Neutral Bueno",
    bio: "Un mago erudito que ha dedicado su vida al estudio de las artes arcanas. Viaja por el mundo en busca de conocimiento y poder para mantener el equilibrio entre la luz y la oscuridad.",
    rasgos: ["Dominio de las artes arcanas y conocimientos antiguos.", "Maestro en el control de la magia elemental.", "Perspicaz y estudioso.", "Débil físicamente, pero letal a distancia."],
    habilidades: [
      { nombre: "Esfera Arcana", emoji: "🔮", desc: "Lanza una esfera de energía pura que destruye al enemigo." },
      { nombre: "Barrera Mágica", emoji: "✨", desc: "Crea un escudo arcano que absorbe el próximo ataque." },
      { nombre: "Cometa Arcano", emoji: "☄️", desc: "Invoca un cometa de energía que aplasta al rival." },
    ],
    img: "assets/clases/mago.png",
    cmd: "!rpgmago",
  },
  arquero: {
    nombre: "Arquero",
    subtitulo: "Humano • Ágil • Neutral Bueno",
    bio: "Un arquero errante que vive en armonía con el entorno. Defiende lo que es justo desde las sombras, disparando solo cuando es necesario. Su arco es su voz, y cada flecha, una sentencia.",
    rasgos: ["Maestro del arco y el combate a distancia.", "Explorador nato, se mueve en silencio.", "Visión aguda y puntería excepcional.", "Letal desde las sombras."],
    habilidades: [
      { nombre: "Lluvia Certera", emoji: "🏹", desc: "Dispara múltiples flechas que acribillan al enemigo." },
      { nombre: "Disparo Preciso", emoji: "🎯", desc: "Apunta con precisión al punto débil del rival." },
      { nombre: "Evasión Rápida", emoji: "💨", desc: "Se mueve velozmente esquivando el siguiente ataque." },
    ],
    img: "assets/clases/arquero.png",
    cmd: "!rpgarquero",
  },
  asesino: {
    nombre: "Asesino",
    subtitulo: "Humano • Ágil • Neutral Bueno",
    bio: "Un asesino errante que vive en las sombras. No busca gloria ni reconocimiento, solo el cumplimiento de su código. Su presencia es un susurro, su ataque, definitivo.",
    rasgos: ["Maestro del sigilo y el combate rápido.", "Ataca desde las sombras, eliminando objetivos clave.", "Se mueve sin ser visto, como una sombra.", "Precisión letal en cada movimiento."],
    habilidades: [
      { nombre: "Asesinato Silencioso", emoji: "🌑", desc: "Ataque desde las sombras con daño crítico garantizado." },
      { nombre: "Golpe Certero", emoji: "🗡️", desc: "Hiere al enemigo en un punto vital, causando sangrado." },
      { nombre: "Sombra Fugaz", emoji: "💜", desc: "Desaparece entre las sombras, esquivando el siguiente ataque." },
    ],
    img: "assets/clases/asesino.png",
    cmd: "!rpgasesino",
  },
  sacerdote: {
    nombre: "Sacerdote",
    subtitulo: "Humano • Sabio • Neutral Bueno",
    bio: "Un sacerdote devoto que dedica su vida al servicio de los demás. Su fe inquebrantable le permite sanar heridas, proteger almas y disipar la oscuridad.",
    rasgos: ["Guía espiritual y apoyo incondicional.", "Protege a sus aliados con fe y compasión.", "Su presencia inspira esperanza y fortaleza.", "La luz es su arma y su refugio."],
    habilidades: [
      { nombre: "Sanación Divina", emoji: "✨", desc: "Restaura puntos de vida propios con luz sagrada." },
      { nombre: "Barrera Sagrada", emoji: "🔵", desc: "Crea un escudo divino que protege del siguiente golpe." },
      { nombre: "Bendición Celestial", emoji: "👼", desc: "Invoca una bendición que aumenta el ATK temporalmente." },
    ],
    img: "assets/clases/sacerdote.png",
    cmd: "!rpgsacerdote",
  },
  "paladín": {
    nombre: "Paladín",
    subtitulo: "Humano • Leal • Neutral Bueno",
    bio: "Un paladín es un guerrero sagrado que dedica su vida a proteger a los demás y hacer cumplir la justicia. Su fe y su honor son su escudo más poderoso.",
    rasgos: ["Defensor incansable de la justicia y los inocentes.", "Sus creencias son su mayor fortaleza.", "Inspira honor y lealtad a sus aliados.", "Jamás rompe su juramento."],
    habilidades: [
      { nombre: "Golpe Justiciero", emoji: "⚡", desc: "Ataque sagrado que inflige daño extra de luz." },
      { nombre: "Protección Sagrada", emoji: "🛡️", desc: "Eleva su defensa al máximo durante un turno." },
      { nombre: "Aura de Valor", emoji: "🌟", desc: "Irradia un aura que aumenta su resistencia al daño." },
    ],
    img: "assets/clases/paladin.png",
    cmd: "!rpgpaladin",
  },
  nigromante: {
    nombre: "Nigromante",
    subtitulo: "Humano • Intelectual • Neutral Malvado",
    bio: "Un nigromante es un erudito de lo prohibido, que ha dedicado su existencia a comprender los secretos más oscuros de la vida y la muerte. Rechazado por muchos, camina entre sombras.",
    rasgos: ["Señor de los muertos y la energía vital.", "Convoca y controla ejércitos de no muertos.", "Extrae fuerza de sus enemigos para sostenerse.", "No busca redención, solo poder eterno."],
    habilidades: [
      { nombre: "Invocación Sombría", emoji: "💀", desc: "Invoca espíritus oscuros que atacan al enemigo." },
      { nombre: "Drenaje de Vida", emoji: "🩸", desc: "Absorbe la vida del enemigo para recuperar HP." },
      { nombre: "Niebla Mortal", emoji: "🌫️", desc: "Envuelve al rival en niebla venenosa que daña por turnos." },
    ],
    img: "assets/clases/nigromante.png",
    cmd: "!rpgnigromante",
  },
  hombrelobo: {
    nombre: "Hombre Lobo",
    subtitulo: "Bestia • Maldito • Caótico Neutral",
    bio: "Una criatura maldita atrapada entre el mundo humano y la bestia. Bajo la luna llena desata una furia incontrolable que pulveriza a sus enemigos con garras y colmillos.",
    rasgos: ["Velocidad y fuerza sobrehumanas.", "Regeneración natural en combate.", "Instintos salvajes que superan la razón.", "La luna potencia su poder al máximo."],
    habilidades: [
      { nombre: "Furia Bestial", emoji: "🐺", desc: "Se transforma y ataca con garras en plena furia x3.5." },
      { nombre: "Aullido Letal", emoji: "🌕", desc: "Aúlla a la luna garantizando un golpe crítico devastador x4." },
      { nombre: "Regeneración Salvaje", emoji: "💚", desc: "Regenera heridas con su naturaleza bestial, curando el 40% HP." },
      { nombre: "Embestida Salvaje", emoji: "💥", desc: "Carga a cuatro patas aplastando al enemigo x2.8." },
    ],
    img: "assets/clases/hombrelobo.png",
    cmd: "!rpghombrelobo",
  },
  nomuerto: {
    nombre: "No-Muerto",
    subtitulo: "No-Muerto • Maldito • Neutral Malvado",
    bio: "Un ser arrancado de las garras de la muerte que camina entre los vivos. Su existencia misma es una maldición que usa como arma: drena la vida de sus enemigos para sostenerse eternamente.",
    rasgos: ["Inmortalidad parcial: puede resucitar en combate.", "Drena la fuerza vital de sus enemigos.", "La muerte es solo un obstáculo menor.", "Su maldición se extiende a quienes enfrenta."],
    habilidades: [
      { nombre: "Resurrección Oscura", emoji: "🧟", desc: "Si cae en combate, resucita una vez con el 30% de HP." },
      { nombre: "Toque de la Muerte", emoji: "☠️", desc: "Toca al enemigo drenando su vida con oscuridad x3." },
      { nombre: "Maldición Eterna", emoji: "🪦", desc: "Lanza una maldición que daña continuamente x2." },
      { nombre: "Ejército de Sombras", emoji: "👻", desc: "Convoca fantasmas que atacan en oleadas x2.5." },
    ],
    img: "assets/clases/nomuerto.png",
    cmd: "!rpgnomuerto",
  },
};

function _buildClaseMenu(info, clase) {
  const c = CLASES[clase];
  return (
    `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
    `┃  ${c.emoji} *${info.nombre.toUpperCase()}* ${c.emoji}  ┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n` +
    `_${info.subtitulo}_\n\n` +
    `╭─〔 📊 *ATRIBUTOS* 〕\n` +
    `│ ❤️ Salud: *${c.hp}*\n` +
    `│ ⚔️ Ataque: *${c.atk}*\n` +
    `│ 🛡️ Defensa: *${c.def}*\n` +
    `│ 💨 Evasión: *${Math.min(35, Math.floor(c.spd * 0.5))}%* (SPD: ${c.spd})\n` +
    `│ 🎯 Crítico: *${c.crit}%*\n` +
    `╰──────────────────────⬣\n\n` +
    `╭─〔 ✨ *HABILIDADES* 〕\n` +
    info.habilidades.map((h, i) => `│ ${h.emoji} *${h.nombre}*\n│   _${h.desc}_`).join("\n") + "\n" +
    `╰──────────────────────⬣\n\n` +
    `╭─〔 📖 *BIOGRAFÍA* 〕\n` +
    `│ _${info.bio}_\n` +
    `╰──────────────────────⬣\n\n` +
    `▸ Para elegir esta clase: \`!rpgregistro ${clase}\``
  );
}

async function _sendClaseMenu(sock, from, msg, clase) {
  const info = CLASE_INFO[clase];
  if (!info) return;
  const texto = _buildClaseMenu(info, clase);
  try {
    const { join } = await import("path");
    const { readFile } = await import("fs/promises");
    const { fileURLToPath } = await import("url");
    const __d = fileURLToPath(new URL(".", import.meta.url));
    const img = await readFile(join(__d, "../../" + info.img));
    await sock.sendMessage(from, { image: img, caption: texto, mimetype: "image/png" }, { quoted: msg });
  } catch {
    await sock.sendMessage(from, { text: texto }, { quoted: msg });
  }
}

const claseCommands = Object.keys(CLASE_INFO).map(clase => ({
  name: `rpg${clase === "paladín" ? "paladin" : clase}`,
  alias: [clase === "paladín" ? "paladin" : clase],
  description: `Ver info de clase ${clase}`,
  category: "RPG ⚔️",
  freeAllowed: true,
  execute: async ({ sock, from, msg }) => {
    await _sendClaseMenu(sock, from, msg, clase);
  },
}));

rpgCommands.push(...claseCommands);

// ══════════════════════════════════════════
//  SISTEMA AFK — !rpgafk / !rpgafk off
// ══════════════════════════════════════════

// Zonas AFK con tasas de recolección por minuto
const AFK_ZONAS = [
  { nombre: "🌲 Bosque Oscuro",    oroMin: 5,  oroMax: 13,  expMin: 7,  expMax: 17, dropChance: 0.14, zona: "bosque"   },
  { nombre: "⛏️ Cueva del Dragón", oroMin: 10, oroMax: 23,  expMin: 13, expMax: 32, dropChance: 0.12, zona: "cueva"    },
  { nombre: "🏰 Castillo Maldito", oroMin: 17, oroMax: 36,  expMin: 23, expMax: 51, dropChance: 0.10, zona: "castillo" },
  { nombre: "🌋 Volcán del Caos",  oroMin: 26, oroMax: 57,  expMin: 36, expMax: 76, dropChance: 0.08, zona: "volcan"  },
  { nombre: "🌑 Abismo Eterno",    oroMin: 42, oroMax: 95,  expMin: 55, expMax: 127, dropChance: 0.07, zona: "abismo"  },
];

function getAfkZona(nivel) {
  if (nivel >= 35) return AFK_ZONAS[4];
  if (nivel >= 20) return AFK_ZONAS[3];
  if (nivel >= 10) return AFK_ZONAS[2];
  if (nivel >= 5)  return AFK_ZONAS[1];
  return AFK_ZONAS[0];
}

function calcAfkRecompensas(player, minutos) {
  const zona = getAfkZona(player.nivel);
  const ticks = Math.floor(minutos); // 1 tick por minuto

  let oroTotal = 0;
  let expTotal = 0;
  const itemsObtenidos = {};

  for (let i = 0; i < ticks; i++) {
    // Oro por minuto (con varianza)
    oroTotal += Math.floor(zona.oroMin + Math.random() * (zona.oroMax - zona.oroMin));
    // EXP por minuto
    expTotal += Math.floor(zona.expMin + Math.random() * (zona.expMax - zona.expMin));
    // Drop aleatorio
    if (Math.random() < zona.dropChance) {
      const drop = calcularDrop(zona.zona, player.nivel, getMultDrop());
      if (drop) {
        itemsObtenidos[drop.itemId] = (itemsObtenidos[drop.itemId] || 0) + 1;
      }
    }
  }

  // Aplicar multiplicadores de evento
  oroTotal = Math.floor(oroTotal * getMultOro());
  expTotal = Math.floor(expTotal * getMultXP());

  return { oroTotal, expTotal, itemsObtenidos, zona };
}

const afkCommand = {
  name: "rpgafk",
  alias: ["afkrpg"],
  description: "Modo AFK — !rpgafk / !rpgafk off",
  category: "RPG ⚔️",
  freeAllowed: true,
  execute: async ({ reply, react, sender, args, sock, from, msg, pushName }) => {
    const p = getPlayer(sender, pushName || msg?.pushName || null);
    if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");

    const { readFile } = await import("fs/promises");
    const { fileURLToPath } = await import("url");
    const { join } = await import("path");
    const __d = fileURLToPath(new URL(".", import.meta.url));

    // ── Desactivar AFK ──────────────────────────────────────────
    if (args[0]?.toLowerCase() === "off") {
      if (!p.afk) return reply("⚠️ No estás en modo AFK.");

      const ahora = Date.now();
      const minutos = (ahora - p.afk.inicio) / 60000;
      const AFK_MAX_HORAS = 5; // máximo real de recolección
      const minutosReal = Math.min(Math.max(0, minutos), AFK_MAX_HORAS * 60);

      // Calcular recompensas
      const { oroTotal, expTotal, itemsObtenidos, zona } = calcAfkRecompensas(p, minutosReal);

      // Aplicar recompensas al jugador
      p.oro += oroTotal;
      const nivelAntes = p.nivel;
      addExp(p, expTotal);

      // Agregar items al inventario
      for (const [itemId, cant] of Object.entries(itemsObtenidos)) {
        p.inventario[itemId] = (p.inventario[itemId] || 0) + cant;
      }

      // Limpiar estado AFK y guardar cooldown
      delete p.afk;
      p.afkCooldown = Date.now();
      savePlayer(p);

      await react("☀️");

      // Formatear tiempo transcurrido
      const horas = Math.floor(minutosReal / 60);
      const mins  = Math.floor(minutosReal % 60);
      const tiempoStr = horas > 0 ? `${horas}h ${mins}min` : `${mins} min`;

      // Lista de items obtenidos
      let itemsStr = "";
      const itemEntries = Object.entries(itemsObtenidos);
      if (itemEntries.length > 0) {
        itemsStr = "\n\n🎒 *Items encontrados:*\n" +
          itemEntries.map(([id, cant]) => {
            const it = TIENDA[id];
            return `  ${it?.emoji || "📦"} ${it?.nombre || id} ×${cant}`;
          }).join("\n");
      } else {
        itemsStr = "\n\n🎒 _Ningún item encontrado esta vez._";
      }

      const subiNivel = p.nivel > nivelAntes ? `\n🆙 *¡Subiste al nivel ${p.nivel}!*` : "";

      const texto =
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  ☀️ *¡DE VUELTA, HÉROE!* ☀️  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `⏱️ Tiempo descansado: *${tiempoStr}*\n` +
        `📍 Zona: *${zona.nombre}*\n\n` +
        `╭─〔 💰 *RECOMPENSAS* 〕\n` +
        `│ 🪙 Oro obtenido: *+${oroTotal.toLocaleString()}*\n` +
        `│ ⭐ EXP ganada: *+${expTotal.toLocaleString()}*` +
        itemsStr.replace(/\n/g, "\n│ ") +
        `\n╰──────────────────────⬣` +
        subiNivel +
        `\n\n_¡Listo para la aventura!_`;

      try {
        const imgBuf = await readFile(join(__d, "../../assets/afk-regreso.png"));
        await sock.sendMessage(from, { image: imgBuf, caption: texto, mimetype: "image/png" }, { quoted: msg });
      } catch {
        await reply(texto);
      }
      return;
    }

    // ── Activar AFK ─────────────────────────────────────────────
    if (p.afk) {
      const mins = Math.floor((Date.now() - p.afk.inicio) / 60000);
      return reply(`⏳ Ya estás en modo AFK.\nLlevas *${mins} min* descansando.\nUsa \`!rpgafk off\` para volver.`);
    }

    if (p.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar` antes de ir AFK.");

    // Cooldown de 5h entre usos de AFK
    const AFK_CD = 5 * 60 * 60 * 1000;
    if (p.afkCooldown && Date.now() - p.afkCooldown < AFK_CD) {
      const restMin = Math.ceil((AFK_CD - (Date.now() - p.afkCooldown)) / 60000);
      const restH = Math.floor(restMin / 60);
      const restM = restMin % 60;
      return reply(`⏳ *AFK en cooldown.*\nPuedes volver a descansar en *${restH}h ${restM}min*.`);
    }

    p.afk = { inicio: Date.now(), from };
    savePlayer(p);

    await react("😴");

    const zona = getAfkZona(p.nivel);
    const texto =
      `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
      `┃  😴 *MODO AFK ACTIVADO* 😴  ┃\n` +
      `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
      `⚔️ *${p.nombre}* está descansando...\n` +
      `📍 Zona activa: *${zona.nombre}*\n\n` +
      `╭─〔 📊 *RECOLECCIÓN* 〕\n` +
      `│ 🪙 Oro: ~${zona.oroMin}–${zona.oroMax} por minuto\n` +
      `│ ⭐ EXP: ~${zona.expMin}–${zona.expMax} por minuto\n` +
      `│ 🎒 Drops: posibles cada minuto\n` +
      `╰──────────────────────⬣\n\n` +
      `🛡️ _No puedes ser atacado mientras estás AFK._\n` +
      `⏱️ _Máximo *5 horas* de recolección. Cooldown: 5h tras volver._\n` +
      `_Usa_ \`!rpgafk off\` _para volver y reclamar tus recompensas._`;

    try {
      const imgBuf = await readFile(join(__d, "../../assets/afk-descanso.png"));
      await sock.sendMessage(from, { image: imgBuf, caption: texto, mimetype: "image/png" }, { quoted: msg });
    } catch {
      await reply(texto);
    }
  },
};

rpgCommands.push(afkCommand);

// ═══════════════════════════════════════════════════════════════
//   SISTEMA DE TERRITORIOS
// ═══════════════════════════════════════════════════════════════

// Cooldown de conquista: 6 horas por clan
const CD_CONQUISTA = 6 * 60 * 60 * 1000;

// Poder ofensivo del clan atacante
function calcPoderClan(clan) {
  return clan.miembros.reduce((total, jid) => {
    const mp = db.players[jid];
    if (!mp) return total;
    return total + getTotalAtk(mp) + getTotalDef(mp) + mp.nivel * 5;
  }, 0) + Math.floor(clan.banco / 100);
}

// Poder defensivo de un territorio (base fija según sus puntos estratégicos)
function calcPoderDefensaTerritorio(territorioId) {
  const def = TERRITORIOS[territorioId];
  if (!def) return 0;
  const puntosBase = calcPuntosTerritorio(territorioId);
  return puntosBase * 80; // cada punto vale 80 de poder base
}

const territorioCommands = [

  // ── !rpgmapa ─────────────────────────────────────────────────
  {
    name: "rpgmapa",
    alias: ["maparpg", "territoriosmapa"],
    description: "Ver el mapa de territorios y quién los controla",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react }) => {
      await react("🗺️");
      const estados = getTerritorios();

      const _PROD = {
        bastion_norte:     { oro: 80,  gemas: 2,  exp: 60  },
        bosque_esmeralda:  { oro: 60,  gemas: 3,  exp: 80  },
        tierras_ardientes: { oro: 120, gemas: 2,  exp: 50  },
        llanuras_doradas:  { oro: 100, gemas: 2,  exp: 70  },
        lago_cristalino:   { oro: 50,  gemas: 3,  exp: 100 },
        la_capital:        { oro: 150, gemas: 5,  exp: 120 },
      };

      const lineas = Object.values(TERRITORIOS).map(t => {
        const estado = estados[t.id];
        const dueno = estado?.propietario
          ? "🏴 *" + estado.propietario + "*"
          : "⬜ _Sin control_";
        const pts = calcPuntosTerritorio(t.id);
        const prod = _PROD[t.id] || { oro: 0, gemas: 0, exp: 0 };
        const acum = estado?.acumulado;
        const acumStr = acum && (acum.oro > 0 || acum.gemas > 0)
          ? "\n│ 📦 Acumulado: 💰" + acum.oro + " 💎" + acum.gemas + " ⭐" + acum.exp
          : "";
        const boss = getBossTerritorio(t.id);
        const bossStr = (boss && boss.hp > 0)
          ? "\n│ " + boss.emoji + " Boss: *" + boss.nombre + "* ❤️" + boss.hp + "/" + boss.hpMax + (boss.clanAtacante ? " ⚔️ atacado por *" + boss.clanAtacante + "*" : "")
          : "";
        const cdMs = getTerritorioCooldown(t.id);
        const cdStr = cdMs > 0
          ? "\n│ 🛡️ Protección: *" + Math.floor(cdMs/3600000) + "h " + Math.floor((cdMs%3600000)/60000) + "min*"
          : "";
        return (
          t.emoji + " *" + t.nombre + "*\n" +
          "│ 🎯 Puntos: " + pts + " | " + dueno + "\n" +
          "│ ⏱️ Prod/hora: 💰" + prod.oro + " | 💎" + prod.gemas + " | ⭐" + prod.exp + "\n" +
          "│ 🎁 Bonus: " + t.bonus.desc +
          acumStr + bossStr + cdStr
        );
      });

      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃    🗺️ *MAPA DE TERRITORIOS* 🗺️    ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        lineas.join("\n\n") + "\n\n" +
        "╭─〔 ⚔️ CONQUISTA 〕\n" +
        "│ `!rpgconquistar [id]` → Atacar territorio\n" +
        "│ `!rpgterritorio [id]` → Ver detalles\n" +
        "│ `!rpgmisbonos` → Tus bonos activos\n" +
        "╰──────────────────────⬣\n\n" +
        "_IDs: bastion_norte, bosque_esmeralda, tierras_ardientes,\nllanuras_doradas, lago_cristalino, la_capital_"
      );
    },
  },

  // ── !rpgterritorio [id] ──────────────────────────────────────
  {
    name: "rpgterritorio",
    alias: ["rterritory"],
    description: "Ver detalles de un territorio — !rpgterritorio [id]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, args, sock, from, msg }) => {
      await react("🏴");
      const id = (args[0] || "").toLowerCase().replace(/-/g, "_");
      if (!id || !TERRITORIOS[id]) {
        const lista = Object.values(TERRITORIOS)
          .map(t => "│ " + t.emoji + " `" + t.id + "` — " + t.nombre)
          .join("\n");
        return reply(
          "❌ ID de territorio inválido.\n\n" +
          "╭─〔 🗺️ IDs VÁLIDOS 〕\n" +
          lista + "\n" +
          "╰──────────────────────⬣\n\n" +
          "Ej: `!rpgterritorio la_capital`"
        );
      }

      const def = TERRITORIOS[id];
      const estado = getTerritorio(id);
      const dueno = estado?.propietario || null;
      const pts = calcPuntosTerritorio(id);
      const boss = getBossTerritorio(id);
      const cdMs = getTerritorioCooldown(id);

      const _TIPOS = {
        fortaleza: { nombre: "Fortaleza",     emoji: "🏰", puntos: 5 },
        aldea:     { nombre: "Aldea",         emoji: "🏠", puntos: 2 },
        santuario: { nombre: "Santuario",     emoji: "🏛️",  puntos: 3 },
        mazmorra:  { nombre: "Mazmorra",      emoji: "🚪", puntos: 3 },
        torre:     { nombre: "Torre de Vigía",emoji: "🗼", puntos: 1 },
      };

      const puntosStr = def.puntos.map(p => {
        const tipo = _TIPOS[p.tipo];
        return "│   " + tipo.emoji + " *" + p.nombre + "* (" + tipo.nombre + ") — " + tipo.puntos + " pts";
      }).join("\n");

      const adyStr = def.adyacentes
        .map(aid => {
          const at = TERRITORIOS[aid];
          const ae = getTerritorios()[aid];
          const ctrl = ae?.propietario ? "🏴 " + ae.propietario : "⬜ libre";
          return "│   " + at.emoji + " " + at.nombre + " (" + ctrl + ")";
        })
        .join("\n");

      const poderDef = calcPoderDefensaTerritorio(id);
      const bossStr = (boss && boss.hp > 0)
        ? "\n╭─〔 " + boss.emoji + " BOSS ACTIVO 〕\n" +
          "│ *" + boss.nombre + "*\n" +
          "│ ❤️ HP: *" + boss.hp + "/" + boss.hpMax + "*\n" +
          (boss.clanAtacante ? "│ ⚔️ Atacado por: *" + boss.clanAtacante + "*\n" : "") +
          "╰──────────────────────⬣"
        : "";
      const cdStr = cdMs > 0
        ? "\n🛡️ Protección: *" + Math.floor(cdMs/3600000) + "h " + Math.floor((cdMs%3600000)/60000) + "min*"
        : "";

      const caption =
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  " + def.emoji + " *" + def.nombre.toUpperCase() + "*  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "📖 " + def.descripcion + "\n\n" +
        "╭─〔 📊 DATOS 〕\n" +
        "│ 🎯 Puntos de control: *" + pts + "*\n" +
        "│ 🛡️ Poder defensivo base: *" + poderDef + "*\n" +
        "│ 🎁 Bonus: " + def.bonus.desc + "\n" +
        "│ 🏴 Controlado por: " + (dueno ? "*" + dueno + "*" : "_Nadie_") + "\n" +
        (estado?.conquistadoEn ? "│ 📅 Desde: " + new Date(estado.conquistadoEn).toLocaleDateString("es") + "\n" : "") +
        cdStr + "\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 🏛️ PUNTOS ESTRATÉGICOS 〕\n" +
        puntosStr + "\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 🔗 TERRITORIOS ADYACENTES 〕\n" +
        adyStr + "\n" +
        "╰──────────────────────⬣" +
        bossStr + "\n\n" +
        (dueno ? "⚔️ Para conquistarlo: `!rpgconquistar " + id + "`" : "⚔️ ¡Sin dueño! Conquístalo: `!rpgconquistar " + id + "`");

      try {
        const { readFile: rf } = await import("fs/promises");
        const { join: pjoin } = await import("path");
        const { fileURLToPath } = await import("url");
        const __d = fileURLToPath(new URL(".", import.meta.url));
        const img = await rf(pjoin(__d, "../../assets/territorios/" + id + ".png"));
        await sock.sendMessage(from, { image: img, caption, mimetype: "image/png" }, { quoted: msg });
      } catch (e) {
        return reply(caption);
      }
    },
  },

  // ── !rpgconquistar [territorio] ──────────────────────────────
  {
    name: "rpgconquistar",
    alias: ["rpgconquista", "rpgatacatterritorio"],
    description: "Atacar un territorio con tu clan — !rpgconquistar [id]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg }) => {
      const p = getPlayer(sender, msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan. Crea o únete a uno con `!rpgclan`.");

      const clan = getGuild(p.clan);
      if (!clan) return reply("❌ Tu clan no existe en la base de datos.");
      if (clan.lider !== sender) return reply("❌ Solo el *líder del clan* puede declarar conquistas.");
      if (clan.miembros.length < 2) return reply("❌ Necesitas al menos *2 miembros* en el clan para conquistar.");

      // Cooldown de conquista
      const ahora = Date.now();
      if (clan.conquistaCooldown && ahora - clan.conquistaCooldown < CD_CONQUISTA) {
        const restMs = CD_CONQUISTA - (ahora - clan.conquistaCooldown);
        const restH = Math.floor(restMs / 3600000);
        const restM = Math.floor((restMs % 3600000) / 60000);
        return reply("⏳ *Conquista en cooldown.*\nTu clan puede volver a atacar en *" + restH + "h " + restM + "min*.");
      }

      const id = (args[0] || "").toLowerCase().replace(/-/g, "_");
      if (!id || !TERRITORIOS[id]) {
        const lista = Object.values(TERRITORIOS)
          .map(t => "│ " + t.emoji + " `" + t.id + "` — " + t.nombre)
          .join("\n");
        return reply(
          "❌ Especifica el ID del territorio a atacar.\n\n" +
          "╭─〔 🗺️ IDs VÁLIDOS 〕\n" +
          lista + "\n" +
          "╰──────────────────────⬣\n\n" +
          "Ej: `!rpgbossterreno la_capital`"
        );
      }

      const def = TERRITORIOS[id];
      const estado = getTerritorio(id);

      // No atacar tu propio territorio
      if (estado?.propietario === clan.nombre) {
        return reply("❌ *" + def.nombre + "* ya pertenece a tu clan.");
      }

      // Verificar adyacencia — necesitas controlar un territorio adyacente (salvo que tu clan no tenga ninguno)
      const territoriosClan = getTerritoriosDeClan(clan.nombre);
      if (territoriosClan.length > 0) {
        const adyacentes = def.adyacentes || [];
        const controlaAdyacente = adyacentes.some(aid => territoriosClan.includes(aid));
        if (!controlaAdyacente) {
          const adyStr = adyacentes.map(aid => {
            const at = TERRITORIOS[aid];
            const ae = getTerritorios()[aid];
            const ctrl = ae?.propietario ? "🏴 " + ae.propietario : "⬜ libre";
            return "│ " + at.emoji + " *" + at.nombre + "* (" + ctrl + ")";
          }).join("\n");
          return reply(
            "❌ *No puedes atacar " + def.nombre + " directamente.*\n\n" +
            "Para conquistarlo necesitas controlar al menos uno de sus territorios adyacentes:\n\n" +
            adyStr + "\n\n" +
            "💡 Conquista primero uno de esos territorios."
          );
        }
      }

      // Verificar cooldown de protección de 1 día
      if (estado?.propietario) {
        const cd = getTerritorioCooldown(id);
        if (cd > 0) {
          const horas = Math.floor(cd / 3600000);
          const mins  = Math.floor((cd % 3600000) / 60000);
          return reply(
            "🛡️ *" + def.nombre + "* está bajo *protección temporal*\n" +
            "Controlado por: *" + estado.propietario + "*\n\n" +
            "⏳ Podrás atacar en *" + horas + "h " + mins + "min*."
          );
        }
      }

      // Ver si ya hay boss activo
      const bossExistente = getBossTerritorio(id);
      const boss = (bossExistente && bossExistente.hp > 0) ? bossExistente : inicializarBossTerritorio(id);

      // Si el territorio tiene dueño, iniciar ventana de defensa y avisar al grupo
      if (estado?.propietario) {
        const defensa = getDefensaTerritorio(id);
        // Solo iniciar nueva defensa si no hay una activa ya
        if (!defensa || Date.now() > defensa.ventanaExpira) {
          iniciarDefensaTerritorio(id, estado.propietario);
          // Aviso en el grupo para que los defensores actúen
          try {
            await sock.sendMessage(from, {
              text:
                "⚔️ *¡TERRITORIO BAJO ATAQUE!* ⚔️\n\n" +
                def.emoji + " *" + def.nombre + "* está siendo atacado por\n" +
                "🔴 *" + clan.nombre + "*\n\n" +
                "🛡️ Clan defensor: *" + estado.propietario + "*\n" +
                "⏳ Tienes *10 minutos* para reforzar al boss:\n" +
                "`!rpgdefender " + id + "`\n\n" +
                "Cada miembro que defienda añade HP al boss basado en su DEF.\n" +
                "¡Un boss más fuerte = territorio más seguro!",
            });
          } catch (e) { /* silencioso */ }
        }
      }

      const esElite = boss.esElite;
      await react("⚔️");
      const textoConquista =
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  ⚔️ *CONQUISTA: " + def.nombre.toUpperCase() + "*  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        (esElite
          ? "⚡ *¡Territorio ocupado!* El clan *" + estado.propietario + "* lo defiende.\n" +
            "Un boss *ÉLITE* guarda este territorio.\n"
          : "🏴 Territorio sin dueño. Un boss lo guarda.\n") +
        "\n" +
        boss.emoji + " *" + boss.nombre + "*\n" +
        "│ ❤️ HP: *" + boss.hp + "/" + boss.hpMax + "*\n" +
        "│ ⚔️ ATK: *" + boss.atk + "* | 🛡️ DEF: *" + boss.def + "*\n\n" +
        "⚔️ Todos los miembros del clan deben atacarlo:\n" +
        "`!rpgbossterreno " + id + "`\n\n" +
        "💀 Al derrotarlo, *" + clan.nombre + "* conquistará *" + def.nombre + "*.";
      try {
        const { readFile: rf } = await import("fs/promises");
        const { join: pjoin } = await import("path");
        const { fileURLToPath } = await import("url");
        const __d = fileURLToPath(new URL(".", import.meta.url));
        const img = await rf(pjoin(__d, "../../assets/territorios/" + id + ".png"));
        return await sock.sendMessage(from, { image: img, caption: textoConquista, mimetype: "image/png" }, { quoted: msg });
      } catch (e) {
        return reply(textoConquista);
      }
    },
  },

  // ── !rpgmisbonos ─────────────────────────────────────────────
  {
    name: "rpgmisbonos",
    alias: ["rpgbonos", "rpgbonusterritorio"],
    description: "Ver bonos activos por territorios de tu clan",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg }) => {
      await react("✨");
      const p = getPlayer(sender, msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan.");

      const clan = getGuild(p.clan);
      if (!clan) return reply("❌ Tu clan no existe.");

      const idsControlados = getTerritoriosDeClan(clan.nombre);
      const bonus = getBonusTerritorio(p);

      if (idsControlados.length === 0) {
        return reply(
          "🏴 *BONOS DE TERRITORIO*\n━━━━━━━━━━━━━━\n" +
          "Tu clan *" + clan.nombre + "* no controla ningún territorio.\n\n" +
          "⚔️ Conquista territorios con `!rpgconquistar [id]`\n" +
          "🗺️ Ver mapa: `!rpgmapa`"
        );
      }

      const territoriosStr = idsControlados.map(id => {
        const def = TERRITORIOS[id];
        return "│ " + def.emoji + " *" + def.nombre + "* — " + def.bonus.desc;
      }).join("\n");

      // Calcular bonus total incluyendo el "all"
      const oroTotal  = (bonus.oro + bonus.all) * 100;
      const expTotal  = (bonus.exp + bonus.all) * 100;
      const dropTotal = (bonus.drop + bonus.all) * 100;
      const atkTotal  = bonus.atk;

      const bonusLineas = [];
      if (oroTotal  > 0) bonusLineas.push("│ 💰 Oro:  +" + oroTotal.toFixed(0) + "%");
      if (expTotal  > 0) bonusLineas.push("│ ⭐ EXP:  +" + expTotal.toFixed(0) + "%");
      if (dropTotal > 0) bonusLineas.push("│ 🎁 Drop: +" + dropTotal.toFixed(0) + "%");
      if (atkTotal  > 0) bonusLineas.push("│ ⚔️ ATK:  +" + atkTotal + " en arena");

      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃    ✨ *BONOS ACTIVOS* ✨    ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "👤 *" + p.nombre + "* | Clan: *" + clan.nombre + "*\n\n" +
        "╭─〔 🏴 TERRITORIOS CONTROLADOS (" + idsControlados.length + ") 〕\n" +
        territoriosStr + "\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 📊 BONUS TOTALES 〕\n" +
        (bonusLineas.length > 0 ? bonusLineas.join("\n") : "│ (ninguno activo)") + "\n" +
        "╰──────────────────────⬣\n\n" +
        "⚔️ Conquista más territorios: `!rpgconquistar [id]`\n" +
        "🗺️ Ver mapa completo: `!rpgmapa`"
      );
    },
  },

  // ── !rpgrecolectar ───────────────────────────────────────────
  {
    name: "rpgrecolectar",
    alias: ["rpgcobrar", "rpgreclamar"],
    description: "Reclamar producción acumulada de los territorios del clan",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg }) => {
      const p = getPlayer(sender, msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      if (!p.clan)  return reply("❌ No perteneces a ningún clan.");

      const clan = getGuild(p.clan);
      if (!clan) return reply("❌ Tu clan no existe.");
      if (clan.lider !== sender) return reply("❌ Solo el *líder del clan* puede reclamar la producción.");

      const ids = getTerritoriosDeClan(clan.nombre);
      if (ids.length === 0) {
        return reply(
          "🏴 *RECOLECCIÓN DE TERRITORIOS*\n━━━━━━━━━━━━━━\n" +
          "Tu clan *" + clan.nombre + "* no controla ningún territorio.\n\n" +
          "⚔️ Conquista territorios con `!rpgconquistar [id]`"
        );
      }

      const acumulado = getAcumuladoClan(clan.nombre);

      if (acumulado.oro === 0 && acumulado.gemas === 0 && acumulado.exp === 0) {
        return reply(
          "⏳ *RECOLECCIÓN DE TERRITORIOS*\n━━━━━━━━━━━━━━\n" +
          "Aún no hay nada acumulado.\n" +
          "Los territorios producen recursos *cada hora*.\n\n" +
          "🗺️ Territorios controlados: *" + ids.length + "*"
        );
      }

      // Reclamar y limpiar
      reclamarAcumuladoClan(clan.nombre);

      // Distribuir entre todos los miembros
      const numMiembros = clan.miembros.length;
      const oroPorMiembro   = Math.floor(acumulado.oro   / numMiembros);
      const gemasPorMiembro = Math.floor(acumulado.gemas / numMiembros);
      const expPorMiembro   = Math.floor(acumulado.exp   / numMiembros);

      const medallasPorMiembro = Math.floor((acumulado.medallas || 0) / numMiembros);
      for (const jid of clan.miembros) {
        const mp = db.players[jid];
        if (!mp) continue;
        mp.oro   = (mp.oro   || 0) + oroPorMiembro;
        mp.gemas = (mp.gemas || 0) + gemasPorMiembro;
        if (expPorMiembro > 0) addExp(mp, expPorMiembro);
        if (medallasPorMiembro > 0) addMedallas(jid, medallasPorMiembro);
        savePlayer(mp);
      }

      // Detalles por territorio
      const detalle = acumulado.territorios.map(t =>
        "│ " + (TERRITORIOS[t.id]?.emoji || "🏴") + " *" + t.nombre + "*\n" +
        "│   💰 " + t.acumulado.oro + " | 💎 " + t.acumulado.gemas + " | ⭐ " + t.acumulado.exp + " | 🏅 " + (t.acumulado.medallas||0)
      ).join("\n");

      await react("💰");
      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  💰 *RECOLECCIÓN DE TERRITORIOS* 💰  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "🏰 Clan: *" + clan.nombre + "* | 👥 " + numMiembros + " miembros\n\n" +
        "╭─〔 🗺️ PRODUCCIÓN TOTAL 〕\n" +
        detalle + "\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 📊 REPARTO POR MIEMBRO 〕\n" +
        "│ 💰 Oro:   *+" + oroPorMiembro + "*\n" +
        "│ 💎 Gemas: *+" + gemasPorMiembro + "*\n" +
        "│ ⭐ EXP:   *+" + expPorMiembro + "*\n" +
        "│ 🏅 Medallas: *+" + medallasPorMiembro + "*\n" +
        "╰──────────────────────⬣\n\n" +
        "✅ Recursos distribuidos entre todos los miembros.\n" +
        "⏳ La producción vuelve a acumularse cada hora."
      );
    },
  },

  // ── !rpgbossterreno [id] ─────────────────────────────────────────────
  {
    name: "rpgbossterreno",
    alias: ["rpgatacarboss", "rpgbossataque"],
    description: "Atacar al boss de un territorio — !rpgbossterreno [id]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg }) => {
      const p = getPlayer(sender, msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      if (!p.clan)  return reply("❌ No perteneces a ningún clan.");
      if (p.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar` primero.");

      const clan = getGuild(p.clan);
      if (!clan) return reply("❌ Tu clan no existe.");

      const id = (args[0] || "").toLowerCase().replace(/-/g, "_");
      if (!id || !TERRITORIOS[id]) {
        const lista = Object.values(TERRITORIOS)
          .map(t => "│ " + t.emoji + " `" + t.id + "` — " + t.nombre)
          .join("\n");
        return reply(
          "❌ Especifica el territorio. IDs válidos:\n\n" +
          "╭─〔 🗺️ TERRITORIOS 〕\n" + lista + "\n╰──────────────────────⬣\n\n" +
          "Ej: `!rpgbossterreno la_capital`"
        );
      }

      const def = TERRITORIOS[id];
      const estado = getTerritorio(id);

      // Verificar cooldown de 1 día si el territorio tiene dueño
      if (estado?.propietario) {
        const cd = getTerritorioCooldown(id);
        if (cd > 0) {
          const horas = Math.floor(cd / 3600000);
          const mins  = Math.floor((cd % 3600000) / 60000);
          return reply(
            "🛡️ *" + def.nombre + "* está bajo *protección temporal*\n" +
            "Controlado por: *" + estado.propietario + "*\n\n" +
            "⏳ Podrás atacar en *" + horas + "h " + mins + "min*."
          );
        }

        // Si es territorio con dueño y el atacante ES el dueño
        if (estado.propietario === clan.nombre) {
          return reply("❌ *" + def.nombre + "* ya pertenece a tu clan.");
        }
      }

      // Obtener o inicializar boss
      let boss = getBossTerritorio(id);
      if (!boss || boss.hp <= 0) {
        boss = inicializarBossTerritorio(id);
      }

      // Si hay boss activo de otro clan atacando, solo ese clan puede atacar
      if (boss.clanAtacante && boss.clanAtacante !== clan.nombre) {
        return reply(
          "⚔️ El boss de *" + def.nombre + "* ya está siendo atacado por el clan *" + boss.clanAtacante + "*\n" +
          "HP restante: *" + boss.hp + "/" + boss.hpMax + "*"
        );
      }

      // Registrar clan atacante
      if (!boss.clanAtacante) {
        boss.clanAtacante = clan.nombre;
        saveBossTerritorio(id, boss);
      }

      // Calcular daño del jugador al boss (stats normales del jugador)
      const atkJugador = getTotalAtk(p);
      const defBoss    = boss.def;
      const critJugador = Math.random() * 100 < (p.crit || 5);
      const dmgABoss   = Math.max(1, Math.floor((atkJugador - defBoss * 0.4 + Math.random() * 20) * (critJugador ? 2 : 1)));

      // Calcular daño del boss al jugador (25% de sus stats)
      const atkBoss    = Math.floor(boss.atk * 0.25);
      const defJugador = getTotalDef(p);
      const critBoss   = Math.random() * 100 < (boss.crit || 8);
      const dmgAJugador = Math.max(1, Math.floor((atkBoss - defJugador * 0.4 + Math.random() * 10) * (critBoss ? 2 : 1)));

      // Aplicar daños
      const bossActualizado = atacarBossTerritorio(id, sender, dmgABoss);
      p.hp = Math.max(0, p.hp - dmgAJugador);
      savePlayer(p);

      const bossHpRestante = bossActualizado.hp;
      const bossMuerto = bossHpRestante <= 0;
      const jugadorMuerto = p.hp <= 0;

      const barraHP = (hp, max) => {
        const pct = Math.round((hp / max) * 10);
        return "▓".repeat(Math.max(0, pct)) + "░".repeat(Math.max(0, 10 - pct));
      };

      let texto =
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  " + boss.emoji + " *" + boss.nombre.toUpperCase() + "*  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "⚔️ *" + p.nombre + "* ataca al boss\n\n" +
        (critJugador ? "💥 *¡CRÍTICO!* " : "⚔️ ") + "Tu golpe: *-" + dmgABoss + "* al boss\n" +
        (critBoss    ? "💥 *¡CRÍTICO!* " : "🔥 ") + "Boss contraataca: *-" + dmgAJugador + "* a ti\n\n" +
        "╭─〔 🐲 BOSS 〕\n" +
        "│ ❤️ HP: *" + bossHpRestante + "/" + bossActualizado.hpMax + "*\n" +
        "│ " + barraHP(bossHpRestante, bossActualizado.hpMax) + "\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 👤 TÚ 〕\n" +
        "│ ❤️ HP: *" + p.hp + "/" + p.hpMax + "*\n" +
        "│ " + barraHP(p.hp, p.hpMax) + "\n" +
        "╰──────────────────────⬣\n";

      if (p.hp <= 0 && bossHpRestante > 0) {
        texto += "\n\n💀 *¡Has caído en batalla!*\n" +
          "│ Usa `!rpgdescansar` para recuperar HP\n" +
          "│ Tus compañeros de clan pueden seguir atacando\n" +
          "│ El daño que hiciste al boss *se mantiene*";
      }

      if (bossHpRestante > 0) {
        // Mostrar daño total acumulado del clan
        const totalDmg = Object.values(bossActualizado.participantes || {}).reduce((a, b) => a + b, 0);
        texto += "\n⚔️ Daño total del clan: *" + totalDmg + "*\n" +
                 "_Sigue atacando con_ `!rpgbossterreno " + id + "`";
        await react("⚔️");
      } else {
        // BOSS MUERTO — conquistar territorio
        saveBossTerritorio(id, null);
        clearDefensaTerritorio(id);

        // Recompensas por matar al boss (distribuidas entre participantes)
        const recompensaOro  = boss.esElite ? 2000 : 1000;
        const recompensaExp  = boss.esElite ? 1500 : 800;
        const recompensaGemas = boss.esElite ? 20 : 10;
        const numPartic = Object.keys(bossActualizado.participantes || {}).length;

        for (const jid of Object.keys(bossActualizado.participantes || {})) {
          const mp = db.players[jid];
          if (!mp) continue;
          mp.oro   = (mp.oro   || 0) + Math.floor(recompensaOro  / numPartic);
          mp.gemas = (mp.gemas || 0) + Math.floor(recompensaGemas / numPartic);
          addExp(mp, Math.floor(recompensaExp / numPartic));
          addMedallas(jid, boss.esElite ? 30 : 15);
          avanzarMisionClan(jid, "boss_terr");
          savePlayer(mp);
        }

        // Registrar en historial
        const anteriorDueno = getTerritorio(id)?.propietario || null;
        registrarConquista(id, clan.nombre, anteriorDueno);
        // Dar medallas a todos los participantes de la conquista
        for (const jid of Object.keys(bossActualizado.participantes || {})) {
          addMedallas(jid, 50); // 50 medallas por conquistar un territorio
        }

        // Conquistar territorio
        saveTerritorio(id, {
          propietario: clan.nombre,
          conquistadoEn: Date.now(),
          puntosControl: calcPuntosTerritorio(id),
          acumulado: { oro: 0, gemas: 0, exp: 0 },
        });

        // Notificación al grupo
        try {
          await sock.sendMessage(from, {
            text:
              "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
              "┃  🏆 *¡TERRITORIO CONQUISTADO!* 🏆  ┃\n" +
              "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
              boss.emoji + " *" + boss.nombre + "* ha sido derrotado!\n\n" +
              def.emoji + " *" + def.nombre + "* ahora pertenece a\n" +
              "🏰 *" + clan.nombre + "*\n\n" +
              "🎁 Bonus activo: " + def.bonus.desc + "\n" +
              "🛡️ Protección activa por *12 horas*",
          });
        } catch (e) { /* silencioso si falla */ }

        texto +=
          "\n\n💀 *¡" + boss.nombre + " ha sido derrotado!*\n\n" +
          "🏆 *¡" + clan.nombre + " conquista " + def.emoji + " " + def.nombre + "!*\n\n" +
          "╭─〔 🎁 RECOMPENSAS (entre " + numPartic + " participantes) 〕\n" +
          "│ 💰 Oro:   *+" + Math.floor(recompensaOro  / numPartic) + "* por miembro\n" +
          "│ 💎 Gemas: *+" + Math.floor(recompensaGemas / numPartic) + "* por miembro\n" +
          "│ ⭐ EXP:   *+" + Math.floor(recompensaExp  / numPartic) + "* por miembro\n" +
          "╰──────────────────────⬣\n\n" +
          "🎁 Bonus activo: " + def.bonus.desc + "\n" +
          "🛡️ Protección: *12 horas*\n" +
          "📋 Ver mapa: `!rpgmapa`";

        await react("🏆");
      }

      return reply(texto);
    },
  },

  // ── !rpgbossstatus [id] ──────────────────────────────────────
  {
    name: "rpgbossstatus",
    alias: ["rpgboss status", "bossinfo"],
    description: "Ver estado actual del boss de un territorio",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, args }) => {
      await react("🐲");
      const id = (args[0] || "").toLowerCase().replace(/-/g, "_");
      if (!id || !TERRITORIOS[id]) {
        const lista = Object.values(TERRITORIOS)
          .map(t => "│ " + t.emoji + " `" + t.id + "`")
          .join("\n");
        return reply("❌ ID inválido.\n\n" + lista + "\n\nEj: `!rpgbossstatus la_capital`");
      }

      const def = TERRITORIOS[id];
      const estado = getTerritorio(id);
      const boss = getBossTerritorio(id);
      const cdMs = getTerritorioCooldown(id);

      if (cdMs > 0) {
        const h = Math.floor(cdMs / 3600000);
        const m = Math.floor((cdMs % 3600000) / 60000);
        return reply(
          def.emoji + " *" + def.nombre + "*\n" +
          "🏴 Controlado por: *" + estado.propietario + "*\n" +
          "🛡️ En protección — no se puede atacar\n" +
          "⏳ Disponible en: *" + h + "h " + m + "min*"
        );
      }

      if (!boss || boss.hp <= 0) {
        const baseBoss = BOSS_TERRITORIO[id];
        const esElite = estado?.propietario ? true : false;
        return reply(
          def.emoji + " *" + def.nombre + "*\n\n" +
          "🏴 Controlado por: " + (estado?.propietario ? "*" + estado.propietario + "*" : "_Nadie_") + "\n\n" +
          baseBoss.emoji + " *" + (esElite ? "⚡ " + baseBoss.nombre + " [ÉLITE]" : baseBoss.nombre) + "*\n" +
          "│ ❤️ HP: *" + (esElite ? baseBoss.hpMax * 2 : baseBoss.hpMax) + "/" + (esElite ? baseBoss.hpMax * 2 : baseBoss.hpMax) + "* (sin iniciar)\n" +
          "│ ⚔️ ATK: *" + (esElite ? Math.floor(baseBoss.atk * 1.5) : baseBoss.atk) + "* | 🛡️ DEF: *" + (esElite ? Math.floor(baseBoss.def * 1.5) : baseBoss.def) + "*\n\n" +
          "⚔️ Usa `!rpgbossterreno " + id + "` para iniciar el ataque."
        );
      }

      const barraHP = (hp, max) => {
        const pct = Math.round((hp / max) * 10);
        return "▓".repeat(Math.max(0, pct)) + "░".repeat(Math.max(0, 10 - pct));
      };

      const participantes = boss.participantes || {};
      const top = Object.entries(participantes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([jid, dmg], i) => {
          const mp = db.players[jid];
          return "│ " + (i + 1) + ". *" + (mp?.nombre || jid.split("@")[0]) + "* — " + dmg + " dmg";
        }).join("\n");

      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  " + boss.emoji + " *STATUS DEL BOSS*  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        def.emoji + " *" + def.nombre + "*\n" +
        "🏴 Controlado por: " + (estado?.propietario ? "*" + estado.propietario + "*" : "_Nadie_") + "\n\n" +
        boss.emoji + " *" + boss.nombre + "*\n" +
        "│ ❤️ HP: *" + boss.hp + "/" + boss.hpMax + "*\n" +
        "│ " + barraHP(boss.hp, boss.hpMax) + "\n" +
        "│ ⚔️ ATK: *" + boss.atk + "* | 🛡️ DEF: *" + boss.def + "*\n" +
        (boss.clanAtacante ? "│ ⚔️ Atacado por: *" + boss.clanAtacante + "*\n" : "") +
        "╰──────────────────────⬣\n\n" +
        (top ? "╭─〔 🏅 TOP DAÑO 〕\n" + top + "\n╰──────────────────────⬣\n\n" : "") +
        "⚔️ Ataca con: `!rpgbossterreno " + id + "`"
      );
    },
  },

  // ── !rpghistorial ────────────────────────────────────────────
  {
    name: "rpghistorial",
    alias: ["rpghistorial", "territoriohistorial"],
    description: "Ver historial de conquistas de territorios",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react }) => {
      await react("📜");
      const historial = getHistorialConquistas();

      if (!historial || historial.length === 0) {
        return reply(
          "📜 *HISTORIAL DE CONQUISTAS*\n━━━━━━━━━━━━━━\n" +
          "_Aún no hay conquistas registradas esta semana._\n\n" +
          "⚔️ Sé el primero con `!rpgconquistar [id]`"
        );
      }

      const lineas = historial.map((h, i) => {
        const fecha = new Date(h.fecha);
        const hora = fecha.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
        const dia  = fecha.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
        const anterior = h.anteriorDueno ? " _(arrebatado a *" + h.anteriorDueno + "*)_" : " _(territorio libre)_";
        return (i + 1) + ". " + h.emoji + " *" + h.territorio + "*\n" +
          "│ 🏰 *" + h.clan + "*" + anterior + "\n" +
          "│ 📅 " + dia + " a las " + hora;
      }).join("\n\n");

      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   📜 *HISTORIAL DE CONQUISTAS*   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        lineas + "\n\n" +
        "_Se reinicia cada semana con el reset de territorios._"
      );
    },
  },


  // ── !rpgbanco ────────────────────────────────────────────────
  {
    name: "rpgbanco",
    alias: ["rpgbanco"],
    description: "Banco personal — guarda oro a salvo de robos",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ sender, args, reply, react, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.nombre) return reply("❌ Primero regístrate con `!rpgregistro [nombre]`.");

      // Inicializar banco personal si no existe
      if (!p.bancoPersonal) p.bancoPersonal = 0;

      const sub   = (args[0] || "").toLowerCase();
      const monto = parseInt(args[1]) || 0;

      // ── Ver saldo ──────────────────────────────────────────
      if (!sub || sub === "ver" || sub === "saldo") {
        await react("🏦");
        return reply(
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃    🏦 *BANCO PERSONAL*    ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "👤 *" + p.nombre + "*\n" +
          "💰 Oro en mano:  *" + p.oro + "*\n" +
          "🏦 Oro en banco: *" + p.bancoPersonal + "*\n\n" +
          "📌 *Comandos:*\n" +
          "• `!rpgbanco depositar [monto]`\n" +
          "• `!rpgbanco retirar [monto]`\n" +
          "_El oro guardado en el banco no puede ser robado._"
        );
      }

      // ── Depositar ──────────────────────────────────────────
      if (sub === "depositar" || sub === "dep") {
        if (!monto || monto <= 0) return reply("❌ Indica un monto válido. Ej: `!rpgbanco depositar 500`");
        if (p.oro < monto) return reply(`❌ No tienes suficiente oro. Tienes *${p.oro}💰* en mano.`);

        p.oro -= monto;
        p.bancoPersonal += monto;
        savePlayer(p);

        await react("💰");
        return reply(
          "🏦 *DEPÓSITO EXITOSO*\n" +
          "━━━━━━━━━━━━━━\n" +
          "💰 Depositado: *+" + monto + " oro*\n" +
          "🏦 Banco: *" + p.bancoPersonal + " oro*\n" +
          "👜 En mano: *" + p.oro + " oro*\n\n" +
          "_Tu oro está a salvo en el banco._"
        );
      }

      // ── Retirar ────────────────────────────────────────────
      if (sub === "retirar" || sub === "ret") {
        if (!monto || monto <= 0) return reply("❌ Indica un monto válido. Ej: `!rpgbanco retirar 300`");
        if (p.bancoPersonal < monto) return reply(`❌ Solo tienes *${p.bancoPersonal}💰* en el banco.`);

        p.bancoPersonal -= monto;
        p.oro += monto;
        savePlayer(p);

        await react("💸");
        return reply(
          "🏦 *RETIRO EXITOSO*\n" +
          "━━━━━━━━━━━━━━\n" +
          "💸 Retirado: *-" + monto + " oro*\n" +
          "🏦 Banco: *" + p.bancoPersonal + " oro*\n" +
          "👜 En mano: *" + p.oro + " oro*"
        );
      }

      return reply("❓ Uso: `!rpgbanco [ver/depositar/retirar] [monto]`");
    },
  },


  // ── !rpgdefender [id] ────────────────────────────────────────
  {
    name: "rpgdefender",
    alias: ["rpgdefensa", "rpgproteger"],
    description: "Defender tu territorio cuando está bajo ataque — !rpgdefender [id]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, msg }) => {
      const p = getPlayer(sender, msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      if (!p.clan)  return reply("❌ No perteneces a ningún clan.");
      if (p.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar` primero.");

      const id = (args[0] || "").toLowerCase().replace(/-/g, "_");
      if (!id || !TERRITORIOS[id]) {
        const lista = Object.values(TERRITORIOS)
          .map(t => "│ " + t.emoji + " `" + t.id + "` — " + t.nombre)
          .join("\n");
        return reply(
          "❌ Especifica el territorio. IDs válidos:\n\n" +
          "╭─〔 🗺️ TERRITORIOS 〕\n" + lista + "\n╰──────────────────────⬣\n\n" +
          "Ej: `!rpgdefender bosque_esmeralda`"
        );
      }

      const def = TERRITORIOS[id];
      const estado = getTerritorio(id);

      // Verificar que el territorio tenga dueño
      if (!estado?.propietario) {
        return reply("❌ *" + def.nombre + "* no pertenece a ningún clan. No hay nada que defender.");
      }

      // Verificar que el jugador pertenece al clan defensor
      if (estado.propietario !== p.clan) {
        return reply(
          "❌ *" + def.nombre + "* pertenece al clan *" + estado.propietario + "*.\n" +
          "Solo sus miembros pueden defenderlo."
        );
      }

      // Verificar que hay una defensa activa
      const defensa = getDefensaTerritorio(id);
      if (!defensa) {
        return reply(
          "🛡️ *" + def.nombre + "* no está bajo ataque.\n\n" +
          "La ventana de defensa se abre cuando un clan enemigo usa `!rpgconquistar " + id + "`."
        );
      }

      // Verificar que la ventana no expiró
      if (Date.now() > defensa.ventanaExpira) {
        return reply(
          "⏳ La ventana de defensa de *" + def.nombre + "* ya *expiró*.\n\n" +
          "Si el boss sigue vivo, el clan atacante puede seguir combatiéndolo.\n" +
          "Usa `!rpgbossstatus " + id + "` para ver el estado actual."
        );
      }

      // Calcular DEF total del jugador
      const defJugador = getTotalDef(p);

      // Intentar defender
      const resultado = defenderTerritorio(id, sender, defJugador);

      if (!resultado) {
        return reply("❌ No se pudo registrar la defensa. Intenta de nuevo.");
      }

      if (resultado.yaDefendio) {
        return reply(
          "⚠️ Ya defendiste *" + def.nombre + "* en este ataque.\n" +
          "Solo puedes reforzar al boss *una vez* por ataque."
        );
      }

      await react("🛡️");

      const msRestante = defensa.ventanaExpira - Date.now();
      const minRestante = Math.ceil(msRestante / 60000);
      const numDefensores = Object.keys(resultado.defensa.defensores).length;
      const hpBonusTotal = resultado.defensa.hpBonus;
      const boss = getBossTerritorio(id);

      const barraHP = (hp, max) => {
        const pct = Math.round((hp / max) * 10);
        return "▓".repeat(Math.max(0, pct)) + "░".repeat(Math.max(0, 10 - pct));
      };

      const bossStr = boss && boss.hp > 0
        ? "\n╭─〔 " + boss.emoji + " BOSS REFORZADO 〕\n" +
          "│ ❤️ HP: *" + boss.hp + "/" + boss.hpMax + "*\n" +
          "│ " + barraHP(boss.hp, boss.hpMax) + "\n" +
          "╰──────────────────────⬣"
        : "";

      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   🛡️ *¡DEFENSA ACTIVADA!* 🛡️   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "👤 *" + p.nombre + "* refuerza al boss de\n" +
        def.emoji + " *" + def.nombre + "*\n\n" +
        "╭─〔 📊 TU APORTE 〕\n" +
        "│ 🛡️ DEF: *" + defJugador + "*\n" +
        "│ ❤️ HP añadido al boss: *+" + resultado.hpAportado + "*\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 🏰 ESTADO DE DEFENSA 〕\n" +
        "│ 👥 Defensores: *" + numDefensores + "*\n" +
        "│ ❤️ HP bonus total: *+" + hpBonusTotal + "*\n" +
        "│ ⏳ Ventana cierra en: *" + minRestante + "min*\n" +
        "╰──────────────────────⬣" +
        bossStr + "\n\n" +
        "⚔️ Atacantes: clan *" + (boss?.clanAtacante || "desconocido") + "*\n" +
        "_Más defensores = boss más fuerte. Avisa a tus compañeros._"
      );
    },
  },

  // ── !rpgestadodefensa [id] ───────────────────────────────────
  {
    name: "rpgestadodefensa",
    alias: ["rpgdefensastatus", "defensainfo"],
    description: "Ver el estado de defensa activa de un territorio",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, args }) => {
      await react("🛡️");
      const id = (args[0] || "").toLowerCase().replace(/-/g, "_");
      if (!id || !TERRITORIOS[id]) {
        const lista = Object.values(TERRITORIOS)
          .map(t => "│ " + t.emoji + " `" + t.id + "`")
          .join("\n");
        return reply("❌ ID inválido.\n\n" + lista + "\n\nEj: `!rpgestadodefensa bosque_esmeralda`");
      }

      const def = TERRITORIOS[id];
      const estado = getTerritorio(id);
      const defensa = getDefensaTerritorio(id);
      const boss = getBossTerritorio(id);

      if (!defensa || Date.now() > defensa.ventanaExpira) {
        const bossActivo = boss && boss.hp > 0;
        return reply(
          def.emoji + " *" + def.nombre + "*\n" +
          "🏴 Controlado por: " + (estado?.propietario ? "*" + estado.propietario + "*" : "_Nadie_") + "\n\n" +
          (bossActivo
            ? "⚔️ *Boss activo* — en combate\n" +
              boss.emoji + " *" + boss.nombre + "* ❤️ " + boss.hp + "/" + boss.hpMax + "\n" +
              "_(ventana de defensa cerrada — ya no se puede reforzar)_"
            : "🛡️ No hay ataque activo en este momento.")
        );
      }

      const msRestante = defensa.ventanaExpira - Date.now();
      const minRestante = Math.ceil(msRestante / 60000);
      const numDefensores = Object.keys(defensa.defensores).length;

      const defensoresStr = Object.entries(defensa.defensores)
        .map(([jid, hp]) => {
          const mp = db.players[jid];
          return "│ 🛡️ *" + (mp?.nombre || jid.split("@")[0]) + "* — +" + hp + " HP";
        }).join("\n");

      const barraHP = (hp, max) => {
        const pct = Math.round((hp / max) * 10);
        return "▓".repeat(Math.max(0, pct)) + "░".repeat(Math.max(0, 10 - pct));
      };

      const bossStr = boss && boss.hp > 0
        ? "╭─〔 " + boss.emoji + " BOSS 〕\n" +
          "│ *" + boss.nombre + "*\n" +
          "│ ❤️ HP: *" + boss.hp + "/" + boss.hpMax + "*\n" +
          "│ " + barraHP(boss.hp, boss.hpMax) + "\n" +
          "│ ⚔️ Atacado por: *" + (boss.clanAtacante || "?") + "*\n" +
          "╰──────────────────────⬣\n\n"
        : "";

      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  🛡️ *DEFENSA ACTIVA*  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        def.emoji + " *" + def.nombre + "*\n" +
        "🏴 Defensor: *" + defensa.clanDefensor + "*\n" +
        "⏳ Ventana cierra en: *" + minRestante + "min*\n\n" +
        bossStr +
        "╭─〔 🛡️ DEFENSORES (" + numDefensores + ") 〕\n" +
        (defensoresStr || "│ _Ninguno aún_") + "\n" +
        "│ ❤️ HP bonus total: *+" + defensa.hpBonus + "*\n" +
        "╰──────────────────────⬣\n\n" +
        "🛡️ Únete a la defensa: `!rpgdefender " + id + "`"
      );
    },
  },


  {
    name: "rpgtoppoder",
    alias: ["toppoder", "rpgtopfuerza"],
    description: "Top 10 jugadores con mayor poder (ATK+DEF total)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react }) => {
      await react("💪");
      const jugadores = Object.values(db.players)
        .filter(p => p.clase)
        .map(p => ({
          ...p,
          poder: getTotalAtk(p) + getTotalDef(p),
        }))
        .sort((a, b) => b.poder - a.poder)
        .slice(0, 10);

      if (!jugadores.length) return reply("❌ No hay jugadores registrados aún.");

      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lista = jugadores.map((p, i) => {
        const nombre = p.nombre && !/^[0-9]{10,}$/.test(p.nombre) ? p.nombre : "@" + p.jid.split("@")[0];
        const claseInfo = CLASES[p.clase];
        const claseStr = claseInfo ? claseInfo.emoji + " " + p.clase.charAt(0).toUpperCase() + p.clase.slice(1) : "Sin clase";
        return (
          medals[i] + " *" + nombre + "* — " + claseStr +
          "\n   💪 Poder: *" + p.poder + "* | ⚔️ ATK: " + getTotalAtk(p) + " | 🛡️ DEF: " + getTotalDef(p)
        );
      }).join("\n\n");

      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   💪 *TOP PODER TOTAL*   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        lista + "\n\n" +
        "_Poder = ATK total + DEF total (incluye equipo, mascota y mejoras)_"
      );
    },
  },


  // ── !rpgtoppodermascota ──────────────────────────────────────
  {
    name: "rpgtoppodermascota",
    alias: ["toppodermascota", "rpgtopmascota"],
    description: "Top 10 jugadores con mascota más poderosa",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react }) => {
      await react("🐾");
      const jugadores = Object.values(db.players)
        .filter(p => p.clase && p.mascota)
        .map(p => {
          const mascota =
            (p._ssrMascotas && p._ssrMascotas[p.mascota]) ||
            MASCOTAS_SSR[p.mascota] ||
            MASCOTAS[p.mascota];
          const poderMascota = mascota
            ? (mascota.bonus?.atk || 0) + (mascota.bonus?.def || 0) + (mascota.bonus?.crit || 0)
            : 0;
          return { ...p, mascotaData: mascota, poderMascota };
        })
        .filter(p => p.poderMascota > 0)
        .sort((a, b) => b.poderMascota - a.poderMascota)
        .slice(0, 10);

      if (!jugadores.length) return reply("❌ Ningún jugador tiene mascota equipada aún.");

      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lista = jugadores.map((p, i) => {
        const nombre = p.nombre && !/^[0-9]{10,}$/.test(p.nombre) ? p.nombre : "@" + p.jid.split("@")[0];
        const m = p.mascotaData;
        const emoji = m?.emoji || "🐾";
        const nombreMascota = m?.nombre || p.mascota;
        const calidad = m?.calidad === "ssr" ? " ✨*[SSR]*" : "";
        return (
          medals[i] + " *" + nombre + "*\n" +
          "   " + emoji + calidad + " " + nombreMascota +
          " | 💪 Poder: *" + p.poderMascota + "* (ATK+" + (m?.bonus?.atk||0) + " DEF+" + (m?.bonus?.def||0) + " CRIT+" + (m?.bonus?.crit||0) + ")"
        );
      }).join("\n\n");

      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  🐾 *TOP PODER MASCOTA*  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        lista + "\n\n" +
        "_Poder mascota = ATK + DEF + CRIT que aporta la mascota equipada_"
      );
    },
  },


  // ── !rpgtoppoderarma ─────────────────────────────────────────
  {
    name: "rpgtoppoderarma",
    alias: ["toppoderarma", "rpgtoparma"],
    description: "Top 10 jugadores con arma más poderosa",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react }) => {
      await react("⚔️");
      const jugadores = Object.values(db.players)
        .filter(p => p.clase && p.equipo?.arma)
        .map(p => {
          const armaId = p.equipo.arma;
          const arma =
            (p._ssrItems && p._ssrItems[armaId]) ||
            ARMAS_SSR[armaId] ||
            TIENDA[armaId];
          const nivelMejora = (p.mejorasEquipo?.arma_atk || 0);
          const bonusMejora = nivelMejora * 3;
          const poderArma = arma ? (arma.atk || 0) + (arma.def || 0) + bonusMejora : 0;
          return { ...p, armaData: arma, poderArma, nivelMejora };
        })
        .filter(p => p.poderArma > 0)
        .sort((a, b) => b.poderArma - a.poderArma)
        .slice(0, 10);

      if (!jugadores.length) return reply("❌ Ningún jugador tiene arma equipada aún.");

      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lista = jugadores.map((p, i) => {
        const nombre = p.nombre && !/^[0-9]{10,}$/.test(p.nombre) ? p.nombre : "@" + p.jid.split("@")[0];
        const a = p.armaData;
        const emoji = a?.emoji || "⚔️";
        const nombreArma = a?.nombre || p.equipo.arma;
        const calidad = a?.calidad === "ssr" ? " ✨*[SSR]*" : a?.calidad === "mitico" ? " 🌑*[Mítico]*" : "";
        const mejoraStr = p.nivelMejora > 0 ? " *(+\" + p.nivelMejora + \" mejoras)*" : "";
        return (
          medals[i] + " *" + nombre + "*\n" +
          "   " + emoji + calidad + " " + nombreArma + mejoraStr +
          "\n   💪 Poder: *" + p.poderArma + "* | ATK " + (a?.atk||0) + (p.nivelMejora > 0 ? "+" + (p.nivelMejora*3) + " 🔵" : "")
        );
      }).join("\n\n");

      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   ⚔️ *TOP PODER ARMA*   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        lista + "\n\n" +
        "_Poder arma = ATK + DEF del arma + bonus de mejoras con Orbe 🔵_"
      );
    },
  },


  // ── !rpgtoppoderamadura ──────────────────────────────────────
  {
    name: "rpgtoppoderamadura",
    alias: ["toppoderamadura", "rpgtoparmadura"],
    description: "Top 10 jugadores con armadura más poderosa",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react }) => {
      await react("🛡️");
      const jugadores = Object.values(db.players)
        .filter(p => p.clase && p.equipo?.armadura)
        .map(p => {
          const armId = p.equipo.armadura;
          const armadura =
            (p._ssrItems && p._ssrItems[armId]) ||
            TIENDA[armId];
          const nivelMejora = (p.mejorasEquipo?.armadura_def || 0);
          const bonusMejora = nivelMejora * 2;
          const poderArmadura = armadura ? (armadura.atk || 0) + (armadura.def || 0) + bonusMejora : 0;
          return { ...p, armaduraData: armadura, poderArmadura, nivelMejora };
        })
        .filter(p => p.poderArmadura > 0)
        .sort((a, b) => b.poderArmadura - a.poderArmadura)
        .slice(0, 10);

      if (!jugadores.length) return reply("❌ Ningún jugador tiene armadura equipada aún.");

      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lista = jugadores.map((p, i) => {
        const nombre = p.nombre && !/^[0-9]{10,}$/.test(p.nombre) ? p.nombre : "@" + p.jid.split("@")[0];
        const a = p.armaduraData;
        const emoji = a?.emoji || "🛡️";
        const nombreArmadura = a?.nombre || p.equipo.armadura;
        const calidad = a?.calidad === "mitico" ? " 🌑*[Mítico]*" : a?.calidad === "legendario" ? " 🌟*[Legendario]*" : "";
        const mejoraStr = p.nivelMejora > 0 ? " *(+" + p.nivelMejora + " mejoras)*" : "";
        return (
          medals[i] + " *" + nombre + "*\n" +
          "   " + emoji + calidad + " " + nombreArmadura + mejoraStr +
          "\n   💪 Poder: *" + p.poderArmadura + "* | DEF " + (a?.def||0) + (p.nivelMejora > 0 ? "+" + (p.nivelMejora*2) + " 🟡" : "")
        );
      }).join("\n\n");

      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  🛡️ *TOP PODER ARMADURA*  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        lista + "\n\n" +
        "_Poder armadura = ATK + DEF de la armadura + bonus de mejoras con Orbe 🟡_"
      );
    },
  },


];

rpgCommands.push(...territorioCommands);

// ═══════════════════════════════════════════════════════════════
//   TORRE DE GEMAS — 100 pisos, 3 vidas, cooldown 24h al completar
// ═══════════════════════════════════════════════════════════════

const GEMA_TORRE_MAX_PISOS  = 100;
const GEMA_TORRE_VIDAS      = 3;
const GEMA_TORRE_CD_COMPLETA = 24 * 60 * 60 * 1000; // 24h al completar
const GEMA_TORRE_CD_MUERTE   = 10 * 60 * 1000;       // 10min al perder todas las vidas
const GEMA_TORRE_ATAQUE_CD   = 15 * 1000;            // 15s entre ataques

// Gemas por piso: escala generosa. Pisos normales + bonus en jefes (múltiplos de 5)
function calcGemaTorreRecompensa(piso) {
  // Base: 8 gemas en piso 1, ~200 en piso 100, escala cuadrática generosa
  const base = Math.floor(8 + (piso / GEMA_TORRE_MAX_PISOS) ** 1.5 * 192);
  const esJefe = piso % 5 === 0;
  const gemas  = esJefe ? base * 4 : base; // jefes dan x4
  const exp    = Math.floor(60 * (1 + piso * 0.05));
  const oro    = Math.floor((20 + piso * 3) * (esJefe ? 2 : 1));
  return { gemas, exp, oro, esJefe };
}

// Enemigo escalado al piso
function calcGemaTorreEnemigo(piso, playerHpMax, playerAtk, playerDef) {
  const escala  = 1 + (piso - 1) * 0.08;
  const esJefe  = piso % 5 === 0;
  const mult    = esJefe ? 2.2 : 1;
  const emojis  = ["💎","🔷","🔹","🪩","💠","🫧","🌀","⚡","🌊","👁️"];
  const nombres = ["Guardián de Cristal","Elemental Zafiro","Centinela Gema","Gólem Índigo","Espectro Áureo","Leviatán Índigo","Coloso Celeste","Titán Rúnico","Dragón de Diamante","El Custodio Eterno"];
  const idx = Math.min(Math.floor((piso - 1) / 10), 9);
  return {
    nombre:  esJefe ? `⭐ ${nombres[Math.floor((piso-1)/10) % nombres.length]} (Piso ${piso})` : `${emojis[idx]} Enemigo Piso ${piso}`,
    emoji:   esJefe ? "⭐" : emojis[idx],
    hp:      Math.floor(playerHpMax * escala * mult * 0.8),
    hpMax:   Math.floor(playerHpMax * escala * mult * 0.8),
    atk:     Math.floor(playerAtk   * escala * mult * 0.55),
    def:     Math.floor(playerDef   * escala * mult * 0.4),
  };
}

function getGemaTorreEstado(player) {
  if (!player.gemaTorre) player.gemaTorre = {
    activa: false, piso: 1, vidas: GEMA_TORRE_VIDAS,
    enemigo: null, completadaTs: 0, muertaTs: 0,
  };
  return player.gemaTorre;
}

// ── Comandos ──────────────────────────────────────────────────
const gemaTorreCommands = [

  // Menú / info
  {
    name: "torregemas",
    alias: ["gtorre", "gematorre"],
    description: "Torre de Gemas — 100 pisos de pura recompensa",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const g = getGemaTorreEstado(p);
      const ahora = Date.now();

      const cdCompleta = g.completadaTs ? Math.max(0, GEMA_TORRE_CD_COMPLETA - (ahora - g.completadaTs)) : 0;
      const cdMuerta   = g.muertaTs    ? Math.max(0, GEMA_TORRE_CD_MUERTE   - (ahora - g.muertaTs))    : 0;

      const fmtCd = ms => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}min` : `${m} min`;
      };

      await react("💎");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  💎 *TORRE DE GEMAS* 💎  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `_100 pisos de desafío. Cada paso te acerca a riquezas imposibles._\n\n` +
        `╭─〔 📊 *TU ESTADO* 〕\n` +
        `│ 📍 Piso actual: *${g.activa ? g.piso : "—"}*\n` +
        `│ ❤️ Vidas: *${g.vidas}/${GEMA_TORRE_VIDAS}*\n` +
        `│ 🏆 Mejor piso: *${p.gemaTorrePisoMax || 0}/100*\n` +
        (cdCompleta > 0 ? `│ ⏳ Cooldown: *${fmtCd(cdCompleta)}*\n` : "") +
        (cdMuerta   > 0 ? `│ ⏳ Recuperando vidas: *${fmtCd(cdMuerta)}*\n` : "") +
        `╰──────────────────────⬣\n\n` +
        `╭─〔 💡 *COMANDOS* 〕\n` +
        `│ \`!gtentrar\` → Entrar a la torre\n` +
        `│ \`!gtatacar\` → Atacar al enemigo\n` +
        `│ \`!gtavanzar\` → Pasar al siguiente piso\n` +
        `│ \`!gtsalir\` → Salir (conservas piso)\n` +
        `╰──────────────────────⬣\n\n` +
        `💎 _Los jefes (cada 5 pisos) dan el *triple* de gemas._\n` +
        `❤️ _Tienes ${GEMA_TORRE_VIDAS} vidas por run. Al perderlas todas, cooldown de 10 min._\n` +
        `🏆 _Al completar los 100 pisos: cooldown de 24h._`
      );
    },
  },

  // Entrar
  {
    name: "gtentrar",
    alias: ["torregemasentrar", "gemasentrar"],
    description: "Entrar a la Torre de Gemas",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const g = getGemaTorreEstado(p);
      const ahora = Date.now();

      if (g.activa) return reply(`⚠️ Ya estás en la Torre de Gemas (Piso ${g.piso}). Usa \`!gtatacar\` o \`!gtavanzar\`.`);

      const cdCompleta = g.completadaTs ? GEMA_TORRE_CD_COMPLETA - (ahora - g.completadaTs) : 0;
      if (cdCompleta > 0) {
        const h = Math.floor(cdCompleta / 3600000), m = Math.floor((cdCompleta % 3600000) / 60000);
        return reply(`⏳ Completaste la torre recientemente. Podrás reintentar en *${h}h ${m}min*.`);
      }
      const cdMuerta = g.muertaTs ? GEMA_TORRE_CD_MUERTE - (ahora - g.muertaTs) : 0;
      if (cdMuerta > 0) {
        return reply(`⏳ Perdiste todas las vidas. Cooldown: *${Math.ceil(cdMuerta / 60000)} min*.`);
      }
      if (p.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar` primero.");

      // Resetear run y entrar
      g.activa  = true;
      g.piso    = 1;
      g.vidas   = GEMA_TORRE_VIDAS;
      g.enemigo = null;
      g.completadaTs = 0;
      g.muertaTs     = 0;
      p.gemaTorre = g;
      savePlayer(p);

      await react("💎");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  💎 *¡TORRE DE GEMAS!* 💎  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `⚔️ *${p.nombre}* entró a la Torre de Gemas.\n` +
        `❤️ Vidas: *${g.vidas}/${GEMA_TORRE_VIDAS}*\n\n` +
        `📍 Piso 1 / 100\n` +
        `_Usa \`!gtatacar\` para combatir. ¡Los jefes cada 5 pisos dan el triple de gemas!_`
      );
    },
  },

  // Atacar
  {
    name: "gtatacar",
    alias: ["torregemastacar", "gatacar"],
    description: "Atacar en la Torre de Gemas",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const g = getGemaTorreEstado(p);
      if (!g.activa) return reply("❌ No estás en la torre. Usa `!gtentrar`.");

      const ahora = Date.now();
      if (!p._gtAtkTs) p._gtAtkTs = 0;
      if (ahora - p._gtAtkTs < GEMA_TORRE_ATAQUE_CD) {
        return reply(`⏳ Espera *${Math.ceil((GEMA_TORRE_ATAQUE_CD - (ahora - p._gtAtkTs)) / 1000)}s* para volver a atacar.`);
      }
      p._gtAtkTs = ahora;

      // Generar enemigo si no existe
      if (!g.enemigo || g.enemigo.hp <= 0) {
        g.enemigo = calcGemaTorreEnemigo(g.piso, p.hpMax, getTotalAtk(p), getTotalDef(p));
      }
      const e = g.enemigo;

      // Ataque del jugador
      let atkJ = Math.max(1, getTotalAtk(p) - Math.floor(e.def * 0.4));
      const esCrit = Math.random() * 100 < calcCrit(p);
      if (p.buffHabilidad && Date.now() < p.buffHabilidad.expira) {
        const b = p.buffHabilidad;
        if (b.tipo === "critico") atkJ = Math.floor(atkJ * b.mult);
        if (b.tipo === "dano")    atkJ = Math.floor(atkJ * b.mult);
        if (b.tipo === "multi")   atkJ = Math.floor(atkJ * 2.5);
        if (b.tipo === "drenar")  atkJ = Math.floor(atkJ * b.mult);
        p.buffHabilidad = null;
      }
      const danoJ = esCrit ? Math.floor(atkJ * 1.8) : atkJ;
      e.hp = Math.max(0, e.hp - danoJ);

      // Ataque del enemigo (con dodge)
      const esquiva = Math.random() * 100 < calcDodge(p);
      const danoE   = esquiva ? 0 : Math.max(1, e.atk - Math.floor(getTotalDef(p) * 0.4) + Math.floor(Math.random() * 10));
      p.hp = Math.max(0, p.hp - danoE);

      const barraE = barra(e.hp, e.hpMax);
      const barraP = barra(p.hp, p.hpMax);

      let texto =
        `💎 *TORRE DE GEMAS — Piso ${g.piso}/100*\n` +
        `${e.emoji} *${e.nombre}*\n` +
        `${barraE} ${e.hp}/${e.hpMax}\n\n` +
        (esCrit ? "💥 *¡CRÍTICO!* " : "⚔️ ") + `Tu golpe: *-${danoJ}*\n` +
        (esquiva ? "💨 *¡Esquivaste* el ataque!\n" : `${e.emoji} Contraataque: *-${danoE}*\n`) +
        `❤️ Tu HP: ${barraP} ${p.hp}/${p.hpMax} | 💎 Vidas: ${g.vidas}/${GEMA_TORRE_VIDAS}\n`;

      // ── Victoria sobre el enemigo ──────────
      if (e.hp <= 0) {
        const r = calcGemaTorreRecompensa(g.piso);
        p.gemas = (p.gemas || 0) + r.gemas;
        p.oro   += r.oro;
        p.hp = Math.min(p.hpMax, p.hp + Math.floor(p.hpMax * 0.25)); // curar 25% al ganar
        addExp(p, r.exp);
        if (!p.gemaTorrePisoMax || g.piso > p.gemaTorrePisoMax) p.gemaTorrePisoMax = g.piso;

        const esJefe   = r.esJefe;
        const esUltimo = g.piso === GEMA_TORRE_MAX_PISOS;

        texto +=
          `\n${esJefe ? "🏆 *¡JEFE DERROTADO!*" : "✅ *¡Piso superado!*"}\n` +
          `━━━━━━━━━━━━━━\n` +
          `💎 Gemas: *+${r.gemas}* ${esJefe ? "_(bonus jefe x3)_" : ""}\n` +
          `💰 Oro: *+${r.oro}* | ⭐ EXP: *+${r.exp}*\n` +
          `❤️ HP recuperado: *+${Math.floor(p.hpMax * 0.25)}*\n`;

        if (esUltimo) {
          // Completó la torre — recompensa final + cooldown 24h
          const gemasBonus = 5000;
          p.gemas += gemasBonus;
          g.activa = false;
          g.completadaTs = ahora;
          g.enemigo = null;
          p.gemaTorre = g;
          savePlayer(p);
          await react("👑");
          return reply(texto +
            `\n👑 *¡¡COMPLETASTE LA TORRE DE GEMAS!!* 🎊\n` +
            `💎 *BONUS FINAL: +${gemasBonus} gemas*\n` +
            `⏳ Cooldown de *24 horas* activo.\n` +
            `💎 Total de gemas: *${p.gemas}*`
          );
        }

        g.piso++;
        g.enemigo = null;
        g.activa  = true;
        p.gemaTorre = g;
        savePlayer(p);
        await react(esJefe ? "🏆" : "✅");
        return reply(texto + `\n📍 Siguiente piso: *${g.piso}/100*\n_Usa \`!gtatacar\` para continuar._`);
      }

      // ── Jugador muere ──────────────────────
      if (p.hp <= 0) {
        g.vidas--;
        p.hp = Math.floor(p.hpMax * 0.3); // revivir con 30%
        g.enemigo = null; // el enemigo vuelve a aparecer con HP lleno

        if (g.vidas <= 0) {
          // Sin vidas — cooldown y expulsión
          g.activa   = false;
          g.vidas    = GEMA_TORRE_VIDAS;
          g.muertaTs = ahora;
          p.hp       = Math.floor(p.hpMax * 0.1);
          p.gemaTorre = g;
          savePlayer(p);
          await react("💀");
          return reply(texto +
            `\n💀 *¡SIN VIDAS!* Fuiste expulsado de la Torre de Gemas.\n` +
            `🏆 Llegaste al piso *${g.piso}*. Mejor piso: *${p.gemaTorrePisoMax || g.piso}*\n` +
            `⏳ Cooldown: *10 minutos*. Luego podrás reintentar.`
          );
        }

        p.gemaTorre = g;
        savePlayer(p);
        await react("💔");
        return reply(texto +
          `\n💔 *¡Caíste!* Vidas restantes: *${g.vidas}/${GEMA_TORRE_VIDAS}*\n` +
          `❤️ HP restaurado a ${p.hp}. El enemigo reaparece.\n` +
          `_Usa \`!gtatacar\` para continuar._`
        );
      }

      // ── Combate continúa ──────────────────
      g.enemigo = e;
      p.gemaTorre = g;
      savePlayer(p);
      await react("⚔️");
      return reply(texto + `_Sigue con \`!gtatacar\`._`);
    },
  },

  // Avanzar (saltar al siguiente piso si no hay enemigo activo)
  {
    name: "gtavanzar",
    alias: ["torregmasavanzar", "gaavanzar"],
    description: "Avanzar al siguiente piso (Torre de Gemas)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const g = getGemaTorreEstado(p);
      if (!g.activa) return reply("❌ No estás en la torre. Usa `!gtentrar`.");
      if (g.enemigo && g.enemigo.hp > 0) return reply(`⚔️ Hay un enemigo activo en el piso ${g.piso}. Usa \`!gtatacar\` para derrotarlo primero.`);

      const r = calcGemaTorreRecompensa(g.piso);
      await react("📍");
      return reply(
        `📍 *Piso ${g.piso} / 100* — Torre de Gemas\n` +
        `${r.esJefe ? "⭐ *¡PISO DE JEFE!* El enemigo es más poderoso y da *3x gemas*.\n" : ""}` +
        `❤️ HP: *${p.hp}/${p.hpMax}* | 💎 Vidas: *${g.vidas}/${GEMA_TORRE_VIDAS}*\n` +
        `💎 Gemas al ganar: *~${r.gemas}*\n\n` +
        `_Usa \`!gtatacar\` para iniciar el combate._`
      );
    },
  },

  // Salir
  {
    name: "gtsalir",
    alias: ["torregesmassalir", "gasalir"],
    description: "Salir de la Torre de Gemas (conservas piso)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const g = getGemaTorreEstado(p);
      if (!g.activa) return reply("⚠️ No estás en la Torre de Gemas.");
      g.activa  = false;
      g.enemigo = null;
      p.gemaTorre = g;
      savePlayer(p);
      await react("🚪");
      return reply(
        `🚪 Saliste de la Torre de Gemas.\n` +
        `📍 Progreso guardado: *Piso ${g.piso}/100*\n` +
        `💎 Vidas restantes: *${g.vidas}/${GEMA_TORRE_VIDAS}*\n` +
        `_Vuelve con \`!gtentrar\` para continuar desde aquí._`
      );
    },
  },
];

rpgCommands.push(...gemaTorreCommands);

// ═══════════════════════════════════════════════════════════════
const DIOS_ATK = 9999999999;
const DIOS_HP  = 9999999999;

const modoDiosCommand = {
  name: "mododios",
  alias: ["diosmode", "godmode"],
  description: "Activa/desactiva el Modo Dios [OWNER]",
  category: "RPG ⚔️",
  ownerOnly: true,
  execute: async ({ reply, react, sender, args, pushName }) => {
    const p = getPlayer(sender, pushName || null);
    if (!p.clase) return reply("❌ Sin personaje RPG. Usa `!rpgregistro` primero.");

    const sub = args[0]?.toLowerCase();

    // ── Activar ──────────────────────────────
    if (sub === "on") {
      if (p._diosModo) return reply("⚡ El Modo Dios ya está activo.");

      // Guardar stats reales antes de sobrescribir
      p._diosBackup = {
        atk:  p.atk,
        hp:   p.hp,
        hpMax: p.hpMax,
        def:  p.def,
      };

      p._diosModo = true;
      p.atk   = DIOS_ATK;
      p.hp    = DIOS_HP;
      p.hpMax = DIOS_HP;
      savePlayer(p);

      await react("⚡");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  ⚡ *MODO DIOS ACTIVADO* ⚡  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `👑 *${p.nombre}* ahora es invencible.\n\n` +
        `⚔️ ATK: *${DIOS_ATK.toLocaleString()}*\n` +
        `❤️ HP:  *${DIOS_HP.toLocaleString()}*\n\n` +
        `_Usa_ \`!mododios off\` _para volver a tus stats normales._`
      );
    }

    // ── Desactivar ────────────────────────────
    if (sub === "off") {
      if (!p._diosModo) return reply("⚠️ El Modo Dios no está activo.");

      const backup = p._diosBackup || {};
      p.atk   = backup.atk   ?? p.atk;
      p.hp    = backup.hp    ?? p.hp;
      p.hpMax = backup.hpMax ?? p.hpMax;
      p.def   = backup.def   ?? p.def;

      delete p._diosModo;
      delete p._diosBackup;
      savePlayer(p);

      await react("😌");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  😌 *MODO DIOS DESACTIVADO*  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `*${p.nombre}* volvió a sus stats normales.\n\n` +
        `⚔️ ATK: *${p.atk}*\n` +
        `❤️ HP:  *${p.hp}/${p.hpMax}*\n` +
        `🛡️ DEF: *${p.def}*`
      );
    }

    // ── Sin argumento ─────────────────────────
    const estado = p._diosModo ? "⚡ *ACTIVO*" : "😌 *INACTIVO*";
    return reply(
      `⚡ *Modo Dios* — ${estado}\n\n` +
      `• \`!mododios on\` — Activar\n` +
      `• \`!mododios off\` — Desactivar`
    );
  },
};

rpgCommands.push(modoDiosCommand);

// ═══════════════════════════════════════════════════════════════
//   TORRE MASCOTA — 100 pisos, bosses fijos, drops de frutos
// ═══════════════════════════════════════════════════════════════

const TM_MAX_PISOS    = 100;
const TM_VIDAS        = 3;
const TM_CD_COMPLETA  = 24 * 60 * 60 * 1000;  // 24h al completar
const TM_CD_MUERTE    = 15 * 60 * 1000;        // 15min al perder vidas
const TM_ATAQUE_CD    = 15 * 1000;             // 15s entre ataques

// ── Frutos que dropean los bosses ───────────────────────────────
const TM_FRUTOS = {
  fruto_vigor:     { nombre: "Fruto del Vigor",     emoji: "🍎", desc: "+15 ATK a mascota",  rareza: "común",     bonus: { atk: 15 } },
  fruto_escudo:    { nombre: "Fruto del Escudo",    emoji: "🫐", desc: "+15 DEF a mascota",  rareza: "común",     bonus: { def: 15 } },
  fruto_fortuna:   { nombre: "Fruto de Fortuna",    emoji: "🍋", desc: "+10 CRIT a mascota", rareza: "raro",      bonus: { crit: 10 } },
  fruto_fenix:     { nombre: "Fruto del Fénix",     emoji: "🍑", desc: "+25 ATK a mascota",  rareza: "épico",     bonus: { atk: 25 } },
  fruto_dragón:    { nombre: "Fruto del Dragón",    emoji: "🍇", desc: "+20 DEF +20 ATK",    rareza: "épico",     bonus: { atk: 20, def: 20 } },
  fruto_divino:    { nombre: "Fruto Divino",        emoji: "🍓", desc: "+30 ATK +15 CRIT",   rareza: "legendario",bonus: { atk: 30, crit: 15 } },
  fruto_celestial: { nombre: "Fruto Celestial",     emoji: "🌟", desc: "+40 ATK +20 DEF +20 CRIT", rareza: "mítico", bonus: { atk: 40, def: 20, crit: 20 } },
};

// Drop por tramo de pisos (solo en bosses cada 5 pisos)
function tmGetFrutoDrop(piso) {
  const roll = Math.random();
  if (piso <= 20)  return roll < 0.70 ? "fruto_vigor"   : roll < 0.95 ? "fruto_escudo"  : "fruto_fortuna";
  if (piso <= 40)  return roll < 0.50 ? "fruto_escudo"  : roll < 0.85 ? "fruto_fortuna" : "fruto_fenix";
  if (piso <= 60)  return roll < 0.50 ? "fruto_fortuna" : roll < 0.80 ? "fruto_fenix"   : "fruto_dragón";
  if (piso <= 80)  return roll < 0.45 ? "fruto_fenix"   : roll < 0.80 ? "fruto_dragón"  : "fruto_divino";
  if (piso <= 99)  return roll < 0.40 ? "fruto_dragón"  : roll < 0.75 ? "fruto_divino"  : "fruto_celestial";
  return "fruto_celestial"; // piso 100 garantizado
}

// ── Tabla de bosses fijos (cada 5 pisos) ────────────────────────
const TM_BOSSES = {
   5:  { nombre: "Slime Ancestral",     emoji: "🟢", hp: 800,   atk: 55,   def: 30  },
  10:  { nombre: "Lobo Alfa",           emoji: "🐺", hp: 1400,  atk: 80,   def: 45  },
  15:  { nombre: "Oso de Piedra",       emoji: "🐻", hp: 2000,  atk: 105,  def: 65  },
  20:  { nombre: "Hidra Menor",         emoji: "🐍", hp: 2800,  atk: 130,  def: 80  },
  25:  { nombre: "Valquiria Salvaje",   emoji: "⚔️", hp: 3700,  atk: 160,  def: 100 },
  30:  { nombre: "Gólem de Hierro",     emoji: "🗿", hp: 4800,  atk: 190,  def: 130 },
  35:  { nombre: "Lich Menor",          emoji: "💀", hp: 6000,  atk: 225,  def: 155 },
  40:  { nombre: "Coloso de Magma",     emoji: "🌋", hp: 7500,  atk: 265,  def: 185 },
  45:  { nombre: "Espectro Carmesí",    emoji: "👻", hp: 9200,  atk: 310,  def: 215 },
  50:  { nombre: "Dragón de Hielo",     emoji: "🐉", hp: 11200, atk: 360,  def: 250 },
  55:  { nombre: "Heraldo Oscuro",      emoji: "🌑", hp: 13500, atk: 415,  def: 290 },
  60:  { nombre: "Titán Antiguo",       emoji: "⚡", hp: 16000, atk: 475,  def: 335 },
  65:  { nombre: "Leviatán Profundo",   emoji: "🌊", hp: 18800, atk: 540,  def: 385 },
  70:  { nombre: "Baal el Devorador",   emoji: "😈", hp: 22000, atk: 615,  def: 440 },
  75:  { nombre: "Dios de la Guerra",   emoji: "🔱", hp: 25500, atk: 700,  def: 500 },
  80:  { nombre: "Fénix Oscuro",        emoji: "🔥", hp: 29500, atk: 795,  def: 570 },
  85:  { nombre: "El Olvidado",         emoji: "🌌", hp: 34000, atk: 900,  def: 645 },
  90:  { nombre: "Señor del Caos",      emoji: "💥", hp: 39000, atk: 1015, def: 730 },
  95:  { nombre: "Ángel Caído",         emoji: "🌠", hp: 44500, atk: 1145, def: 825 },
  100: { nombre: "Astaroth el Eterno",  emoji: "👁️", hp: 51000, atk: 1300, def: 930 },
};

// Enemigo normal (pisos sin boss)
function tmCalcEnemigo(piso) {
  const escala = 1 + (piso - 1) * 0.065;
  const emojis  = ["🐭","🐸","🦎","🦊","🦝","🐗","🦌","🦏","🦁","🐯"];
  const nombres = ["Rata Corrompida","Sapo Venenoso","Lagarto Rugiente","Zorro Arcano","Mapache Salvaje","Jabalí Furioso","Ciervo Espectral","Rinoceronte de Hierro","León de Sombra","Tigre Eterno"];
  const idx = Math.min(Math.floor((piso - 1) / 10), 9);
  const hp  = Math.floor(300 * escala);
  const atk = Math.floor(30  * escala);
  const def = Math.floor(15  * escala);
  return { nombre: nombres[idx], emoji: emojis[idx], hp, hpMax: hp, atk, def, esBoss: false };
}

function tmGetEnemigo(piso) {
  if (TM_BOSSES[piso]) {
    const b = TM_BOSSES[piso];
    return { ...b, hpMax: b.hp, hp: b.hp, esBoss: true };
  }
  return tmCalcEnemigo(piso);
}

function getTMEstado(player) {
  if (!player.torreMascota) player.torreMascota = {
    activa: false, piso: 1, vidas: TM_VIDAS,
    enemigo: null, completadaTs: 0, muertaTs: 0,
  };
  return player.torreMascota;
}

function tmFmtCd(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ── Comandos ──────────────────────────────────────────────────
// ── Helpers sistema de nivel de mascota ─────────────────────────────────────
function tmFrutosParaNivel(nivelActual) {
  // Escala: nivel 1→2 = 2 frutos, cada nivel pide más
  // Fórmula: Math.floor(2 + nivelActual * 1.5)
  // Nivel 1→2: 3, 2→3: 5, 5→6: 9, 10→11: 17, 25→26: 39, 49→50: 75
  return Math.floor(3 + nivelActual * 1.5);
}

function tmBarraProgreso(actual, total) {
  const llenos = Math.round((actual / total) * 10);
  return "▰".repeat(llenos) + "▱".repeat(10 - llenos);
}

const torreMascotaCommands = [

  // ── Menú ────────────────────────────────────────────────────
  {
    name: "torremascota",
    alias: ["tmorre", "mascotorre", "tmascotas"],
    description: "Torre Mascota — 100 pisos, bosses fijos, drops de frutos 🐾",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const g = getTMEstado(p);
      const ahora = Date.now();

      const cdCompleta = g.completadaTs ? Math.max(0, TM_CD_COMPLETA - (ahora - g.completadaTs)) : 0;
      const cdMuerta   = g.muertaTs    ? Math.max(0, TM_CD_MUERTE   - (ahora - g.muertaTs))    : 0;

      await react("🐾");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  🐾 *TORRE MASCOTA* 🐾  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `_100 pisos de bestias salvajes. Derrota bosses para obtener frutos y fortalecer tu mascota._\n\n` +
        `╭─〔 📊 *TU ESTADO* 〕\n` +
        `│ 📍 Piso actual: *${g.activa ? g.piso : "—"}*\n` +
        `│ ❤️ Vidas: *${g.vidas}/${TM_VIDAS}*\n` +
        `│ 🏆 Mejor piso: *${p.tmPisoMax || 0}/100*\n` +
        (cdCompleta > 0 ? `│ ⏳ Cooldown: *${tmFmtCd(cdCompleta)}*\n` : "") +
        (cdMuerta   > 0 ? `│ ⏳ Recuperando: *${tmFmtCd(cdMuerta)}*\n` : "") +
        `╰──────────────────────⬣\n\n` +
        `╭─〔 💡 *COMANDOS* 〕\n` +
        `│ \`!tmentrar\` → Entrar a la torre\n` +
        `│ \`!tmatacar\` → Atacar al enemigo\n` +
        `│ \`!tmavanzar\` → Ver info del piso\n` +
        `│ \`!tmsalir\` → Salir (conservas piso)\n` +
        `│ \`!tmfrutos\` → Ver tus frutos\n` +
        `│ \`!tmusar [fruto]\` → Aplicar fruto a mascota\n` +
        `╰──────────────────────⬣\n\n` +
        `🍎 _Los bosses (cada 5 pisos) dropean frutos para tu mascota._\n` +
        `🏆 _Boss piso 100: **Astaroth el Eterno** — completar da fruto Celestial._\n` +
        `❤️ _Tienes ${TM_VIDAS} vidas por run. Sin vidas: cooldown 15 min._`
      );
    },
  },

  // ── Entrar ──────────────────────────────────────────────────
  {
    name: "tmentrar",
    alias: ["torremascotaentrar", "tmentrar"],
    description: "Entrar a la Torre Mascota",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const g = getTMEstado(p);
      const ahora = Date.now();

      if (g.activa) return reply(`⚠️ Ya estás en la Torre Mascota (Piso ${g.piso}). Usa \`!tmatacar\`.`);

      const cdCompleta = g.completadaTs ? TM_CD_COMPLETA - (ahora - g.completadaTs) : 0;
      if (cdCompleta > 0) return reply(`⏳ Completaste la torre recientemente. Vuelve en *${tmFmtCd(cdCompleta)}*.`);

      const cdMuerta = g.muertaTs ? TM_CD_MUERTE - (ahora - g.muertaTs) : 0;
      if (cdMuerta > 0) return reply(`⏳ Sin vidas. Cooldown: *${tmFmtCd(cdMuerta)}*.`);

      if (p.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar` primero.");

      g.activa  = true;
      g.piso    = 1;
      g.vidas   = TM_VIDAS;
      g.enemigo = null;
      g.completadaTs = 0;
      g.muertaTs     = 0;
      p.torreMascota = g;
      savePlayer(p);

      const primerEnemigo = tmGetEnemigo(1);
      await react("🐾");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  🐾 *¡TORRE MASCOTA!* 🐾  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `⚔️ *${p.nombre}* entró a la Torre Mascota.\n` +
        `❤️ Vidas: *${g.vidas}/${TM_VIDAS}*\n\n` +
        `📍 *Piso 1 / 100*\n` +
        `${primerEnemigo.emoji} Enemigo: *${primerEnemigo.nombre}*\n` +
        `❤️ HP: *${primerEnemigo.hpMax}* | ⚔️ ATK: *${primerEnemigo.atk}* | 🛡️ DEF: *${primerEnemigo.def}*\n\n` +
        `_Usa \`!tmatacar\` para combatir. ¡Bosses cada 5 pisos dropean frutos!_`
      );
    },
  },

  // ── Atacar ──────────────────────────────────────────────────
  {
    name: "tmatacar",
    alias: ["torremascotaatacar", "tmatk"],
    description: "Atacar en la Torre Mascota",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const g = getTMEstado(p);
      if (!g.activa) return reply("❌ No estás en la torre. Usa `!tmentrar`.");

      const ahora = Date.now();
      if (!p._tmAtkTs) p._tmAtkTs = 0;
      if (ahora - p._tmAtkTs < TM_ATAQUE_CD) {
        return reply(`⏳ Espera *${Math.ceil((TM_ATAQUE_CD - (ahora - p._tmAtkTs)) / 1000)}s* para volver a atacar.`);
      }
      p._tmAtkTs = ahora;

      // Generar enemigo si no existe
      if (!g.enemigo || g.enemigo.hp <= 0) {
        g.enemigo = tmGetEnemigo(g.piso);
      }
      const e = g.enemigo;

      // Ataque del jugador (stats del jugador + bonus mascota)
      const atkBase = getTotalAtk(p);
      const defBase = getTotalDef(p);
      const esCrit  = Math.random() * 100 < calcCrit(p);
      let danoJ = Math.max(1, atkBase - Math.floor(e.def * 0.4) + Math.floor(Math.random() * 12));
      if (esCrit) danoJ = Math.floor(danoJ * 1.8);
      e.hp = Math.max(0, e.hp - danoJ);

      // Ataque del enemigo (con dodge)
      const esquiva = Math.random() * 100 < calcDodge(p);
      const danoE   = esquiva ? 0 : Math.max(1, e.atk - Math.floor(defBase * 0.4) + Math.floor(Math.random() * 10));
      p.hp = Math.max(0, p.hp - danoE);

      const barraE = barra(e.hp, e.hpMax);
      const barraP = barra(p.hp, p.hpMax);

      let texto =
        `🐾 *TORRE MASCOTA — Piso ${g.piso}/100*\n` +
        `${e.esBoss ? "🏆 *¡BOSS!* " : ""}${e.emoji} *${e.nombre}*\n` +
        `${barraE} ${e.hp}/${e.hpMax} | ⚔️${e.atk} 🛡️${e.def}\n\n` +
        (esCrit ? "💥 *¡CRÍTICO!* " : "⚔️ ") + `Tu golpe: *-${danoJ}*\n` +
        (esquiva ? "💨 *¡Esquivaste!*\n" : `${e.emoji} Contraataque: *-${danoE}*\n`) +
        `❤️ Tu HP: ${barraP} ${p.hp}/${p.hpMax} | 💎 Vidas: ${g.vidas}/${TM_VIDAS}\n`;

      // ── Victoria ────────────────────────────
      if (e.hp <= 0) {
        const expGan = Math.floor(50 * (1 + g.piso * 0.04));
        const oroGan = Math.floor((15 + g.piso * 2) * (e.esBoss ? 2 : 1));
        addExp(p, expGan);
        p.oro += oroGan;
        p.hp = Math.min(p.hpMax, p.hp + Math.floor(p.hpMax * 0.20));
        if (!p.tmPisoMax || g.piso > p.tmPisoMax) p.tmPisoMax = g.piso;

        texto +=
          `\n${e.esBoss ? "🏆 *¡BOSS DERROTADO!*" : "✅ *¡Enemigo derrotado!*"}\n` +
          `━━━━━━━━━━━━━━\n` +
          `💰 Oro: *+${oroGan}* | ⭐ EXP: *+${expGan}*\n` +
          `❤️ HP recuperado: *+${Math.floor(p.hpMax * 0.20)}*\n`;

        // Drop de fruto si es boss
        if (e.esBoss) {
          const fId  = tmGetFrutoDrop(g.piso);
          const fruto = TM_FRUTOS[fId];
          if (!p.tmFrutos) p.tmFrutos = {};
          p.tmFrutos[fId] = (p.tmFrutos[fId] || 0) + 1;
          texto += `\n🎁 *¡Fruto obtenido!* ${fruto.emoji} *${fruto.nombre}* _(${fruto.rareza})_\n_${fruto.desc}_\n`;
        }

        // Piso 100 completado
        if (g.piso === TM_MAX_PISOS) {
          g.activa = false;
          g.completadaTs = ahora;
          g.enemigo = null;
          p.torreMascota = g;
          savePlayer(p);
          await react("👑");
          return reply(texto +
            `\n👑 *¡¡COMPLETASTE LA TORRE MASCOTA!!* 🎊\n` +
            `🌟 *¡Fruto Celestial garantizado!*\n` +
            `⏳ Cooldown de *24 horas* activo.\n` +
            `🏆 Mejor piso: *100/100*`
          );
        }

        g.piso++;
        g.enemigo = null;
        g.activa  = true;
        p.torreMascota = g;
        savePlayer(p);

        const sig = tmGetEnemigo(g.piso);
        const esBossProx = sig.esBoss;
        await react(e.esBoss ? "🏆" : "✅");
        return reply(texto +
          `\n📍 Siguiente piso: *${g.piso}/100*\n` +
          (esBossProx ? `⚠️ *¡Próximo piso es BOSS!* ${sig.emoji} ${sig.nombre} — HP: ${sig.hpMax} ATK: ${sig.atk} DEF: ${sig.def}\n` : `${sig.emoji} ${sig.nombre} — HP: ${sig.hpMax} ATK: ${sig.atk} DEF: ${sig.def}\n`) +
          `_Usa \`!tmatacar\` para continuar._`
        );
      }

      // ── Jugador muere ────────────────────────
      if (p.hp <= 0) {
        g.vidas--;
        p.hp = Math.floor(p.hpMax * 0.3);
        g.enemigo = null;

        if (g.vidas <= 0) {
          g.activa   = false;
          g.vidas    = TM_VIDAS;
          g.muertaTs = ahora;
          p.hp       = Math.floor(p.hpMax * 0.1);
          p.torreMascota = g;
          savePlayer(p);
          await react("💀");
          return reply(texto +
            `\n💀 *¡SIN VIDAS!* Fuiste expulsado de la Torre Mascota.\n` +
            `🏆 Llegaste al piso *${g.piso}*. Mejor piso: *${p.tmPisoMax || g.piso}*\n` +
            `⏳ Cooldown: *15 minutos*. Luego podrás reintentar.`
          );
        }

        p.torreMascota = g;
        savePlayer(p);
        await react("💔");
        return reply(texto +
          `\n💔 *¡Caíste!* Vidas restantes: *${g.vidas}/${TM_VIDAS}*\n` +
          `❤️ HP restaurado a ${p.hp}. El enemigo reaparece con HP lleno.\n` +
          `_Usa \`!tmatacar\` para continuar._`
        );
      }

      // ── Combate continúa ─────────────────────
      g.enemigo = e;
      p.torreMascota = g;
      savePlayer(p);
      await react("⚔️");
      return reply(texto + `_Sigue con \`!tmatacar\`._`);
    },
  },

  // ── Avanzar / info piso ─────────────────────────────────────
  {
    name: "tmavanzar",
    alias: ["torremascotaavanzar"],
    description: "Ver info del piso actual (Torre Mascota)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const g = getTMEstado(p);
      if (!g.activa) return reply("❌ No estás en la torre. Usa `!tmentrar`.");
      if (g.enemigo && g.enemigo.hp > 0) return reply(`⚔️ Hay un enemigo activo en el piso ${g.piso}. Usa \`!tmatacar\`.`);

      const e = tmGetEnemigo(g.piso);
      await react("📍");
      return reply(
        `📍 *Piso ${g.piso} / 100* — Torre Mascota\n` +
        `${e.esBoss ? "🏆 *¡PISO DE BOSS!* Derrótalo para obtener un fruto.\n" : ""}\n` +
        `${e.emoji} *${e.nombre}*\n` +
        `❤️ HP: *${e.hpMax}* | ⚔️ ATK: *${e.atk}* | 🛡️ DEF: *${e.def}*\n\n` +
        `❤️ Tu HP: *${p.hp}/${p.hpMax}* | 💎 Vidas: *${g.vidas}/${TM_VIDAS}*\n\n` +
        `_Usa \`!tmatacar\` para combatir._`
      );
    },
  },

  // ── Salir ───────────────────────────────────────────────────
  {
    name: "tmsalir",
    alias: ["torremascotasalir", "tmescape"],
    description: "Salir de la Torre Mascota (conservas el piso)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const g = getTMEstado(p);
      if (!g.activa) return reply("❌ No estás en la torre.");

      g.activa  = false;
      g.enemigo = null;
      p.torreMascota = g;
      savePlayer(p);

      await react("🚪");
      return reply(
        `🚪 *${p.nombre}* salió de la Torre Mascota.\n` +
        `📍 Piso guardado: *${g.piso}/100*\n` +
        `🏆 Mejor piso: *${p.tmPisoMax || g.piso}/100*\n\n` +
        `_Usa \`!tmentrar\` para continuar desde el piso ${g.piso}._`
      );
    },
  },

  // ── Ver frutos ──────────────────────────────────────────────
  {
    name: "tmfrutos",
    alias: ["misfrutos", "frutosmascota", "verfrutos"],
    description: "Ver tus frutos para mascotas",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");

      // Mostrar nivel de mascota equipada si hay una
      let nivelInfo = "";
      if (p.mascota) {
        const mascotaData = (p._ssrMascotas && p._ssrMascotas[p.mascota])
          || MASCOTAS?.[p.mascota]
          || { nombre: p.mascota, emoji: "🐾" };
        if (!p._mascotaNiveles) p._mascotaNiveles = {};
        const nivelActual = p._mascotaNiveles[p.mascota] || 1;
        const frutosNecesarios = tmFrutosParaNivel(nivelActual);
        nivelInfo = `🐾 *${mascotaData.emoji || "🐾"} ${mascotaData.nombre || p.mascota}* — Nivel *${nivelActual}/50*\n` +
          (nivelActual < 50 ? `📈 Siguiente nivel: *${frutosNecesarios} frutos*\n` : `🏆 ¡Mascota al nivel máximo!\n`) +
          `━━━━━━━━━━━━━━\n`;
      }

      if (!p.tmFrutos || Object.keys(p.tmFrutos).filter(k => p.tmFrutos[k] > 0).length === 0)
        return reply(`${nivelInfo}🍎 No tienes frutos. Derrota bosses en \`!tmentrar\` para obtenerlos.`);

      const lista = Object.entries(p.tmFrutos)
        .filter(([, c]) => c > 0)
        .map(([id, cant]) => {
          const f = TM_FRUTOS[id];
          return f ? `${f.emoji} *${f.nombre}* x${cant} — _(${f.rareza})_` : null;
        })
        .filter(Boolean)
        .join("\n");

      await react("🍎");
      return reply(
        `╭─〔 🍎 *TUS FRUTOS* 〕\n` +
        (nivelInfo ? nivelInfo : "") +
        `${lista}\n` +
        `╰──────────────────────⬣\n\n` +
        `_Usa \`!tmusar [nombre_fruto]\` para subir de nivel a tu mascota._\n` +
        `_Ejemplo:_ \`!tmusar fruto_vigor\``
      );
    },
  },

  // ── Usar fruto (sistema de niveles 1/50) ────────────────────
  {
    name: "tmusar",
    alias: ["usarfruto", "aplicarfruto"],
    description: "Aplicar fruto a tu mascota para subirla de nivel — !tmusar [id_fruto]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.mascota) return reply("❌ No tienes mascota equipada. Equipa una con `!rpgmascota equipar`.");

      const frutId = args[0]?.toLowerCase();
      if (!frutId) return reply("❌ Indica qué fruto usar. Ej: `!tmusar fruto_vigor`\nUsa `!tmfrutos` para ver tu inventario.");

      const fruto = TM_FRUTOS[frutId];
      if (!fruto) return reply(`❌ Fruto *${frutId}* no existe. Usa \`!tmfrutos\` para ver los disponibles.`);

      if (!p.tmFrutos || !p.tmFrutos[frutId] || p.tmFrutos[frutId] <= 0)
        return reply(`❌ No tienes *${fruto.nombre}*. Consíguelo derrotando bosses en la Torre Mascota.`);

      // Inicializar sistemas de nivel de mascota
      if (!p._mascotaNiveles)    p._mascotaNiveles    = {};
      if (!p._mascotaFrutosAcc)  p._mascotaFrutosAcc  = {};
      if (!p._mascotaBonusExtra) p._mascotaBonusExtra = {};

      const mascotaId   = p.mascota;
      const nivelActual = p._mascotaNiveles[mascotaId] || 1;

      if (nivelActual >= 50) {
        return reply(
          `🏆 *¡Tu mascota ya está al nivel máximo!* (50/50)\n` +
          `No puede seguir evolucionando.`
        );
      }

      // Frutos acumulados para el nivel actual
      if (!p._mascotaFrutosAcc[mascotaId]) p._mascotaFrutosAcc[mascotaId] = 0;
      const frutosNecesarios = tmFrutosParaNivel(nivelActual);

      // Consumir fruto
      p.tmFrutos[frutId]--;
      p._mascotaFrutosAcc[mascotaId]++;

      const frutosAcc    = p._mascotaFrutosAcc[mascotaId];
      const subioNivel   = frutosAcc >= frutosNecesarios;

      const mascotaData = (p._ssrMascotas && p._ssrMascotas[mascotaId])
        || MASCOTAS?.[mascotaId]
        || { nombre: mascotaId, emoji: "🐾" };

      let texto = `${fruto.emoji} *¡Fruto usado!*\n\n` +
        `🐾 *${mascotaData.emoji || "🐾"} ${mascotaData.nombre || mascotaId}*\n`;

      if (subioNivel) {
        // Subir nivel
        const nuevoNivel = nivelActual + 1;
        p._mascotaNiveles[mascotaId]   = nuevoNivel;
        p._mascotaFrutosAcc[mascotaId] = 0; // reiniciar contador

        // Bonus al subir de nivel: escalado por nivel
        const bonusAtk  = Math.floor(5  + nuevoNivel * 0.8);
        const bonusDef  = Math.floor(3  + nuevoNivel * 0.5);
        const bonusCrit = nuevoNivel % 5 === 0 ? Math.floor(2 + nuevoNivel * 0.1) : 0; // CRIT cada 5 niveles

        p._mascotaBonusExtra[mascotaId] = p._mascotaBonusExtra[mascotaId] || { atk: 0, def: 0, crit: 0 };
        p._mascotaBonusExtra[mascotaId].atk  += bonusAtk;
        p._mascotaBonusExtra[mascotaId].def  += bonusDef;
        p._mascotaBonusExtra[mascotaId].crit += bonusCrit;

        // Aplicar también al jugador
        p.atk  = (p.atk  || 0) + bonusAtk;
        p.def  = (p.def  || 0) + bonusDef;
        p.crit = (p.crit || 0) + bonusCrit;

        const estrellitas = nuevoNivel >= 50 ? "🌟🌟🌟🌟🌟" :
          nuevoNivel >= 40 ? "⭐⭐⭐⭐" : nuevoNivel >= 30 ? "⭐⭐⭐" :
          nuevoNivel >= 20 ? "⭐⭐" : "⭐";

        texto +=
          `\n${estrellitas} *¡NIVEL ARRIBA!* ${estrellitas}\n` +
          `📊 Nivel: *${nivelActual} → ${nuevoNivel}/50*\n\n` +
          `✨ *Bonus obtenido:*\n` +
          `⚔️ ATK +${bonusAtk} | 🛡️ DEF +${bonusDef}` +
          (bonusCrit > 0 ? ` | 🎯 CRIT +${bonusCrit}%` : "") + `\n\n` +
          `📈 *Stats totales mascota:*\n` +
          `⚔️ ${p._mascotaBonusExtra[mascotaId].atk} ATK | ` +
          `🛡️ ${p._mascotaBonusExtra[mascotaId].def} DEF | ` +
          `🎯 ${p._mascotaBonusExtra[mascotaId].crit}% CRIT\n`;

        if (nuevoNivel >= 50) {
          texto += `\n🏆 *¡MASCOTA AL MÁXIMO NIVEL!* 🏆\n_Esta bestia ha alcanzado su forma definitiva._`;
        } else {
          texto += `\n_Siguiente nivel: *${tmFrutosParaNivel(nuevoNivel)} frutos*_`;
        }
      } else {
        // No subió nivel, mostrar progreso
        const frutosParaSiguiente = frutosNecesarios - frutosAcc;
        const barra = tmBarraProgreso(frutosAcc, frutosNecesarios);
        texto +=
          `📊 Nivel: *${nivelActual}/50*\n` +
          `${barra} ${frutosAcc}/${frutosNecesarios}\n` +
          `_Faltan *${frutosParaSiguiente} frutos* para el siguiente nivel._`;
      }

      savePlayer(p);
      await react(subioNivel ? "🌟" : fruto.emoji);
      return reply(texto);
    },
  },

  // ── Ver nivel mascota ───────────────────────────────────────
  {
    name: "mascotanivel",
    alias: ["nivelmasocta", "mivelnivel", "tmnivel"],
    description: "Ver el nivel actual de tu mascota",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.mascota) return reply("❌ No tienes mascota equipada.");

      if (!p._mascotaNiveles)    p._mascotaNiveles    = {};
      if (!p._mascotaFrutosAcc)  p._mascotaFrutosAcc  = {};
      if (!p._mascotaBonusExtra) p._mascotaBonusExtra = {};

      const mascotaId   = p.mascota;
      const nivelActual = p._mascotaNiveles[mascotaId] || 1;
      const frutosAcc   = p._mascotaFrutosAcc[mascotaId] || 0;
      const frutosNec   = nivelActual < 50 ? tmFrutosParaNivel(nivelActual) : 0;
      const bonus       = p._mascotaBonusExtra[mascotaId] || { atk: 0, def: 0, crit: 0 };

      const mascotaData = (p._ssrMascotas && p._ssrMascotas[mascotaId])
        || MASCOTAS?.[mascotaId]
        || { nombre: mascotaId, emoji: "🐾", bonus: { atk: 0, def: 0, crit: 0 } };

      const baseBonus = mascotaData.bonus || { atk: 0, def: 0, crit: 0 };
      const barra = nivelActual < 50 ? tmBarraProgreso(frutosAcc, frutosNec) : "🏆 MÁXIMO";

      await react("🐾");
      return reply(
        `╭─〔 🐾 *MASCOTA* 〕\n` +
        `│ ${mascotaData.emoji || "🐾"} *${mascotaData.nombre || mascotaId}*\n` +
        `│ Nivel: *${nivelActual}/50*\n` +
        `│ ${barra}` + (nivelActual < 50 ? ` ${frutosAcc}/${frutosNec} frutos` : "") + `\n` +
        `├────────────────────\n` +
        `│ 📊 *Stats base:*\n` +
        `│ ⚔️ ${baseBonus.atk} ATK | 🛡️ ${baseBonus.def} DEF | 🎯 ${baseBonus.crit}% CRIT\n` +
        `│ 📈 *Bonus por nivel:*\n` +
        `│ ⚔️ +${bonus.atk} ATK | 🛡️ +${bonus.def} DEF | 🎯 +${bonus.crit}% CRIT\n` +
        `╰──────────────────────⬣\n\n` +
        (nivelActual < 50
          ? `_Usa \`!tmusar [fruto]\` para subir de nivel._`
          : `_¡Tu mascota ha alcanzado el poder máximo!_`)
      );
    },
  },

];

rpgCommands.push(...torreMascotaCommands);

// ═══════════════════════════════════════════════════════════════
//   MEDALLAS DE HONOR — BOSS DEL CLAN, TIENDA Y MISIÓN CLAN
// ═══════════════════════════════════════════════════════════════

const TM_FRUTOS_DATA = {
  fruto_vigor:     { nombre: "Fruto del Vigor",     emoji: "🍎", desc: "+15 ATK a mascota",       bonus: { atk: 15 } },
  fruto_escudo:    { nombre: "Fruto del Escudo",    emoji: "🫐", desc: "+15 DEF a mascota",       bonus: { def: 15 } },
  fruto_fortuna:   { nombre: "Fruto de Fortuna",    emoji: "🍋", desc: "+10 CRIT a mascota",      bonus: { crit: 10 } },
  fruto_fenix:     { nombre: "Fruto del Fénix",     emoji: "🍑", desc: "+25 ATK a mascota",       bonus: { atk: 25 } },
  "fruto_dragón":  { nombre: "Fruto del Dragón",    emoji: "🍇", desc: "+20 DEF +20 ATK",         bonus: { atk: 20, def: 20 } },
  fruto_divino:    { nombre: "Fruto Divino",        emoji: "🍓", desc: "+30 ATK +15 CRIT",        bonus: { atk: 30, crit: 15 } },
  fruto_celestial: { nombre: "Fruto Celestial",     emoji: "🌟", desc: "+40 ATK +20 DEF +20 CRIT",bonus: { atk: 40, def: 20, crit: 20 } },
};

const medallaCommands = [

  // ── !medallas ─────────────────────────────────────────────────
  {
    name: "medallas",
    alias: ["rpgmedallas", "mismedallas"],
    description: "Ver tus Medallas de Honor 🏅",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender }) => {
      const p = db.players[sender];
      if (!p?.clase) return reply("❌ Regístrate primero con `!rpgregistro [clase]`.");
      const med = p.medallas || 0;
      await react("🏅");
      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   🏅 *MEDALLAS DE HONOR*   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "👤 *" + p.nombre + "* | " + med + " 🏅\n\n" +
        "╭─〔 💡 Cómo obtener medallas 〕\n" +
        "│ ⚔️ Matar boss del clan → 100 🏅\n" +
        "│ 🗺️ Matar boss de territorio → 15–30 🏅\n" +
        "│ 🏆 Conquistar un territorio → 50 🏅\n" +
        "│ 📋 Completar misión de clan → variable 🏅\n" +
        "╰──────────────────────⬣\n\n" +
        "🛒 Usa `!tiendaclan` para gastar medallas.\n" +
        "💎 500 🏅 = 100 💎 con `!medallas2gemas`"
      );
    },
  },

  // ── !bossclan ─────────────────────────────────────────────────
  {
    name: "bossclan",
    alias: ["rpgbossclan", "bossdelclan"],
    description: "Ver / invocar el Boss del Clan 🏅",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender }) => {
      const p = db.players[sender];
      if (!p?.clase) return reply("❌ Regístrate primero con `!rpgregistro [clase]`.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan.");
      const clan = db.guilds[p.clan];
      if (!clan) return reply("❌ El clan no existe.");

      const boss = getBossClan(p.clan);
      const ahora = Date.now();

      if (!boss || boss.hp <= 0) {
        const tiempoDerrotado = boss?.derrotadoEn || 0;
        const restante = BOSS_CLAN_COOLDOWN - (ahora - tiempoDerrotado);

        if (restante > 0) {
          const h = Math.floor(restante / 3600000);
          const m = Math.floor((restante % 3600000) / 60000);
          return reply("⏳ El Boss del Clan regresa en *" + h + "h " + m + "min*.\n\nUsa `!rpgatacarbossclan` para atacarlo cuando reaparezca.");
        }

        // Invocar boss nuevo (solo el líder)
        if (clan.lider !== sender) return reply("❌ Solo el *líder del clan* puede invocar al Boss del Clan.");
        const nuevoBoss = inicializarBossClan(p.clan);
        await react("⚔️");
        return reply(
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃   🏅 *BOSS DEL CLAN* 🏅   ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🏅 *" + nuevoBoss.nombre + "* ha aparecido!\n\n" +
          "❤️ HP: *" + nuevoBoss.hpMax.toLocaleString() + "*\n" +
          "⚔️ ATK: *" + nuevoBoss.atk + "* | 🛡️ DEF: *" + nuevoBoss.def + "*\n\n" +
          "⚔️ Solo miembros del clan *" + p.clan + "* pueden atacarlo.\n" +
          "🏅 Al derrotarlo cada participante recibe *100 Medallas de Honor*.\n\n" +
          "▶️ Usa `!rpgatacarbossclan` para atacar!"
        );
      }

      // Boss ya activo — mostrar estado
      const barra = "▓".repeat(Math.round((boss.hp / boss.hpMax) * 10)) + "░".repeat(10 - Math.round((boss.hp / boss.hpMax) * 10));
      const numPartic = Object.keys(boss.participantes || {}).length;
      await react("🏅");
      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   🏅 *BOSS DEL CLAN* 🏅   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "🏅 *" + boss.nombre + "*\n" +
        "❤️ [" + barra + "] " + boss.hp.toLocaleString() + "/" + boss.hpMax.toLocaleString() + "\n" +
        "⚔️ ATK: *" + boss.atk + "* | 🛡️ DEF: *" + boss.def + "*\n\n" +
        "⚔️ Participantes: *" + numPartic + "*\n\n" +
        "▶️ Usa `!rpgatacarbossclan` para atacar!"
      );
    },
  },

  // ── !rpgatacarbossclan ────────────────────────────────────────
  {
    name: "rpgatacarbossclan",
    alias: ["atacarbossclan", "atkclan"],
    description: "Atacar el Boss del Clan — !rpgatacarbossclan",
    category: "RPG ⚔️",
    freeAllowed: false,
    execute: async ({ reply, react, sender }) => {
      const p = db.players[sender];
      if (!p?.clase) return reply("❌ Regístrate primero con `!rpgregistro [clase]`.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan.");
      const clan = db.guilds[p.clan];
      if (!clan) return reply("❌ El clan no existe.");

      const boss = getBossClan(p.clan);
      if (!boss || boss.hp <= 0) return reply("❌ No hay Boss del Clan activo. El líder del clan debe invocarlo con `!bossclan`.");

      if (p.hp <= 0) return reply("❌ Estás derrotado. Descansa con `!rpgdescansar`.");

      // Cooldown de ataque individual (30s)
      const CD_ATKCLAN = 30 * 1000;
      const ahora = Date.now();
      if (p._cdBossClan && ahora - p._cdBossClan < CD_ATKCLAN) {
        const seg = Math.ceil((CD_ATKCLAN - (ahora - p._cdBossClan)) / 1000);
        return reply("⏳ Espera *" + seg + "s* para volver a atacar al Boss del Clan.");
      }
      p._cdBossClan = ahora;

      const atk = getTotalAtk(p);
      const def = boss.def;
      const critChance = calcCrit(p);
      const esCrit = Math.random() * 100 < critChance;
      let dmg = Math.max(1, Math.floor((atk - def * 0.3 + Math.random() * 20) * (esCrit ? 2 : 1)));

      // Contraataque del boss
      const dmgBoss = Math.max(1, Math.floor(boss.atk - getTotalDef(p) * 0.4 + Math.random() * 15));
      p.hp = Math.max(0, p.hp - dmgBoss);
      savePlayer(p);

      const bossActual = atacarBossClan(p.clan, sender, dmg);
      const bossHpRestante = bossActual.hp;
      const barra = "▓".repeat(Math.round((bossHpRestante / bossActual.hpMax) * 10)) + "░".repeat(10 - Math.round((bossHpRestante / bossActual.hpMax) * 10));

      let texto =
        (esCrit ? "💥 *¡CRÍTICO!*\n" : "") +
        "⚔️ Atacaste al *" + boss.nombre + "* por *-" + dmg + "* daño!\n" +
        "💢 El boss te golpeó por *-" + dmgBoss + "*\n\n" +
        "🏅 Boss HP: [" + barra + "] " + bossHpRestante.toLocaleString() + "/" + bossActual.hpMax.toLocaleString();

      if (bossHpRestante <= 0) {
        // Boss derrotado — repartir medallas
        const participantes = Object.keys(bossActual.participantes || {});
        const numPartic = participantes.length;
        for (const jid of participantes) {
          addMedallas(jid, 100);
          avanzarMisionClan(jid, "boss_clan");
        }

        texto +=
          "\n\n💀 *¡" + boss.nombre + " ha sido derrotado!*\n\n" +
          "🏅 *¡Cada participante recibe 100 Medallas de Honor!*\n" +
          "👥 Participantes: *" + numPartic + "*\n\n" +
          "⏳ El boss regresará en *24 horas*.\n" +
          "🛒 Gasta tus medallas: `!tiendaclan`";
        await react("🏆");
      } else {
        await react("⚔️");
      }

      return reply(texto);
    },
  },

  // ── !tiendaclan ───────────────────────────────────────────────
  {
    name: "tiendaclan",
    alias: ["rpgtiendaclan", "shopmedallas"],
    description: "Tienda del Clan — compra con Medallas de Honor 🏅",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args }) => {
      const p = db.players[sender];
      if (!p?.clase) return reply("❌ Regístrate primero con `!rpgregistro [clase]`.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan para acceder a la tienda.");

      const med = p.medallas || 0;

      if (!args[0]) {
        // Mostrar catálogo
        await react("🏅");
        let cat = "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
                  "┃   🏅 *TIENDA DEL CLAN* 🏅   ┃\n" +
                  "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
                  "🏅 Tus medallas: *" + med + "*\n\n" +
                  "╭─〔 🍎 FRUTOS DE MASCOTA 〕\n";
        const frutos = Object.entries(TIENDA_CLAN).filter(([,v]) => v.tipo === "fruto");
        for (const [id, item] of frutos) {
          cat += "│ `" + id + "` — " + item.emoji + " *" + item.nombre + "* (" + item.desc + ") — *" + item.precio + " 🏅*\n";
        }
        cat += "├─〔 💎 PIEDRAS DE ASCENSIÓN 〕\n";
        const piedras = Object.entries(TIENDA_CLAN).filter(([,v]) => v.tipo === "piedra");
        for (const [id, item] of piedras) {
          cat += "│ `" + id + "` — " + item.emoji + " *" + item.nombre + "* (" + item.desc + ") — *" + item.precio + " 🏅*\n";
        }
        cat += "├─〔 💸 CAMBIO ESPECIAL 〕\n" +
               "│ `!medallas2gemas` → 500 🏅 = 100 💎\n" +
               "╰──────────────────────⬣\n\n" +
               "▶️ Compra: `!tiendaclan [id]`";
        return reply(cat);
      }

      const itemId = args[0].toLowerCase();
      const item = TIENDA_CLAN[itemId];
      if (!item) return reply("❌ Ítem no encontrado. Usa `!tiendaclan` para ver el catálogo.");
      if (med < item.precio) return reply("❌ No tienes suficientes medallas. Tienes *" + med + " 🏅*, necesitas *" + item.precio + " 🏅*.");

      if (!quitarMedallas(sender, item.precio)) return reply("❌ Error al descontar medallas.");

      if (item.tipo === "fruto") {
        if (!p.frutos) p.frutos = {};
        p.frutos[item.frutoId] = (p.frutos[item.frutoId] || 0) + 1;
        savePlayer(p);
        await react("🍎");
        return reply(
          "✅ *¡Compra exitosa!*\n\n" +
          item.emoji + " Obtuviste: *" + item.nombre + "*\n" +
          "📦 " + item.desc + "\n" +
          "🏅 Medallas restantes: *" + (p.medallas || 0) + "*\n\n" +
          "_Usa `!tmusar " + item.frutoId + "` para aplicarlo a tu mascota._"
        );
      }

      if (item.tipo === "piedra") {
        addExp(p, item.xp);
        savePlayer(p);
        await react("💎");
        return reply(
          "✅ *¡Compra exitosa!*\n\n" +
          item.emoji + " Usaste: *" + item.nombre + "*\n" +
          "⭐ Ganaste *+" + item.xp + " XP*!\n" +
          "🏅 Medallas restantes: *" + (p.medallas || 0) + "*"
        );
      }

      return reply("❌ Tipo de ítem desconocido.");
    },
  },

  // ── !medallas2gemas ───────────────────────────────────────────
  {
    name: "medallas2gemas",
    alias: ["cambiarmedallas", "medallasagemas"],
    description: "Cambiar 500 Medallas de Honor por 100 💎",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender }) => {
      const p = db.players[sender];
      if (!p?.clase) return reply("❌ Regístrate primero con `!rpgregistro [clase]`.");
      if (!p.clan) return reply("❌ Solo miembros de un clan pueden hacer este cambio.");

      const COSTO = 500;
      const GEMAS = 100;
      const med = p.medallas || 0;

      if (med < COSTO) return reply("❌ Necesitas *500 🏅* para cambiar. Tienes *" + med + " 🏅*.");
      if (!quitarMedallas(sender, COSTO)) return reply("❌ Error al procesar el cambio.");

      p.gemas = (p.gemas || 0) + GEMAS;
      savePlayer(p);
      await react("💎");
      return reply(
        "✅ *¡Cambio realizado!*\n\n" +
        "🏅 *-500 Medallas de Honor*\n" +
        "💎 *+100 Diamantes*\n\n" +
        "🏅 Medallas restantes: *" + (p.medallas || 0) + "*\n" +
        "💎 Diamantes totales: *" + p.gemas + "*"
      );
    },
  },

  // ── !misionclan ───────────────────────────────────────────────
  {
    name: "misionclan",
    alias: ["rpgmisionclan", "clanmision"],
    description: "Misión diaria del clan — ¡gana Medallas de Honor! 🏅",
    category: "RPG ⚔️",
    freeAllowed: false,
    execute: async ({ reply, react, sender }) => {
      const p = db.players[sender];
      if (!p?.clase) return reply("❌ Regístrate primero con `!rpgregistro [clase]`.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan. Únete con `!rpgclan unirse [nombre]`.");

      const ahora = Date.now();
      let mc = getMisionClan(sender);

      // Expirada o inexistente → generar nueva
      if (!mc || ahora > mc.expiraEn) {
        mc = generarMisionClan(sender);
      }

      if (mc.completada) {
        const restante = mc.expiraEn - ahora;
        const h = Math.floor(restante / 3600000);
        const m = Math.floor((restante % 3600000) / 60000);
        await react("✅");
        return reply(
          "✅ *¡Misión de clan completada!*\n\n" +
          "🏅 Recompensa cobrada: *+" + mc.recompensa.medallas + " medallas*\n" +
          "💰 Oro extra: *+" + mc.recompensa.oro + "*\n\n" +
          "⏳ Nueva misión disponible en *" + h + "h " + m + "min*."
        );
      }

      const progBarra = "▰".repeat(Math.round((mc.progreso / mc.meta) * 10)) + "▱".repeat(10 - Math.round((mc.progreso / mc.meta) * 10));
      const restante = mc.expiraEn - ahora;
      const h = Math.floor(restante / 3600000);
      const m = Math.floor((restante % 3600000) / 60000);

      await react("🏅");
      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   🏅 *MISIÓN DE CLAN* 🏅   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "📋 *" + mc.desc + "*\n\n" +
        "📊 Progreso: [" + progBarra + "] *" + mc.progreso + "/" + mc.meta + "*\n\n" +
        "╭─〔 🎁 RECOMPENSA 〕\n" +
        "│ 🏅 *+" + mc.recompensa.medallas + " Medallas de Honor*\n" +
        "│ 💰 *+" + mc.recompensa.oro + " Oro*\n" +
        "╰──────────────────────⬣\n\n" +
        "⏳ Expira en: *" + h + "h " + m + "min*\n" +
        "📋 Tu misión se completa automáticamente al lograr el objetivo."
      );
    },
  },

  // ── !clansubirnivel ───────────────────────────────────────────
  {
    name: "clansubirnivel",
    alias: ["rpgclanupgrade", "subirnivel_clan"],
    description: "Subir el nivel del clan donando Medallas de Honor 🏅",
    category: "RPG ⚔️",
    freeAllowed: false,
    execute: async ({ reply, react, sender }) => {
      const p = db.players[sender];
      if (!p?.clase) return reply("❌ Regístrate primero con `!rpgregistro [clase]`.");
      if (!p.clan) return reply("❌ No perteneces a ningún clan.");
      const clan = getGuild(p.clan);
      if (!clan) return reply("❌ El clan no existe.");
      if (clan.lider !== sender) return reply("❌ Solo el *líder del clan* puede subir el nivel del clan.");

      const nivelActual = getNivelClan(clan);
      const costo = costoSiguienteNivelClan(clan);
      const medActuales = p.medallas || 0;

      if (!p) return reply("❌ Jugador no encontrado.");

      // Mostrar info si no hay argumento suficiente
      if (medActuales < costo) {
        return reply(
          "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃  🏅 *SUBIR NIVEL DEL CLAN*  ┃\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          "🏰 Clan: *" + clan.nombre + "*\n" +
          "🌟 Nivel actual: *" + nivelActual + "*\n\n" +
          "╭─〔 💡 SIGUIENTE NIVEL 〕\n" +
          "│ 🏅 Costo: *" + costo + " Medallas de Honor*\n" +
          "│ Tus medallas: *" + medActuales + "*\n" +
          "│ Te faltan: *" + (costo - medActuales) + "* 🏅\n" +
          "╰──────────────────────⬣\n\n" +
          "_Consigue más medallas en el Boss del Clan,\nbosses de territorio y misiones de clan._"
        );
      }

      // Subir nivel
      if (!quitarMedallas(sender, costo)) return reply("❌ Error al procesar las medallas.");
      clan.medallasDonadas = (clan.medallasDonadas || 0) + costo;
      saveGuild(clan);

      const nivelNuevo = getNivelClan(clan);
      await react("🌟");
      return reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃  🌟 *¡CLAN SUBIÓ DE NIVEL!*  ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "🏰 *" + clan.nombre + "*\n" +
        "🌟 Nivel: *" + (nivelNuevo - 1) + "* → *" + nivelNuevo + "*\n" +
        "🏅 Medallas donadas: *-" + costo + "*\n" +
        "🏅 Tus medallas restantes: *" + (p.medallas || 0) + "*\n\n" +
        "💪 El Boss del Clan ahora es más fuerte y da más recompensas."
      );
    },
  },

];

rpgCommands.push(...medallaCommands);

// ── Buzón de mensajes ─────────────────────────────────────────────────────
rpgCommands.push(
  {
    name: "buzon",
    alias: ["inbox", "correo", "mensajes"],
    description: "Ver tu buzón de mensajes del sistema",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ Sin personaje RPG.");
      const buzon = getBuzon(sender);
      if (!buzon.length) return reply("📭 *Tu buzón está vacío.*");
      await react("📬");
      const lineas = buzon.map((m, i) => {
        const estado = m.leido ? (m.recompensa && !m.reclamado ? "🎁" : "✉️") : "📩";
        const fecha = new Date(m.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" });
        return `│ [${i + 1}] ${estado} *${m.titulo}* — ${fecha}`;
      });
      const sinLeer = buzon.filter(m => !m.leido).length;
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃      📬  *BUZÓN DE MENSAJES*      ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n" +
        "📨 *Remitente:* SISTEMA RPG\n" +
        `📩 Sin leer: *${sinLeer}* | Total: *${buzon.length}*\n` +
        "━━━━━━━━━━━━━━\n" +
        lineas.join("\n") + "\n" +
        "╰──────────────────────⬣\n\n" +
        "📖 Usa `!buzonver [número]` para leer y reclamar recompensas\n" +
        "_Leyenda: 📩 Sin leer  ✉️ Leído  🎁 Recompensa pendiente_"
      );
    },
  },
  {
    name: "buzonver",
    alias: ["leerbuzon", "leercorreo"],
    description: "Leer un mensaje del buzón y reclamar recompensa",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ Sin personaje RPG.");
      const idx = parseInt(args[0]) - 1;
      const buzon = getBuzon(sender);
      if (isNaN(idx) || idx < 0 || idx >= buzon.length)
        return reply("❌ Número inválido. Usa `!buzon` para ver tus mensajes.");
      const msg = leerMensajeBuzon(sender, idx);
      await react("📖");
      let texto =
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃      📨  *MENSAJE DEL SISTEMA*      ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n" +
        `📌 *${msg.titulo}*\n` +
        `📅 ${new Date(msg.fecha).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}\n` +
        "━━━━━━━━━━━━━━\n" +
        msg.cuerpo + "\n" +
        "╰──────────────────────⬣";
      if (msg.recompensa && !msg.reclamado) {
        const r = msg.recompensa;
        const detalle = [
          r.oro   ? `💰 ${r.oro} oro`   : "",
          r.gemas ? `💎 ${r.gemas} gemas` : "",
          r.item  ? `🎒 ${r.cantidad}x ${r.item}` : "",
        ].filter(Boolean).join(" | ");
        texto += `\n\n🎁 *Recompensa adjunta:* ${detalle}`;
        const reclamado = reclamarRecompensaBuzon(sender, idx);
        if (reclamado) {
          texto += "\n✅ *¡Recompensa reclamada automáticamente!*";
        }
      } else if (msg.recompensa && msg.reclamado) {
        texto += "\n\n✅ _Recompensa ya reclamada._";
      }
      await reply(texto);
    },
  }
);

export default rpgCommands;

// ═══════════════════════════════════════════════════════════════
// ══  TORRE DE ORO  ══════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════

const ORO_TORRE_MAX_PISOS   = 50;
const ORO_TORRE_VIDAS       = 3;
const ORO_TORRE_CD_COMPLETA = 12 * 60 * 60 * 1000; // 12h al completar
const ORO_TORRE_CD_MUERTE   = 8  * 60 * 1000;       //  8min al perder vidas
const ORO_TORRE_ATAQUE_CD   = 15 * 1000;             // 15s entre ataques

// Jefes fijos por piso — stats definidos de forma explícita
const ORO_TORRE_JEFES = {
   5: { nombre: "Señor de las Monedas",  emoji: "🪙", hpMult: 1.8, atkMult: 1.4, defMult: 1.3 },
  10: { nombre: "Golem de Oro",          emoji: "🗿", hpMult: 2.2, atkMult: 1.6, defMult: 1.5 },
  15: { nombre: "Dragón Codicioso",      emoji: "🐉", hpMult: 2.6, atkMult: 1.8, defMult: 1.5 },
  20: { nombre: "Mercader Oscuro",       emoji: "🧙", hpMult: 3.0, atkMult: 2.0, defMult: 1.8 },
  25: { nombre: "Titán Dorado",          emoji: "🛡️", hpMult: 3.5, atkMult: 2.2, defMult: 2.0 },
  30: { nombre: "El Avaro Eterno",       emoji: "💀", hpMult: 4.0, atkMult: 2.5, defMult: 2.2 },
  35: { nombre: "Kraken del Tesoro",     emoji: "🐙", hpMult: 4.5, atkMult: 2.7, defMult: 2.3 },
  40: { nombre: "Espectro del Banco",    emoji: "👻", hpMult: 5.0, atkMult: 3.0, defMult: 2.5 },
  45: { nombre: "Reina de las Bóvedas", emoji: "👑", hpMult: 5.8, atkMult: 3.3, defMult: 2.8 },
  50: { nombre: "🔱 El Gran Tesoro",    emoji: "🔱", hpMult: 7.0, atkMult: 4.0, defMult: 3.5 },
};

// Recompensa de oro por piso — generosa y escalada
function calcOroTorreRecompensa(piso) {
  const esJefe = piso % 5 === 0;
  const base   = Math.floor(150 + (piso / ORO_TORRE_MAX_PISOS) ** 1.4 * 3350); // 150 en p1, ~3500 en p50
  const oro    = esJefe ? Math.floor(base * 5) : base;   // jefes x5
  const exp    = Math.floor(80 * (1 + piso * 0.06));
  const gemas  = esJefe ? Math.floor(piso / 5) : 0;      // pequeño bonus de gemas solo en jefes
  return { oro, exp, gemas, esJefe };
}

// Enemigo de la Torre de Oro
function calcOroTorreEnemigo(piso, playerHpMax, playerAtk, playerDef) {
  const jefe = ORO_TORRE_JEFES[piso];
  if (jefe) {
    return {
      nombre: `${jefe.emoji} ${jefe.nombre} (Piso ${piso})`,
      emoji:  jefe.emoji,
      hp:     Math.floor(playerHpMax * jefe.hpMult),
      hpMax:  Math.floor(playerHpMax * jefe.hpMult),
      atk:    Math.floor(playerAtk   * jefe.atkMult),
      def:    Math.floor(playerDef   * jefe.defMult),
      esJefe: true,
    };
  }
  const escala = 1 + (piso - 1) * 0.07;
  const emojis  = ["💰","🪙","💛","🌟","✨","🏅","🎖️","🔶","🟡","⚜️"];
  const nombres = ["Saqueador Dorado","Guardián Áureo","Centinela del Oro","Custodio Brillante","Espectro Dorado","Coloso Áureo","Titán del Tesoro","Señor Brillante","Dragón Menor","Ángel Codicioso"];
  const idx = Math.min(Math.floor((piso - 1) / 5), 9);
  return {
    nombre: `${emojis[idx]} ${nombres[idx]} (Piso ${piso})`,
    emoji:  emojis[idx],
    hp:     Math.floor(playerHpMax * escala * 0.85),
    hpMax:  Math.floor(playerHpMax * escala * 0.85),
    atk:    Math.floor(playerAtk   * escala * 0.6),
    def:    Math.floor(playerDef   * escala * 0.45),
    esJefe: false,
  };
}

function getOroTorreEstado(player) {
  if (!player.oroTorre) player.oroTorre = {
    activa: false, piso: 1, vidas: ORO_TORRE_VIDAS,
    enemigo: null, completadaTs: 0, muertaTs: 0,
  };
  return player.oroTorre;
}

const oroTorreCommands = [
  // ── Menú ──────────────────────────────────────────────────────
  {
    name: "torreoro",
    alias: ["otorre", "orotorre"],
    description: "Torre de Oro — 50 pisos con jefes fijos y oro generoso",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const g = getOroTorreEstado(p);
      const ahora = Date.now();

      const cdCompleta = g.completadaTs ? Math.max(0, ORO_TORRE_CD_COMPLETA - (ahora - g.completadaTs)) : 0;
      const cdMuerta   = g.muertaTs    ? Math.max(0, ORO_TORRE_CD_MUERTE   - (ahora - g.muertaTs))    : 0;

      const fmtCd = ms => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}min` : `${m} min`;
      };

      await react("💰");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  💰 *TORRE DE ORO* 💰  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `_50 pisos de pura codicia. Jefes legendarios te esperan._\n\n` +
        `╭─〔 📊 *TU ESTADO* 〕\n` +
        `│ 📍 Piso actual: *${g.activa ? g.piso : "—"}*\n` +
        `│ ❤️ Vidas: *${g.vidas}/${ORO_TORRE_VIDAS}*\n` +
        `│ 🏆 Mejor piso: *${p.oroTorrePisoMax || 0}/50*\n` +
        `│ 💰 Tu oro: *${p.oro}*\n` +
        (cdCompleta > 0 ? `│ ⏳ Cooldown: *${fmtCd(cdCompleta)}*\n` : "") +
        (cdMuerta   > 0 ? `│ ⏳ Recuperando vidas: *${fmtCd(cdMuerta)}*\n` : "") +
        `╰──────────────────────⬣\n\n` +
        `╭─〔 💡 *COMANDOS* 〕\n` +
        `│ \`!otentrar\` → Entrar a la torre\n` +
        `│ \`!otatacar\` → Atacar al enemigo\n` +
        `│ \`!otavanzar\` → Ver info del piso\n` +
        `│ \`!otsalir\` → Salir (conservas piso)\n` +
        `╰──────────────────────⬣\n\n` +
        `💰 _Jefes fijos cada 5 pisos — dan *x5 oro* + gemas bonus._\n` +
        `❤️ _Tienes ${ORO_TORRE_VIDAS} vidas por run. Al perderlas: 8 min de CD._\n` +
        `🏆 _Al completar los 50 pisos: cooldown de 12h._`
      );
    },
  },

  // ── Entrar ────────────────────────────────────────────────────
  {
    name: "otentrar",
    alias: ["tooroenttrar", "orotorreentrar"],
    description: "Entrar a la Torre de Oro",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      const g = getOroTorreEstado(p);
      const ahora = Date.now();

      if (g.activa) return reply(`⚠️ Ya estás en la Torre de Oro (Piso ${g.piso}). Usa \`!otatacar\`.`);

      const cdCompleta = g.completadaTs ? ORO_TORRE_CD_COMPLETA - (ahora - g.completadaTs) : 0;
      if (cdCompleta > 0) {
        const h = Math.floor(cdCompleta / 3600000), m = Math.floor((cdCompleta % 3600000) / 60000);
        return reply(`⏳ Completaste la torre recientemente. Podrás reintentar en *${h}h ${m}min*.`);
      }
      const cdMuerta = g.muertaTs ? ORO_TORRE_CD_MUERTE - (ahora - g.muertaTs) : 0;
      if (cdMuerta > 0) return reply(`⏳ Perdiste todas las vidas. Cooldown: *${Math.ceil(cdMuerta / 60000)} min*.`);
      if (p.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar` primero.");

      g.activa       = true;
      g.piso         = 1;
      g.vidas        = ORO_TORRE_VIDAS;
      g.enemigo      = null;
      g.completadaTs = 0;
      g.muertaTs     = 0;
      p.oroTorre = g;
      savePlayer(p);

      await react("💰");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  💰 *¡TORRE DE ORO!* 💰  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `⚔️ *${p.nombre}* entró a la Torre de Oro.\n` +
        `❤️ Vidas: *${g.vidas}/${ORO_TORRE_VIDAS}*\n\n` +
        `📍 Piso 1 / 50\n` +
        `_Usa \`!otatacar\` para combatir. ¡Los jefes fijos cada 5 pisos dan x5 oro!_`
      );
    },
  },

  // ── Atacar ────────────────────────────────────────────────────
  {
    name: "otatacar",
    alias: ["oroatacar", "orotorreatacar"],
    description: "Atacar en la Torre de Oro",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const g = getOroTorreEstado(p);
      if (!g.activa) return reply("❌ No estás en la torre. Usa `!otentrar`.");

      const ahora = Date.now();
      if (!p._otAtkTs) p._otAtkTs = 0;
      if (ahora - p._otAtkTs < ORO_TORRE_ATAQUE_CD) {
        return reply(`⏳ Espera *${Math.ceil((ORO_TORRE_ATAQUE_CD - (ahora - p._otAtkTs)) / 1000)}s* para volver a atacar.`);
      }
      p._otAtkTs = ahora;

      if (!g.enemigo || g.enemigo.hp <= 0) {
        g.enemigo = calcOroTorreEnemigo(g.piso, p.hpMax, getTotalAtk(p), getTotalDef(p));
      }
      const e = g.enemigo;

      // Ataque jugador
      let atkJ = Math.max(1, getTotalAtk(p) - Math.floor(e.def * 0.4));
      const esCrit = Math.random() * 100 < calcCrit(p);
      if (p.buffHabilidad && Date.now() < p.buffHabilidad.expira) {
        const b = p.buffHabilidad;
        if (b.tipo === "critico") atkJ = Math.floor(atkJ * b.mult);
        if (b.tipo === "dano")    atkJ = Math.floor(atkJ * b.mult);
        if (b.tipo === "multi")   atkJ = Math.floor(atkJ * 2.5);
        if (b.tipo === "drenar")  atkJ = Math.floor(atkJ * b.mult);
        p.buffHabilidad = null;
      }
      const danoJ = esCrit ? Math.floor(atkJ * 1.8) : atkJ;
      e.hp = Math.max(0, e.hp - danoJ);

      // Contraataque enemigo
      const esquiva = Math.random() * 100 < calcDodge(p);
      const danoE   = esquiva ? 0 : Math.max(1, e.atk - Math.floor(getTotalDef(p) * 0.4) + Math.floor(Math.random() * 10));
      p.hp = Math.max(0, p.hp - danoE);

      const barraE = barra(e.hp, e.hpMax);
      const barraP = barra(p.hp, p.hpMax);

      let texto =
        `💰 *TORRE DE ORO — Piso ${g.piso}/50*\n` +
        `${e.emoji} *${e.nombre}*\n` +
        `${barraE} ${e.hp}/${e.hpMax}\n\n` +
        (esCrit ? "💥 *¡CRÍTICO!* " : "⚔️ ") + `Tu golpe: *-${danoJ}*\n` +
        (esquiva ? "💨 *¡Esquivaste* el ataque!\n" : `${e.emoji} Contraataque: *-${danoE}*\n`) +
        `❤️ Tu HP: ${barraP} ${p.hp}/${p.hpMax} | 💰 Vidas: ${g.vidas}/${ORO_TORRE_VIDAS}\n`;

      // Victoria
      if (e.hp <= 0) {
        const r = calcOroTorreRecompensa(g.piso);
        p.oro += r.oro;
        p.gemas = (p.gemas || 0) + r.gemas;
        p.hp = Math.min(p.hpMax, p.hp + Math.floor(p.hpMax * 0.25));
        addExp(p, r.exp);
        if (!p.oroTorrePisoMax || g.piso > p.oroTorrePisoMax) p.oroTorrePisoMax = g.piso;

        const esUltimo = g.piso === ORO_TORRE_MAX_PISOS;

        texto +=
          `\n${r.esJefe ? "🏆 *¡JEFE DERROTADO!*" : "✅ *¡Piso superado!*"}\n` +
          `━━━━━━━━━━━━━━\n` +
          `💰 Oro: *+${r.oro}* ${r.esJefe ? "_(bonus jefe x5)_" : ""}\n` +
          `⭐ EXP: *+${r.exp}*` +
          (r.gemas > 0 ? ` | 💎 Gemas: *+${r.gemas}*` : "") + `\n` +
          `❤️ HP recuperado: *+${Math.floor(p.hpMax * 0.25)}*\n`;

        if (esUltimo) {
          const oroBonus = 10000;
          p.oro += oroBonus;
          g.activa       = false;
          g.completadaTs = ahora;
          g.enemigo      = null;
          p.oroTorre = g;
          savePlayer(p);
          await react("👑");
          return reply(texto +
            `\n👑 *¡¡COMPLETASTE LA TORRE DE ORO!!* 🎊\n` +
            `💰 *BONUS FINAL: +${oroBonus} oro*\n` +
            `⏳ Cooldown de *12 horas* activo.\n` +
            `💰 Total de oro: *${p.oro}*`
          );
        }

        g.piso++;
        g.enemigo = null;
        g.activa  = true;
        p.oroTorre = g;
        savePlayer(p);
        await react(r.esJefe ? "🏆" : "✅");
        return reply(texto + `\n📍 Siguiente piso: *${g.piso}/50*\n_Usa \`!otatacar\` para continuar._`);
      }

      // Jugador muere
      if (p.hp <= 0) {
        g.vidas--;
        p.hp = Math.floor(p.hpMax * 0.3);
        g.enemigo = null;

        if (g.vidas <= 0) {
          g.activa   = false;
          g.vidas    = ORO_TORRE_VIDAS;
          g.muertaTs = ahora;
          p.hp       = Math.floor(p.hpMax * 0.1);
          p.oroTorre = g;
          savePlayer(p);
          await react("💀");
          return reply(texto +
            `\n💀 *¡SIN VIDAS!* Fuiste expulsado de la Torre de Oro.\n` +
            `🏆 Llegaste al piso *${g.piso}*. Mejor piso: *${p.oroTorrePisoMax || g.piso}*\n` +
            `⏳ Cooldown: *8 minutos*. Luego podrás reintentar.`
          );
        }

        p.oroTorre = g;
        savePlayer(p);
        await react("💔");
        return reply(texto +
          `\n💔 *¡Caíste!* Vidas restantes: *${g.vidas}/${ORO_TORRE_VIDAS}*\n` +
          `❤️ HP restaurado a ${p.hp}. El enemigo reaparece.\n` +
          `_Usa \`!otatacar\` para continuar._`
        );
      }

      // Combate continúa
      g.enemigo  = e;
      p.oroTorre = g;
      savePlayer(p);
      await react("⚔️");
      return reply(texto + `_Sigue con \`!otatacar\`._`);
    },
  },

  // ── Avanzar / info piso ───────────────────────────────────────
  {
    name: "otavanzar",
    alias: ["oroavanzar", "orotorreavanzar"],
    description: "Ver info del piso actual (Torre de Oro)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const g = getOroTorreEstado(p);
      if (!g.activa) return reply("❌ No estás en la torre. Usa `!otentrar`.");
      if (g.enemigo && g.enemigo.hp > 0) return reply(`⚔️ Hay un enemigo activo en el piso ${g.piso}. Usa \`!otatacar\` primero.`);

      const r    = calcOroTorreRecompensa(g.piso);
      const jefe = ORO_TORRE_JEFES[g.piso];
      await react("📍");
      return reply(
        `📍 *Piso ${g.piso} / 50* — Torre de Oro\n` +
        (r.esJefe ? `⭐ *¡PISO DE JEFE!* ${jefe ? `— ${jefe.emoji} ${jefe.nombre}` : ""}\n` : "") +
        `❤️ HP: *${p.hp}/${p.hpMax}* | 💰 Vidas: *${g.vidas}/${ORO_TORRE_VIDAS}*\n` +
        `💰 Oro al ganar: *~${r.oro}*` +
        (r.gemas > 0 ? ` | 💎 +${r.gemas} gemas` : "") + `\n\n` +
        `_Usa \`!otatacar\` para combatir._`
      );
    },
  },

  // ── Salir ─────────────────────────────────────────────────────
  {
    name: "otsalir",
    alias: ["orosalir", "orotorresalir"],
    description: "Salir de la Torre de Oro (conservas piso)",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const g = getOroTorreEstado(p);
      if (!g.activa) return reply("⚠️ No estás en la Torre de Oro.");
      g.activa  = false;
      g.enemigo = null;
      p.oroTorre = g;
      savePlayer(p);
      await react("🚪");
      return reply(
        `🚪 Saliste de la Torre de Oro.\n` +
        `📍 Progreso guardado: *Piso ${g.piso}/50*\n` +
        `💰 Vidas restantes: *${g.vidas}/${ORO_TORRE_VIDAS}*\n` +
        `_Vuelve con \`!otentrar\` para continuar desde aquí._`
      );
    },
  },
];

rpgCommands.push(...oroTorreCommands);

// ═══════════════════════════════════════════════════════════════
// ══  SISTEMA DE MATRIMONIO  ═════════════════════════════════════
// ═══════════════════════════════════════════════════════════════

const MARRY_INVITE_TIMEOUT  = 5  * 60 * 1000;  // 5 min para aceptar
const MARRY_TRANSFER_CD     = 60 * 60 * 1000;  // 1h entre transferencias
const MARRY_MISION_CD       = 24 * 60 * 60 * 1000;
const MARRY_BONUS_ATK_DEF   = 0.05; // +5%
const MARRY_REVIVE_COST_PCT = 0.40; // 40% HP propio para revivir pareja
const MARRY_COSTO_DIVORCIO  = 2000; // oro

// Invitaciones pendientes en memoria
const _merryInvites = {};

function getMerryInvite(jid) { return _merryInvites[jid] || null; }
function setMerryInvite(jid, data) {
  if (data === null) delete _merryInvites[jid];
  else _merryInvites[jid] = data;
}

function getMarriagePartner(p) {
  if (!p.pareja) return null;
  return db.players[p.pareja] || null;
}

// Bonus de pareja: activo si ambos exploraron hoy
function marriageBonus(p) {
  if (!p.pareja) return { atk: 0, def: 0, activo: false };
  const partner = db.players[p.pareja];
  if (!partner) return { atk: 0, def: 0, activo: false };
  const hoy = new Date().toDateString();
  const pHoy = new Date(p.ultimaExploracion || 0).toDateString() === hoy;
  const qHoy = new Date(partner.ultimaExploracion || 0).toDateString() === hoy;
  const activo = pHoy && qHoy;
  const atk = activo ? Math.floor(getTotalAtk(p) * MARRY_BONUS_ATK_DEF) : 0;
  const def = activo ? Math.floor(getTotalDef(p) * MARRY_BONUS_ATK_DEF) : 0;
  return { atk, def, activo };
}

// Misiones de pareja
const MARRY_MISIONES = [
  { id: "explorar2", desc: "Explorar juntos 2 veces", tipo: "explorarJuntos", meta: 2, recompensa: { oro: 800, exp: 200 } },
  { id: "kills10",   desc: "Derrotar 10 enemigos en exploración conjunta", tipo: "killsJuntos", meta: 10, recompensa: { oro: 1200, exp: 350 } },
  { id: "oro500",    desc: "Transferirse 500 oro entre sí", tipo: "transferencia", meta: 500, recompensa: { gemas: 30, exp: 150 } },
];

function getMarryMision(p) {
  const hoy = new Date().toDateString();
  if (!p._merryMision || p._merryMision.dia !== hoy) {
    const m = MARRY_MISIONES[Math.floor(Math.random() * MARRY_MISIONES.length)];
    p._merryMision = { dia: hoy, id: m.id, progreso: 0, completada: false };
  }
  return p._merryMision;
}

// ── Comandos ──────────────────────────────────────────────────
const marriageCommands = [

  // ── !merry @usuario ──────────────────────────────────────────
  {
    name: "merry",
    alias: ["rpgcasar", "proponer", "casarse"],
    description: "Proponer matrimonio — !merry @usuario",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, msg, pushName }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje. Usa `!rpgregistro`.");
      if (p.pareja) return reply(`💍 Ya estás casado/a con *@${p.pareja.split("@")[0]}*.\n_Para divorciarte usa \`!divorcio\`._`);

      const targetId = (msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [])[0];
      if (!targetId) return reply("❌ Menciona a alguien. Ej: `!merry @usuario`");
      if (targetId === sender) return reply("❌ No puedes casarte contigo mismo.");

      const q = db.players[targetId];
      if (!q || !q.clase) return reply("❌ Ese jugador no tiene personaje RPG.");
      if (q.pareja) return reply(`❌ *@${targetId.split("@")[0]}* ya está casado/a.`);

      // Pending invite?
      const prev = getMerryInvite(targetId);
      if (prev && prev.de === sender && Date.now() - prev.ts < MARRY_INVITE_TIMEOUT) {
        return reply("⏳ Ya tienes una propuesta pendiente enviada a esa persona.");
      }

      setMerryInvite(targetId, { de: sender, nombreDe: p.nombre, ts: Date.now() });
      await react("💍");
      return reply(
        `💍 *¡PROPUESTA DE MATRIMONIO!*\n` +
        `━━━━━━━━━━━━━━\n` +
        `💌 *${p.nombre}* le propone matrimonio a *@${targetId.split("@")[0]}*\n\n` +
        `_@${targetId.split("@")[0]}, escribe \`!aceptarboda\` para decir Sí 💒_\n` +
        `_o \`!rechazarboda\` para rechazar._\n` +
        `⏳ Tienes *5 minutos* para responder.`
      );
    },
  },

  // ── !aceptarboda ─────────────────────────────────────────────
  {
    name: "aceptarboda",
    alias: ["rpgaceptarboda", "siaceboda"],
    description: "Aceptar propuesta de matrimonio",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (p.pareja) return reply("❌ Ya estás casado/a.");

      const invite = getMerryInvite(sender);
      if (!invite) return reply("❌ No tienes propuestas de matrimonio pendientes.");
      if (Date.now() - invite.ts > MARRY_INVITE_TIMEOUT) {
        setMerryInvite(sender, null);
        return reply("❌ La propuesta expiró.");
      }

      const q = db.players[invite.de];
      if (!q || !q.clase) { setMerryInvite(sender, null); return reply("❌ El jugador ya no existe."); }
      if (q.pareja) { setMerryInvite(sender, null); return reply("❌ Esa persona ya se casó con alguien más."); }

      // Unir
      p.pareja = invite.de;
      q.pareja = sender;
      p.bodaTs = Date.now();
      q.bodaTs = Date.now();
      p.parejaDesde = Date.now();
      q.parejaDesde = Date.now();
      setMerryInvite(sender, null);
      savePlayer(p);
      savePlayer(q);

      await react("💒");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  💒 *¡BODA CELEBRADA!* 💒  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `💍 *${q.nombre}* & *${p.nombre}* ¡ahora son pareja!\n\n` +
        `✨ *Beneficios activos:*\n` +
        `│ 💪 +5% ATK/DEF cuando ambos exploran el mismo día\n` +
        `│ 🗺️ Exploración conjunta con \`!rpgexplorar [zona] @pareja\`\n` +
        `│ 💰 Transferencias con \`!darpro [cantidad] [oro/gemas]\`\n` +
        `│ 📋 Misión diaria con \`!misionpareja\`\n` +
        `│ 💀 Revivirse mutuamente con \`!revivirpareja\`\n` +
        `│ 🎖️ Título *💍 Enamorado/a* en tu perfil\n\n` +
        `_¡Que sean muy felices! 🎊_`
      );
    },
  },

  // ── !rechazarboda ─────────────────────────────────────────────
  {
    name: "rechazarboda",
    alias: ["noboda", "rechazarmatrimonio"],
    description: "Rechazar propuesta de matrimonio",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const invite = getMerryInvite(sender);
      if (!invite) return reply("❌ No tienes propuestas pendientes.");
      const nombre = invite.nombreDe;
      setMerryInvite(sender, null);
      await react("💔");
      return reply(`💔 Rechazaste la propuesta de *${nombre}*.`);
    },
  },

  // ── !divorcio ─────────────────────────────────────────────────
  {
    name: "divorcio",
    alias: ["rpgdivorcio", "separarme"],
    description: `Divorciarse (cuesta ${MARRY_COSTO_DIVORCIO} oro)`,
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.pareja) return reply("❌ No estás casado/a.");
      if (p.oro < MARRY_COSTO_DIVORCIO) return reply(`❌ El divorcio cuesta *${MARRY_COSTO_DIVORCIO} 💰*. Te faltan *${MARRY_COSTO_DIVORCIO - p.oro}* oro.`);

      const q = db.players[p.pareja];
      const nombreQ = q?.nombre || p.pareja.split("@")[0];
      p.oro -= MARRY_COSTO_DIVORCIO;
      if (q) { q.pareja = null; q.bodaTs = null; q.parejaDesde = null; savePlayer(q); }
      p.pareja = null;
      p.bodaTs = null;
      p.parejaDesde = null;
      savePlayer(p);
      await react("💔");
      return reply(
        `💔 *Divorcio consumado.*\n` +
        `Ya no eres pareja de *${nombreQ}*.\n` +
        `💰 *-${MARRY_COSTO_DIVORCIO} oro* como tarifa de separación.`
      );
    },
  },

  // ── !verpareja ────────────────────────────────────────────────
  {
    name: "verpareja",
    alias: ["mipareja", "rpgpareja"],
    description: "Ver estado de tu matrimonio y beneficios activos",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.pareja) return reply("❌ No estás casado/a.\n_Propón con \`!merry @usuario\`._");

      const q = db.players[p.pareja];
      if (!q) { p.pareja = null; savePlayer(p); return reply("❌ Tu pareja ya no existe. El matrimonio fue disuelto."); }

      const bonus = marriageBonus(p);
      const diasJuntos = Math.floor((Date.now() - (p.bodaTs || Date.now())) / 86400000);
      const mision = getMarryMision(p);
      const mDef   = MARRY_MISIONES.find(m => m.id === mision.id);

      await react("💍");
      return reply(
        `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃   💍 *ESTADO DE PAREJA*   ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `💑 *${p.nombre}* & *${q.nombre}*\n` +
        `📅 Juntos desde hace *${diasJuntos}* día(s)\n\n` +
        `╭─〔 💪 *BONUS ACTIVO* 〕\n` +
        `│ ${bonus.activo ? "✅ Activo" : "❌ Inactivo (exploren el mismo día)"}\n` +
        (bonus.activo ? `│ ⚔️ +${bonus.atk} ATK | 🛡️ +${bonus.def} DEF\n` : "") +
        `╰──────────────────────⬣\n\n` +
        `╭─〔 📋 *MISIÓN HOY* 〕\n` +
        `│ ${mDef?.desc || "—"}\n` +
        `│ Progreso: *${mision.progreso}/${mDef?.meta || "?"}*  ${mision.completada ? "✅" : "⏳"}\n` +
        `╰──────────────────────⬣\n\n` +
        `_Comandos: \`!darpro\` · \`!misionpareja\` · \`!revivirpareja\` · \`!divorcio\`_`
      );
    },
  },

  // ── !darpro [cantidad] [oro/gemas] ────────────────────────────
  {
    name: "darpro",
    alias: ["transferirpareja", "gifpareja"],
    description: "Transferir oro o gemas a tu pareja — !darpro [cantidad] [oro/gemas]",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, args, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.pareja) return reply("❌ No estás casado/a.");

      const cantidad = parseInt(args[0]);
      const tipo = (args[1] || "oro").toLowerCase();
      if (!cantidad || cantidad <= 0) return reply("❌ Indica una cantidad válida. Ej: `!darpro 500 oro`");
      if (!["oro", "gemas"].includes(tipo)) return reply("❌ Elige `oro` o `gemas`.");

      // Cooldown transferencia
      const ahora = Date.now();
      if (!p._merryTransferTs) p._merryTransferTs = 0;
      if (ahora - p._merryTransferTs < MARRY_TRANSFER_CD) {
        const min = Math.ceil((MARRY_TRANSFER_CD - (ahora - p._merryTransferTs)) / 60000);
        return reply(`⏳ Cooldown de transferencia: *${min} min* restantes.`);
      }

      const q = db.players[p.pareja];
      if (!q) { p.pareja = null; savePlayer(p); return reply("❌ Tu pareja ya no existe."); }

      if (tipo === "oro") {
        if (p.oro < cantidad) return reply(`❌ No tienes suficiente oro. Tienes *${p.oro}* 💰.`);
        p.oro  -= cantidad;
        q.oro  = (q.oro  || 0) + cantidad;
      } else {
        if ((p.gemas || 0) < cantidad) return reply(`❌ No tienes suficiente gemas. Tienes *${p.gemas || 0}* 💎.`);
        p.gemas = (p.gemas || 0) - cantidad;
        q.gemas = (q.gemas || 0) + cantidad;
      }

      p._merryTransferTs = ahora;
      // Progreso misión
      if (tipo === "oro") {
        const mm = getMarryMision(p);
        if (mm.id === "oro500" && !mm.completada) { mm.progreso = Math.min(mm.progreso + cantidad, 500); if (mm.progreso >= 500) mm.completada = true; p._merryMision = mm; }
        const mm2 = getMarryMision(q);
        if (mm2.id === "oro500" && !mm2.completada) { mm2.progreso = Math.min(mm2.progreso + cantidad, 500); if (mm2.progreso >= 500) mm2.completada = true; q._merryMision = mm2; }
      }
      savePlayer(p);
      savePlayer(q);
      await react("💌");
      return reply(
        `💌 *¡Transferencia enviada!*\n` +
        `━━━━━━━━━━━━━━\n` +
        `${tipo === "oro" ? "💰" : "💎"} *${cantidad} ${tipo}* → *${q.nombre}*\n` +
        (tipo === "oro" ? `💰 Tu oro: *${p.oro}*` : `💎 Tus gemas: *${p.gemas}*`) + `\n` +
        `⏳ Próxima transferencia en *1 hora*.`
      );
    },
  },

  // ── !misionpareja ─────────────────────────────────────────────
  {
    name: "misionpareja",
    alias: ["misionboda", "rpgmisionpareja"],
    description: "Ver misión diaria de pareja y reclamar recompensa",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.pareja) return reply("❌ No estás casado/a.");

      const q = db.players[p.pareja];
      if (!q) { p.pareja = null; savePlayer(p); return reply("❌ Tu pareja ya no existe."); }

      const mm  = getMarryMision(p);
      const mmQ = getMarryMision(q);
      const def = MARRY_MISIONES.find(m => m.id === mm.id);
      if (!def) return reply("❌ Error de misión. Intenta mañana.");

      // Reclamar si ambos completaron
      if (mm.completada && mmQ.completada) {
        if (mm.reclamada) return reply("✅ Ya reclamaste la recompensa de hoy.");
        const { recompensa } = def;
        if (recompensa.oro)   { p.oro   = (p.oro   || 0) + recompensa.oro;   q.oro   = (q.oro   || 0) + recompensa.oro; }
        if (recompensa.gemas) { p.gemas = (p.gemas || 0) + recompensa.gemas; q.gemas = (q.gemas || 0) + recompensa.gemas; }
        if (recompensa.exp)   { addExp(p, recompensa.exp); addExp(q, recompensa.exp); }
        mm.reclamada  = true;
        mmQ.reclamada = true;
        p._merryMision = mm;
        q._merryMision = mmQ;
        savePlayer(p);
        savePlayer(q);
        await react("🎉");
        return reply(
          `🎉 *¡Misión de pareja completada!*\n` +
          `━━━━━━━━━━━━━━\n` +
          `📋 *${def.desc}*\n\n` +
          `🏆 Recompensa para ambos:\n` +
          (recompensa.oro   ? `💰 *+${recompensa.oro} oro*\n`   : "") +
          (recompensa.gemas ? `💎 *+${recompensa.gemas} gemas*\n` : "") +
          (recompensa.exp   ? `⭐ *+${recompensa.exp} EXP*\n`    : "")
        );
      }

      await react("📋");
      return reply(
        `╭─〔 📋 *MISIÓN DE PAREJA* 〕\n` +
        `│ ${def.desc}\n` +
        `│\n` +
        `│ *${p.nombre}:* ${mm.progreso}/${def.meta} ${mm.completada ? "✅" : "⏳"}\n` +
        `│ *${q.nombre}:* ${mmQ.progreso}/${def.meta} ${mmQ.completada ? "✅" : "⏳"}\n` +
        `╰──────────────────────⬣\n\n` +
        `🏆 Recompensa: ` +
        (def.recompensa.oro   ? `💰${def.recompensa.oro} ` : "") +
        (def.recompensa.gemas ? `💎${def.recompensa.gemas} ` : "") +
        (def.recompensa.exp   ? `⭐${def.recompensa.exp}` : "") + `\n` +
        `_Ambos deben completarla para reclamar._`
      );
    },
  },

  // ── !revivirpareja ────────────────────────────────────────────
  {
    name: "revivirpareja",
    alias: ["rescatarpareja", "rpgrevivirpareja"],
    description: "Gastar 40% de tu HP para revivir a tu pareja caída",
    category: "RPG ⚔️",
    freeAllowed: true,
    execute: async ({ reply, react, sender, pushName, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      if (!p.pareja) return reply("❌ No estás casado/a.");

      const q = db.players[p.pareja];
      if (!q) { p.pareja = null; savePlayer(p); return reply("❌ Tu pareja ya no existe."); }
      if (q.hp > 0) return reply(`❌ *${q.nombre}* aún está vivo/a (HP: ${q.hp}/${q.hpMax}). No necesita ser revivido/a.`);

      const costoHp = Math.floor(p.hpMax * MARRY_REVIVE_COST_PCT);
      if (p.hp <= costoHp) return reply(`❌ Necesitas al menos *${costoHp + 1} HP* para revivir a tu pareja. Tienes *${p.hp}*.`);

      p.hp -= costoHp;
      q.hp  = Math.floor(q.hpMax * 0.35); // revive con 35%
      savePlayer(p);
      savePlayer(q);
      await react("💖");
      return reply(
        `💖 *¡Reviviste a tu pareja!*\n` +
        `━━━━━━━━━━━━━━\n` +
        `❤️ *${p.nombre}* gastó *${costoHp} HP* para salvar a *${q.nombre}*.\n` +
        `✨ *${q.nombre}* revive con *${q.hp}/${q.hpMax} HP*.\n` +
        `❤️ Tu HP ahora: *${p.hp}/${p.hpMax}*`
      );
    },
  },
];

rpgCommands.push(...marriageCommands);

// ── Patch: rpgexplorar conjunto ─────────────────────────────────
// Se parchea el handler de explorar para soportar @pareja opcional
const _origExplorarIdx = rpgCommands.findIndex(c => c.name === "rpgexplorar");
if (_origExplorarIdx !== -1) {
  const _origExec = rpgCommands[_origExplorarIdx].execute;
  rpgCommands[_origExplorarIdx].execute = async (ctx) => {
    const { reply, react, sender, msg, pushName, args } = ctx;
    const p = getPlayer(sender, pushName || msg?.pushName || null);

    // Si hay mención y hay pareja, intentar exploración conjunta
    const mentioned = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const targetId  = mentioned[0];

    if (targetId && p.pareja && targetId === p.pareja) {
      // Exploración conjunta
      const q = db.players[p.pareja];
      if (!q || !q.clase) return reply("❌ Tu pareja no tiene personaje.");
      if (p.hp <= 0) return reply("❌ Estás muerto/a. Usa `!rpgdescansar`.");
      if (q.hp <= 0) return reply(`❌ *${q.nombre}* está muerto/a y no puede explorar.`);

      const zonaNombre = (args[0] || "bosque").toLowerCase();
      const zona = ZONAS[zonaNombre];
      if (!zona) return reply("❌ Zona inválida. Usa: bosque, cueva, castillo, volcan, abismo");
      if (p.nivel < zona.nivel) return reply(`❌ Necesitas nivel *${zona.nivel}* para entrar.`);

      const ahora = Date.now();
      if (ahora - p.ultimaExploracion < CD_EXPLORACION) {
        const rest = Math.ceil((CD_EXPLORACION - (ahora - p.ultimaExploracion)) / 60000);
        return reply(`⏳ Espera *${rest} min* antes de explorar de nuevo.`);
      }
      if (ahora - q.ultimaExploracion < CD_EXPLORACION) {
        const rest = Math.ceil((CD_EXPLORACION - (ahora - q.ultimaExploracion)) / 60000);
        return reply(`⏳ *${q.nombre}* aún tiene cooldown: *${rest} min*.`);
      }

      await react("💑");

      const bonus = marriageBonus(p);
      const enemigoBase = zona.enemigos[Math.floor(Math.random() * zona.enemigos.length)];
      const bonusTerr   = getBonusTerritorio(p);
      const multTerrOro = 1 + (bonusTerr.oro || 0) + (bonusTerr.all || 0);
      const multTerrExp = 1 + (bonusTerr.exp || 0) + (bonusTerr.all || 0);

      // ATK combinado — ambos atacan
      const atkTotal = getTotalAtk(p) + bonus.atk + getTotalAtk(q) + marriageBonus(q).atk;
      const defTotal = Math.floor((getTotalDef(p) + bonus.def + getTotalDef(q) + marriageBonus(q).def) / 2);

      const hpEnemigo = enemigoBase.hp;
      const gano = atkTotal > enemigoBase.def * 1.5 || Math.random() > 0.25;

      p.ultimaExploracion = ahora;
      q.ultimaExploracion = ahora;

      if (gano) {
        const oroBase = Math.floor(enemigoBase.oro * 1.3 * multTerrOro); // 30% extra conjunta
        const oroP    = Math.floor(oroBase / 2);
        const oroQ    = oroBase - oroP;
        const expBase = Math.floor(enemigoBase.exp * 1.3 * multTerrExp);

        p.oro += oroP; q.oro += oroQ;
        p.hp   = Math.max(1, p.hp - Math.floor(Math.random() * 10));
        q.hp   = Math.max(1, q.hp - Math.floor(Math.random() * 10));
        addExp(p, expBase); addExp(q, expBase);
        p.stats.exploraciones++; q.stats.exploraciones++;
        p.stats.enemigosKill++;  q.stats.enemigosKill++;

        // Drop compartido — puede caer para cualquiera
        const drop = calcularDrop(zonaNombre, Math.max(p.nivel, q.nivel), 1.2);
        let dropTexto = "";
        if (drop) {
          const receptor = Math.random() < 0.5 ? p : q;
          receptor.inventario[drop.itemId] = (receptor.inventario[drop.itemId] || 0) + 1;
          dropTexto = `\n🎁 *Drop para ${receptor.nombre}:* ${drop.item.emoji} *${drop.item.nombre}*`;
        }

        // Progreso misión pareja
        const mmP = getMarryMision(p);
        const mmQ = getMarryMision(q);
        if (mmP.id === "explorar2" && !mmP.completada) { mmP.progreso = Math.min(mmP.progreso + 1, 2); if (mmP.progreso >= 2) mmP.completada = true; p._merryMision = mmP; }
        if (mmQ.id === "explorar2" && !mmQ.completada) { mmQ.progreso = Math.min(mmQ.progreso + 1, 2); if (mmQ.progreso >= 2) mmQ.completada = true; q._merryMision = mmQ; }
        if (mmP.id === "kills10"   && !mmP.completada) { mmP.progreso = Math.min(mmP.progreso + 1, 10); if (mmP.progreso >= 10) mmP.completada = true; p._merryMision = mmP; }
        if (mmQ.id === "kills10"   && !mmQ.completada) { mmQ.progreso = Math.min(mmQ.progreso + 1, 10); if (mmQ.progreso >= 10) mmQ.completada = true; q._merryMision = mmQ; }

        savePlayer(p); savePlayer(q);
        avanzarMisionClan(sender, "exploraciones"); avanzarMisionClan(sender, "kills");
        avanzarMisionClan(p.pareja, "exploraciones"); avanzarMisionClan(p.pareja, "kills");

        return reply(
          `💑 *EXPLORACIÓN EN PAREJA — ${zona.nombre}*\n` +
          `━━━━━━━━━━━━━━\n` +
          `${enemigoBase.emoji} *${enemigoBase.nombre}* derrotado\n` +
          (bonus.activo ? `💪 *Bonus pareja activo (+5% ATK/DEF)*\n` : "") +
          `\n🏆 *¡VICTORIA!*\n` +
          `💰 *${p.nombre}* +${oroP} oro | *${q.nombre}* +${oroQ} oro\n` +
          `⭐ Ambos +${expBase} EXP\n` +
          dropTexto
        );
      } else {
        p.hp = Math.floor(p.hpMax * 0.2);
        q.hp = Math.floor(q.hpMax * 0.2);
        savePlayer(p); savePlayer(q);
        return reply(
          `💑 *EXPLORACIÓN EN PAREJA — ${zona.nombre}*\n` +
          `━━━━━━━━━━━━━━\n` +
          `⚠️ *Fueron derrotados por ${enemigoBase.emoji} ${enemigoBase.nombre}.*\n` +
          `❤️ Ambos quedan con HP bajo. Usen \`!rpgdescansar\`.`
        );
      }
    }

    // Sin pareja mencionada → exploración normal
    return _origExec(ctx);
  };
}

// ── Patch: rpgperfil — mostrar título de pareja ─────────────────
const _origPerfilIdx = rpgCommands.findIndex(c => c.name === "rpgperfil");
if (_origPerfilIdx !== -1) {
  const _origPerfilExec = rpgCommands[_origPerfilIdx].execute;
  rpgCommands[_origPerfilIdx].execute = async (ctx) => {
    // Inyectar campo pareja en el texto de perfil via monkey-patch reply
    const { reply: origReply, sender, msg } = ctx;
    const mentioned = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || sender;
    const tp = db.players[target];

    const patchedReply = (text) => {
      if (tp?.pareja && typeof text === "string") {
        const qp = db.players[tp.pareja];
        const nombre = qp?.nombre || tp.pareja.split("@")[0];
        // Insertar antes de "━━━ EQUIPO" o al final del encabezado
        text = text.replace(
          /(\n━━━ EQUIPO)/,
          `\n💍 Pareja: *${nombre}*$1`
        );
        // Si no hubo match (visual card fallback), simplemente no importa
      }
      return origReply(text);
    };

    return _origPerfilExec({ ...ctx, reply: patchedReply });
  };
}

// ═══════════════════════════════════════════════════════════════
//   !exparmadura — Dungeon de Armaduras (multijugador, 3 etapas)
// ═══════════════════════════════════════════════════════════════

const EXPARMADURA_SALAS = new Map(); // groupJid -> sala

const EA_ENEMIGOS = [
  { nombre: "Golem de Piedra",    emoji: "🪨", hp: 380, atk: 38, def: 22 },
  { nombre: "Guardián de Hierro", emoji: "⚙️", hp: 420, atk: 42, def: 28 },
  { nombre: "Centinela Arcano",   emoji: "🔮", hp: 460, atk: 48, def: 30 },
];

const EA_BOSS = {
  nombre: "Armiger Oscuro", emoji: "🛡️👹", hp: 900, atk: 65, def: 40,
  desc: "Guardián final de la cripta. Sus armaduras absorben el daño.",
};

// Pool de recompensas por tier
const EA_RECOMPENSAS = {
  ssr:        { prob: 0.05,  label: "🌟 [SSR]" },
  legendario: { prob: 0.10,  label: "🟠 [Legendario]" },
  epico:      { prob: 0.20,  label: "🟣 [Épico]" },
  raro:       { prob: 0.35,  label: "🔵 [Raro]" },
  comun:      { prob: 1.00,  label: "⚪ [Común]" },
};

const EA_ARMADURAS_POOL = {
  ssr:        ["peto_caballero_oscuro"],                            // BANNER_ARMADURA_SSR ids
  legendario: ["armadura_dragon"],
  epico:      ["armadura_runa", "armadura_acero", "manto_sombra"],
  raro:       ["armadura_hierro", "cota_malla"],
  comun:      ["armadura_hierro"],
};

function ea_rollArmadura(player) {
  const roll = Math.random();
  let tier;
  if      (roll < EA_RECOMPENSAS.ssr.prob)        tier = "ssr";
  else if (roll < EA_RECOMPENSAS.legendario.prob)  tier = "legendario";
  else if (roll < EA_RECOMPENSAS.epico.prob)       tier = "epico";
  else if (roll < EA_RECOMPENSAS.raro.prob)        tier = "raro";
  else                                              tier = "comun";

  const pool = EA_ARMADURAS_POOL[tier];
  const id   = pool[Math.floor(Math.random() * pool.length)];
  return { tier, id };
}

function ea_darArmadura(player, id, tier) {
  if (tier === "ssr") {
    // Es SSR del banner — va a _ssrItems
    if (!player._ssrItems) player._ssrItems = {};
    const ssrKey = "ssr_armadura_banner_" + id;
    player._ssrItems[ssrKey] = { ...BANNER_ARMADURA_SSR[id] };
    return ssrKey;
  } else {
    // Va al inventario normal
    if (!player.inventario) player.inventario = {};
    player.inventario[id] = (player.inventario[id] || 0) + 1;
    return id;
  }
}

function ea_calcDmg(atacante, defensorDef) {
  const atk    = (getTotalAtk ? getTotalAtk(atacante) : (atacante.atk || 50)) + Math.floor(Math.random() * 15);
  const dmg    = Math.max(1, atk - defensorDef + Math.floor(Math.random() * 10));
  const esCrit = Math.random() * 100 < (atacante.crit || 5);
  return { dmg: esCrit ? Math.floor(dmg * 1.5) : dmg, esCrit };
}

function ea_habilidad(player) {
  const clase = CLASES[player.clase];
  const hab   = clase ? Object.values(HABILIDADES || {}).find(h => h.clase === player.clase) : null;
  const mult  = hab ? (hab.multiplicador || 1.5) : 1.3;
  const atk   = (getTotalAtk ? getTotalAtk(player) : (player.atk || 50));
  return { dmg: Math.floor(atk * mult), nombre: hab?.nombre || "Habilidad" };
}

// Importar BANNER_ARMADURA_SSR si no está disponible globalmente en este scope
import { BANNER_ARMADURA_SSR as _EA_BANNER_ARMADURA_SSR, getItemsDeClase, saveDB } from "../lib/rpg-database.js";
const BANNER_ARMADURA_SSR = _EA_BANNER_ARMADURA_SSR;

const expArmaduraCommands = [
  {
    name: "exparmadura",
    alias: ["exploarmadura", "dungeonarmadura"],
    description: "Dungeon de armaduras (hasta 3 jugadores, 3 etapas, boss final)",
    category: "RPG ⚔️",
    groupOnly: true,
    execute: async (ctx) => {
      const { reply, sender, from, sock, msg, args, isGroup, mentioned } = ctx;
      const hoy = new Date().toDateString();

      if (!isGroup) return reply("⚔️ Este modo solo funciona en grupos.");

      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG. Usa `!rpgcrear`.");

      const sub = (args[0] || "").toLowerCase();

      // ── INICIAR / INVITAR ─────────────────────────────────────
      if (!sub || mentioned.length) {
        // Verificar intentos diarios
        if (!p._eaDungeon) p._eaDungeon = { dia: "", intentos: 0 };
        if (p._eaDungeon.dia !== hoy) { p._eaDungeon.dia = hoy; p._eaDungeon.intentos = 0; }
        if (p._eaDungeon.intentos >= 3)
          return reply("⏳ Ya usaste tus *3 intentos diarios* de la Dungeon de Armaduras.\nVuelve mañana.");

        if (EXPARMADURA_SALAS.has(from))
          return reply("⚠️ Ya hay una sala activa en este grupo. Usa `!exparmadura aceptar` para unirte.");

        // Crear sala
        const sala = {
          lider: sender,
          jugadores: [sender],
          invitados: mentioned.filter(j => j !== sender),
          etapa: 0,       // 0 = sala abierta, 1-3 = etapas
          fase: "espera", // espera | combate | fin
          enemigo: null,
          turno: {},      // jid -> "atacar"|"habilidad"|null
          creada: Date.now(),
        };
        EXPARMADURA_SALAS.set(from, sala);

        let texto = `🛡️ *DUNGEON DE ARMADURAS* 🛡️\n━━━━━━━━━━━━━━\n👑 Líder: *${p.nombre}*\n👥 Jugadores: 1/3\n\n`;
        if (sala.invitados.length) {
          texto += `📨 Invitados:\n`;
          for (const jid of sala.invitados) {
            const ip = db.players[jid];
            texto += `  • ${ip?.nombre || jid.split("@")[0]}\n`;
          }
          texto += `\n✅ Usa \`!exparmadura aceptar\` para unirte.\n`;
        }
        texto += `\n🗡️ Cuando estés listo: \`!exparmadura avanzar\`\n_Sala expira en 3 minutos._`;

        // Auto-expirar sala tras 3 min
        setTimeout(() => {
          if (EXPARMADURA_SALAS.has(from)) {
            const s = EXPARMADURA_SALAS.get(from);
            if (s.fase === "espera") {
              EXPARMADURA_SALAS.delete(from);
              sock.sendMessage(from, { text: "⏰ La sala de *Dungeon de Armaduras* expiró por inactividad." });
            }
          }
        }, 180_000);

        return reply(texto);
      }

      // ── ACEPTAR INVITACIÓN ────────────────────────────────────
      if (sub === "aceptar") {
        const sala = EXPARMADURA_SALAS.get(from);
        if (!sala) return reply("❌ No hay sala activa. Usa `!exparmadura` para crear una.");
        if (sala.fase !== "espera") return reply("❌ La dungeon ya comenzó.");
        if (sala.jugadores.includes(sender)) return reply("⚠️ Ya estás en la sala.");
        if (sala.jugadores.length >= 3) return reply("❌ La sala está llena (3/3).");

        if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");

        // Verificar intentos
        if (!p._eaDungeon) p._eaDungeon = { dia: "", intentos: 0 };
        if (p._eaDungeon.dia !== hoy) { p._eaDungeon.dia = hoy; p._eaDungeon.intentos = 0; }
        if (p._eaDungeon.intentos >= 3)
          return reply(`⏳ *${p.nombre}* ya usó sus 3 intentos diarios.`);

        sala.jugadores.push(sender);
        const nombres = sala.jugadores.map(j => db.players[j]?.nombre || j.split("@")[0]).join(", ");
        return reply(`✅ *${p.nombre}* se unió a la sala.\n👥 Jugadores (${sala.jugadores.length}/3): ${nombres}\n\n🗡️ Líder, usa \`!exparmadura avanzar\` cuando estén listos.`);
      }

      // ── AVANZAR (solo líder) ──────────────────────────────────
      if (sub === "avanzar") {
        const sala = EXPARMADURA_SALAS.get(from);
        if (!sala) return reply("❌ No hay sala activa.");
        if (sala.lider !== sender) return reply("❌ Solo el líder puede avanzar.");

        if (sala.fase === "combate")
          return reply("⚔️ Hay un combate en curso. Todos deben usar `!exparmadura atacar` o `!exparmadura habilidad`.");

        sala.etapa++;
        if (sala.etapa > 3) {
          EXPARMADURA_SALAS.delete(from);
          return reply("✅ Ya completaron todas las etapas.");
        }

        // Configurar enemigo
        const esDef = sala.etapa === 3;
        const base  = esDef ? { ...EA_BOSS } : { ...EA_ENEMIGOS[sala.etapa - 1] };
        // Escalar HP según número de jugadores
        base.hpActual = Math.floor(base.hp * (1 + (sala.jugadores.length - 1) * 0.4));
        sala.enemigo  = base;
        sala.fase     = "combate";
        sala.turno    = {};

        const nombres = sala.jugadores.map(j => db.players[j]?.nombre || j.split("@")[0]).join(", ");
        let txt = `⚔️ *ETAPA ${sala.etapa}/3*${esDef ? " — ¡BOSS!" : ""}\n━━━━━━━━━━━━━━\n`;
        txt += `${base.emoji} *${base.nombre}*\n`;
        txt += `❤️ HP: ${base.hpActual} | ⚔️ ATK: ${base.atk} | 🛡️ DEF: ${base.def}\n\n`;
        if (esDef) txt += `_"${base.desc}"_\n\n`;
        txt += `👥 Partido: ${nombres}\n\n`;
        txt += `Todos usen:\n• \`!exparmadura atacar\` — Ataque normal\n• \`!exparmadura habilidad\` — Habilidad de clase (más daño)`;
        return sock.sendMessage(from, { text: txt }, { quoted: msg });
      }

      // ── ATACAR / HABILIDAD ────────────────────────────────────
      if (sub === "atacar" || sub === "habilidad") {
        const sala = EXPARMADURA_SALAS.get(from);
        if (!sala) return reply("❌ No hay sala activa.");
        if (sala.fase !== "combate") return reply("⚠️ No hay combate en curso.");
        if (!sala.jugadores.includes(sender)) return reply("❌ No estás en esta sala.");
        if (sala.turno[sender]) return reply("⏳ Ya elegiste tu acción. Esperando a los demás...");

        sala.turno[sender] = sub;

        const pendientes = sala.jugadores.filter(j => !sala.turno[j]);
        if (pendientes.length > 0) {
          const nomPend = pendientes.map(j => db.players[j]?.nombre || j.split("@")[0]).join(", ");
          return reply(`✅ Acción registrada. Esperando: *${nomPend}*`);
        }

        // ── RESOLVER TURNO (todos actuaron) ──────────────────────
        const enemigo = sala.enemigo;
        let resumen   = `⚔️ *RESULTADO DEL TURNO — Etapa ${sala.etapa}/3*\n━━━━━━━━━━━━━━\n`;

        let dmgTotal = 0;
        for (const jid of sala.jugadores) {
          const jp     = db.players[jid];
          const accion = sala.turno[jid];
          let dmg, esCrit, nombreAtk;

          if (accion === "habilidad") {
            const res = ea_habilidad(jp);
            dmg = Math.max(1, res.dmg - Math.floor(enemigo.def * 0.5));
            esCrit = false;
            nombreAtk = res.nombre;
          } else {
            const res = ea_calcDmg(jp, enemigo.def);
            dmg    = res.dmg;
            esCrit = res.esCrit;
            nombreAtk = "Ataque";
          }
          dmgTotal += dmg;
          resumen  += `• *${jp.nombre}* [${nombreAtk}]: ${dmg} dmg${esCrit ? " 💥CRIT" : ""}\n`;
        }

        enemigo.hpActual = Math.max(0, enemigo.hpActual - dmgTotal);
        resumen += `\n🗡️ Daño total: *${dmgTotal}*\n`;
        resumen += `${enemigo.emoji} HP restante: *${enemigo.hpActual}*\n`;

        // Contraataque del enemigo
        let dmgEnemy = Math.max(1, enemigo.atk - Math.floor(Math.random() * 10));
        resumen += `\n🔴 *${enemigo.nombre}* contraataca: ${dmgEnemy} dmg (dividido)\n`;

        // ── VICTORIA ─────────────────────────────────────────────
        if (enemigo.hpActual <= 0) {
          resumen += `\n✅ *¡${enemigo.nombre} derrotado!*\n━━━━━━━━━━━━━━\n`;

          if (sala.etapa === 3) {
            // BOSS caído — dar recompensas
            resumen += `🎉 *¡DUNGEON COMPLETADA!*\n\n🎁 *Recompensas:*\n`;
            for (const jid of sala.jugadores) {
              const jp = db.players[jid];
              const { tier, id } = ea_rollArmadura(jp);
              const itemKey = ea_darArmadura(jp, id, tier);
              const label   = EA_RECOMPENSAS[tier].label;
              const itemData = tier === "ssr"
                ? BANNER_ARMADURA_SSR[id]
                : TIENDA[id];
              const nombre  = itemData?.nombre || id;

              // Descontar intento diario
              if (!jp._eaDungeon) jp._eaDungeon = { dia: hoy, intentos: 0 };
              if (jp._eaDungeon.dia !== hoy) { jp._eaDungeon.dia = hoy; jp._eaDungeon.intentos = 0; }
              jp._eaDungeon.intentos++;

              savePlayer(jp);
              resumen += `• *${jp.nombre}*: ${label} ${itemData?.emoji || "🛡️"} *${nombre}*\n`;
            }
            EXPARMADURA_SALAS.delete(from);
            resumen += `\n_Intentos restantes hoy: ver con_ \`!exparmadura intentos\``;
          } else {
            resumen += `\n▶️ Usa \`!exparmadura avanzar\` para continuar a la etapa ${sala.etapa + 1}.`;
            sala.fase  = "espera";
            sala.turno = {};
          }

        } else {
          // Continuar combate
          sala.turno = {};
          resumen += `\n▶️ Todos usen \`!exparmadura atacar\` o \`!exparmadura habilidad\` de nuevo.`;
        }

        return sock.sendMessage(from, { text: resumen }, { quoted: msg });
      }

      // ── INTENTOS ──────────────────────────────────────────────
      if (sub === "intentos") {
        if (!p._eaDungeon) p._eaDungeon = { dia: "", intentos: 0 };
        if (p._eaDungeon.dia !== hoy) { p._eaDungeon.dia = hoy; p._eaDungeon.intentos = 0; }
        const restantes = 3 - p._eaDungeon.intentos;
        return reply(`🛡️ *Dungeon de Armaduras*\n⏳ Intentos restantes hoy: *${restantes}/3*`);
      }

      // ── SALIR ─────────────────────────────────────────────────
      if (sub === "salir" || sub === "cancelar") {
        const sala = EXPARMADURA_SALAS.get(from);
        if (!sala) return reply("❌ No hay sala activa.");
        if (sala.lider !== sender) return reply("❌ Solo el líder puede cancelar la sala.");
        EXPARMADURA_SALAS.delete(from);
        return reply("🚪 Sala de Dungeon de Armaduras cancelada.");
      }

      // ── AYUDA ─────────────────────────────────────────────────
      return reply(
        `🛡️ *DUNGEON DE ARMADURAS*\n━━━━━━━━━━━━━━\n` +
        `• \`!exparmadura\` — Crear sala\n` +
        `• \`!exparmadura @usuario\` — Invitar jugadores\n` +
        `• \`!exparmadura aceptar\` — Unirse a sala\n` +
        `• \`!exparmadura avanzar\` — Avanzar etapa (líder)\n` +
        `• \`!exparmadura atacar\` — Atacar en combate\n` +
        `• \`!exparmadura habilidad\` — Usar habilidad de clase\n` +
        `• \`!exparmadura intentos\` — Ver intentos restantes\n` +
        `• \`!exparmadura salir\` — Cancelar sala (líder)\n\n` +
        `📌 3 intentos diarios | 3 etapas | hasta 3 jugadores\n` +
        `🎁 Boss final dropea armaduras hasta SSR`
      );
    },
  },
];

rpgCommands.push(...expArmaduraCommands);

// ═══════════════════════════════════════════════════════════════
//   SISTEMA DE JEFES MUNDIALES
//   !jefemundial | !jefemundialatacar [nombre]
// ═══════════════════════════════════════════════════════════════

const JM_RESPAWN_MS = 72 * 60 * 60 * 1000; // 72 horas
const JM_CD_ATAQUE  = 5 * 60 * 1000;        // 5 min cooldown por jugador por jefe

const JEFES_MUNDIALES_DEF = [
  {
    id: "asharot",
    nombre: "Asharot el Caído",
    emoji: "👹",
    desc: "Señor de la oscuridad eterna. Su sola presencia corrompe el mundo.",
    hpMax: 500_000,
    atk: 800,
    recompensa: { oro: 5000, gemas: 150, item: "pocion_superior", cantidad: 3 },
  },
  {
    id: "leviatán",
    nombre: "Leviatán Abismal",
    emoji: "🌊",
    desc: "Serpiente primordial que duerme en las profundidades del mundo.",
    hpMax: 420_000,
    atk: 700,
    recompensa: { oro: 4000, gemas: 120, item: "pocion_superior", cantidad: 2 },
  },
  {
    id: "moloch",
    nombre: "Moloch el Devorador",
    emoji: "🔥",
    desc: "Dios del fuego y la destrucción. Consume todo a su paso.",
    hpMax: 380_000,
    atk: 680,
    recompensa: { oro: 3500, gemas: 100, item: "pocion_mayor", cantidad: 3 },
  },
  {
    id: "valkiria",
    nombre: "Valkiria Maldita",
    emoji: "⚡",
    desc: "Guerrera celestial corrompida. Fue enviada a juzgar y se quedó a reinar.",
    hpMax: 350_000,
    atk: 650,
    recompensa: { oro: 3000, gemas: 90, item: "pocion_mayor", cantidad: 2 },
  },
  {
    id: "kronos",
    nombre: "Kronos el Eterno",
    emoji: "⌛",
    desc: "Señor del tiempo. Cada segundo que pasa lo hace más poderoso.",
    hpMax: 300_000,
    atk: 600,
    recompensa: { oro: 2500, gemas: 80, item: "pocion_vida2", cantidad: 2 },
  },
];

// Estado en memoria — se persiste en db.jefes_mundiales
function getJMState() {
  if (!db.jefes_mundiales) {
    db.jefes_mundiales = {};
    for (const def of JEFES_MUNDIALES_DEF) {
      db.jefes_mundiales[def.id] = {
        hpActual: def.hpMax,
        vivo: true,
        ultimoRespawn: Date.now(),
        proximoRespawn: null,
        participantes: {}, // jid -> { dmgTotal, ultimoAtaque }
        golpeFinal: null,
      };
    }
    saveDB();
  }
  return db.jefes_mundiales;
}

// Verificar respawn de todos los jefes
async function jm_checkRespawn() {
  const state = getJMState();
  const ahora = Date.now();
  let huboRespawn = false;

  for (const def of JEFES_MUNDIALES_DEF) {
    const s = state[def.id];
    if (!s.vivo && s.proximoRespawn && ahora >= s.proximoRespawn) {
      s.hpActual       = def.hpMax;
      s.vivo           = true;
      s.ultimoRespawn  = ahora;
      s.proximoRespawn = null;
      s.participantes  = {};
      s.golpeFinal     = null;
      huboRespawn      = true;

      // Anunciar a todos los grupos
      const txt =
        `🌍 *¡JEFE MUNDIAL APARECIDO!*\n` +
        `━━━━━━━━━━━━━━\n` +
        `${def.emoji} *${def.nombre}*\n` +
        `_"${def.desc}"_\n\n` +
        `❤️ HP: *${def.hpMax.toLocaleString()}*\n\n` +
        `⚔️ Usa \`!jefemundialatacar ${def.id}\` para atacarlo.\n` +
        `👑 ¡Quien dé el golpe final recibe el título *Cazador Mundial*!`;
      broadcastGrupos(txt).catch(() => {});
    }
  }

  if (huboRespawn) saveDB();
}

// Iniciar el loop de respawn (cada 5 min revisa)
setInterval(jm_checkRespawn, 5 * 60 * 1000);

const jefeMundialCommands = [
  // ── !jefemundial — Ver todos los jefes ──────────────────────
  {
    name: "jefemundial",
    alias: ["jefesmundiales", "bossmundial"],
    description: "Ver el estado de todos los Jefes Mundiales",
    category: "RPG ⚔️",
    execute: async ({ reply }) => {
      await jm_checkRespawn();
      const state = getJMState();
      const ahora = Date.now();
      let txt = `🌍 *JEFES MUNDIALES*\n━━━━━━━━━━━━━━\n`;

      for (const def of JEFES_MUNDIALES_DEF) {
        const s = state[def.id];
        const pct = Math.floor((s.hpActual / def.hpMax) * 100);
        const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));

        if (s.vivo) {
          txt += `${def.emoji} *${def.nombre}*\n`;
          txt += `  ❤️ HP: ${s.hpActual.toLocaleString()} / ${def.hpMax.toLocaleString()} (${pct}%)\n`;
          txt += `  [${bar}]\n`;
          txt += `  ⚔️ \`!jefemundialatacar ${def.id}\`\n\n`;
        } else {
          const resta = s.proximoRespawn - ahora;
          const horas = Math.floor(resta / 3600000);
          const mins  = Math.floor((resta % 3600000) / 60000);
          txt += `💀 *${def.nombre}* — Derrotado\n`;
          txt += `  ⏳ Reaparece en: *${horas}h ${mins}m*\n\n`;
        }
      }
      return reply(txt);
    },
  },

  // ── !jefemundialatacar [id] ──────────────────────────────────
  {
    name: "jefemundialatacar",
    alias: ["atacarjefemundial", "jmatacar"],
    description: "Atacar un Jefe Mundial. Uso: !jefemundialatacar [id]",
    category: "RPG ⚔️",
    execute: async ({ reply, sender, args, sock, from, msg }) => {
      await jm_checkRespawn();
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");

      const idBuscar = (args[0] || "").toLowerCase().trim();
      if (!idBuscar) {
        const lista = JEFES_MUNDIALES_DEF.map(d => `• \`${d.id}\` ${d.emoji} ${d.nombre}`).join("\n");
        return reply(`⚔️ Especifica un jefe:\n${lista}`);
      }

      const def = JEFES_MUNDIALES_DEF.find(d =>
        d.id === idBuscar || d.nombre.toLowerCase().includes(idBuscar)
      );
      if (!def) return reply(`❌ Jefe no encontrado. Usa \`!jefemundial\` para ver la lista.`);

      const state = getJMState();
      const s     = state[def.id];

      if (!s.vivo) {
        const resta = s.proximoRespawn - Date.now();
        const horas = Math.floor(resta / 3600000);
        const mins  = Math.floor((resta % 3600000) / 60000);
        return reply(`💀 *${def.nombre}* ya fue derrotado.\n⏳ Reaparece en: *${horas}h ${mins}m*`);
      }

      // Cooldown por jugador
      const part   = s.participantes[sender] || { dmgTotal: 0, ultimoAtaque: 0 };
      const ahora  = Date.now();
      const cdRest = part.ultimoAtaque + JM_CD_ATAQUE - ahora;
      if (cdRest > 0) {
        const segs = Math.ceil(cdRest / 1000);
        return reply(`⏳ Puedes volver a atacar en *${segs}s*.`);
      }

      // Calcular daño
      const atk    = getTotalAtk(p) + Math.floor(Math.random() * 50);
      const esCrit = Math.random() * 100 < (p.crit || 5);
      let dmg      = Math.max(100, atk * 8 + Math.floor(Math.random() * 500));
      if (esCrit) dmg = Math.floor(dmg * 1.5);
      dmg = Math.min(dmg, s.hpActual); // no pasar de la vida actual

      // Aplicar daño global
      s.hpActual -= dmg;
      part.dmgTotal    = (part.dmgTotal || 0) + dmg;
      part.ultimoAtaque = ahora;
      s.participantes[sender] = part;

      const pct = Math.max(0, Math.floor((s.hpActual / def.hpMax) * 100));
      const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));

      // Anunciar ataque a todos los grupos
      const anuncio =
        `⚔️ *${p.nombre}* ataca a ${def.emoji} *${def.nombre}*!\n` +
        `💥 Daño: *${dmg.toLocaleString()}*${esCrit ? " 💥CRIT" : ""}\n` +
        `❤️ HP restante: *${s.hpActual.toLocaleString()}* [${bar}]`;
      broadcastGrupos(anuncio).catch(() => {});

      // ── GOLPE FINAL ───────────────────────────────────────────
      if (s.hpActual <= 0) {
        s.vivo           = false;
        s.hpActual       = 0;
        s.golpeFinal     = sender;
        s.proximoRespawn = ahora + JM_RESPAWN_MS;

        // Dar recompensa y título al golpe final
        p._cazadorMundial = true;
        p.oro   = (p.oro   || 0) + def.recompensa.oro;
        p.gemas = (p.gemas || 0) + def.recompensa.gemas;
        if (!p.inventario) p.inventario = {};
        p.inventario[def.recompensa.item] = (p.inventario[def.recompensa.item] || 0) + def.recompensa.cantidad;
        savePlayer(p);
        saveDB();

        const victoria =
          `🏆 *¡JEFE MUNDIAL DERROTADO!*\n` +
          `━━━━━━━━━━━━━━\n` +
          `${def.emoji} *${def.nombre}* ha caído!\n\n` +
          `👑 Golpe final: *${p.nombre}*\n` +
          `🎖️ Título desbloqueado: *🌍 Cazador Mundial*\n\n` +
          `🎁 Recompensas:\n` +
          `  💰 ${def.recompensa.oro.toLocaleString()} oro\n` +
          `  💎 ${def.recompensa.gemas} gemas\n` +
          `  🧪 ${def.recompensa.cantidad}x ${def.recompensa.item}\n\n` +
          `⏳ Reaparecerá en *72 horas*.`;
        broadcastGrupos(victoria).catch(() => {});
        return; // ya se anunció globalmente
      }

      saveDB();

      return sock.sendMessage(from, {
        text:
          `⚔️ Atacaste a ${def.emoji} *${def.nombre}*\n` +
          `💥 Daño: *${dmg.toLocaleString()}*${esCrit ? " 💥CRIT" : ""}\n` +
          `❤️ HP: *${s.hpActual.toLocaleString()}* / ${def.hpMax.toLocaleString()} (${pct}%)\n` +
          `[${bar}]\n\n` +
          `⏳ Próximo ataque en *5 minutos*.`,
      }, { quoted: msg });
    },
  },
];

rpgCommands.push(...jefeMundialCommands);


// ═══════════════════════════════════════════════════════════════
//   TIENDAS POR CLASE — Rework completo
// ═══════════════════════════════════════════════════════════════

const tiendaClaseCommands = [

  // ── !rpgtienda — Submenú principal ────────────────────────
  {
    name: "rpgtienda",
    alias: ["tiendarpg"],
    description: "Ver el submenú de tiendas del RPG",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      const clase = p?.clase || null;
      let txt =
        "🛒 *TIENDA RPG*\n" +
        "━━━━━━━━━━━━━━\n" +
        "Selecciona una tienda:\n\n" +
        "⚔️ *TIENDAS DE CLASE* (ítems exclusivos)\n";

      const clases = [
        ["guerrero",   "⚔️",  "!tiendaguerrero"],
        ["mago",       "🧙",  "!tiendamago"],
        ["arquero",    "🏹",  "!tiendaarquero"],
        ["asesino",    "🗡️", "!tiendaasesino"],
        ["sacerdote",  "✨",  "!tiendasacerdote"],
        ["paladin",    "🛡️", "!tiendapaladin"],
        ["nigromante", "💀",  "!tiendanigromante"],
        ["hombrelobo", "🐺",  "!tiendahombrelobo"],
        ["nomuerto",   "🧟",  "!tiendanomuerto"],
      ];

      for (const [c, emoji, cmd] of clases) {
        const marca = clase === c ? " ◀ *TU CLASE*" : "";
        txt += `  ${emoji} ${cmd}${marca}\n`;
      }

      txt +=
        "\n🧪 *TIENDA GENERAL* (pociones, accesorios, orbes)\n" +
        "  !rpgtiendageneral\n\n" +
        "🏅 *TIENDA DEL CLAN* (medallas)\n" +
        "  !tiendaclan";

      return reply(txt);
    },
  },

  // ── !rpgtiendageneral — Tienda original (sin armas/armaduras de clase) ──
  {
    name: "rpgtiendageneral",
    alias: ["tiendageneral"],
    description: "Tienda general: pociones, accesorios, orbes",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      const tipos = ["pocion", "pocion_buff", "accesorio", "orbe_stat", "orbe_equipo"];
      const emojis = { pocion: "🧪", pocion_buff: "✨", accesorio: "📿", orbe_stat: "🔵", orbe_equipo: "🟡" };
      let txt = `🛒 *TIENDA GENERAL*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      for (const tipo of tipos) {
        const items = Object.entries(TIENDA).filter(([, v]) => v.tipo === tipo);
        if (!items.length) continue;
        txt += `${emojis[tipo] || "🔹"} *${tipo.toUpperCase().replace("_", " ")}*\n`;
        for (const [id, item] of items) {
          txt += `  • \`${id}\` ${item.emoji} ${item.nombre} — ${item.precio}💰\n`;
        }
        txt += "\n";
      }
      txt += "💡 Compra: `!rpgcomprar [id]` | Pociones y orbes: `!rpgcomprar [id] 5` o `!rpgcomprar [id] 10`";
      return reply(txt);
    },
  },

  {
    name: "tiendaguerrero",
    alias: ["tienda_guerrero"],
    description: "Tienda exclusiva de Guerrero",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      if (p.clase !== "guerrero") return reply(`❌ Esta tienda es exclusiva para *Guerrero* ⚔️.\nTu clase es *${p.clase}*. Usa \`!rpgtienda\` para ver tu tienda.`);
      const items = getItemsDeClase("guerrero");
      if (!items.length) return reply("❌ Sin ítems disponibles para tu clase.");
      const calidadEmoji = { comun: "⚪", raro: "🔵", epico: "🟣", legendario: "🟠", mitico: "🔴" };
      let txt = `⚔️ *TIENDA GUERRERO*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      let tipoActual = "";
      for (const [id, item] of items) {
        if (item.tipo !== tipoActual) {
          tipoActual = item.tipo;
          txt += `\n⚔️ *${tipoActual.toUpperCase()}S*\n`;
        }
        const cal = calidadEmoji[item.calidad] || "⚪";
        const puedes = p.nivel >= item.nivelReq;
        txt += `  ${cal} \`${id}\` ${item.emoji} *${item.nombre}*\n`;
        txt += `     ATK:${item.atk} DEF:${item.def} | ${item.precio}💰 | Nv.${item.nivelReq}${puedes ? "" : " 🔒"}\n`;
      }
      txt += "\n💡 Compra: `!rpgcomprar [id]`";
      return reply(txt);
    },
  },
  {
    name: "tiendamago",
    alias: ["tienda_mago"],
    description: "Tienda exclusiva de Mago",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      if (p.clase !== "mago") return reply(`❌ Esta tienda es exclusiva para *Mago* 🧙.\nTu clase es *${p.clase}*. Usa \`!rpgtienda\` para ver tu tienda.`);
      const items = getItemsDeClase("mago");
      if (!items.length) return reply("❌ Sin ítems disponibles para tu clase.");
      const calidadEmoji = { comun: "⚪", raro: "🔵", epico: "🟣", legendario: "🟠", mitico: "🔴" };
      let txt = `🧙 *TIENDA MAGO*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      let tipoActual = "";
      for (const [id, item] of items) {
        if (item.tipo !== tipoActual) {
          tipoActual = item.tipo;
          txt += `\n⚔️ *${tipoActual.toUpperCase()}S*\n`;
        }
        const cal = calidadEmoji[item.calidad] || "⚪";
        const puedes = p.nivel >= item.nivelReq;
        txt += `  ${cal} \`${id}\` ${item.emoji} *${item.nombre}*\n`;
        txt += `     ATK:${item.atk} DEF:${item.def} | ${item.precio}💰 | Nv.${item.nivelReq}${puedes ? "" : " 🔒"}\n`;
      }
      txt += "\n💡 Compra: `!rpgcomprar [id]`";
      return reply(txt);
    },
  },
  {
    name: "tiendaarquero",
    alias: ["tienda_arquero"],
    description: "Tienda exclusiva de Arquero",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      if (p.clase !== "arquero") return reply(`❌ Esta tienda es exclusiva para *Arquero* 🏹.\nTu clase es *${p.clase}*. Usa \`!rpgtienda\` para ver tu tienda.`);
      const items = getItemsDeClase("arquero");
      if (!items.length) return reply("❌ Sin ítems disponibles para tu clase.");
      const calidadEmoji = { comun: "⚪", raro: "🔵", epico: "🟣", legendario: "🟠", mitico: "🔴" };
      let txt = `🏹 *TIENDA ARQUERO*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      let tipoActual = "";
      for (const [id, item] of items) {
        if (item.tipo !== tipoActual) {
          tipoActual = item.tipo;
          txt += `\n⚔️ *${tipoActual.toUpperCase()}S*\n`;
        }
        const cal = calidadEmoji[item.calidad] || "⚪";
        const puedes = p.nivel >= item.nivelReq;
        txt += `  ${cal} \`${id}\` ${item.emoji} *${item.nombre}*\n`;
        txt += `     ATK:${item.atk} DEF:${item.def} | ${item.precio}💰 | Nv.${item.nivelReq}${puedes ? "" : " 🔒"}\n`;
      }
      txt += "\n💡 Compra: `!rpgcomprar [id]`";
      return reply(txt);
    },
  },
  {
    name: "tiendaasesino",
    alias: ["tienda_asesino"],
    description: "Tienda exclusiva de Asesino",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      if (p.clase !== "asesino") return reply(`❌ Esta tienda es exclusiva para *Asesino* 🗡️.\nTu clase es *${p.clase}*. Usa \`!rpgtienda\` para ver tu tienda.`);
      const items = getItemsDeClase("asesino");
      if (!items.length) return reply("❌ Sin ítems disponibles para tu clase.");
      const calidadEmoji = { comun: "⚪", raro: "🔵", epico: "🟣", legendario: "🟠", mitico: "🔴" };
      let txt = `🗡️ *TIENDA ASESINO*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      let tipoActual = "";
      for (const [id, item] of items) {
        if (item.tipo !== tipoActual) {
          tipoActual = item.tipo;
          txt += `\n⚔️ *${tipoActual.toUpperCase()}S*\n`;
        }
        const cal = calidadEmoji[item.calidad] || "⚪";
        const puedes = p.nivel >= item.nivelReq;
        txt += `  ${cal} \`${id}\` ${item.emoji} *${item.nombre}*\n`;
        txt += `     ATK:${item.atk} DEF:${item.def} | ${item.precio}💰 | Nv.${item.nivelReq}${puedes ? "" : " 🔒"}\n`;
      }
      txt += "\n💡 Compra: `!rpgcomprar [id]`";
      return reply(txt);
    },
  },
  {
    name: "tiendasacerdote",
    alias: ["tienda_sacerdote"],
    description: "Tienda exclusiva de Sacerdote",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      if (p.clase !== "sacerdote") return reply(`❌ Esta tienda es exclusiva para *Sacerdote* ✨.\nTu clase es *${p.clase}*. Usa \`!rpgtienda\` para ver tu tienda.`);
      const items = getItemsDeClase("sacerdote");
      if (!items.length) return reply("❌ Sin ítems disponibles para tu clase.");
      const calidadEmoji = { comun: "⚪", raro: "🔵", epico: "🟣", legendario: "🟠", mitico: "🔴" };
      let txt = `✨ *TIENDA SACERDOTE*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      let tipoActual = "";
      for (const [id, item] of items) {
        if (item.tipo !== tipoActual) {
          tipoActual = item.tipo;
          txt += `\n⚔️ *${tipoActual.toUpperCase()}S*\n`;
        }
        const cal = calidadEmoji[item.calidad] || "⚪";
        const puedes = p.nivel >= item.nivelReq;
        txt += `  ${cal} \`${id}\` ${item.emoji} *${item.nombre}*\n`;
        txt += `     ATK:${item.atk} DEF:${item.def} | ${item.precio}💰 | Nv.${item.nivelReq}${puedes ? "" : " 🔒"}\n`;
      }
      txt += "\n💡 Compra: `!rpgcomprar [id]`";
      return reply(txt);
    },
  },
  {
    name: "tiendapaladin",
    alias: ["tienda_paladin"],
    description: "Tienda exclusiva de Paladín",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      if (p.clase !== "paladin") return reply(`❌ Esta tienda es exclusiva para *Paladín* 🛡️.\nTu clase es *${p.clase}*. Usa \`!rpgtienda\` para ver tu tienda.`);
      const items = getItemsDeClase("paladin");
      if (!items.length) return reply("❌ Sin ítems disponibles para tu clase.");
      const calidadEmoji = { comun: "⚪", raro: "🔵", epico: "🟣", legendario: "🟠", mitico: "🔴" };
      let txt = `🛡️ *TIENDA PALADÍN*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      let tipoActual = "";
      for (const [id, item] of items) {
        if (item.tipo !== tipoActual) {
          tipoActual = item.tipo;
          txt += `\n⚔️ *${tipoActual.toUpperCase()}S*\n`;
        }
        const cal = calidadEmoji[item.calidad] || "⚪";
        const puedes = p.nivel >= item.nivelReq;
        txt += `  ${cal} \`${id}\` ${item.emoji} *${item.nombre}*\n`;
        txt += `     ATK:${item.atk} DEF:${item.def} | ${item.precio}💰 | Nv.${item.nivelReq}${puedes ? "" : " 🔒"}\n`;
      }
      txt += "\n💡 Compra: `!rpgcomprar [id]`";
      return reply(txt);
    },
  },
  {
    name: "tiendanigromante",
    alias: ["tienda_nigromante"],
    description: "Tienda exclusiva de Nigromante",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      if (p.clase !== "nigromante") return reply(`❌ Esta tienda es exclusiva para *Nigromante* 💀.\nTu clase es *${p.clase}*. Usa \`!rpgtienda\` para ver tu tienda.`);
      const items = getItemsDeClase("nigromante");
      if (!items.length) return reply("❌ Sin ítems disponibles para tu clase.");
      const calidadEmoji = { comun: "⚪", raro: "🔵", epico: "🟣", legendario: "🟠", mitico: "🔴" };
      let txt = `💀 *TIENDA NIGROMANTE*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      let tipoActual = "";
      for (const [id, item] of items) {
        if (item.tipo !== tipoActual) {
          tipoActual = item.tipo;
          txt += `\n⚔️ *${tipoActual.toUpperCase()}S*\n`;
        }
        const cal = calidadEmoji[item.calidad] || "⚪";
        const puedes = p.nivel >= item.nivelReq;
        txt += `  ${cal} \`${id}\` ${item.emoji} *${item.nombre}*\n`;
        txt += `     ATK:${item.atk} DEF:${item.def} | ${item.precio}💰 | Nv.${item.nivelReq}${puedes ? "" : " 🔒"}\n`;
      }
      txt += "\n💡 Compra: `!rpgcomprar [id]`";
      return reply(txt);
    },
  },
  {
    name: "tiendahombrelobo",
    alias: ["tienda_hombrelobo"],
    description: "Tienda exclusiva de Hombre Lobo",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      if (p.clase !== "hombrelobo") return reply(`❌ Esta tienda es exclusiva para *Hombre Lobo* 🐺.\nTu clase es *${p.clase}*. Usa \`!rpgtienda\` para ver tu tienda.`);
      const items = getItemsDeClase("hombrelobo");
      if (!items.length) return reply("❌ Sin ítems disponibles para tu clase.");
      const calidadEmoji = { comun: "⚪", raro: "🔵", epico: "🟣", legendario: "🟠", mitico: "🔴" };
      let txt = `🐺 *TIENDA HOMBRE LOBO*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      let tipoActual = "";
      for (const [id, item] of items) {
        if (item.tipo !== tipoActual) {
          tipoActual = item.tipo;
          txt += `\n⚔️ *${tipoActual.toUpperCase()}S*\n`;
        }
        const cal = calidadEmoji[item.calidad] || "⚪";
        const puedes = p.nivel >= item.nivelReq;
        txt += `  ${cal} \`${id}\` ${item.emoji} *${item.nombre}*\n`;
        txt += `     ATK:${item.atk} DEF:${item.def} | ${item.precio}💰 | Nv.${item.nivelReq}${puedes ? "" : " 🔒"}\n`;
      }
      txt += "\n💡 Compra: `!rpgcomprar [id]`";
      return reply(txt);
    },
  },
  {
    name: "tiendanomuerto",
    alias: ["tienda_nomuerto"],
    description: "Tienda exclusiva de No-Muerto",
    category: "RPG ⚔️",
    execute: async ({ reply, sender }) => {
      const p = db.players[sender];
      if (!p || !p.clase) return reply("❌ No tienes personaje RPG.");
      if (p.clase !== "nomuerto") return reply(`❌ Esta tienda es exclusiva para *No-Muerto* 🧟.\nTu clase es *${p.clase}*. Usa \`!rpgtienda\` para ver tu tienda.`);
      const items = getItemsDeClase("nomuerto");
      if (!items.length) return reply("❌ Sin ítems disponibles para tu clase.");
      const calidadEmoji = { comun: "⚪", raro: "🔵", epico: "🟣", legendario: "🟠", mitico: "🔴" };
      let txt = `🧟 *TIENDA NO-MUERTO*\n━━━━━━━━━━━━━━\n💰 Oro: *${p.oro}*\n\n`;
      let tipoActual = "";
      for (const [id, item] of items) {
        if (item.tipo !== tipoActual) {
          tipoActual = item.tipo;
          txt += `\n⚔️ *${tipoActual.toUpperCase()}S*\n`;
        }
        const cal = calidadEmoji[item.calidad] || "⚪";
        const puedes = p.nivel >= item.nivelReq;
        txt += `  ${cal} \`${id}\` ${item.emoji} *${item.nombre}*\n`;
        txt += `     ATK:${item.atk} DEF:${item.def} | ${item.precio}💰 | Nv.${item.nivelReq}${puedes ? "" : " 🔒"}\n`;
      }
      txt += "\n💡 Compra: `!rpgcomprar [id]`";
      return reply(txt);
    },
  },
];

rpgCommands.push(...tiendaClaseCommands);

// ── Patch: validar clase al equipar ──────────────────────────
const _rpgEquiparIdx = rpgCommands.findIndex(c => c.name === "rpgequipar");
if (_rpgEquiparIdx !== -1) {
  const _origEquipar = rpgCommands[_rpgEquiparIdx].execute;
  rpgCommands[_rpgEquiparIdx].execute = async (ctx) => {
    const { reply, sender, args } = ctx;
    const itemId = args[0]?.toLowerCase();
    if (itemId) {
      const p = db.players[sender];
      const itemClase = TIENDA_CLASE[itemId];
      if (itemClase && p) {
        if (itemClase.clase && itemClase.clase !== p.clase) {
          const claseNombre = itemClase.clase.charAt(0).toUpperCase() + itemClase.clase.slice(1);
          return reply(
            `❌ *${itemClase.emoji} ${itemClase.nombre}* es exclusivo para la clase *${claseNombre}*\n` +
            `Tu clase es *${p.clase}*. Solo puedes equipar ítems de tu clase o de la tienda general.\n` +
            `Usa \`!rpgtienda\` para ver tu tienda.`
          );
        }
      }
    }
    return _origEquipar(ctx);
  };
}
