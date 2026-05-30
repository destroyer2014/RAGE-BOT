// ════════════════════════════════════════════
//  PRAGMATA BOT — src/lib/sockGlobal.js
//  Instancia global del sock para broadcasting
// ════════════════════════════════════════════

let _sock = null;

export function setSock(sock) {
  _sock = sock;
}

export function getSock() {
  return _sock;
}

/**
 * Envía un mensaje a todos los grupos donde está el bot.
 * @param {string} text - Texto a enviar
 * @param {number} delay - ms entre mensajes (default 800)
 */
export async function broadcastGrupos(text, delay = 800) {
  if (!_sock) return;
  try {
    const grupos = await _sock.groupFetchAllParticipating();
    const jids = Object.keys(grupos);
    for (const jid of jids) {
      try {
        await _sock.sendMessage(jid, { text });
        await new Promise(r => setTimeout(r, delay));
      } catch {}
    }
    return jids.length;
  } catch {
    return 0;
  }
}

/**
 * Envía un mensaje a todos los grupos Y chats privados del bot.
 * @param {string} text - Texto a enviar
 * @param {number} delay - ms entre mensajes (default 800)
 */
export async function broadcastTodos(text, delay = 800) {
  if (!_sock) return { grupos: 0, chats: 0 };
  let grupos = 0, chats = 0;
  try {
    // Grupos
    const gruposData = await _sock.groupFetchAllParticipating();
    for (const jid of Object.keys(gruposData)) {
      try { await _sock.sendMessage(jid, { text }); grupos++; } catch {}
      await new Promise(r => setTimeout(r, delay));
    }
    // Chats privados (excluye grupos, broadcasts y el propio bot)
    const allChats = await _sock.getChats?.() || [];
    const privados = allChats.filter(c =>
      c.id.endsWith("@s.whatsapp.net") && !c.id.startsWith("status")
    );
    for (const chat of privados) {
      try { await _sock.sendMessage(chat.id, { text }); chats++; } catch {}
      await new Promise(r => setTimeout(r, delay));
    }
  } catch {}
  return { grupos, chats };
}
