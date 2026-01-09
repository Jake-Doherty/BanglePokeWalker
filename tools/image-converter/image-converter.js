const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Your 16-color palette (RGB)
const paletteRGB = [
  [196, 207, 180],
  [184, 195, 169],
  [171, 183, 158],
  [161, 171, 147],
  [142, 153, 131],
  [126, 136, 117],
  [111, 120, 104],
  [96, 104, 90],
  [81, 89, 77],
  [68, 75, 65],
  [55, 61, 53],
  [43, 48, 42],
  [30, 33, 29],
  [21, 24, 20],
  [13, 15, 13],
  [5, 5, 5],
];

function getClosestIndex(pixelValue) {
  return Math.floor((255 - pixelValue) / 16);
}

async function convertWithPalette() {
  // Anchoring paths to __dirname to ensure they work from the root npm script
  const inputDir = path.join(__dirname, "../../assets/showdown/");
  const outputDir = path.join(__dirname, "../../assets/dist/");
  const FRAME_GAP = 4;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".gif"));

  for (const file of files) {
    const fileName = path.parse(file).name;

    // CRITICAL FIX: Create the absolute path for Sharp to use
    const fullInputPath = path.join(inputDir, file);

    try {
      // Use fullInputPath instead of just 'file'
      const metadata = await sharp(fullInputPath).metadata();

      const processFrame = async (idx) => {
        // Use fullInputPath here as well
        return await sharp(fullInputPath, { page: idx })
          .ensureAlpha()
          .resize(64, 64, { kernel: "nearest" })
          .raw()
          .toBuffer({ resolveWithObject: true });
      };

      const { data: d0 } = await processFrame(0);
      let secondFrameIndex = Math.min(FRAME_GAP, metadata.pages - 1);
      if (secondFrameIndex < 0) secondFrameIndex = 0;
      const { data: d1 } = await processFrame(secondFrameIndex);

      const atlasRaw = Buffer.concat([d0, d1]);
      const packed = Buffer.alloc(atlasRaw.length / 8);

      for (let i = 0; i < atlasRaw.length / 4; i++) {
        const r = atlasRaw[i * 4];
        const g = atlasRaw[i * 4 + 1];
        const b = atlasRaw[i * 4 + 2];
        const a = atlasRaw[i * 4 + 3];

        let colorIndex;
        if (a < 128) {
          colorIndex = 0;
        } else {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          colorIndex = getClosestIndex(lum);
          if (colorIndex === 0) colorIndex = 1;
        }

        const byteIdx = Math.floor(i / 2);
        if (i % 2 === 0) {
          packed[byteIdx] = colorIndex << 4;
        } else {
          packed[byteIdx] |= colorIndex & 0x0f;
        }
      }

      const header = Buffer.from([64, 128, 4]);
      const fullOutputPath = path.join(outputDir, `pws-${fileName}.img`);

      fs.writeFileSync(fullOutputPath, Buffer.concat([header, packed]));

      console.log(`✓ pws-{fileName}.img using Frame 0 & ${secondFrameIndex}`);
    } catch (err) {
      // Updated error message to show exactly where it was looking
      console.error(`✗ Error processing ${file}: ${err.message}`);
    }
  }
}

convertWithPalette();
