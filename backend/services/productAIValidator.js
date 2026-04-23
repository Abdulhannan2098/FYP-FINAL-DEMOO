/**
 * productAIValidator.js
 *
 * Production-grade 3-layer hybrid classification engine for the AutoSphere
 * car-modification marketplace.  No external API required — runs entirely
 * in-process with zero latency overhead.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Layer 1  │  Hard-Rule Gate       │  instant O(1)           │
 * │  Layer 2  │  Phrase / N-gram      │  O(keywords)            │
 * │  Layer 3  │  TF-IDF Cosine Sim.   │  O(corpus × terms)      │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Final score scale  0 – 100
 *   ≥ 90  →  auto_approved
 *   60–89 →  pending_review
 *   < 60  →  auto_rejected
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 ── HARD RULE GATE
// These are unambiguous domain signals evaluated before any scoring.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Any product whose normalised text contains one of these phrases is
 * immediately rejected regardless of other signals.
 */
const HARD_REJECT_PHRASES = [
  // Generic non-automotive electronics
  'laptop', 'notebook computer', 'desktop pc', 'gaming pc', 'personal computer',
  'smartphone', 'iphone', 'android phone', 'mobile phone', 'cell phone',
  'tablet', 'ipad', 'kindle',
  'television', 'smart tv', 'led tv', 'oled tv', 'qled',
  'microwave', 'refrigerator', 'washing machine', 'dishwasher',
  'air conditioner', 'air purifier',
  'headphone', 'earphone', 'earbuds', 'airpods', 'tws earbuds',
  'keyboard', 'computer mouse', 'usb hub', 'hard drive', 'ssd drive',
  'monitor screen', 'projector',

  // Food / grocery
  'banana', 'apple fruit', 'mango', 'orange juice', 'fruit juice',
  'grocery', 'vegetable', 'chicken', 'beef', 'mutton', 'rice bag',
  'cooking oil', 'spice', 'flour', 'cereal', 'bread', 'dairy',
  'supplement', 'protein powder', 'vitamin tablet',

  // Clothing / footwear
  'shirt', 't-shirt', 'tshirt', 'trousers', 'jeans', 'shorts',
  'dress', 'mini skirt', 'pencil skirt', 'hoodie', 'jacket clothing',
  'sneakers', 'running shoes', 'sandals', 'boots footwear',
  'underwear', 'socks',

  // Furniture / home
  'sofa', 'couch', 'bed frame', 'mattress', 'pillow', 'blanket',
  'curtain', 'carpet rug', 'wardrobe', 'cupboard',

  // Motorcycle / bicycle (different domain from cars)
  'motorcycle', 'motorbike', 'dirt bike', 'scooter', 'bicycle',
  'bike helmet', 'cycling gloves',

  // Explicitly prohibited accessories (per platform policy)
  'car charger', 'phone mount car', 'phone holder car',
  'seat cover', 'car seat cover',
  'floor mat', 'car mat', 'trunk mat',
  'cleaning kit', 'car polish kit', 'car wash kit',
  'steering wheel cover',
  'sun shade', 'windshield sunshade',
  'air freshener', 'car fragrance',
  'jump starter', 'tire inflator', 'tire pump',
  'dash cam', 'dashcam', 'car camera',
  'reverse camera', 'parking sensor',
];

/**
 * Any product whose normalised text contains one of these phrases is
 * immediately elevated to a very high score (still validated by phrase layer).
 */
const HARD_APPROVE_PHRASES = [
  // Wheels & Tyres
  'alloy wheels', 'alloy rims', 'forged wheels', 'chrome rims', 'spoke rims',
  'racing wheels', 'performance wheels', 'aftermarket wheels',
  'low profile tyres', 'run flat tyres', 'performance tyres',

  // Exterior
  'body kit', 'front bumper', 'rear bumper', 'side skirts',
  'carbon fiber hood', 'carbon fibre hood', 'vented hood', 'aftermarket hood',
  'roof spoiler', 'trunk spoiler', 'rear spoiler', 'carbon spoiler',
  'front splitter', 'rear diffuser', 'wide body', 'fender flare',
  'carbon fiber body', 'aftermarket grille',

  // Performance / Engine
  'performance exhaust', 'cat back exhaust', 'catback exhaust',
  'stainless exhaust', 'titanium exhaust', 'sports exhaust',
  'turbo kit', 'turbocharger kit', 'supercharger kit',
  'intercooler kit', 'cold air intake', 'short ram intake',
  'performance air filter',

  // Suspension
  'coilover kit', 'lowering springs', 'performance suspension',
  'air suspension', 'adjustable suspension',

  // Brakes
  'performance brakes', 'big brake kit', 'slotted rotors',
  'drilled rotors', 'brake caliper', 'racing brake pads',

  // Lighting
  'aftermarket headlights', 'projector headlights', 'sequential tail lights',
  'led headlight kit', 'hid kit', 'xenon kit', 'angel eye kit',

  // Wraps / vinyl
  'vinyl wrap', 'car wrap', 'full car wrap', 'matte wrap', 'chrome wrap',
  'carbon wrap', 'vehicle wrap',
];

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 ── PHRASE / N-GRAM SCORING
// Weighted single-words and multi-word phrases.  Multi-word phrases score
// 2-4× their component words to reward specificity.
// ─────────────────────────────────────────────────────────────────────────────

