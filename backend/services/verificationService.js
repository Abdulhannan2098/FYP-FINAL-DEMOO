/**
 * Vendor Identity Verification Service - OPTIMIZED
 *
 * ARCHITECTURE:
 * - Extraction Module: Receives ONLY image, returns extracted data
 * - Verification Module: Receives extracted data + registered data, compares
 * - Complete separation between extraction and verification
 * - Optimized for speed with early termination
 */

const path = require('path');
const fs = require('fs');

// ============================================================
// DEPENDENCY LOADING
// ============================================================

let Tesseract = null;
let sharp = null;

try {
  Tesseract = require('tesseract.js');
  console.log('[VERIFICATION] Tesseract.js loaded');
} catch (e) {
  console.error('[VERIFICATION] Tesseract.js not installed');
}

try {
  sharp = require('sharp');
  console.log('[VERIFICATION] sharp loaded');
} catch (e) {
  console.warn('[VERIFICATION] sharp not installed');
}

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // Lowered from 70 → mobile-compressed JPEGs regularly produce OCR confidence of
  // 45–60. A 1-known-word name at 50% OCR confidence scores 65 (50+15), which was
  // below the old threshold and caused false-negative extractions.
  NAME_CONFIDENCE_THRESHOLD: 50,
  HIGH_CONFIDENCE_THRESHOLD: 85,
  TARGET_WIDTH: 2000, // Upped from 1800 to match higher-res mobile uploads
};

// ============================================================
// KNOWN PAKISTANI NAME PARTS (for validation and scoring)
// ============================================================

const PAKISTANI_NAMES = new Set([
  'ABDUL', 'MUHAMMAD', 'MOHAMMAD', 'AHMED', 'AHMAD', 'ALI', 'KHAN',
  'SHEIKH', 'SHAIKH', 'SYED', 'SAIF', 'SAIFULLAH', 'ULLAH', 'ALLAH',
  'HASSAN', 'HUSSAIN', 'HABIB', 'HANNAN', 'RAHMAN', 'REHMAN',
  'KAREEM', 'KARIM', 'LATIF', 'RAUF', 'JABBAR', 'SATTAR', 'WAHAB',
  'WAHEED', 'RAFIQ', 'SHAFIQ', 'BABAR', 'ADNAN', 'ASIF', 'ATIF',
  'AYUB', 'EJAZ', 'FARAZ', 'HAMID', 'HARIS', 'IMRAN', 'IRFAN',
  'JAVED', 'JUNAID', 'KAMRAN', 'KASHIF', 'KHURRAM', 'MAJID', 'NASIR',
  'NAVEED', 'NAWAZ', 'QADIR', 'QASIM', 'RAHEEM', 'RASHID', 'RIAZ',
  'SAEED', 'SAJID', 'SALEEM', 'SHAHID', 'SHAKEEL', 'SHARIF', 'TARIQ',
  'UMAR', 'OMAR', 'USMAN', 'OSMAN', 'WAQAR', 'WASEEM', 'YASIR',
  'YOUSAF', 'YOUSUF', 'ZAHID', 'ZAMAN', 'ZUBAIR', 'BILAL', 'DANISH',
  'FAHAD', 'FAISAL', 'FARHAN', 'GHULAM', 'HAMZA', 'MEHMOOD', 'MAHMOOD',
  'NAEEM', 'NADEEM', 'PERVAIZ', 'RAZA', 'SAFDAR', 'SARFRAZ', 'SHOAIB',
  'SOHAIL', 'TAHIR', 'TANVEER', 'UMAIR', 'WAJID', 'ZAFAR', 'AAMIR',
  'AMIR', 'ARIF', 'ASHRAF', 'ASLAM', 'AZAM', 'AZIZ', 'BASHIR',
  'GUL', 'HAYAT', 'IQBAL', 'JAN', 'MALIK', 'MIR', 'NABI', 'SHAH',
  'SULTAN', 'TAYYAB', 'AKRAM', 'ANWAR', 'ARSHAD', 'AMIN', 'AKBAR',
  'ASGHAR', 'BAIG', 'BUTT', 'CHAUDHRY', 'CHEEMA', 'GILL', 'GONDAL',
  'KHATTAK', 'LODHI', 'MANZOOR', 'MASOOD', 'MEMON', 'MUKHTAR', 'NIAZI',
  'QAYYUM', 'QURESHI', 'SIDDIQUI', 'YAQOOB', 'YOUNAS', 'ZIA',
  'HAMMAD', 'TAHA', 'ISMAIL', 'IBRAHIM', 'MUSA', 'NOOR', 'FAZAL',
  'MUSTAFA', 'HAIDER', 'HASAN', 'AKMAL', 'JAMAL', 'KAMAL', 'ZAIN',
]);

