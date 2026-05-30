// ═══════════════════════════════════════════
//   PRAGMATA BOT — src/lib/scheduler.js
//   Tareas automáticas: recordatorios y ranking
// ═══════════════════════════════════════════

import { getTopUsers, getUser, setPremium } from "./database.js";
import { db, savePlayer, tickTerritorios, checkResetSemanal } from "./rpg-database.js";
import config from "../../config.js";

let sockGlobal = null;

export function initScheduler(sock) {
  sockGlobal = sock;

  // Verificar premium vencido + recordatorios cada hora
  setInterval(() => checkPremiumExpiry(), 60 * 60 * 1000);

  // Producción de territorios — cada hora
  setInterval(() => {
    tickTerritorios();
  }, 60 * 60 * 1000);

  // Reset semanal de territorios — verificar cada hora
  setInterval(() => {
    const seHizo = checkResetSemanal();
    if (seHizo && sockGlobal) {
      // Notificar al owner que se hizo reset
      notifyOwner("🗺️ *Reset semanal de territorios ejecutado.*\nTodos los territorios están libres nuevamente.");
    }
  }, 60 * 60 * 1000);

  // Ranking semanal — cada domingo a las 9:00 AM (Perú UTC-5)
  scheduleWeeklyRanking();

  // Regeneración de HP cada minuto
  setInterval(() => tickDescanso(), 60 * 1000);

  // Expiración automática de AFK — cada minuto
  setInterval(() => tickAfkExpiry(), 60 * 1000);

  console.log("[SCHEDULER] ✅ Tareas automáticas iniciadas");
}

