import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = join(__dirname, '../public/icons');

// SVG source avec fond teal et "m" blanc
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#14B8A6"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="280" font-weight="700" fill="white" text-anchor="middle">m</text>
</svg>`;

async function generateIcons() {
  await mkdir(iconDir, { recursive: true });

  for (const size of sizes) {
    const outputPath = join(iconDir, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Apple Touch Icon (180x180)
  await sharp(Buffer.from(svgContent))
    .resize(180, 180)
    .png()
    .toFile(join(iconDir, 'apple-touch-icon.png'));

  console.log('Generated: apple-touch-icon.png');

  // Favicon 32x32
  await sharp(Buffer.from(svgContent))
    .resize(32, 32)
    .png()
    .toFile(join(iconDir, 'favicon-32x32.png'));

  console.log('Generated: favicon-32x32.png');

  // Favicon 16x16
  await sharp(Buffer.from(svgContent))
    .resize(16, 16)
    .png()
    .toFile(join(iconDir, 'favicon-16x16.png'));

  console.log('Generated: favicon-16x16.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
