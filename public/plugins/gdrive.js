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
  const writer = fs.createWriteStream(filePath);
  const res = await axios({ url, method: "GET", responseType: "stream", maxRedirects: 5 });
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve());
    writer.on("error", reject);
  });
}

async function zipPart(partPath, zipName) {
  const zipPath = path.join(TEMP_DIR, zipName);
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 1 } });
    output.on("close", () => resolve(zipPath));
    archive.on("error", (err) => reject(err));
    archive.pipe(output);
    archive.file(partPath, { name: path.basename(partPath) });
    archive.finalize();
  });
}

cmd(
  {
    pattern: "gdrive",
    alias: ["gd"],
    desc: "Download public Google Drive files (split >1.8GB in parallel)",
    category: "download",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📎 Send a public Google Drive link");

      const fileId = extractDriveId(q);
      if (!fileId) return reply("❌ Invalid Google Drive link");

      const downloadUrl = await getDriveDownloadUrl(fileId);
      console.log("[DEBUG] Download URL:", downloadUrl);

      const { fileName, ext, size } = await getFileInfo(downloadUrl);

      const MAX_SIZE = 1.8 * 1024 * 1024 * 1024; // 1.8GB
      const tempFile = path.join(TEMP_DIR, fileName);

      if (size > MAX_SIZE) {
        // Warn user
        await reply("*සුද්දා File size එක වැඩි නිසා Parts වලට කඩල එවන්නම්...ටිකක් ඉන්න ❤️‍🩹👀*");

        // Download full file first
        await downloadFile(downloadUrl, tempFile);

        // Split file into parts
        const PART_SIZE = 500 * 1024 * 1024;
        const parts = await splitFile.splitFileBySize(tempFile, PART_SIZE);

        // Send all parts in parallel
        const sendPromises = parts.map(async (part, index) => {
          const zipName = `${path.parse(fileName).name}-part${index + 1}.zip`;
          const zipPath = await zipPart(part, zipName);

          const sent = await danuwa.sendMessage(
            from,
            {
              document: { url: zipPath },
              fileName: zipName,
              mimetype: "application/zip",
              caption: `📦 Part ${index + 1} of ${parts.length}`,
            },
            { quoted: mek }
          );

          // React with ✅ for each part
          await danuwa.sendMessage(from, {
            react: { text: "✅", key: sent.key },
          });

          // Clean up temp files
          fs.existsSync(part) && fs.unlinkSync(part);
          fs.existsSync(zipPath) && fs.unlinkSync(zipPath);
        });

        await Promise.all(sendPromises);
        fs.existsSync(tempFile) && fs.unlinkSync(tempFile);
      } else {
        // File <=1.8GB send directly
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

      // React with ✅ after finished
      await danuwa.sendMessage(from, {
        react: { text: "✅", key: mek.key },
      });
    } catch (e) {
      console.log("GDRIVE ERROR:", e);
      reply("❌ Error downloading Google Drive file. Make sure the link is public.");
    }
  }
);
