// ═══════════════════════════════════════════
//      RAGE-BOT — src/commands/ticket.js
//          Sistema de Tickets v1.0
// ═══════════════════════════════════════════

import config from "../../config.js";

// Tickets abiertos en memoria { senderJid: { id, asunto, abierto } }
const tickets = new Map();
let ticketCounter = 1;

// Todos los creadores a los que llega el ticket
function getCreadores() {
  return [
    config.ownerNumber + "@s.whatsapp.net",
    ...(config.subCreators || [])
      .filter(n => !/[^0-9]/.test(n)) // solo números reales, no LIDs
      .map(n => n + "@s.whatsapp.net"),
  ];
}

const ticketCommands = [

  // ── Abrir ticket ──────────────────────────
  {
    name: "ticket",
    alias: ["soporte", "ayuda", "support"],
    description: "Abre un ticket de soporte con el creador",
    category: "General",
    execute: async ({ sock, from, reply, react, sender, text, msg }) => {
      if (!text) {
        return reply(
          "🎫 *SISTEMA DE TICKETS*\n━━━━━━━━━━━━━━\n" +
          "Abre un ticket para contactar con el equipo de soporte.\n\n" +
          "Uso: `!ticket [tu mensaje o asunto]`\n\n" +
          "Ejemplos:\n" +
          "• `!ticket tengo un problema con el premium`\n" +
          "• `!ticket el comando !clima no funciona`\n" +
          "• `!ticket quiero información sobre premium`\n\n" +
          "⚠️ _No abuses del sistema de tickets._"
        );
      }

      // Verificar si ya tiene un ticket abierto
      if (tickets.has(sender)) {
        const t = tickets.get(sender);
        return reply(
          "⚠️ Ya tienes el ticket *#" + t.id + "* abierto.\n" +
          "📝 Asunto: " + t.asunto + "\n\n" +
          "Usa `!cerrarticket` para cerrarlo antes de abrir uno nuevo."
        );
      }

      const id = ticketCounter++;
      const numero = sender.split("@")[0];
      const fecha = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });

      tickets.set(sender, { id, asunto: text, abierto: Date.now(), sender });

      await react("🎫");

      // Notificar a todos los creadores
      const creadores = getCreadores();
      const mensajeCreador =
        "🎫 *NUEVO TICKET #" + id + "*\n" +
        "━━━━━━━━━━━━━━\n" +
        "👤 Usuario: @" + numero + "\n" +
        "📱 JID: `" + sender + "`\n" +
        "📅 Fecha: " + fecha + "\n" +
        "━━━━━━━━━━━━━━\n" +
        "📝 *Asunto:*\n" + text + "\n\n" +
        "Para responder: `!rticket " + id + " [respuesta]`\n" +
        "Para cerrar: `!cerrarticket " + id + "`";

      for (const jid of creadores) {
        try {
          await sock.sendMessage(jid, { text: mensajeCreador, mentions: [sender] });
        } catch (e) {
          console.error("[TICKET] Error enviando a creador:", e.message);
        }
      }

      // Confirmar al usuario
      await sock.sendMessage(from, {
        text:
          "✅ *Ticket #" + id + " abierto*\n" +
          "━━━━━━━━━━━━━━\n" +
          "📝 Asunto: " + text + "\n" +
          "📅 Fecha: " + fecha + "\n\n" +
          "🔔 El equipo de soporte fue notificado.\n" +
          "Te responderán por este medio lo antes posible.\n\n" +
          "Usa `!cerrarticket` para cerrar tu ticket.",
      }, { quoted: msg });
    },
  },

  // ── Cerrar ticket (usuario) ───────────────
  {
    name: "cerrarticket",
    alias: ["closeticket", "cticket"],
    description: "Cierra tu ticket de soporte",
    category: "General",
    execute: async ({ sock, from, reply, react, sender, args, msg }) => {
      // Owner puede cerrar cualquier ticket por ID
      const isOwner = sender.split("@")[0] === config.ownerNumber ||
        (config.subCreators || []).some(s => sender.split("@")[0] === s.replace(/\D/g, ""));

      if (isOwner && args[0]) {
        const id = parseInt(args[0]);
        let encontrado = null;
        for (const [jid, t] of tickets.entries()) {
          if (t.id === id) { encontrado = { jid, t }; break; }
        }
        if (!encontrado) return reply("❌ Ticket #" + id + " no encontrado.");
        tickets.delete(encontrado.jid);
        await react("✅");
        await sock.sendMessage(encontrado.jid, {
          text: "🔒 *Tu ticket #" + id + " fue cerrado por el equipo de soporte.*\n¿Necesitas más ayuda? Abre uno nuevo con `!ticket`.",
        });
        return reply("✅ Ticket #" + id + " cerrado.");
      }

      // Usuario cierra su propio ticket
      if (!tickets.has(sender)) return reply("❌ No tienes ningún ticket abierto.");
      const t = tickets.get(sender);
      tickets.delete(sender);
      await react("🔒");

      // Notificar a creadores
      for (const jid of getCreadores()) {
        try {
          await sock.sendMessage(jid, {
            text: "🔒 *Ticket #" + t.id + " cerrado por el usuario.*\n👤 @" + sender.split("@")[0],
            mentions: [sender],
          });
        } catch {}
      }

      await sock.sendMessage(from, {
        text: "🔒 *Ticket #" + t.id + " cerrado.*\nGracias por contactarnos. Si necesitas más ayuda usa `!ticket`.",
      }, { quoted: msg });
    },
  },

  // ── Responder ticket [OWNER] ──────────────
  {
    name: "rticket",
    alias: ["responderticket", "replyticket"],
    description: "Responde un ticket [OWNER] — !rticket [id] [respuesta]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, reply, react, args, sender }) => {
      const id = parseInt(args[0]);
      const respuesta = args.slice(1).join(" ");
      if (!id || !respuesta) return reply("Uso: `!rticket [id] [respuesta]`\nEj: `!rticket 3 Hola, ya revisamos tu problema`");

      let encontrado = null;
      for (const [jid, t] of tickets.entries()) {
        if (t.id === id) { encontrado = { jid, t }; break; }
      }
      if (!encontrado) return reply("❌ Ticket #" + id + " no encontrado o ya fue cerrado.");

      await react("📨");
      const numero = sender.split("@")[0];
      try {
        await sock.sendMessage(encontrado.jid, {
          text:
            "📨 *RESPUESTA A TU TICKET #" + id + "*\n" +
            "━━━━━━━━━━━━━━\n" +
            "👑 Soporte (@" + numero + "):\n\n" +
            respuesta + "\n\n" +
            "_Responde con `!ticket [mensaje]` si tienes más dudas._\n" +
            "_Usa `!cerrarticket` si tu problema fue resuelto._",
          mentions: [sender],
        });
        await reply("✅ Respuesta enviada al ticket #" + id + ".");
      } catch (e) {
        await reply("❌ No se pudo enviar la respuesta: " + e.message);
      }
    },
  },

  // ── Ver tickets abiertos [OWNER] ──────────
  {
    name: "tickets",
    alias: ["listartickets", "vertickets"],
    description: "Ver todos los tickets abiertos [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, react }) => {
      await react("📋");
      if (tickets.size === 0) return reply("📋 No hay tickets abiertos actualmente.");
      const lista = [...tickets.values()].map(t =>
        "🎫 *#" + t.id + "* — @" + t.sender.split("@")[0] + "\n   📝 " + t.asunto.slice(0, 50) + (t.asunto.length > 50 ? "..." : "")
      ).join("\n\n");
      await reply("📋 *TICKETS ABIERTOS*\n━━━━━━━━━━━━━━\n" + lista + "\n\n_Responde con !rticket [id] [respuesta]_");
    },
  },
];

export default ticketCommands;
