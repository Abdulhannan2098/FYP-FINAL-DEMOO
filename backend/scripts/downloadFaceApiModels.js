/**
 * Script to download face-api.js models
 * Run this script once to download required models for face verification
 *
 * Usage: node scripts/downloadFaceApiModels.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'models', 'face-api');
const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

// Required model files (based on manifest files)
const MODEL_FILES = [
  // SSD MobileNet V1 - Face Detection
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',

  // Face Landmark 68 - Facial Landmarks
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',

  // Face Recognition - Face Descriptors
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
];

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log(`Created directory: ${MODELS_DIR}`);
}

// Download function
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('='.repeat(60));
  console.log('Downloading face-api.js models...');
  console.log('='.repeat(60));
  console.log(`Target directory: ${MODELS_DIR}\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const modelFile of MODEL_FILES) {
    const url = `${BASE_URL}/${modelFile}`;
    const dest = path.join(MODELS_DIR, modelFile);

    // Check if file already exists
    if (fs.existsSync(dest)) {
      console.log(`[SKIP] ${modelFile} (already exists)`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`[DOWNLOADING] ${modelFile}...`);
      await downloadFile(url, dest);
      console.log(' ✓');
      downloaded++;
    } catch (error) {
      console.log(` ✗ (${error.message})`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Download Summary:');
  console.log(`  Downloaded: ${downloaded}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  Some models failed to download. Please try again or download manually.');
    process.exit(1);
  } else {
    console.log('\n✅ All models are ready!');
  }
}

downloadModels().catch(console.error);