const CAR_POSITIVE = [
  // High-value multi-word phrases (most specific)
  { phrase: 'alloy wheel',        score: 22 },
  { phrase: 'alloy rim',          score: 22 },
  { phrase: 'body kit',           score: 22 },
  { phrase: 'front bumper',       score: 20 },
  { phrase: 'rear bumper',        score: 20 },
  { phrase: 'carbon fiber',       score: 18 },
  { phrase: 'carbon fibre',       score: 18 },
  { phrase: 'cat back',           score: 20 },
  { phrase: 'catback',            score: 20 },
  { phrase: 'cold air intake',    score: 20 },
  { phrase: 'coilover',           score: 20 },
  { phrase: 'lowering spring',    score: 18 },
  { phrase: 'performance exhaust',score: 22 },
  { phrase: 'turbo kit',          score: 20 },
  { phrase: 'vinyl wrap',         score: 20 },
  { phrase: 'car wrap',           score: 18 },
  { phrase: 'aftermarket',        score: 15 },
  { phrase: 'headlight assembly', score: 20 },
  { phrase: 'tail light',         score: 18 },
  { phrase: 'led strip',          score: 12 },
  { phrase: 'fender flare',       score: 20 },
  { phrase: 'side skirt',         score: 20 },
  { phrase: 'roof spoiler',       score: 20 },
  { phrase: 'trunk spoiler',      score: 20 },
  { phrase: 'intercooler',        score: 18 },
  { phrase: 'air filter performance', score: 18 },
  { phrase: 'brake pad',          score: 18 },
  { phrase: 'brake rotor',        score: 18 },
  { phrase: 'drilled rotor',      score: 20 },
  { phrase: 'slotted rotor',      score: 20 },
  { phrase: 'strut bar',          score: 18 },
  { phrase: 'sway bar',           score: 18 },
  { phrase: 'short shifter',      score: 18 },
  { phrase: 'gear knob',          score: 16 },
  { phrase: 'steering wheel',     score: 14 },
  { phrase: 'wide body',          score: 18 },
  { phrase: 'diffuser',           score: 16 },
  { phrase: 'splitter',           score: 16 },
  { phrase: 'canard',             score: 16 },

  // Single high-value terms
  { phrase: 'spoiler',            score: 16 },
  { phrase: 'exhaust',            score: 16 },
  { phrase: 'turbo',              score: 14 },
  { phrase: 'supercharger',       score: 14 },
  { phrase: 'suspension',         score: 14 },
  { phrase: 'rim',                score: 14 },
  { phrase: 'wheel',              score: 12 },
  { phrase: 'tyre',               score: 12 },
  { phrase: 'tire',               score: 12 },
  { phrase: 'headlight',          score: 14 },
  { phrase: 'taillight',          score: 14 },
  { phrase: 'bumper',             score: 14 },
  { phrase: 'fender',             score: 12 },
  { phrase: 'hood',               score: 10 },
  { phrase: 'bonnet',             score: 10 },
  { phrase: 'grille',             score: 12 },
  { phrase: 'caliper',            score: 14 },
  { phrase: 'rotor',              score: 12 },
  { phrase: 'vinyl',              score: 12 },
  { phrase: 'decal',              score: 10 },
  { phrase: 'wrap',               score: 8  },
  { phrase: 'automotive',         score: 14 },
  { phrase: 'intake',             score: 10 },
  { phrase: 'downpipe',           score: 16 },
  { phrase: 'muffler',            score: 14 },
  { phrase: 'silencer',           score: 10 },
  { phrase: 'xenon',              score: 12 },
  { phrase: 'hid',                score: 10 },
  { phrase: 'fog light',          score: 12 },
  { phrase: 'drl',                score: 12 },
  { phrase: 'lowering',           score: 10 },
  { phrase: 'subframe',           score: 16 },
  { phrase: 'control arm',        score: 16 },
  { phrase: 'tie rod',            score: 14 },

  // Car makes/models (strong context signals)
  { phrase: 'honda',              score: 8  },
  { phrase: 'toyota',             score: 8  },
  { phrase: 'bmw',                score: 8  },
  { phrase: 'mercedes',           score: 8  },
  { phrase: 'audi',               score: 8  },
  { phrase: 'volkswagen',         score: 8  },
  { phrase: 'civic',              score: 10 },
  { phrase: 'corolla',            score: 10 },
  { phrase: 'supra',              score: 10 },
  { phrase: 'mustang',            score: 10 },
  { phrase: 'camry',              score: 10 },
  { phrase: 'accord',             score: 10 },
  { phrase: 'golf gti',           score: 12 },
  { phrase: 'subaru',             score: 8  },
  { phrase: 'nissan',             score: 8  },
  { phrase: 'mazda',              score: 8  },
  { phrase: 'mitsubishi',         score: 8  },
  { phrase: 'ferrari',            score: 8  },
  { phrase: 'lamborghini',        score: 8  },
  { phrase: 'porsche',            score: 8  },
];

