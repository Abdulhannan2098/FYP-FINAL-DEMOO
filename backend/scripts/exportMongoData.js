/**
 * Standalone MongoDB export script — no Express/server required.
 * Uses the native mongodb driver so it has zero dependency on backend
 * application code (no canvas, sharp, face-api, tesseract, etc.).
 *
 * Usage (local):  node backend/scripts/exportMongoData.js
 * Usage (CI):     MONGODB_URI=<uri> EXPORT_OUTPUT_DIR=<dir> node exportMongoData.js
 *
 * Sensitive fields listed in SENSITIVE_FIELDS are stripped before writing.
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load .env for local dev — dotenv silently skips missing files.
// In CI the variable is injected via GitHub Secrets so dotenv is a no-op.
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── Config ──────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI;

const DATE_STAMP = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const OUTPUT_BASE =
  process.env.EXPORT_OUTPUT_DIR ||
  path.join(__dirname, '..', '..', 'exports');

const EXPORT_DIR = path.join(OUTPUT_BASE, DATE_STAMP);

// ─── Sensitive field stripping ────────────────────────────────────────────────
// These fields exist in the DB but must never appear in exported JSON.
// Keys are MongoDB collection names (not Mongoose model names).

const SENSITIVE_FIELDS = {
  users: [
    'password',
    'resetPasswordToken',
    'resetPasswordExpire',
    'twoFactorSecret',
    'twoFactorBackupCodes',
    'emailVerificationOTP',
    'emailVerificationExpire',
    'phoneVerificationOTP',
    'phoneVerificationExpire',
    'authProviderId',
    'vendorVerification', // contains CNIC document paths + match scores
  ],
  sessions: ['token', 'refreshToken', 'accessToken'],
};

function stripSensitive(collectionName, doc) {
  const fields = SENSITIVE_FIELDS[collectionName];
  if (!fields || fields.length === 0) return doc;
  const clean = { ...doc };
  fields.forEach((f) => delete clean[f]);
  return clean;
}

// ─── Per-collection export ────────────────────────────────────────────────────

async function exportCollection(db, name) {
  const col = db.collection(name);
  const total = await col.countDocuments();

  if (total === 0) {
    console.log(`  ⚪  ${name.padEnd(24)} 0 documents — skipped`);
    return { collection: name, count: 0, exported: false, file: null };
  }

  const docs = [];
  const cursor = col.find({});
  for await (const doc of cursor) {
    docs.push(stripSensitive(name, doc));
  }

  const filePath = path.join(EXPORT_DIR, `${name}.json`);
  const payload = {
    collection: name,
    exportedAt: new Date().toISOString(),
    count: docs.length,
    data: docs,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(
    `  ✅  ${name.padEnd(24)} ${String(docs.length).padStart(5)} documents → ${name}.json`
  );
  return { collection: name, count: docs.length, exported: true, file: `${name}.json` };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  if (!MONGODB_URI) {
    console.error(
      '\n❌  MONGODB_URI is not set.\n' +
        '    Local:  add it to backend/.env\n' +
        '    CI:     add MONGODB_URI as a GitHub Secret\n'
    );
    process.exit(1);
  }

  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  📦  MongoDB Export  —  ${DATE_STAMP}`);
  console.log(`  📁  ${EXPORT_DIR}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });

  try {
    await client.connect();

    // Derive DB name from the URI path segment (e.g. /AutoSphere_db)
    const uriDbName = new URL(MONGODB_URI).pathname.replace(/^\//, '');
    const dbName = uriDbName || 'admin';
    const db = client.db(dbName);

    console.log(`  🔗  Connected to database: ${dbName}\n`);

    const colList = await db.listCollections().toArray();
    const names = colList.map((c) => c.name).sort();

    console.log(`  📋  Collections found: ${names.join(', ')}\n`);

    const results = [];
    for (const name of names) {
      results.push(await exportCollection(db, name));
    }

    // Write manifest
    const totalDocs = results.reduce((s, r) => s + r.count, 0);
    const manifest = {
      exportedAt: new Date().toISOString(),
      database: dbName,
      runBy: process.env.GITHUB_ACTOR || process.env.USER || 'local',
      workflow: process.env.GITHUB_WORKFLOW || 'manual',
      totalCollections: names.length,
      totalDocuments: totalDocs,
      collections: results,
    };

    const manifestPath = path.join(EXPORT_DIR, '_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      `  ✅  Done: ${totalDocs} documents across ${names.length} collections`
    );
    console.log(`  📄  Manifest: _manifest.json`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error('\n❌  Export failed:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  process.exit(1);
});