// ── Recordatorio de premium por vencer ──────
async function checkPremiumExpiry() {
  if (!sockGlobal) return;
  const usuarios = getTopUsers(500);
  const ahora = Date.now();
  const TRES_DIAS = 3 * 24 * 60 * 60 * 1000;
  const UN_DIA   = 24 * 60 * 60 * 1000;

  for (const u of usuarios) {
    if (!u.premium || !u.premiumExpiry) continue;
    const resta = u.premiumExpiry - ahora;
    const jid   = `${u.phone}@s.whatsapp.net`;
    const nombre = u.name || `+${u.phone}`;
    const planesLabel = { plata:"🥈 Rage-Plata", dorado:"🥇 Rage-Dorado", king:"👑 King-Rage", dios:"🔱 Dios-Rage" };
    const planNombre = planesLabel[u.premiumPlan] || "Premium";
    const fecha = new Date(u.premiumExpiry).toLocaleDateString("es-PE");

    // Premium ya venció
    if (resta <= 0) {
      setPremium(jid, false);
      try {
        await sockGlobal.sendMessage(jid, {
          text:
            `⚠️ *Tu premium ha vencido*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `Hola *${nombre}*, tu plan *${planNombre}* expiró el *${fecha}*.\n\n` +
            `💎 Renueva escribiendo *!adqpremium*\n` +
            `📞 Contacto: wa.me/${config.ownerNumber}`
        });
        // Avisar al owner
        await notifyOwner(`❌ *Premium vencido*\n👤 ${nombre}\n💎 Plan: ${planNombre}\n📅 Venció: ${fecha}`);
      } catch {}
      continue;
    }

    // Aviso 3 días antes (solo una vez — verificamos si ya se notificó)
    if (resta <= TRES_DIAS && !u.notif3d) {
      u.notif3d = true;
      try {
        await sockGlobal.sendMessage(jid, {
          text:
            `⏰ *Recordatorio de Premium*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `Hola *${nombre}* 👋\n` +
            `Tu plan *${planNombre}* vence en *3 días* (${fecha}).\n\n` +
            `💎 Renueva con *!adqpremium*\n` +
            `📞 Contacto: wa.me/${config.ownerNumber}`
        });
        await notifyOwner(`⏰ *Premium por vencer en 3 días*\n👤 ${nombre}\n💎 Plan: ${planNombre}\n📅 Vence: ${fecha}`);
      } catch {}
    }

    // Aviso 1 día antes
    if (resta <= UN_DIA && !u.notif1d) {
      u.notif1d = true;
      try {
        await sockGlobal.sendMessage(jid, {
          text:
            `🚨 *¡Último día de Premium!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `Hola *${nombre}* 👋\n` +
            `Tu plan *${planNombre}* vence *mañana* (${fecha}).\n\n` +
            `⚡ Renueva YA con *!adqpremium*\n` +
            `📞 Contacto: wa.me/${config.ownerNumber}`
        });
        await notifyOwner(`🚨 *Premium vence mañana*\n👤 ${nombre}\n💎 Plan: ${planNombre}\n📅 Vence: ${fecha}`);
      } catch {}
    }
  }
}

// ── Notificar al owner ───────────────────────
async function notifyOwner(texto) {
  if (!sockGlobal || !config.ownerNumber) return;
  try {
    await sockGlobal.sendMessage(`${config.ownerNumber}@s.whatsapp.net`, { text: texto });
  } catch {}
}

// ── Ranking semanal — domingo 9 AM ────────────
function scheduleWeeklyRanking() {
  function msUntilNextSunday9AM() {
    const now = new Date();
    const next = new Date();
    const day = now.getDay(); // 0=dom, 1=lun...
    const daysUntilSun = day === 0 ? 7 : 7 - day;
    next.setDate(now.getDate() + daysUntilSun);
    next.setHours(9, 0, 0, 0);
    return next.getTime() - now.getTime();
  }

  function scheduleNext() {
    const ms = msUntilNextSunday9AM();
    setTimeout(async () => {
      await sendWeeklyRanking();
      scheduleNext(); // volver a programar para el siguiente domingo
    }, ms);
  }

  scheduleNext();
}

// ── Tick de regeneración HP ─────────────────
async function tickDescanso() {
  if (!sockGlobal || !db.players) return;
  const ahora = Date.now();

  for (const jid of Object.keys(db.players)) {
    const p = db.players[jid];
    if (!p?.clase || !p.descansandoEn || !p.descansandoFrom) continue;
    if (p.hp >= p.hpMax) {
      // Ya está lleno, limpiar estado
      p.descansandoEn = null;
      p.descansandoFrom = null;
      savePlayer(p);
      continue;
    }

    // Curar 10% por tick (cada minuto)
    const cura = Math.max(1, Math.floor(p.hpMax * 0.10));
    p.hp = Math.min(p.hpMax, p.hp + cura);
    savePlayer(p);

    // Notificar si llegó al máximo
    if (p.hp >= p.hpMax) {
      const from = p.descansandoFrom;
      const nombre = p.nombre || jid.split("@")[0];
      p.descansandoEn = null;
      p.descansandoFrom = null;
      savePlayer(p);
      try {
        await sockGlobal.sendMessage(from, {
          text:
            `😴✅ *¡Descanso completo!*\n` +
            `━━━━━━━━━━━━━━\n` +
            `@${jid.split("@")[0]} ❤️ HP completamente recuperado!\n` +
            `❤️ HP: ${p.hp}/${p.hpMax}\n\n` +
            `⚔️ _¡Listo para batallar!_`,
          mentions: [jid],
        });
      } catch {}
    }
  }
}

// ── Expiración automática de AFK ────────────
async function tickAfkExpiry() {
  if (!sockGlobal || !db.players) return;
  const ahora = Date.now();
  const AFK_MAX_MS = 5 * 60 * 60 * 1000; // 5 horas

  for (const jid of Object.keys(db.players)) {
    const p = db.players[jid];
    if (!p?.clase || !p.afk) continue;

    const transcurrido = ahora - p.afk.inicio;
    if (transcurrido < AFK_MAX_MS) continue;

    // NO borrar p.afk — el jugador debe usar !rpgafk off para reclamar recompensas
    // Solo marcamos que ya expiró para no volver a notificar
    if (p.afk.notificado) continue;
    p.afk.notificado = true;
    savePlayer(p);

    const from = p.afk.from;
    if (!from) continue;

    try {
      await sockGlobal.sendMessage(from, {
        text:
          `⏰ *¡Tiempo AFK completado!*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `@${jid.split("@")[0]} descansó las *5 horas* máximas.\n\n` +
          `🎒 Usa \`!rpgafk off\` para reclamar tus recompensas.\n` +
          `_El modo AFK ha sido desactivado automáticamente._`,
        mentions: [jid],
      });
    } catch {}
  }
}

export async function sendWeeklyRanking(groupJid = null) {
  if (!sockGlobal) return;
  const top = getTopUsers(10);
  if (!top.length) return;

  const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
  const list = top.map((u, i) => {
    const nombre = u.name || `+${u.phone}`;
    return `${medals[i]} *${nombre}* — Nv.${u.level} • ${u.xp} XP`;
  }).join("\n");

  const msg =
    `🏆 *RANKING SEMANAL — PRAGMATA BOT*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Semana del ${new Date().toLocaleDateString("es-PE")}\n\n` +
    `${list}\n\n` +
    `_¡Sigue usando comandos para subir de nivel!_\n` +
    `⚡ *PRAGMATA BOT v${config.botVersion}*`;

  // Si se especifica un grupo, mandar ahí; si no, mandar al owner
  const destino = groupJid || `${config.ownerNumber}@s.whatsapp.net`;
  try {
    await sockGlobal.sendMessage(destino, { text: msg });
  } catch {}
}