const CAR_NEGATIVE = [
  // Strong off-domain signals
  { phrase: 'laptop',             score: 55 },
  { phrase: 'computer',           score: 45 },
  { phrase: 'smartphone',         score: 55 },
  { phrase: 'tablet',             score: 50 },
  { phrase: 'television',         score: 55 },
  { phrase: 'refrigerator',       score: 55 },
  { phrase: 'washing machine',    score: 55 },
  { phrase: 'headphone',          score: 50 },
  { phrase: 'earphone',           score: 50 },
  { phrase: 'keyboard',           score: 40 },
  { phrase: 'shirt',              score: 50 },
  { phrase: 'trousers',           score: 50 },
  { phrase: 'shoes',              score: 50 },
  { phrase: 'furniture',          score: 55 },
  { phrase: 'sofa',               score: 55 },
  { phrase: 'mattress',           score: 55 },
  { phrase: 'bicycle',            score: 40 },
  { phrase: 'motorcycle parts',   score: 45 },
  { phrase: 'food',               score: 55 },
  { phrase: 'grocery',            score: 55 },
  { phrase: 'vegetable',          score: 55 },
  { phrase: 'fruit',              score: 40 },

  // Medium-penalty ambiguous terms used in non-car contexts
  { phrase: 'charger',            score: 20 },
  { phrase: 'usb',                score: 15 },
  { phrase: 'bluetooth',          score: 15 },
  { phrase: 'wireless',           score: 10 },
  { phrase: 'speaker',            score: 20 },
  { phrase: 'camera',             score: 20 },
  { phrase: 'memory',             score: 10 },
  { phrase: 'screen',             score: 15 },
  { phrase: 'display',            score: 15 },
];

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3 ── TF-IDF COSINE SIMILARITY
// Reference corpus: curated representative documents for each class.
// TF-IDF is computed at module load (startup) and cached.
// ─────────────────────────────────────────────────────────────────────────────

const CAR_MOD_CORPUS = [
  'alloy wheels rims forged spokes low profile tyres performance fitment',
  'body kit front bumper rear bumper side skirts wide body fender flares',
  'carbon fiber hood vented bonnet lightweight racing aftermarket',
  'coilover kit lowering springs adjustable damper suspension upgrade',
  'performance exhaust catback downpipe stainless titanium sports exhaust note',
  'turbo kit turbocharger intercooler cold air intake filter boost upgrade',
  'vinyl wrap matte chrome car wrap colour change full body wrap',
  'projector headlights led headlight assembly hid xenon angel eyes drl',
  'sequential tail lights led taillights smoke tinted smoked rear lights',
  'front splitter rear diffuser canard aerodynamic downforce carbon',
  'brake caliper upgrade big brake kit drilled slotted rotors performance',
  'roof spoiler trunk spoiler duck tail wing carbon rear lip',
  'subframe brace strut bar tie rod control arm suspension stiffening',
  'supercharger pulley belt drive forced induction performance engine',
  'grille mesh honeycomb aftermarket front grille custom insert',
  'fog light fog lamp led fog drl daytime running replacement',
  'air suspension bagged lowered stance static height adjustable',
  'short shifter gear knob shift throw reduction racing shifter',
  'carbon fiber parts lightweight trim panel interior exterior upgrade',
];

