const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const svgPath = path.join(__dirname, "..", "public", "waiter-emoji.svg");
const pngPath = path.join(__dirname, "..", "public", "waiter-emoji.png");

const svg = fs.readFileSync(svgPath);

sharp(Buffer.from(svg))
  .png()
  .toFile(pngPath)
  .then(() => console.log("Saved:", pngPath))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
