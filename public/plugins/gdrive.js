const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const splitFile = require("split-file");
const archiver = require("archiver");
const mime = require("mime-types");
const cheerio = require("cheerio");

const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// Extract Google Drive file ID
function extractDriveId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Get download URL (handles "Download anyway" page)
async function getDriveDownloadUrl(fileId) {
  const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await axios.get(baseUrl, { responseType: "text" });
  const $ = cheerio.load(res.data);
  const form = $("#download-form");
  if (form.length) {
    const action = form.attr("action");
    const params = {};
    form.find("input[type=hidden]").each((i, el) => {
      params[$(el).attr("name")] = $(el).attr("value");
    });
    const query = new URLSearchParams(params).toString();
    return `${action}?${query}`;
  }
  return baseUrl;
}

// Get file info (size & extension)
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

// Download file to path
async function downloadFile(url, filePath) {
  const writer = fs.createWriteStream(filePath);
  const res = await axios({ url, method: "GET", responseType: "stream", maxRedirects: 5 });
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Zip multiple parts
async function zipParts(parts, baseName) {
  const zipPath = `${TEMP_DIR}/${baseName}.zip`;
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(output);
  parts.forEach((p) => archive.file(p, { name: path.basename(p) }));
  await archive.finalize();
  return zipPath;
}

// DANUWA-MD Google Drive Plugin
cmd(
  {
    pattern: "gdrive",
    alias: ["gd"],
    desc: "Download public Google Drive files (stream + split >2GB)",
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

      // If file >2GB, split into equal parts
      const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
      if (size > MAX_SIZE) {
        await downloadFile(downloadUrl, tempFile);
        const parts = await splitFile.splitFileBySize(tempFile, MAX_SIZE);
        const zippedPath = await zipParts(parts, path.parse(fileName).name);

        await danuwa.sendMessage(
          from,
          {
            document: { url: zippedPath },
            fileName: path.basename(zippedPath),
            mimetype: "application/zip",
          },
          { quoted: mek }
        );

        // Clean up
        fs.unlinkSync(tempFile);
        fs.unlinkSync(zippedPath);
        parts.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
      } else {
        // Stream small files
        await danuwa.sendMessage(
          from,
          {
            document: { url: downloadUrl },
            fileName,
            mimetype: mime.lookup(ext) || "application/octet-stream",
          },
          { quoted: mek }
        );
      }

      // React ✅
      await danuwa.sendMessage(from, {
        react: { text: "✅", key: mek.key },
      });
    } catch (e) {
      console.log("GDRIVE ERROR:", e);
      reply("❌ Error downloading Google Drive file. Make sure the link is public.");
    }
  }
);