const NON_CAR_CORPUS = [
  'laptop notebook computer intel amd processor ram ssd storage',
  'smartphone android iphone mobile display screen touch battery',
  'tablet ipad screen app wifi cellular connectivity',
  'television smart tv 4k oled qled streaming netflix',
  'headphones earbuds wireless bluetooth audio sound music',
  'shirt clothing apparel fashion style wear cotton polyester',
  'shoes sneakers footwear running training comfort sole',
  'refrigerator fridge freezer temperature food storage appliance',
  'washing machine laundry spin drum rinse cycle detergent',
  'sofa couch furniture living room cushion fabric comfortable',
  'food grocery vegetables fruit nutrition calories cooking recipe',
  'vitamin supplement health medicine capsule dosage pharmacy',
  'bicycle cycle pedal gear brake handlebar frame riding',
];

// ── TF-IDF engine ──────────────────────────────────────────────────────────

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildTfIdf(corpus) {
  const N = corpus.length;
  const docFreq = {};
  const docVectors = [];

  // Term frequency per document
  const rawTFs = corpus.map((doc) => {
    const tokens = tokenize(doc);
    const tf = {};
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1;
      docFreq[t] = (docFreq[t] || 0); // will count below
    }
    return { tf, tokens };
  });

  // Document frequency (how many docs contain each term)
  for (const { tokens } of rawTFs) {
    const seen = new Set(tokens);
    for (const t of seen) {
      docFreq[t] = (docFreq[t] || 0) + 1;
    }
  }

  // TF-IDF vectors
  for (const { tf, tokens } of rawTFs) {
    const vec = {};
    const total = tokens.length;
    for (const [term, count] of Object.entries(tf)) {
      const tfVal = count / total;
      const idfVal = Math.log((N + 1) / (docFreq[term] + 1)) + 1;
      vec[term] = tfVal * idfVal;
    }
    docVectors.push(vec);
  }

  return { docVectors, docFreq, N };
}

function queryVector(tokens, docFreq, N) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  const vec = {};
  const total = tokens.length || 1;
  for (const [term, count] of Object.entries(tf)) {
    const tfVal = count / total;
    const idfVal = Math.log((N + 1) / ((docFreq[term] || 0) + 1)) + 1;
    vec[term] = tfVal * idfVal;
  }
  return vec;
}

