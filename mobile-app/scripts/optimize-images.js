const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const SIZES = {
  small: 640,
  medium: 1280,
  large: 1920
};

async function optimizeImages(inputDir) {
  try {
    const files = await fs.readdir(inputDir);
    
    for (const file of files) {
      if (!file.match(/\.(jpg|jpeg)$/i)) continue;
      
      const inputPath = path.join(inputDir, file);
      const baseName = path.basename(file, path.extname(file));
      
      // Create different sizes
      for (const [size, width] of Object.entries(SIZES)) {
        const outputJpg = path.join(inputDir, `${baseName}-${size}.jpg`);
        const outputWebp = path.join(inputDir, `${baseName}-${size}.webp`);
        
        await sharp(inputPath)
          .resize(width, null, { 
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: 80, progressive: true })
          .toFile(outputJpg);
          
        await sharp(inputPath)
          .resize(width, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .webp({ quality: 80 })
          .toFile(outputWebp);
      }
    }
  } catch (error) {
    console.error('Error optimizing images:', error);
  }
}

const directories = [
  path.join(__dirname, '../public/images/admin_backgrounds'),
  path.join(__dirname, '../public/images/employee_backgrounds')
];

directories.forEach(dir => optimizeImages(dir));