// Words to exclude (document terms, not names)
const EXCLUDED_WORDS = new Set([
  'PAKISTAN', 'ISLAMIC', 'REPUBLIC', 'GOVERNMENT', 'NATIONAL', 'IDENTITY',
  'CARD', 'NADRA', 'COMPUTERIZED', 'NAME', 'NAMA', 'FATHER', 'HUSBAND',
  'GENDER', 'MALE', 'FEMALE', 'DATE', 'BIRTH', 'DOB', 'ISSUE', 'EXPIRY',
  'VALID', 'COUNTRY', 'STAY', 'HOLDER', 'SIGNATURE', 'CNIC', 'NUMBER',
  'ADDRESS', 'PERMANENT', 'PRESENT', 'OF', 'THE', 'AND', 'FOR',
]);

// Common OCR garbage prefixes that appear before actual names
// These are often partial label text or misread characters
const GARBAGE_PREFIXES = [
  'RE', 'MO', 'NA', 'ME', 'AM', 'MA', 'ND', 'AN', 'ER', 'EN', 'NE', 'AE',
  'NAM', 'AME', 'NAE', 'MAE', 'MAN', 'REN', 'ANE',
  'NAME', 'NAMA', 'MAME', 'NANE', 'RAME',
];

// ============================================================
// FAST IMAGE PREPROCESSING (2 variants only)
// ============================================================

const preprocessImage = async (imagePath) => {
  if (!sharp || !fs.existsSync(imagePath)) {
    return [{ path: imagePath, cleanup: false }];
  }

  const variants = [];
  const basePath = imagePath.replace(/\.[^.]+$/, '');
  const id = Date.now();

  try {
    const meta = await sharp(imagePath).metadata();
    const scale = Math.min(2, CONFIG.TARGET_WIDTH / meta.width);
    const newW = Math.round(meta.width * scale);
    const newH = Math.round(meta.height * scale);

    // Variant 1: High contrast normalized
    const v1 = `${basePath}_v1_${id}.png`;
    await sharp(imagePath)
      .resize(newW, newH)
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.5 })
      .png()
      .toFile(v1);
    variants.push({ path: v1, cleanup: true });

    // Variant 2: Very high contrast (for faded cards)
    const v2 = `${basePath}_v2_${id}.png`;
    await sharp(imagePath)
      .resize(newW, newH)
      .grayscale()
      .linear(2.0, -0.3)
      .sharpen({ sigma: 1.2 })
      .png()
      .toFile(v2);
    variants.push({ path: v2, cleanup: true });

  } catch (e) {
    console.warn('[PREPROCESS] Error:', e.message);
  }

  return variants.length > 0 ? variants : [{ path: imagePath, cleanup: false }];
};

const cleanup = (variants) => {
  for (const v of variants) {
    if (v.cleanup && fs.existsSync(v.path)) {
      try { fs.unlinkSync(v.path); } catch (e) {}
    }
  }
};

// ============================================================
// OCR EXECUTION
// ============================================================

