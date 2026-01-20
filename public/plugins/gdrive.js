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

async function zipFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    archive.file(inputPath, { name: path.basename(inputPath) });
    archive.finalize();
    output.on("close", () => resolve(outputPath));
    archive.on("error", (err) => reject(err));
  });
}

cmd(
  {
    pattern: "gdrive",
    alias: ["gd"],
    desc: "Download public Google Drive files (stream + split >1.8GB, 500MB parts)",
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
      const PART_SIZE = 500 * 1024 * 1024; // 500MB

      const tempFile = path.join(TEMP_DIR, fileName);

      if (size > MAX_SIZE) {
        reply("*සුද්දා File size එක වැඩි නිසා Parts වලට කඩල එවන්නම්...ටිකක් ඉන්න ❤️‍🩹👀*");
        console.log("[DEBUG] File >1.8GB, downloading to temp...");
        await downloadFile(downloadUrl, tempFile);

        console.log("[DEBUG] Splitting file into 500MB parts...");
        const parts = await splitFile.splitFileBySize(tempFile, PART_SIZE);
        console.log("[DEBUG] Parts created:", parts);

        console.log("[DEBUG] Zipping parts in parallel...");
        const zipPromises = parts.map((part, i) => {
          const zipPath = path.join(TEMP_DIR, `${path.parse(fileName).name}-part${i + 1}.zip`);
          return zipFile(part, zipPath);
        });
        const zippedParts = await Promise.all(zipPromises);
        console.log("[DEBUG] All parts zipped:", zippedParts);

        console.log("[DEBUG] Sending zipped parts sequentially...");
for (let i = 0; i < zippedParts.length; i++) {
  const zipPath = zippedParts[i];
  const partNumber = i + 1;
  const totalParts = zippedParts.length;
  const caption = `📦 ${path.basename(zipPath, ".zip")} - Part ${partNumber}/${totalParts}`;

  await danuwa.sendMessage(
    from,
    {
      document: { url: zipPath },
      fileName: path.basename(zipPath),
      mimetype: "application/zip",
      caption, // add the caption here
    },
    { quoted: mek }
  );
}


        console.log("[DEBUG] Cleaning temp files...");
        fs.unlinkSync(tempFile);
        zippedParts.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
        parts.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));

      } else {
        console.log("[DEBUG] File <=1.8GB, sending directly...");
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

