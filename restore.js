// ═══════════════════════════════════════════
//   RAGE-BOT — restore.js
//   Restaura sesión y config desde env vars
// ═══════════════════════════════════════════

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Restaurar sesión desde SESSION_DATA ──────
if (process.env.SESSION_DATA) {
  try {
    const sessionDir = join(__dirname, "session");
    if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true });

    const buff = Buffer.from(process.env.SESSION_DATA, "base64");
    writeFileSync(join(__dirname, "session.zip"), buff);

    const { execSync } = await import("child_process");
    execSync(`unzip -o session.zip -d ${__dirname}`);
    console.log("[RESTORE] ✅ Sesión restaurada correctamente.");
  } catch (e) {
    console.error("[RESTORE] ❌ Error al restaurar sesión:", e.message);
  }
} else {
  console.log("[RESTORE] ⚠️ No hay SESSION_DATA, iniciando sin sesión (se generará QR).");
}

// ── Generar config.js desde variables de entorno ─
const configData = `
const config = {
  ownerNumber: "${process.env.OWNER_NUMBER || "51917611323"}",
  ownerName: "${process.env.OWNER_NAME || "Zemo"}",
  ownerLid: "${process.env.OWNER_LID || "50148205949148"}",
  botName: "${process.env.BOT_NAME || "RAGE-BOT"}",
  prefix: "${process.env.PREFIX || "!"}",
  botVersion: "3.0.8",
  subCreators: [],
  subCreatorLids: [],
};
export default config;
`.trim();

writeFileSync(join(__dirname, "config.js"), configData);
console.log("[RESTORE] ✅ Config generado desde variables de entorno.");
