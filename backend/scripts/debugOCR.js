const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

// Find the most recent CNIC image in uploads
const uploadsDir = path.join(__dirname, '../uploads/verification');

async function debugOCR() {
  console.log('Looking for CNIC images in:', uploadsDir);

  if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads directory does not exist!');
    return;
  }

  // Find all files
  const files = fs.readdirSync(uploadsDir);
  const cnicFiles = files.filter(f => f.includes('cnic') || f.includes('CNIC'));

  console.log('Found files:', files);
  console.log('CNIC files:', cnicFiles);

  if (cnicFiles.length === 0) {
    console.log('\nNo CNIC files found. Please provide the path to your CNIC image.');
    console.log('Usage: node scripts/debugOCR.js <path-to-image>');

    // Check if path provided as argument
    if (process.argv[2]) {
      await processImage(process.argv[2]);
    }
    return;
  }

  // Process the most recent one
  const latestFile = cnicFiles.sort().pop();
  const imagePath = path.join(uploadsDir, latestFile);

  await processImage(imagePath);
}

async function processImage(imagePath) {
  console.log('\n' + '='.repeat(60));
  console.log('Processing image:', imagePath);
  console.log('='.repeat(60));

  if (!fs.existsSync(imagePath)) {
    console.log('File not found:', imagePath);
    return;
  }

  const stats = fs.statSync(imagePath);
  console.log('File size:', (stats.size / 1024).toFixed(2), 'KB');

  console.log('\nRunning OCR (this may take a moment)...\n');

  try {
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rProgress: ${(m.progress * 100).toFixed(0)}%`);
        }
      }
    });

    console.log('\n\n' + '='.repeat(60));
    console.log('OCR RESULTS');
    console.log('='.repeat(60));
    console.log('Confidence:', result.data.confidence.toFixed(1) + '%');
    console.log('\nExtracted Text:');
    console.log('-'.repeat(60));
    console.log(result.data.text);
    console.log('-'.repeat(60));

    // Try to find CNIC number
    console.log('\nSearching for CNIC patterns...');

    const text = result.data.text;

    // Pattern 1: Standard format with dashes
    const pattern1 = /(\d{5})[-\s]?(\d{7})[-\s]?(\d)/g;
    let matches1 = [...text.matchAll(pattern1)];

    // Pattern 2: 13 consecutive digits
    const pattern2 = /(\d{13})/g;
    let matches2 = [...text.matchAll(pattern2)];

    // Pattern 3: More flexible - any sequence of digits that could be CNIC
    const pattern3 = /\d[\d\s-]{11,17}\d/g;
    let matches3 = [...text.matchAll(pattern3)];

    console.log('\nPattern 1 (XXXXX-XXXXXXX-X):', matches1.length > 0 ? matches1.map(m => m[0]) : 'No matches');
    console.log('Pattern 2 (13 digits):', matches2.length > 0 ? matches2.map(m => m[0]) : 'No matches');
    console.log('Pattern 3 (flexible):', matches3.length > 0 ? matches3.map(m => m[0]) : 'No matches');

    // Look for any numbers
    const allNumbers = text.match(/\d+/g) || [];
    console.log('\nAll number sequences found:', allNumbers.filter(n => n.length >= 5));

  } catch (err) {
    console.error('OCR Error:', err.message);
  }
}

debugOCR();
