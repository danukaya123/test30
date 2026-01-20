const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

const {
  extractId,
  getMeta,
  listFolder,
  downloadFile,
  splitIfNeeded,
} = require("../lib/gdrive");

cmd(
  {
    pattern: "gdrive",
    alias: ["gd"],
    desc: "Download Google Drive files or folders",
    category: "download",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📁 Send Google Drive file or folder link");

      reply("*පොඩ්ඩක් ඉදහම් සනික එවන්නම් ❤️‍🩹👀*");

      const id = extractId(q);
      if (!id) return reply("❌ Invalid Google Drive link");

      const meta = await getMeta(id);

      // ================= FILE =================
      if (meta.mimeType !== "application/vnd.google-apps.folder") {
        const filePath = path.join("./temp", meta.name);
        await downloadFile(id, filePath);

        const parts = await splitIfNeeded(filePath);

        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          const type = mime.lookup(p) || "application/octet-stream";

          const sent = await danuwa.sendMessage(
            from,
            {
              document: { url: p },
              mimetype: type,
              fileName:
                parts.length > 1
                  ? `${meta.name}.part${i + 1}`
                  : meta.name,
            },
            { quoted: mek }
          );

          await danuwa.sendMessage(from, {
            react: { text: "✅", key: sent.key },
          });
        }
        return;
      }

      // ================= FOLDER =================
      const files = await listFolder(id);
      for (const file of files) {
        if (!file.size) continue;

        const filePath = path.join("./temp", file.name);
        await downloadFile(file.id, filePath);

        const parts = await splitIfNeeded(filePath);

        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          const type = mime.lookup(p) || "application/octet-stream";

          await danuwa.sendMessage(
            from,
            {
              document: { url: p },
              mimetype: type,
              fileName:
                parts.length > 1
                  ? `${file.name}.part${i + 1}`
                  : file.name,
            },
            { quoted: mek }
          );
        }
      }

    } catch (e) {
      console.log("GDRIVE ERROR:", e);
      reply("❌ Error while downloading Google Drive content");
    }
  }
);
