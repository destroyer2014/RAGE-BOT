// ═══════════════════════════════════════════
//        RAGE-BOT — src/commands/rpg.js
//           Sistema RPG completo v3.0
// ═══════════════════════════════════════════

import {
  db, getPlayer, savePlayer, addExp, calcularDrop,
  getTotalAtk, getTotalDef, CLASES, ZONAS, TIENDA, HABILIDADES,
  DROP_POOL, CALIDAD, getGuild, saveGuild,
} from "../lib/rpg-database.js";

const CD_EXPLORACION = 5 * 60 * 1000;
const CD_MISION      = 24 * 60 * 60 * 1000;
const CD_DESCANSO    = 30 * 60 * 1000;

function barra(actual, max, largo = 10) {
  const lleno = Math.round((actual / max) * largo);
  return "▓".repeat(Math.max(0, lleno)) + "░".repeat(Math.max(0, largo - lleno));
}

function calcCrit(player) {
  const clase = CLASES[player.clase];
  return clase ? clase.crit : 5;
}

function simularCombate(atacante, defensor) {
  let hpA = atacante.hp, hpB = defensor.hp;
  const log = [];
  let turno = 1;
  while (hpA > 0 && hpB > 0 && turno <= 12) {
    const critA = Math.random() * 100 < (atacante.crit || 5);
    const critB = Math.random() * 100 < (defensor.crit || 5);
    const dmgA = Math.max(1, Math.floor((atacante.atk - defensor.def * 0.4 + Math.random() * 8) * (critA ? 2 : 1)));
    const dmgB = Math.max(1, Math.floor((defensor.atk - atacante.def * 0.4 + Math.random() * 8) * (critB ? 2 : 1)));
    hpB = Math.max(0, hpB - dmgA);
    log.push((critA ? "💥" : "⚔️") + " T" + turno + ": " + atacante.nombre + " → -" + dmgA + (critA ? " ¡CRÍTICO!" : ""));
    if (hpB <= 0) break;
    hpA = Math.max(0, hpA - dmgB);
    log.push((critB ? "💥" : "🛡️") + " T" + turno + ": " + defensor.nombre + " → -" + dmgB + (critB ? " ¡CRÍTICO!" : ""));
    turno++;
  }
  return { gano: hpA > 0, hpRestante: hpA, log: log.slice(-8) };
}

function calidadTag(calidad) {
  const c = CALIDAD[calidad];
  return c ? c.emoji + " *" + c.nombre + "*" : "";
}