function cosine(a, b) {
  let dot = 0, normA = 0, normB = 0;
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of allKeys) {
    const va = a[k] || 0;
    const vb = b[k] || 0;
    dot   += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Pre-build corpora at module load (cached for lifetime of process)
const carTfIdf    = buildTfIdf(CAR_MOD_CORPUS);
const nonCarTfIdf = buildTfIdf(NON_CAR_CORPUS);

// Combined docFreq and N for query vectorisation
const combinedDocFreq = { ...nonCarTfIdf.docFreq };
for (const [k, v] of Object.entries(carTfIdf.docFreq)) {
  combinedDocFreq[k] = (combinedDocFreq[k] || 0) + v;
}
const combinedN = carTfIdf.N + nonCarTfIdf.N;

function semanticSimilarity(text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return { carSim: 0, nonCarSim: 0 };

  const qVec = queryVector(tokens, combinedDocFreq, combinedN);

  // Max cosine similarity against each class corpus
  const carSim    = Math.max(...carTfIdf.docVectors.map((d)    => cosine(qVec, d)));
  const nonCarSim = Math.max(...nonCarTfIdf.docVectors.map((d) => cosine(qVec, d)));

  return { carSim, nonCarSim };
}

// ─────────────────────────────────────────────────────────────────────────────
// CAR-DOMAIN DETECTION GATE
//
// Minimum vocabulary that MUST appear somewhere in name + description for a
// product to even enter the scoring pipeline.  If zero tokens match, the
// product is outside the automotive domain entirely and is rejected instantly
// — regardless of any scoring arithmetic.
// ─────────────────────────────────────────────────────────────────────────────

const CAR_DOMAIN_TOKENS = new Set([
  // Generic automotive words
  'car', 'auto', 'vehicle', 'automotive', 'automobile',
  // Core parts / modification terms
  'rim', 'rims', 'wheel', 'wheels', 'alloy', 'tire', 'tires', 'tyre', 'tyres',
  'spoiler', 'bumper', 'body kit', 'fender', 'hood', 'bonnet', 'grille',
  'exhaust', 'muffler', 'downpipe', 'turbo', 'supercharger', 'intercooler',
  'intake', 'coilover', 'suspension', 'lowering', 'brake', 'caliper', 'rotor',
  'headlight', 'taillight', 'fog light', 'drl', 'xenon', 'hid',
  'vinyl', 'wrap', 'diffuser', 'splitter', 'canard', 'skirt', 'lip',
  'carbon fiber', 'carbon fibre', 'aftermarket',
  // Car makes / models (strong contextual anchors)
  'honda', 'toyota', 'bmw', 'mercedes', 'audi', 'volkswagen', 'ford',
  'subaru', 'nissan', 'mazda', 'mitsubishi', 'ferrari', 'lamborghini',
  'porsche', 'chevrolet', 'hyundai', 'kia', 'tesla',
  'civic', 'corolla', 'supra', 'mustang', 'camry', 'accord',
]);

/**
 * Returns true only if at least one car-domain token appears in the text.
 * Uses whole-word boundary check for short tokens ('car', 'rim', etc.) to
 * avoid false positives like "carrot", "scarecrow", "primary".
 */
function hasCarDomainContext(text) {
  // Short single-word tokens need a word-boundary check
  const SHORT_TOKENS = new Set(['car', 'auto', 'rim', 'rims', 'lip', 'hid', 'drl']);

  for (const token of CAR_DOMAIN_TOKENS) {
    if (SHORT_TOKENS.has(token)) {
      // Require the token to be surrounded by non-alpha characters
      const re = new RegExp(`(?<![a-z])${token}(?![a-z])`, 'i');
      if (re.test(text)) return true;
    } else {
      if (text.includes(token)) return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR-FACING MESSAGES  (clean, policy-based, zero technical language)
// ─────────────────────────────────────────────────────────────────────────────

const VENDOR_MSG = {
  approved: 'Your product has been approved and is now live on the platform.',
  pending:  'Your product is under review. Our team will verify whether it fits within our car modification category.',
  rejected: 'Your product was not approved because it does not belong to the car modification and customisation category, which is against our platform policy.',
};

// ─────────────────────────────────────────────────────────────────────────────
// FINAL SCORING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLDS = { APPROVE: 90, REJECT: 60 };

/**
 * Validate a product and return an AI decision.
 *
 * Decision flow
 * ─────────────
 * Step 1  Hard-reject blocklist         → instant REJECT
 * Step 2  Car-domain detection gate     → REJECT if no automotive context
 * Step 3  Hard-approve phrase check     → elevates score by +40
 * Step 4  Phrase + TF-IDF scoring       → final 0-100 score
 *           ≥ 90  → auto_approved
 *           60-89 → pending_review  (car-related, ambiguous modification fit)
 *           < 60  → auto_rejected
 *
 * @param {string} name
 * @param {string} description
 * @param {string} category  – always car-related by schema enum
 *
 * @returns {{
 *   decision:        'auto_approved' | 'pending_review' | 'auto_rejected',
 *   confidenceScore: number,
 *   reason:          string,   // admin-facing technical detail
 *   vendorMessage:   string,   // clean policy message for vendor UI
 *   layers: { hardRule, phraseScore, semanticCarSim, semanticNetSim }
 * }}
 */
function validateProduct(name = '', description = '', category = '') {
  const text     = ` ${name} ${description} `.toLowerCase();
  const textFull = `${name} ${description} ${category}`.toLowerCase();

  // ── Step 1: Hard-reject blocklist ────────────────────────────────────────
  for (const phrase of HARD_REJECT_PHRASES) {
    if (text.includes(phrase)) {
      return {
        decision:        'auto_rejected',
        confidenceScore: 5,
        reason:          `Blocked by hard-reject rule: matched excluded term "${phrase}". Platform only accepts car modification and customisation products.`,
        vendorMessage:   VENDOR_MSG.rejected,
        layers: { hardRule: `HARD_REJECT:${phrase}`, phraseScore: 0, semanticCarSim: 0, semanticNetSim: 0 },
      };
    }
  }

  // ── Step 2: Car-domain detection gate (MANDATORY) ────────────────────────
  // Any product that contains zero automotive context words is outside the
  // platform's domain and must be rejected — it must NEVER reach Pending.
  if (!hasCarDomainContext(text)) {
    return {
      decision:        'auto_rejected',
      confidenceScore: 8,
      reason:          'No automotive domain context detected in product name or description. Product appears unrelated to cars, car modification, or automotive customisation.',
      vendorMessage:   VENDOR_MSG.rejected,
      layers: { hardRule: 'DOMAIN_GATE:no_car_context', phraseScore: 0, semanticCarSim: 0, semanticNetSim: 0 },
    };
  }

  // ── Step 3: Hard-approve phrase boost ────────────────────────────────────
  let hardApproveBonus = 0;
  let hardApprovePhrase = null;
  for (const phrase of HARD_APPROVE_PHRASES) {
    if (text.includes(phrase)) {
      hardApproveBonus  = 40;
      hardApprovePhrase = phrase;
      break;
    }
  }

  // ── Step 4a: Phrase / N-gram scoring ─────────────────────────────────────
  let positiveScore = 0;
  let negativeScore = 0;
  const matchedPositive = [];
  const matchedNegative = [];

  for (const { phrase, score } of CAR_POSITIVE) {
    if (text.includes(phrase)) {
      positiveScore += score;
      matchedPositive.push(phrase);
    }
  }
  for (const { phrase, score } of CAR_NEGATIVE) {
    if (text.includes(phrase)) {
      negativeScore += score;
      matchedNegative.push(phrase);
    }
  }

  const cappedPositive = Math.min(positiveScore, 55);
  const cappedNegative = Math.min(negativeScore, 55);

  // ── Step 4b: TF-IDF cosine similarity ────────────────────────────────────
  const { carSim, nonCarSim } = semanticSimilarity(textFull);
  const semanticNet = Math.round((carSim - nonCarSim) * 30);

  // ── Final score ──────────────────────────────────────────────────────────
  // Base 50 (neutral, reached only because domain gate passed)
  // + category bonus 15 (all schema categories are car-related)
  const raw = 50
    + cappedPositive
    - cappedNegative
    + semanticNet
    + 15          // category bonus
    + hardApproveBonus;

  const confidenceScore = Math.max(0, Math.min(100, Math.round(raw)));

  // ── Decision ─────────────────────────────────────────────────────────────
  let decision;
  let reason;
  let vendorMessage;

  if (confidenceScore >= THRESHOLDS.APPROVE) {
    decision = 'auto_approved';
    vendorMessage = VENDOR_MSG.approved;
    const topMatches = (hardApprovePhrase
      ? [hardApprovePhrase, ...matchedPositive]
      : matchedPositive
    ).slice(0, 5);
    reason = topMatches.length > 0
      ? `Auto-approved. Matched car modification signals: ${topMatches.join(', ')}.`
      : 'Auto-approved via semantic similarity to car modification corpus.';

  } else if (confidenceScore < THRESHOLDS.REJECT) {
    // Car domain context exists but modification signals are too weak
    decision = 'auto_rejected';
    vendorMessage = VENDOR_MSG.rejected;
    reason = matchedNegative.length > 0
      ? `Car domain context present but modification signals insufficient. Negative signals: ${matchedNegative.slice(0, 4).join(', ')}.`
      : 'Car domain context present but insufficient modification/customisation signals detected.';

  } else {
    // Car context + ambiguous modification fit → human review
    decision = 'pending_review';
    vendorMessage = VENDOR_MSG.pending;
    reason = `Car domain context confirmed. Ambiguous modification fit (score ${confidenceScore}/100) — requires manual admin review.`;
    if (matchedPositive.length > 0) {
      reason += ` Partial car signals: ${matchedPositive.slice(0, 3).join(', ')}.`;
    }
  }

  return {
    decision,
    confidenceScore,
    reason,
    vendorMessage,
    layers: {
      hardRule:        hardApprovePhrase ? `HARD_APPROVE:${hardApprovePhrase}` : null,
      phraseScore:     cappedPositive - cappedNegative,
      semanticCarSim:  Math.round(carSim    * 100),
      semanticNetSim:  Math.round((carSim - nonCarSim) * 100),
    },
  };
}

module.exports = { validateProduct };
