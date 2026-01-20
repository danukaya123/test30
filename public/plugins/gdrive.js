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

function extractDriveId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

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

async function getFileInfo(url) {
  const res = await axios.head(url, { maxRedirects: 5 });
  const disposition = res.headers["content-disposition"];
  const fileName = disposition
    ? disposition.split("filename=")[1].replace(/"/g, "")
    : `file-${Date.now()}`;
  const ext = path.extname(fileName) || "." + mime.extension(res.headers["content-type"]);
  const size = parseInt(res.headers["content-length"] || 0);
  console.log("[DEBUG] File info:", { fileName, ext, size });
  return { fileName, ext, size };
}

async function downloadFile(url, filePath) {
  console.log("[DEBUG] Starting download to:", filePath);
  const writer = fs.createWriteStream(filePath);
  const res = await axios({ url, method: "GET", responseType: "stream", maxRedirects: 5 });
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      console.log("[DEBUG] Download finished:", filePath);
      resolve();
    });
    writer.on("error", (err) => {
      console.log("[DEBUG] Download error:", err);
      reject(err);
    });
  });
}

async function zipParts(parts, baseName) {
  const zipPath = `${TEMP_DIR}/${baseName}.zip`;
  console.log("[DEBUG] Creating zip:", zipPath);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(output);
  parts.forEach((p) => archive.file(p, { name: path.basename(p) }));
  await archive.finalize();
  console.log("[DEBUG] Zip created:", zipPath);
  return zipPath;
}

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
      console.log("[DEBUG] Download URL:", downloadUrl);

      const { fileName, ext, size } = await getFileInfo(downloadUrl);

      const MAX_SIZE = 1.8 * 1024 * 1024 * 1024; // 2GB
      console.log("[DEBUG] File size vs MAX_SIZE:", { size, MAX_SIZE });

      const tempFile = path.join(TEMP_DIR, fileName);

      if (size > MAX_SIZE) {
        console.log("[DEBUG] File >2GB, downloading to temp...");
        await downloadFile(downloadUrl, tempFile);

        console.log("[DEBUG] Splitting file into parts...");
        const parts = await splitFile.splitFileBySize(tempFile, MAX_SIZE);
        console.log("[DEBUG] Parts created:", parts);

        console.log("[DEBUG] Zipping parts...");
        const zippedPath = await zipParts(parts, path.parse(fileName).name);

        console.log("[DEBUG] Sending zip to WhatsApp...");
        await danuwa.sendMessage(
          from,
          {
            document: { url: zippedPath },
            fileName: path.basename(zippedPath),
            mimetype: "application/zip",
          },
          { quoted: mek }
        );

        console.log("[DEBUG] Cleaning temp files...");
        fs.unlinkSync(tempFile);
        fs.unlinkSync(zippedPath);
        parts.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
      } else {
        console.log("[DEBUG] File <=2GB, streaming directly...");
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

      console.log("[DEBUG] Reacting with ✅");
      await danuwa.sendMessage(from, {
        react: { text: "✅", key: mek.key },
      });

    } catch (e) {
      console.log("GDRIVE ERROR:", e);
      reply("❌ Error downloading Google Drive file. Make sure the link is public.");
    }
  }
);