const runOCR = async (imagePath) => {
  if (!Tesseract) return { text: '', confidence: 0 };

  try {
    const result = await Tesseract.recognize(imagePath, 'eng', {
      tessedit_pageseg_mode: '6',
    });
    return {
      text: result.data.text || '',
      confidence: result.data.confidence || 0,
    };
  } catch (e) {
    return { text: '', confidence: 0 };
  }
};

// ============================================================
// NAME EXTRACTION (PURE - FROM IMAGE ONLY)
// ============================================================

/**
 * Extracts name from OCR text using multiple strategies
 */
const extractNameFromText = (text, baseConfidence) => {
  if (!text) return null;

  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 2);
  const candidates = [];

  for (const line of lines) {
    // Strategy 1: Find name after "Name" label
    const labelMatch = line.toUpperCase().match(/(?:NAME|NAMA)\s*[:\-]?\s*([A-Z][A-Z\s]{2,})/i);
    if (labelMatch) {
      const name = cleanName(labelMatch[1]);
      if (name) {
        candidates.push({ name, score: baseConfidence + 20, strategy: 'label' });
      }
    }

    // Strategy 2: Check if line contains known Pakistani names
    const cleaned = cleanName(line);
    if (cleaned) {
      const words = cleaned.split(' ');
      const knownCount = words.filter(w => PAKISTANI_NAMES.has(w)).length;

      if (knownCount > 0) {
        const score = baseConfidence + (knownCount * 15);
        candidates.push({ name: cleaned, score, strategy: 'known_names' });
      } else if (words.length >= 2 && words.length <= 4) {
        // Looks like a name (2-4 words, all caps letters)
        candidates.push({ name: cleaned, score: baseConfidence - 10, strategy: 'pattern' });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Return best candidate
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
};

/**
 * Cleans and validates a potential name string
 * Removes garbage prefixes and excluded words
 */
const cleanName = (str) => {
  if (!str) return null;

  // Remove non-letters, normalize spaces, uppercase
  let cleaned = str.toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words
  let words = cleaned.split(' ').filter(w => w.length >= 2);

  // Remove excluded words
  words = words.filter(w => !EXCLUDED_WORDS.has(w));

  // Remove garbage prefixes from the beginning
  // Keep removing first word if it's a known garbage prefix and not a real name
  while (words.length > 0) {
    const firstWord = words[0];

    // If first word is a known Pakistani name, keep it
    if (PAKISTANI_NAMES.has(firstWord)) break;

    // If first word is a garbage prefix (2-4 chars, not a name), remove it
    if (firstWord.length <= 4 && GARBAGE_PREFIXES.includes(firstWord)) {
      words.shift();
      continue;
    }

    // If first word is very short (2 chars) and not a known name, likely garbage
    if (firstWord.length === 2 && !PAKISTANI_NAMES.has(firstWord)) {
      words.shift();
      continue;
    }

    break;
  }

  if (words.length < 1 || words.length > 5) return null;

  // Reject single short words that aren't known names
  if (words.length === 1 && words[0].length <= 3 && !PAKISTANI_NAMES.has(words[0])) {
    return null;
  }

  return words.join(' ');
};

/**
 * MAIN NAME EXTRACTION - Optimized with early termination
 */
const extractNameFromCNIC = async (imagePath) => {
  console.log('\n[NAME EXTRACT] Starting optimized extraction...');
  const startTime = Date.now();

  if (!fs.existsSync(imagePath)) {
    return { success: false, error: 'Image not found' };
  }

  const variants = await preprocessImage(imagePath);
  let bestResult = null;

  for (const variant of variants) {
    const ocr = await runOCR(variant.path);

    // Threshold lowered from 30 → 10.  Mobile JPEG at 72% quality can push
    // Tesseract confidence below 30 even on perfectly readable text, causing
    // every variant to be skipped and returning a false "Could not extract".
    if (ocr.confidence < 10) continue;

    console.log(`[OCR] Confidence: ${ocr.confidence.toFixed(1)}%`);

    const extracted = extractNameFromText(ocr.text, ocr.confidence);

    if (extracted && (!bestResult || extracted.score > bestResult.score)) {
      bestResult = {
        success: true,
        name: extracted.name,
        confidence: Math.min(100, Math.round(extracted.score)),
        strategy: extracted.strategy,
        rawText: ocr.text.substring(0, 500),
      };

      // Early termination if high confidence
      if (bestResult.confidence >= CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
        console.log(`[NAME EXTRACT] High confidence early termination: "${bestResult.name}"`);
        break;
      }
    }
  }

  cleanup(variants);

  const elapsed = Date.now() - startTime;
  console.log(`[NAME EXTRACT] Completed in ${elapsed}ms`);

  if (!bestResult) {
    return { success: false, confidence: 0, error: 'Could not extract name' };
  }

  // Apply minimum threshold
  if (bestResult.confidence < CONFIG.NAME_CONFIDENCE_THRESHOLD) {
    return {
      success: false,
      confidence: bestResult.confidence,
      error: `Confidence too low (${bestResult.confidence}% < ${CONFIG.NAME_CONFIDENCE_THRESHOLD}%)`,
    };
  }

  console.log(`[NAME EXTRACT] Result: "${bestResult.name}" (${bestResult.confidence}%)`);
  return bestResult;
};

// ============================================================
// CNIC NUMBER EXTRACTION
// ============================================================

// Apply known OCR→digit character substitutions.
// Extended set: Ss→5, Tt→7, iIlL|!→1, oO→0, Bb→8, gGq→9/6, Zz→2, Aa→4
const applyDigitCorrections = (text) =>
  text
    .replace(/[Ss]/g, '5')
    .replace(/[Tt]/g, '7')
    .replace(/[iIlL\|!]/g, '1')
    .replace(/[oO]/g, '0')
    .replace(/[Bb]/g, '8')
    .replace(/[gq]/g, '9')
    .replace(/[G]/g, '6')
    .replace(/[Zz]/g, '2')
    .replace(/[Aa]/g, '4');

const isValidCnic = (digits) =>
  digits && digits.length === 13 && !/^0{5}/.test(digits);

// Three strategies in priority order.
// Strategy 1: flexible separator pattern — handles OCR noise between groups.
// Strategy 2: line-by-line strip — handles extra chars inside groups.
// Strategy 3: global strip — last resort, grabs first 13 digits in whole text.
const tryCnicPatterns = (rawText, confidence) => {
  const corrected = applyDigitCorrections(rawText);

  // S1: XXXXX[-_. ]XXXXXXX[-_. ]X with flexible separators inside groups
  const m1 = corrected.match(/(\d[\d\s]{4})\s*[-_.\s]*\s*([\d\s]{7})\s*[-_.\s]*\s*(\d)/);
  if (m1) {
    const cnic = m1[1].replace(/\s/g, '') + m1[2].replace(/\s/g, '') + m1[3];
    if (isValidCnic(cnic)) return { cnic, confidence, strategy: 'S1_pattern' };
  }

  // S2: strip each line to pure digits, look for 13-digit lines
  for (const line of corrected.split(/[\n\r]+/)) {
    const digits = line.replace(/[^\d]/g, '');
    if (digits.length >= 13) {
      const candidate = digits.replace(/^0+/, '').padStart(13, '0').slice(0, 13);
      const cnic = digits.slice(0, 13);
      if (isValidCnic(cnic)) return { cnic, confidence: confidence * 0.9, strategy: 'S2_line' };
    }
  }

  // S3: strip ALL non-digits from whole text, take first 13
  const allDigits = corrected.replace(/[^\d]/g, '');
  const m3 = allDigits.match(/(\d{13})/);
  if (m3 && isValidCnic(m3[1])) {
    return { cnic: m3[1], confidence: confidence * 0.8, strategy: 'S3_global' };
  }

  return null;
};

const extractCNICNumber = async (imagePath) => {
  if (!Tesseract || !fs.existsSync(imagePath)) {
    return { success: false, cnic: null };
  }

  // Add a bottom-half variant — Pakistani CNICs have the number in the lower
  // portion of the card, so cropping reduces noise from the name/photo area.
  const buildVariantsWithBottomCrop = async () => {
    const base = await preprocessImage(imagePath);

    if (!sharp || !fs.existsSync(imagePath)) return base;

    try {
      const meta = await sharp(imagePath).metadata();
      const scale = Math.min(2, CONFIG.TARGET_WIDTH / meta.width);
      const newW = Math.round(meta.width * scale);
      const newH = Math.round(meta.height * scale);
      const cropTop = Math.floor(newH * 0.5);
      const cropH = newH - cropTop;
      const id = Date.now();
      const bottomPath = `${imagePath.replace(/\.[^.]+$/, '')}_bottom_${id}.png`;

      await sharp(imagePath)
        .resize(newW, newH)
        .extract({ left: 0, top: cropTop, width: newW, height: cropH })
        .grayscale()
        .normalize()
        .threshold(140)   // Binary threshold sharpens printed digits
        .png()
        .toFile(bottomPath);

      return [...base, { path: bottomPath, cleanup: true }];
    } catch (e) {
      console.warn('[CNIC CROP] Could not create bottom variant:', e.message);
      return base;
    }
  };

  const variants = await buildVariantsWithBottomCrop();
  let best = null;

  for (const variant of variants) {
    try {
      // Pass 1: standard OCR — works well when card text is clean
      const result = await Tesseract.recognize(variant.path, 'eng');
      const found = tryCnicPatterns(result.data.text, result.data.confidence);
      if (found && (!best || found.confidence > best.confidence)) {
        best = found;
        console.log(`[CNIC] Found via ${found.strategy}: ${formatCNIC(found.cnic)} (${found.confidence.toFixed(1)}%)`);
      }

      // Pass 2: digits-only whitelist — greatly reduces misreads for the
      // CNIC number row when surrounding text confuses the general model
      if (!best || best.confidence < 80) {
        const digitResult = await Tesseract.recognize(variant.path, 'eng', {
          tessedit_char_whitelist: '0123456789-',
          tessedit_pageseg_mode: '6',
        });
        const foundDigit = tryCnicPatterns(digitResult.data.text, digitResult.data.confidence);
        if (foundDigit && (!best || foundDigit.confidence > best.confidence)) {
          best = foundDigit;
          console.log(`[CNIC] Found via whitelist+${foundDigit.strategy}: ${formatCNIC(foundDigit.cnic)} (${foundDigit.confidence.toFixed(1)}%)`);
        }
      }
    } catch (e) {
      console.warn('[CNIC] OCR error:', e.message);
    }
  }

  cleanup(variants);

  if (best) return { success: true, cnic: best.cnic, confidence: best.confidence };
  return { success: false, cnic: null };
};

const formatCNIC = (cnic) => {
  if (!cnic || cnic.length !== 13) return cnic;
  return `${cnic.slice(0, 5)}-${cnic.slice(5, 12)}-${cnic.slice(12)}`;
};

// ============================================================
// STEP 1: CNIC DATA EXTRACTION
// ============================================================

const extractCNICData = async (imagePath) => {
  const result = {
    step: 1,
    name: 'CNIC Data Extraction',
    status: 'in_progress',
    passed: false,
    data: {
      extractedName: null,
      extractedCNIC: null,
      extractedCNICFormatted: null,
      nameConfidence: 0,
    },
    error: null,
    message: null,
  };

  console.log('\n' + '='.repeat(50));
  console.log('[STEP 1] CNIC DATA EXTRACTION');
  console.log('='.repeat(50));

  if (!Tesseract || !fs.existsSync(imagePath)) {
    result.status = 'failed';
    result.error = 'OCR unavailable or image not found';
    result.message = 'Cannot process image';
    return result;
  }

  // Extract name and CNIC in parallel for speed
  const [nameResult, cnicResult] = await Promise.all([
    extractNameFromCNIC(imagePath),
    extractCNICNumber(imagePath),
  ]);

  if (nameResult.success) {
    result.data.extractedName = nameResult.name;
    result.data.nameConfidence = nameResult.confidence;
    console.log(`[STEP 1] Name: "${nameResult.name}" (${nameResult.confidence}%)`);
  } else {
    console.log(`[STEP 1] Name extraction failed: ${nameResult.error}`);
  }

  if (cnicResult.success) {
    result.data.extractedCNIC = cnicResult.cnic;
    result.data.extractedCNICFormatted = formatCNIC(cnicResult.cnic);
    console.log(`[STEP 1] CNIC: ${formatCNIC(cnicResult.cnic)}`);
  } else {
    console.log('[STEP 1] CNIC extraction failed');
  }

  // Determine status
  if (nameResult.success && cnicResult.success) {
    result.status = 'passed';
    result.passed = true;
    result.message = 'Data extracted successfully';
  } else {
    result.status = 'failed';
    result.error = !nameResult.success ? 'Name extraction failed' : 'CNIC extraction failed';
    result.message = nameResult.error || 'Could not extract data';
  }

  return result;
};

// ============================================================
// STEP 2: NAME VERIFICATION
// ============================================================

const verifyName = (extractedName, registeredName) => {
  const result = {
    step: 2,
    name: 'Name Verification',
    status: 'in_progress',
    passed: false,
    data: { extractedName: null, registeredName: null, similarity: 0 },
    error: null,
    message: null,
  };

  console.log('\n[STEP 2] NAME VERIFICATION');

  const normalize = (n) => n ? n.toUpperCase().replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ').trim() : '';

  const normExt = normalize(extractedName);
  const normReg = normalize(registeredName);

  result.data.extractedName = normExt || 'Not extracted';
  result.data.registeredName = normReg || 'Not provided';

  console.log(`[STEP 2] Extracted: "${normExt}"`);
  console.log(`[STEP 2] Registered: "${normReg}"`);

  if (!normExt || !normReg) {
    result.status = 'failed';
    result.error = 'Missing data';
    result.message = 'Name data incomplete';
    return result;
  }

  // Exact match
  if (normExt === normReg) {
    result.status = 'passed';
    result.passed = true;
    result.data.similarity = 100;
    result.message = 'Name verified (exact match)';
    console.log('[STEP 2] PASSED - Exact match');
    return result;
  }

  // Token match (handles word order differences)
  const extTokens = normExt.split(' ').sort();
  const regTokens = normReg.split(' ').sort();

  if (extTokens.length === regTokens.length && extTokens.every((t, i) => t === regTokens[i])) {
    result.status = 'passed';
    result.passed = true;
    result.data.similarity = 100;
    result.message = 'Name verified (token match)';
    console.log('[STEP 2] PASSED - Token match');
    return result;
  }

  // Jaccard similarity
  const extSet = new Set(extTokens);
  const regSet = new Set(regTokens);
  const intersection = [...extSet].filter(x => regSet.has(x)).length;
  const union = new Set([...extSet, ...regSet]).size;
  const similarity = Math.round((intersection / union) * 100);

  result.data.similarity = similarity;

  if (similarity >= 80) {
    result.status = 'passed';
    result.passed = true;
    result.message = `Name verified (${similarity}% similarity)`;
    console.log(`[STEP 2] PASSED - ${similarity}% similarity`);
    return result;
  }

  result.status = 'failed';
  result.error = 'Name mismatch';
  result.message = `Names do not match (${similarity}% similarity)`;
  console.log(`[STEP 2] FAILED - ${similarity}% similarity`);

  return result;
};

// ============================================================
// STEP 3: CNIC NUMBER VERIFICATION
// ============================================================

const verifyCNICNumber = (extractedCNIC, registeredCNIC) => {
  const result = {
    step: 3,
    name: 'CNIC Number Verification',
    status: 'in_progress',
    passed: false,
    data: {
      extractedCNIC: null,
      extractedCNICFormatted: null,
      registeredCNIC: null,
      registeredCNICFormatted: null,
      similarity: 0,
    },
    error: null,
    message: null,
  };

  console.log('\n[STEP 3] CNIC NUMBER VERIFICATION');

  const normalize = (c) => c ? c.replace(/[-\s]/g, '') : '';

  const normExt = normalize(extractedCNIC);
  const normReg = normalize(registeredCNIC);

  result.data.extractedCNIC = normExt || 'Not extracted';
  result.data.extractedCNICFormatted = normExt ? formatCNIC(normExt) : 'Not extracted';
  result.data.registeredCNIC = normReg || 'Not provided';
  result.data.registeredCNICFormatted = normReg ? formatCNIC(normReg) : 'Not provided';

  console.log(`[STEP 3] Extracted: ${result.data.extractedCNICFormatted}`);
  console.log(`[STEP 3] Registered: ${result.data.registeredCNICFormatted}`);

  if (!normExt || !normReg) {
    result.status = 'failed';
    result.error = 'Missing data';
    result.message = 'CNIC data incomplete';
    return result;
  }

  if (normExt === normReg) {
    result.status = 'passed';
    result.passed = true;
    result.data.similarity = 100;
    result.message = 'CNIC verified';
    console.log('[STEP 3] PASSED');
    return result;
  }

  // Calculate similarity
  let matches = 0;
  for (let i = 0; i < Math.min(normExt.length, normReg.length); i++) {
    if (normExt[i] === normReg[i]) matches++;
  }
  result.data.similarity = Math.round((matches / 13) * 100);

  result.status = 'failed';
  result.error = 'CNIC mismatch';
  result.message = `CNIC numbers do not match (${result.data.similarity}%)`;
  console.log(`[STEP 3] FAILED - ${result.data.similarity}%`);

  return result;
};

// ============================================================
// COMPLETE VERIFICATION PIPELINE
// ============================================================

const runStepByStepVerification = async (params) => {
  const { cnicFrontPath, registeredCNIC, registeredName } = params;
  const startTime = Date.now();

  const verification = {
    timestamp: new Date().toISOString(),
    overallStatus: 'in_progress',
    totalSteps: 3,
    stepsPassed: 0,
    stepsFailed: 0,
    steps: [],
    passed: false,
  };

  console.log('\n' + '='.repeat(60));
  console.log('THREE-STEP IDENTITY VERIFICATION');
  console.log('='.repeat(60));

  // Step 1: Extract (image only, no user data)
  const step1 = await extractCNICData(cnicFrontPath);
  verification.steps.push(step1);
  if (step1.passed) verification.stepsPassed++;
  else verification.stepsFailed++;

  // Step 2: Verify name
  const step2 = verifyName(step1.data?.extractedName, registeredName);
  verification.steps.push(step2);
  if (step2.passed) verification.stepsPassed++;
  else verification.stepsFailed++;

  // Step 3: Verify CNIC number
  const step3 = verifyCNICNumber(step1.data?.extractedCNIC, registeredCNIC);
  verification.steps.push(step3);
  if (step3.passed) verification.stepsPassed++;
  else verification.stepsFailed++;

  verification.passed = verification.stepsPassed === 3;
  verification.overallStatus = verification.passed ? 'passed' : 'failed';

  const elapsed = Date.now() - startTime;
  console.log('\n' + '='.repeat(60));
  console.log(`RESULT: ${verification.stepsPassed}/3 passed (${elapsed}ms)`);
  console.log('='.repeat(60));

  return verification;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  runStepByStepVerification,
  extractCNICData,
  verifyName,
  verifyCNICNumber,
  extractNameFromCNIC,
  extractCNICNumber,
  formatCNIC,
  getStatus: () => ({
    tesseract: !!Tesseract,
    sharp: !!sharp,
  }),
};
