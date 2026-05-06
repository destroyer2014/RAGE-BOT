// ═══════════════════════════════════════════
//         RAGE-BOT — src/lib/utils.js
//              v2.5.0
// ═══════════════════════════════════════════

import config from "../../config.js";

// Limpia JID: quita device suffix (:0, :2, etc.)
export function cleanJid(jid = "") {
  return jid.replace(/:[0-9]+@/g, "@");
}

export function getNumber(jid = "") {
  return jid.split("@")[0];
}

// Detecta owner, ownerLid, subCreators (números) y subCreatorLids
export function isOwner(jid) {
  const clean = cleanJid(jid);
  const num = clean.split("@")[0].replace(/[^0-9]/g, "");

  // Owner principal por número
  const isMain =
    num === config.ownerNumber ||
    num.endsWith(config.ownerNumber);

  // Owner por LID
  const isMainLid = config.ownerLid && num === config.ownerLid;

  // Sub-creadores por número
  const isSub = (config.subCreators || []).some(
    (sub) => num === sub.replace(/[^0-9]/g, "")
  );

  // Sub-creadores por LID (ej: 238722939379788@lid)
  const isSubLid = (config.subCreatorLids || []).some(
    (lid) => num === lid.replace(/[^0-9]/g, "")
  );

  return isMain || isMainLid || isSub || isSubLid;
}

export function isGroup(jid = "") {
  return jid.endsWith("@g.us");
}

export function parseMessage(msg) {
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";
  const isCmd = body.startsWith(config.prefix);
  const parts = body.slice(isCmd ? config.prefix.length : 0).trim().split(/\s+/);
  const command = isCmd ? parts[0].toLowerCase() : "";
  const args = parts.slice(1);
  const text = args.join(" ");
  return { body, isCmd, command, args, text };
}

export function getMessageType(msg) {
  return Object.keys(msg.message || {})[0] || "unknown";
}

export function getQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    message: ctx.quotedMessage,
    sender: ctx.participant || ctx.remoteJid,
    stanzaId: ctx.stanzaId,
  };
}

export function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];;
}

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
