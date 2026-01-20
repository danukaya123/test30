const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const splitFile = require("split-file");
const mime = require("mime-types");

const TEMP_DIR = "./temp";

// Helper: Ensure temp folder exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// Helper: Convert Google Drive public link to direct download URL
function getDriveDirectUrl(url) {
  const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!fileIdMatch) return null;
  const fileId = fileIdMatch[1];
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Helper: Get filename and extension from headers
async function getFileInfo(url) {
  const res = await axios.head(url, { maxRedirects: 5 });
  const disposition = res.headers["content-disposition"];
  let fileName = disposition
    ? disposition.split("filename=")[1].replace(/"/g, "")
    : `file-${Date.now()}`;
  const ext = path.extname(fileName) || "." + mime.extension(res.headers["content-type"]);
  return { fileName, ext, size: parseInt(res.headers["content-length"] || 0) };
}

// Helper: Download file
async function downloadFile(url, filePath) {
  const writer = fs.createWriteStream(filePath);
  const res = await axios({ url, method: "GET", responseType: "stream" });
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
    desc: "Download public Google Drive file",
    category: "download",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📎 Send a public Google Drive link");

      const directUrl = getDriveDirectUrl(q);
      if (!directUrl) return reply("❌ Invalid Google Drive link");

      reply("*පොඩ්ඩක් ඉදහම් සනික එවන්නම් ❤️‍🩹👀*");

      const { fileName, ext, size } = await getFileInfo(directUrl);
      const tempFile = path.join(TEMP_DIR, fileName);

      // Download file
      await downloadFile(directUrl, tempFile);

      // If file >2GB, split
      const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
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
          fs.unlinkSync(parts[i]); // remove part after sending
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