const rpgCommands = [

  // ── Menú ──────────────────────────────────
  {
    name: "rpg",
    alias: ["rpgmenu"],
    description: "Menú RPG",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender }) => {
      await react("⚔️");
      const p = db.players[sender];
      const reg = p && p.clase;
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃      ⚔️ *RAGE RPG* ⚔️      ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        (reg ? "👤 *" + p.nombre + "* | " + (CLASES[p.clase]?.emoji||"") + " Nv." + p.nivel + "\n❤️ " + p.hp + "/" + p.hpMax + " | 💰 " + p.oro + " oro\n\n" : "⚠️ No registrado. Usa *!rpgregistro [clase]*\n\n") +
        "╭─〔 📋 *COMANDOS* 〕\n" +
        "│ `!rpgregistro [clase]` → Crear personaje\n" +
        "│ `!rpgperfil` → Ver tus stats\n" +
        "│ `!rpgexplorar [zona]` → Explorar\n" +
        "│ `!rpghabilidad` → Usar habilidad de clase\n" +
        "│ `!rpgataccar @u` → Batalla PvP\n" +
        "│ `!rpgduelo @u [apuesta]` → Duelo con apuesta\n" +
        "│ `!rpginventario` → Ver items\n" +
        "│ `!rpgtienda [calidad]` → Ver tienda\n" +
        "│ `!rpgcomprar [item]` → Comprar\n" +
        "│ `!rpgusar [item]` → Usar poción\n" +
        "│ `!rpgequipar [item]` → Equipar item\n" +
        "│ `!rpgcurar @u` → Curar aliado (sacerdote)\n" +
        "│ `!rpgdescansar` → Recuperar HP (30min CD)\n" +
        "│ `!rpgmision` → Misión diaria\n" +
        "│ `!rpgclan` → Clanes\n" +
        "│ `!rpgtop` → Ranking\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 🗺️ *ZONAS* 〕\n" +
        "│ 🌲 `bosque` → Nv.1+ | Drop 20%\n" +
        "│ ⛏️ `cueva` → Nv.5+ | Drop 30%\n" +
        "│ 🏰 `castillo` → Nv.10+ | Drop 40%\n" +
        "│ 🌋 `volcan` → Nv.20+ | Drop 55%\n" +
        "│ 🌑 `abismo` → Nv.35+ | Drop 70%\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 ✨ *CALIDADES* 〕\n" +
        "│ ⬜ Común → 🟦 Raro → 🟪 Épico\n" +
        "│ 🟨 Legendario → 🟥 Mítico\n" +
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
    execute: async ({ reply, react, sender, args }) => {
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
        "🛡️ DEF: " + clase.def + " | 💨 VEL: " + clase.spd + " | 🎯 CRIT: " + clase.crit + "%\n" +
        "💰 Oro inicial: 100\n\n" +
        "✨ *Habilidad especial:*\n" +
        hab.emoji + " *" + hab.nombre + "* — " + hab.desc + "\nUsa: `!rpghabilidad` en combate"
      );
    },
  },

  // ── Perfil ────────────────────────────────
  {
    name: "rpgperfil",
    alias: ["rpgstats", "rpgme"],
    description: "Ver perfil RPG",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, msg }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0] || sender;
      const p = db.players[target];
      if (!p || !p.clase) return reply("❌ Sin personaje RPG.");
      const clase = CLASES[p.clase];
      const arma = p.equipo.arma ? TIENDA[p.equipo.arma] : null;
      const arm  = p.equipo.armadura ? TIENDA[p.equipo.armadura] : null;
      const acc  = p.equipo.accesorio ? TIENDA[p.equipo.accesorio] : null;
      await react("📊");
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃ " + clase.emoji + " *" + p.nombre.toUpperCase() + "* ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "🎭 Clase: *" + p.clase.toUpperCase() + "* | ⭐ Nivel: *" + p.nivel + "*\n" +
        "📊 EXP: [" + barra(p.exp, p.expMax) + "] " + p.exp + "/" + p.expMax + "\n\n" +
        "❤️ HP: [" + barra(p.hp, p.hpMax) + "] " + p.hp + "/" + p.hpMax + "\n" +
        "⚔️ ATK: *" + getTotalAtk(p) + "* | 🛡️ DEF: *" + getTotalDef(p) + "*\n" +
        "💨 VEL: *" + p.spd + "* | 🎯 CRIT: *" + p.crit + "%*\n\n" +
        "💰 Oro: *" + p.oro + "* | 💎 Gemas: *" + p.gemas + "*\n\n" +
        "━━━ EQUIPO ━━━\n" +
        "🗡️ " + (arma ? calidadTag(arma.calidad) + " " + arma.emoji + " " + arma.nombre : "Sin arma") + "\n" +
        "🛡️ " + (arm  ? calidadTag(arm.calidad)  + " " + arm.emoji  + " " + arm.nombre  : "Sin armadura") + "\n" +
        "📿 " + (acc  ? calidadTag(acc.calidad)   + " " + acc.emoji  + " " + acc.nombre  : "Sin accesorio") + "\n\n" +
        "━━━ STATS ━━━\n" +
        "⚔️ Batallas: " + p.stats.batallas + " | 🏆 Victorias: " + p.stats.victorias + "\n" +
        "🗺️ Exploraciones: " + p.stats.exploraciones + " | 💀 Kills: " + p.stats.enemigosKill + "\n" +
        "🎁 Drops obtenidos: " + (p.stats.dropsObtenidos||0) +
        (p.clan ? "\n🏰 Clan: *" + p.clan + "*" : "")
      );
    },
  },

  // ── Explorar ──────────────────────────────
  {
    name: "rpgexplorar",
    alias: ["explorar", "rpgexp"],
    description: "Explorar zona — !rpgexplorar [zona]",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, args }) => {
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
      const enemigo = zona.enemigos[Math.floor(Math.random() * zona.enemigos.length)];
      const resultado = simularCombate(
        { nombre: p.nombre, hp: p.hp, atk: getTotalAtk(p), def: getTotalDef(p), crit: p.crit },
        { nombre: enemigo.nombre, hp: enemigo.hp, atk: enemigo.atk, def: enemigo.def, crit: 5 }
      );

      p.stats.exploraciones++;
      p.ultimaExploracion = ahora;

      if (resultado.gano) {
        p.stats.enemigosKill++;
        p.oro += enemigo.oro;
        p.hp = Math.max(1, resultado.hpRestante);
        const leveledUp = addExp(p, enemigo.exp);

        // Sistema de drops
        const drop = calcularDrop(zonaNombre, p.nivel);
        let dropTexto = "";
        if (drop) {
          p.inventario[drop.itemId] = (p.inventario[drop.itemId]||0) + 1;
          p.stats.dropsObtenidos = (p.stats.dropsObtenidos||0) + 1;
          dropTexto = "\n\n🎁 *¡ITEM DROPEADO!*\n" +
            calidadTag(drop.calidad) + " " + drop.item.emoji + " *" + drop.item.nombre + "*";
        }

        savePlayer(p);
        await reply(
          "🗺️ *" + zona.nombre + "*\n━━━━━━━━━━━━━━\n" +
          "Enemigo: " + enemigo.emoji + " *" + enemigo.nombre + "*\n\n" +
          resultado.log.join("\n") + "\n\n" +
          "🏆 *¡VICTORIA!*\n" +
          "💰 +" + enemigo.oro + " oro | ⭐ +" + enemigo.exp + " EXP\n" +
          "❤️ HP: " + p.hp + "/" + p.hpMax +
          dropTexto +
          (leveledUp ? "\n\n🎉 *¡SUBISTE AL NIVEL " + p.nivel + "!*\n❤️ HP restaurado" : "")
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
    description: "Usar habilidad especial de clase",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const clase = CLASES[p.clase];
      const hab = HABILIDADES[clase.habilidad];
      const ahora = Date.now();
      if (ahora - (p.habilidadUsada||0) < hab.cooldown) {
        const rest = Math.ceil((hab.cooldown - (ahora - p.habilidadUsada)) / 60000);
        return reply("⏳ Habilidad en cooldown. Espera *" + rest + " min*.");
      }
      if (p.hp <= 0) return reply("❌ Estás muerto.");

      p.habilidadUsada = ahora;

      if (hab.tipo === "cura") {
        const cura = Math.floor(p.hpMax * hab.mult);
        p.hp = Math.min(p.hpMax, p.hp + cura);
        savePlayer(p);
        await react("💚");
        return reply("💚 *" + hab.nombre + "*\n━━━━━━━━━━━━━━\n❤️ +" + cura + " HP\n❤️ HP: " + p.hp + "/" + p.hpMax);
      }

      if (hab.tipo === "escudo") {
        p.escudoActivo = true;
        savePlayer(p);
        await react("🛡️");
        return reply("🛡️ *" + hab.nombre + "*\n━━━━━━━━━━━━━━\nEl próximo ataque que recibas será bloqueado.");
      }

      // Habilidades de daño — necesita usar !rpgataccar después
      // Guardamos el buff temporalmente
      p.buffHabilidad = { tipo: hab.tipo, mult: hab.mult, nombre: hab.nombre, emoji: hab.emoji, expira: ahora + 60000 };
      savePlayer(p);
      await react(hab.emoji);
      await reply(
        hab.emoji + " *" + hab.nombre + "*\n━━━━━━━━━━━━━━\n" +
        hab.desc + "\n\n⚡ Buff activo por 60 segundos.\nUsa `!rpgataccar @usuario` para aplicarlo."
      );
    },
  },

  // ── Curar aliado (sacerdote) ──────────────
  {
    name: "rpgcurar",
    alias: ["curar", "rpgheal"],
    description: "Cura a un aliado (solo sacerdote) — !rpgcurar @usuario",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, msg, sock, from }) => {
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
    description: "Recuperar HP sin poción (CD 30min)",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const ahora = Date.now();
      if (ahora - (p.ultimoDescanso||0) < CD_DESCANSO) {
        const rest = Math.ceil((CD_DESCANSO - (ahora - p.ultimoDescanso)) / 60000);
        return reply("⏳ Ya descansaste. Espera *" + rest + " min*.");
      }
      const cura = Math.floor(p.hpMax * 0.35);
      p.hp = Math.min(p.hpMax, p.hp + cura);
      p.ultimoDescanso = ahora;
      savePlayer(p);
      await react("😴");
      await reply("😴 *DESCANSO*\n━━━━━━━━━━━━━━\n❤️ +" + cura + " HP recuperado\n❤️ HP: " + p.hp + "/" + p.hpMax);
    },
  },

  // ── PvP ───────────────────────────────────
  {
    name: "rpgataccar",
    alias: ["rpgpvp", "rpgatacar"],
    description: "Atacar jugador — !rpgataccar @usuario",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, msg, sock, from }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const rival = mentioned[0];
      if (!rival) return reply("❌ Menciona a alguien. Ej: `!rpgataccar @usuario`");
      if (rival === sender) return reply("❌ No puedes atacarte a ti mismo.");
      const p1 = getPlayer(sender, pushName || msg?.pushName || null);
      const p2 = db.players[rival];
      if (!p1.clase) return reply("❌ Sin personaje.");
      if (!p2?.clase) return reply("❌ Ese jugador no tiene personaje.");
      if (p1.hp <= 0) return reply("❌ Estás muerto. Usa `!rpgdescansar`.");
      if (p2.hp <= 0) return reply("❌ Ese jugador ya está muerto.");

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
        { nombre: p1.nombre, hp: p1.hp, atk: atkFinal, def: getTotalDef(p1), crit: p1.crit },
        { nombre: p2.nombre, hp: p2.hp, atk: getTotalAtk(p2), def: getTotalDef(p2), crit: p2.crit }
      );

      p1.stats.batallas++; p2.stats.batallas++;
      const oroRobo = Math.floor(p2.oro * 0.08);

      if (resultado.gano) {
        p1.stats.victorias++;
        p1.hp = Math.max(1, resultado.hpRestante);
        p2.hp = Math.floor(p2.hpMax * 0.1);
        p1.oro += oroRobo; p2.oro = Math.max(0, p2.oro - oroRobo);
        addExp(p1, 60);
        savePlayer(p1); savePlayer(p2);
        await sock.sendMessage(from, {
          text: "⚔️ *BATALLA PVP*\n━━━━━━━━━━━━━━\n" +
            "@" + sender.split("@")[0] + " vs @" + rival.split("@")[0] +
            buffTexto + "\n\n" +
            resultado.log.join("\n") + "\n\n" +
            "🏆 *¡@" + sender.split("@")[0] + " GANÓ!*\n💰 Robó " + oroRobo + " oro | ⭐ +60 EXP",
          mentions: [sender, rival],
        }, { quoted: msg });
      } else {
        p2.stats.victorias++;
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
    execute: async ({ reply, react, sender, msg, sock, from, args }) => {
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
      if (apuesta > 0) {
        if (p1.oro < apuesta) return reply("❌ No tienes " + apuesta + " oro para apostar.");
        if (p2.oro < apuesta) return reply("❌ Tu rival no tiene suficiente oro.");
      }

      await react("⚔️");
      const resultado = simularCombate(
        { nombre: p1.nombre, hp: p1.hp, atk: getTotalAtk(p1), def: getTotalDef(p1), crit: p1.crit },
        { nombre: p2.nombre, hp: p2.hp, atk: getTotalAtk(p2), def: getTotalDef(p2), crit: p2.crit }
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
    execute: async ({ reply, react, sender }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      await react("🎒");
      const items = Object.entries(p.inventario).filter(([,c]) => c > 0);
      if (!items.length) return reply("🎒 *INVENTARIO*\n━━━━━━━━━━━━━━\nVacío. Explora para obtener drops o compra en `!rpgtienda`.");
      const lista = items.map(([id, cant]) => {
        const item = TIENDA[id];
        if (!item) return "│ 📦 " + id + " x" + cant;
        return "│ " + calidadTag(item.calidad) + " " + item.emoji + " " + item.nombre + " x" + cant;
      }).join("\n");
      await reply(
        "🎒 *INVENTARIO*\n━━━━━━━━━━━━━━\n" + lista + "\n\n" +
        "🗡️ Arma: " + (p.equipo.arma ? TIENDA[p.equipo.arma]?.nombre : "Ninguna") + "\n" +
        "🛡️ Armadura: " + (p.equipo.armadura ? TIENDA[p.equipo.armadura]?.nombre : "Ninguna") + "\n" +
        "📿 Accesorio: " + (p.equipo.accesorio ? TIENDA[p.equipo.accesorio]?.nombre : "Ninguno")
      );
    },
  },

  // ── Tienda ────────────────────────────────
  {
    name: "rpgtienda",
    alias: ["tienda"],
    description: "Ver tienda — !rpgtienda [calidad]",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, args }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      await react("🛒");
      const filtro = (args[0]||"").toLowerCase();
      const calidades = ["comun","raro","epico","legendario","mitico"];
      if (filtro && !calidades.includes(filtro)) {
        return reply("❌ Calidad inválida.\nOpciones: comun, raro, epico, legendario, mitico");
      }

      const fmt = ([id, v]) => {
        const cal = CALIDAD[v.calidad];
        return "│ `" + id + "` " + cal.emoji + " " + v.emoji + " *" + v.nombre + "* — " + v.precio + "💰 (Nv." + v.nivelReq + "+)";
      };

      const tipos = ["arma","armadura","accesorio","pocion"];
      let texto = "🛒 *TIENDA RPG*\n━━━━━━━━━━━━━━\n💰 Tu oro: *" + p.oro + "*\n\n";

      for (const tipo of tipos) {
        let items = Object.entries(TIENDA).filter(([,v]) => v.tipo === tipo);
        if (filtro) items = items.filter(([,v]) => v.calidad === filtro);
        if (!items.length) continue;
        const emojis = { arma:"⚔️", armadura:"🛡️", accesorio:"📿", pocion:"🧪" };
        texto += emojis[tipo] + " *" + tipo.toUpperCase() + "S*\n" + items.map(fmt).join("\n") + "\n\n";
      }

      texto += "Compra: `!rpgcomprar [id]`\nFiltrar: `!rpgtienda [calidad]`";
      await reply(texto);
    },
  },

  // ── Comprar ───────────────────────────────
  {
    name: "rpgcomprar",
    alias: ["rpgbuy"],
    description: "Comprar item — !rpgcomprar [id]",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, args }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const itemId = (args[0]||"").toLowerCase();
      const item = TIENDA[itemId];
      if (!item) return reply("❌ Item no existe. Usa `!rpgtienda` para ver el catálogo.");
      if (p.nivel < (item.nivelReq||1)) return reply("❌ Necesitas nivel *" + item.nivelReq + "* para comprar este item.");
      if (p.oro < item.precio) return reply("❌ Necesitas " + item.precio + "💰, tienes " + p.oro + "💰.");
      p.oro -= item.precio;
      p.inventario[itemId] = (p.inventario[itemId]||0) + 1;
      savePlayer(p);
      await react("✅");
      await reply("✅ Compraste " + calidadTag(item.calidad) + " " + item.emoji + " *" + item.nombre + "* por " + item.precio + "💰\n💰 Restante: " + p.oro);
    },
  },

  // ── Usar poción ───────────────────────────
  {
    name: "rpgusar",
    alias: ["rpguse"],
    description: "Usar poción — !rpgusar [id]",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, args }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const itemId = (args[0]||"").toLowerCase();
      const item = TIENDA[itemId];
      if (!item || item.tipo !== "pocion") return reply("❌ Solo puedes usar pociones. Ej: `!rpgusar pocion_menor`");
      if (!p.inventario[itemId] || p.inventario[itemId] <= 0) return reply("❌ No tienes ese item.");
      const cura = Math.min(item.hp, p.hpMax - p.hp);
      p.hp = Math.min(p.hpMax, p.hp + item.hp);
      p.inventario[itemId]--;
      savePlayer(p);
      await react("💊");
      await reply("💊 Usaste *" + item.emoji + " " + item.nombre + "*\n❤️ +" + cura + " HP\n❤️ HP: " + p.hp + "/" + p.hpMax);
    },
  },

  // ── Equipar ───────────────────────────────
  {
    name: "rpgequipar",
    alias: ["rpgequip"],
    description: "Equipar item — !rpgequipar [id]",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, args }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const itemId = (args[0]||"").toLowerCase();
      const item = TIENDA[itemId];
      if (!item || item.tipo === "pocion") return reply("❌ Ese item no se puede equipar.");
      if (!p.inventario[itemId] || p.inventario[itemId] <= 0) return reply("❌ No tienes ese item en tu inventario.");
      if (p.nivel < (item.nivelReq||1)) return reply("❌ Necesitas nivel *" + item.nivelReq + "* para equipar esto.");
      if (item.tipo === "arma")      p.equipo.arma = itemId;
      if (item.tipo === "armadura")  p.equipo.armadura = itemId;
      if (item.tipo === "accesorio") p.equipo.accesorio = itemId;
      savePlayer(p);
      await react("⚔️");
      await reply(
        "✅ Equipaste " + calidadTag(item.calidad) + " " + item.emoji + " *" + item.nombre + "*\n" +
        "⚔️ ATK total: " + getTotalAtk(p) + " | 🛡️ DEF total: " + getTotalDef(p)
      );
    },
  },

  // ── Misión diaria ─────────────────────────
  {
    name: "rpgmision",
    alias: ["rpgdaily", "mision"],
    description: "Misión diaria",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const ahora = Date.now();
      if (ahora - (p.ultimaMision||0) < CD_MISION) {
        const rest = Math.ceil((CD_MISION - (ahora - p.ultimaMision)) / 3600000);
        return reply("⏳ Misión completada. Vuelve en *" + rest + "h*.");
      }
      await react("📜");
      const misiones = [
        { desc: "Derrota enemigos en el bosque",      recompensa: { oro: 120, exp: 90  } },
        { desc: "Explora la cueva oscura",            recompensa: { oro: 180, exp: 120 } },
        { desc: "Gana una batalla PvP",               recompensa: { oro: 250, exp: 150 } },
        { desc: "Compra un item de la tienda",        recompensa: { oro: 100, exp: 70  } },
        { desc: "Usa tu habilidad especial en combate", recompensa: { oro: 150, exp: 100 } },
        { desc: "Explora el castillo maldito",        recompensa: { oro: 220, exp: 140 } },
      ];
      const mision = misiones[Math.floor(Math.random() * misiones.length)];
      p.oro += mision.recompensa.oro;
      p.ultimaMision = ahora;
      p.misiones.completadas++;
      const leveledUp = addExp(p, mision.recompensa.exp);
      savePlayer(p);
      await reply(
        "📜 *MISIÓN DIARIA*\n━━━━━━━━━━━━━━\n🎯 " + mision.desc + "\n\n" +
        "✅ *¡COMPLETADA!*\n💰 +" + mision.recompensa.oro + " oro | ⭐ +" + mision.recompensa.exp + " EXP\n" +
        "📊 Misiones totales: " + p.misiones.completadas +
        (leveledUp ? "\n\n🎉 *¡SUBISTE AL NIVEL " + p.nivel + "!*" : "")
      );
    },
  },

  // ── Clan ──────────────────────────────────
  {
    name: "rpgclan",
    alias: ["clan"],
    description: "Sistema de clanes — !rpgclan [crear/unirse/salir/info]",
    category: "RPG ⚔️",
    execute: async ({ reply, react, sender, args, sock, from, msg }) => {
      const p = getPlayer(sender, pushName || msg?.pushName || null);
      if (!p.clase) return reply("❌ Sin personaje.");
      const sub = (args[0]||"").toLowerCase();
      const param = args.slice(1).join(" ");

      if (!sub) {
        if (p.clan) {
          const clan = getGuild(p.clan);
          if (!clan) return reply("❌ Tu clan no existe. Usa `!rpgclan salir`.");
          return sock.sendMessage(from, {
            text: "🏰 *CLAN: " + clan.nombre + "*\n━━━━━━━━━━━━━━\n👑 Líder: @" + clan.lider.split("@")[0] + "\n👥 Miembros: " + clan.miembros.length + "\n💰 Banco: " + clan.banco + " oro",
            mentions: clan.miembros,
          }, { quoted: msg });
        }
        return reply("🏰 *CLANES RPG*\n━━━━━━━━━━━━━━\nNo perteneces a ningún clan.\n\n• `!rpgclan crear [nombre]` → Crear (500💰)\n• `!rpgclan unirse [nombre]` → Unirse\n• `!rpgclan info [nombre]` → Info\n• `!rpgclan salir` → Salir");
      }
      if (sub === "crear") {
        if (!param) return reply("❌ Escribe el nombre. Ej: `!rpgclan crear Arcadia`");
        if (p.clan) return reply("❌ Ya perteneces al clan *" + p.clan + "*.");
        if (p.oro < 500) return reply("❌ Necesitas 500💰.");
        if (getGuild(param)) return reply("❌ Ya existe ese clan.");
        p.oro -= 500; p.clan = param;
        saveGuild({ nombre: param, lider: sender, miembros: [sender], banco: 0, creado: Date.now() });
        savePlayer(p);
        await react("🏰");
        return reply("🏰 ¡Clan *" + param + "* creado!");
      }
      if (sub === "unirse") {
        if (!param) return reply("❌ Escribe el nombre del clan.");
        if (p.clan) return reply("❌ Ya perteneces a un clan.");
        const clan = getGuild(param);
        if (!clan) return reply("❌ Clan no encontrado.");
        clan.miembros.push(sender); p.clan = param;
        saveGuild(clan); savePlayer(p);
        await react("✅");
        return reply("✅ Te uniste al clan *" + param + "*!");
      }
      if (sub === "salir") {
        if (!p.clan) return reply("❌ No perteneces a ningún clan.");
        const clan = getGuild(p.clan);
        if (clan) {
          clan.miembros = clan.miembros.filter(m => m !== sender);
          if (clan.lider === sender && clan.miembros.length > 0) clan.lider = clan.miembros[0];
          if (clan.miembros.length === 0) delete db.guilds[clan.nombre];
          else saveGuild(clan);
        }
        p.clan = null; savePlayer(p);
        await react("👋");
        return reply("👋 Saliste del clan.");
      }
      if (sub === "info") {
        const nombre = param || p.clan;
        if (!nombre) return reply("❌ Escribe el nombre del clan.");
        const clan = getGuild(nombre);
        if (!clan) return reply("❌ Clan no encontrado.");
        return reply("🏰 *" + clan.nombre + "*\n👑 @" + clan.lider.split("@")[0] + "\n👥 Miembros: " + clan.miembros.length + "\n💰 Banco: " + clan.banco);
      }
      await reply("❌ Subcomando inválido. Usa: crear, unirse, salir, info");
    },
  },

  // ── Top ───────────────────────────────────
  {
    name: "rpgtop",
    alias: ["rpgranking"],
    description: "Ranking de jugadores",
    category: "RPG ⚔️",
    execute: async ({ reply, react }) => {
      await react("🏆");
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
        return medals[i] + " *" + nombreMostrar + "* — " + claseNombre + "\n   Nv." + p.nivel + " | 🏆 " + p.stats.victorias + " victorias | 💀 " + p.stats.enemigosKill + " kills";
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
    execute: async ({ reply, react, msg, args }) => {
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
    execute: async ({ reply, react, msg, args }) => {
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
    execute: async ({ reply, react, msg, args }) => {
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
    execute: async ({ reply, react, msg, args }) => {
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
];

export default rpgCommands;
