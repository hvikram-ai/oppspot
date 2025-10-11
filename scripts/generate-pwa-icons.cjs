const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Icon sizes for PWA
const iconSizes = [
  16, 32, 72, 96, 128, 144, 152, 192, 384, 512
];

// Additional Apple/Safari sizes
const appleSizes = [
  { size: 180, name: 'apple-touch-icon' }
];

// Splash screen sizes for iOS
const splashScreens = [
  { width: 640, height: 1136, name: 'splash-640x1136' },
  { width: 750, height: 1334, name: 'splash-750x1334' },
  { width: 1125, height: 2436, name: 'splash-1125x2436' },
  { width: 1170, height: 2532, name: 'splash-1170x2532' },
  { width: 1284, height: 2778, name: 'splash-1284x2778' }
];

async function ensureDirectory(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function generateIcon(size) {
  const iconPath = path.join(__dirname, '../public/icons');
  await ensureDirectory(iconPath);

  // Create a gradient background with sparkle icon
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
      <g transform="translate(${size/2}, ${size/2})">
        <path transform="translate(-${size * 0.25}, -${size * 0.25})"
              d="M ${size * 0.25} ${size * 0.1}
                 L ${size * 0.3} ${size * 0.2}
                 L ${size * 0.4} ${size * 0.15}
                 L ${size * 0.3} ${size * 0.25}
                 L ${size * 0.35} ${size * 0.4}
                 L ${size * 0.25} ${size * 0.3}
                 L ${size * 0.15} ${size * 0.35}
                 L ${size * 0.2} ${size * 0.25}
                 Z"
              stroke="white" stroke-width="${size * 0.02}" fill="white" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(iconPath, `icon-${size}x${size}.png`));

  console.log(`✓ Generated icon-${size}x${size}.png`);
}

async function generateAppleIcon(config) {
  const iconPath = path.join(__dirname, '../public/icons');
  await ensureDirectory(iconPath);

  const size = config.size;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
      <g transform="translate(${size/2}, ${size/2})">
        <path transform="translate(-${size * 0.25}, -${size * 0.25})"
              d="M ${size * 0.25} ${size * 0.1}
                 L ${size * 0.3} ${size * 0.2}
                 L ${size * 0.4} ${size * 0.15}
                 L ${size * 0.3} ${size * 0.25}
                 L ${size * 0.35} ${size * 0.4}
                 L ${size * 0.25} ${size * 0.3}
                 L ${size * 0.15} ${size * 0.35}
                 L ${size * 0.2} ${size * 0.25}
                 Z"
              stroke="white" stroke-width="${size * 0.02}" fill="white" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(iconPath, `${config.name}.png`));

  console.log(`✓ Generated ${config.name}.png`);
}

async function generateSplashScreen(config) {
  const iconPath = path.join(__dirname, '../public/icons');
  await ensureDirectory(iconPath);

  const { width, height, name } = config;
  const iconSize = Math.min(width, height) * 0.3;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      <g transform="translate(${width/2}, ${height/2})">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect x="${-iconSize/2}" y="${-iconSize/2}" width="${iconSize}" height="${iconSize}"
              rx="${iconSize * 0.15}" fill="url(#grad)"/>
        <path transform="translate(-${iconSize * 0.25}, -${iconSize * 0.25})"
              d="M ${iconSize * 0.25} ${iconSize * 0.1}
                 L ${iconSize * 0.3} ${iconSize * 0.2}
                 L ${iconSize * 0.4} ${iconSize * 0.15}
                 L ${iconSize * 0.3} ${iconSize * 0.25}
                 L ${iconSize * 0.35} ${iconSize * 0.4}
                 L ${iconSize * 0.25} ${iconSize * 0.3}
                 L ${iconSize * 0.15} ${iconSize * 0.35}
                 L ${iconSize * 0.2} ${iconSize * 0.25}
                 Z"
              stroke="white" stroke-width="${iconSize * 0.02}" fill="white" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="0" y="${iconSize * 0.8}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif"
              font-size="${iconSize * 0.15}" font-weight="600" fill="#1f2937">oppSpot</text>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(iconPath, `${name}.png`));

  console.log(`✓ Generated ${name}.png`);
}

async function generateAllIcons() {
  console.log('🎨 Generating PWA icons...\n');

  try {
    // Check if sharp is installed
    const sharpVersion = sharp.versions;
    console.log(`Using sharp v${sharpVersion.sharp}\n`);

    // Generate standard PWA icons
    console.log('Generating PWA icons:');
    for (const size of iconSizes) {
      await generateIcon(size);
    }

    // Generate Apple icons
    console.log('\nGenerating Apple icons:');
    for (const config of appleSizes) {
      await generateAppleIcon(config);
    }

    // Generate splash screens
    console.log('\nGenerating splash screens:');
    for (const config of splashScreens) {
      await generateSplashScreen(config);
    }

    // Create favicon.ico (multi-resolution)
    console.log('\nGenerating favicon.ico...');
    const iconPath = path.join(__dirname, '../public');
    await sharp(Buffer.from(createSvgIcon(32)))
      .png()
      .toFile(path.join(iconPath, 'favicon.ico'));
    console.log('✓ Generated favicon.ico');

    console.log('\n✅ All icons generated successfully!');
    console.log('\nNote: You can customize the icon design by modifying the SVG in this script.');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    console.log('\nMake sure sharp is installed:');
    console.log('npm install --save-dev sharp --legacy-peer-deps');
    process.exit(1);
  }
}

function createSvgIcon(size) {
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
      <g transform="translate(${size/2}, ${size/2})">
        <path transform="translate(-${size * 0.25}, -${size * 0.25})"
              d="M ${size * 0.25} ${size * 0.1}
                 L ${size * 0.3} ${size * 0.2}
                 L ${size * 0.4} ${size * 0.15}
                 L ${size * 0.3} ${size * 0.25}
                 L ${size * 0.35} ${size * 0.4}
                 L ${size * 0.25} ${size * 0.3}
                 L ${size * 0.15} ${size * 0.35}
                 L ${size * 0.2} ${size * 0.25}
                 Z"
              stroke="white" stroke-width="${size * 0.02}" fill="white" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>
  `;
}

// Run the script
generateAllIcons();