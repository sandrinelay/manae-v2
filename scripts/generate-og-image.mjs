import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WIDTH = 1200;
const HEIGHT = 630;

// Couleurs Manae
const MINT_BG = '#F2F5F7';
const PRIMARY = '#4A7488';
const TEAL = '#14B8A6';
const TEXT_DARK = '#333538';

async function generateOGImage() {
  // Créer un SVG avec le design incluant le vrai logo et typo Quicksand
  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient -->
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${MINT_BG};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#E8F5F2;stop-opacity:1" />
        </linearGradient>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@700&amp;display=swap');
        </style>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      
      <!-- Decorative circles -->
      <circle cx="100" cy="100" r="200" fill="${PRIMARY}" opacity="0.05"/>
      <circle cx="1100" cy="530" r="250" fill="${PRIMARY}" opacity="0.05"/>
      
      <!-- Logo icon (rounded square with m) -->
      <rect x="525" y="140" width="150" height="150" rx="28" fill="${TEAL}"/>
      <text x="600" y="245" font-family="Quicksand, Arial, sans-serif" font-size="90" font-weight="700" fill="white" text-anchor="middle">m</text>
      
      <!-- App name -->
      <text x="600" y="380" font-family="Quicksand, Arial, sans-serif" font-size="56" font-weight="700" fill="${PRIMARY}" text-anchor="middle">
        Manae
      </text>
      
      <!-- Tagline -->
      <text x="600" y="440" font-family="Quicksand, Arial, sans-serif" font-size="28" font-weight="500" fill="${TEXT_DARK}" text-anchor="middle">
        Organise ta vie de parent sereinement
      </text>
    </svg>
  `;

  const outputPath = path.join(__dirname, '../public/icons/og-image.png');

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log('✅ OG image générée avec logo et typo Quicksand:', outputPath);
}

generateOGImage().catch(console.error);
