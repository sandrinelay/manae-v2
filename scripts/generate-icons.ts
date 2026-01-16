/**
 * Script de génération des icônes PWA
 *
 * Ce script génère les icônes PNG à partir du fichier SVG source.
 *
 * Usage:
 *   npx tsx scripts/generate-icons.ts
 *
 * Prérequis:
 *   - npm install sharp
 *   - Fichier source: public/icons/icon.svg
 *
 * Note: Si sharp n'est pas installé, ce script affichera les instructions
 * pour générer manuellement les icônes avec un outil en ligne.
 */

import { existsSync } from 'fs'
import { join } from 'path'

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const INPUT_SVG = join(process.cwd(), 'public/icons/icon.svg')
const OUTPUT_DIR = join(process.cwd(), 'public/icons')

async function generateIcons() {
  console.log('')
  console.log('🎨 Générateur d\'icônes PWA Manae')
  console.log('================================')
  console.log('')

  // Vérifier que le SVG source existe
  if (!existsSync(INPUT_SVG)) {
    console.error('❌ Fichier source non trouvé:', INPUT_SVG)
    console.log('')
    console.log('💡 Crée d\'abord un fichier icon.svg dans public/icons/')
    process.exit(1)
  }

  // Essayer d'importer sharp
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.log('⚠️  Le package "sharp" n\'est pas installé.')
    console.log('')
    console.log('Options:')
    console.log('')
    console.log('1. Installer sharp et relancer:')
    console.log('   npm install sharp --save-dev')
    console.log('   npx tsx scripts/generate-icons.ts')
    console.log('')
    console.log('2. Générer manuellement les icônes:')
    console.log('   - Utilise https://realfavicongenerator.net/')
    console.log('   - Ou https://www.pwabuilder.com/imageGenerator')
    console.log('')
    console.log('Tailles requises:')
    SIZES.forEach(size => {
      console.log(`   - icon-${size}x${size}.png`)
    })
    console.log('')
    console.log('Place les fichiers dans public/icons/')
    process.exit(0)
  }

  console.log(`📁 Source: ${INPUT_SVG}`)
  console.log(`📁 Destination: ${OUTPUT_DIR}`)
  console.log('')

  for (const size of SIZES) {
    const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`)

    try {
      await sharp(INPUT_SVG)
        .resize(size, size)
        .png()
        .toFile(outputPath)

      console.log(`   ✅ icon-${size}x${size}.png`)
    } catch (err) {
      console.error(`   ❌ icon-${size}x${size}.png - Erreur:`, err)
    }
  }

  // Générer aussi favicon.ico (32x32) et apple-touch-icon (180x180)
  try {
    await sharp(INPUT_SVG)
      .resize(32, 32)
      .png()
      .toFile(join(OUTPUT_DIR, '../favicon.png'))
    console.log(`   ✅ favicon.png (32x32)`)
  } catch (err) {
    console.error(`   ❌ favicon.png - Erreur:`, err)
  }

  try {
    await sharp(INPUT_SVG)
      .resize(180, 180)
      .png()
      .toFile(join(OUTPUT_DIR, 'apple-touch-icon.png'))
    console.log(`   ✅ apple-touch-icon.png (180x180)`)
  } catch (err) {
    console.error(`   ❌ apple-touch-icon.png - Erreur:`, err)
  }

  console.log('')
  console.log('================================')
  console.log('✅ Génération terminée!')
  console.log('')
}

generateIcons().catch(console.error)
