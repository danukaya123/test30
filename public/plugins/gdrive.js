const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const splitFile = require("split-file");
const mime = require("mime-types");

const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// Extract Google Drive file ID
function extractDriveId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Get real download URL (handle confirm token for unsafe files)
async function getDriveDownloadUrl(fileId) {
  const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  const res = await axios.get(baseUrl, { responseType: "text" });
  const confirmMatch = res.data.match(/name="confirm" value="([0-9A-Za-z_]+)"/);

  if (confirmMatch) {
    const token = confirmMatch[1];
    return `https://drive.google.com/uc?export=download&confirm=${token}&id=${fileId}`;
  }

  return baseUrl; // normal public file
}

// Get filename and size from headers
async function getFileInfo(url) {
  const res = await axios.head(url, { maxRedirects: 5 });
  const disposition = res.headers["content-disposition"];
  const fileName = disposition
    ? disposition.split("filename=")[1].replace(/"/g, "")
    : `file-${Date.now()}`;
  const ext = path.extname(fileName) || "." + mime.extension(res.headers["content-type"]);
  const size = parseInt(res.headers["content-length"] || 0);
  return { fileName, ext, size };
}

// Download file
async function downloadFile(url, filePath) {
  const res = await axios({ url, method: "GET", responseType: "stream", maxRedirects: 5 });
  const writer = fs.createWriteStream(filePath);
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Main plugin
cmd(
  {
    pattern: "gdrive",
    alias: ["gd"],
    desc: "Download public Google Drive file (even unsafe/executable)",
    category: "download",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📎 Send a public Google Drive link");

      const fileId = extractDriveId(q);
      if (!fileId) return reply("❌ Invalid Google Drive link");

      reply("*පොඩ්ඩක් ඉදහම් සනික එවන්නම් ❤️‍🩹👀*");

      const downloadUrl = await getDriveDownloadUrl(fileId);
      const { fileName, ext, size } = await getFileInfo(downloadUrl);
      const tempFile = path.join(TEMP_DIR, fileName);

      // Download file
      await downloadFile(downloadUrl, tempFile);

      // Split >2GB automatically
      const MAX_SIZE = 2 * 1024 * 1024 * 1024;
      if (size > MAX_SIZE) {
        const parts = await splitFile.splitFileBySize(tempFile, MAX_SIZE);
        for (let i = 0; i < parts.length; i++) {
          await danuwa.sendMessage(
            from,
            {
              document: { url: parts[i] },
              fileName: `${fileName}.part${i + 1}${ext}`,
              mimetype: mime.lookup(ext) || "application/octet-stream",
            },
            { quoted: mek }
          );
          fs.unlinkSync(parts[i]);
        }
      } else {
        await danuwa.sendMessage(
          from,
          {
            document: { url: tempFile },
            fileName,
            mimetype: mime.lookup(ext) || "application/octet-stream",
          },
          { quoted: mek }
        );
      }

      // React ✅ to the message
      await danuwa.sendMessage(from, {
        react: {
          text: "✅",
          key: mek.key,
        },
      });

      // Cleanup
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch (e) {
      console.log("GDRIVE ERROR:", e);
      reply("❌ Error downloading Google Drive file. Make sure the link is public.");
    }
  }
);
