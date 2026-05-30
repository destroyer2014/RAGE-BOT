// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/pdf_dl.js
//   Descarga PDF desde cualquier URL
// ═══════════════════════════════════════════

import axios from "axios";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

async function downloadPdf(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Accept: "application/pdf,*/*",
    },
  });

  const contentType = res.headers["content-type"] || "";
  if (!contentType.includes("pdf") && !url.toLowerCase().endsWith(".pdf")) {
    // Intentar igual si el buffer empieza con %PDF
    const magic = Buffer.from(res.data).slice(0, 4).toString();
    if (magic !== "%PDF") throw new Error("NOT_PDF");
  }

  return Buffer.from(res.data);
}

// Extrae nombre del PDF desde la URL
function getPdfName(url) {
  try {
    const parts = new URL(url).pathname.split("/");
    const name = parts[parts.length - 1];
    if (name.toLowerCase().endsWith(".pdf")) return name;
  } catch {}
  return `documento_${Date.now()}.pdf`;
}

const pdfCommands = [
  {
    name: "pdf",
    alias: ["descargarpdf", "dlpdf", "getpdf"],
    description: "Descarga un PDF desde una URL !pdf [url]",
    category: "Utilidades 🛠️",
    execute: async ({ text, args, reply, react, sock, from, msg }) => {
      const url = (args[0] || text || "").trim();

      if (!url || !url.startsWith("http")) {
        return reply(
          "📄 *!pdf*\n━━━━━━━━━━━━━━\n" +
          "Descarga un PDF desde cualquier enlace.\n\n" +
          "Uso: `!pdf [url del pdf]`\n" +
          "Ej: `!pdf https://ejemplo.com/documento.pdf`"
        );
      }

      await react("📄");
      await sock.sendMessage(from, { text: "⬇️ Descargando PDF..." }, { quoted: msg });

      const tmpPath = join(tmpdir(), `ragepdf_${Date.now()}.pdf`);

      try {
        const buffer = await downloadPdf(url);
        await writeFile(tmpPath, buffer);

        const fileName = getPdfName(url);
        const sizeMb = (buffer.length / 1024 / 1024).toFixed(2);

        if (buffer.length > 64 * 1024 * 1024) {
          return reply("❌ El PDF es demasiado grande (máx 64MB para WhatsApp).");
        }

        await sock.sendMessage(
          from,
          {
            document: { url: `file://${tmpPath}` },
            mimetype: "application/pdf",
            fileName,
            caption: `📄 *${fileName}*\n💾 ${sizeMb} MB\n\n_Descargado por PRAGMATA BOT_`,
          },
          { quoted: msg }
        );

        await react("✅");
      } catch (err) {
        console.error("[PDF]", err.message);
        if (err.message === "NOT_PDF") {
          await reply("❌ El link no apunta a un PDF válido.");
        } else if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
          await reply("❌ No pude conectarme a esa URL. Verifica el enlace.");
        } else {
          await reply("❌ Error al descargar el PDF. El link puede requerir login o no ser público.");
        }
        await react("❌");
      } finally {
        unlink(tmpPath).catch(() => {});
      }
    },
  },
];

export default pdfCommands;
