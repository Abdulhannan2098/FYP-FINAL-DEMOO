/**
 * uploadAndNotify.js
 *
 * Runs AFTER exportMongoData.js has written JSON files.
 * 1. Reads the _manifest.json produced by the export step.
 * 2. Creates a dated subfolder in Google Drive and uploads every JSON file.
 * 3. Sets the folder to "anyone with the link can view".
 * 4. Sends a professional HTML email containing the Drive link + summary.
 *
 * Uses OAuth2 (refresh token) — NOT a service account — so files are owned
 * by your actual Google account and count against your real Drive quota.
 * Service accounts have no storage quota and will always fail on My Drive.
 *
 * Required env vars (set as GitHub Secrets):
 *   GOOGLE_CLIENT_ID      — OAuth2 client ID from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET  — OAuth2 client secret
 *   GOOGLE_REFRESH_TOKEN  — long-lived refresh token (see setup guide)
 *   GOOGLE_DRIVE_FOLDER_ID — Drive folder ID the token owner has write access to
 *   EMAIL_USER            — Gmail address used as sender (same as backend .env)
 *   EMAIL_PASSWORD        — Gmail App Password (same as backend .env)
 *   NOTIFICATION_EMAIL    — recipient address for the report
 *   EXPORT_OUTPUT_DIR     — path where exportMongoData.js wrote the files
 */

const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load .env for local dev; dotenv never overrides existing CI env vars.
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── Config ───────────────────────────────────────────────────────────────────

const DATE_STAMP = new Date().toISOString().split('T')[0];
const EXPORT_BASE =
  process.env.EXPORT_OUTPUT_DIR || path.join(__dirname, '../../exports');
const EXPORT_DIR = path.join(EXPORT_BASE, DATE_STAMP);

// ─── Env validation ───────────────────────────────────────────────────────────

const REQUIRED = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
  'GOOGLE_DRIVE_FOLDER_ID',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'NOTIFICATION_EMAIL',
];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    `\n❌  Missing required environment variables:\n   ${missing.join('\n   ')}\n`
  );
  process.exit(1);
}

// ─── Google Drive helpers ─────────────────────────────────────────────────────

async function buildDriveClient() {
  // OAuth2 with a refresh token — files are owned by the real Google user,
  // not a service account, so there is no storage-quota issue.
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function createFolder(drive, parentId, name) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, name',
  });
  return res.data;
}

async function makePublic(drive, fileId) {
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });
}

async function uploadFile(drive, folderId, filePath, fileName) {
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: {
      mimeType: 'application/json',
      body: fs.createReadStream(filePath),
    },
    fields: 'id, name, size',
  });
  return res.data;
}

async function getFolderLink(drive, folderId) {
  const res = await drive.files.get({
    fileId: folderId,
    fields: 'webViewLink',
  });
  return res.data.webViewLink;
}

// ─── Drive upload orchestrator ────────────────────────────────────────────────

async function uploadToDrive(manifest) {
  console.log('\n☁️   Uploading to Google Drive...\n');

  const drive = await buildDriveClient();
  const folderName = `AutoSphere_Export_${DATE_STAMP}`;

  const folder = await createFolder(
    drive,
    process.env.GOOGLE_DRIVE_FOLDER_ID,
    folderName
  );
  console.log(`  📁  Created Drive folder: ${folder.name}`);

  await makePublic(drive, folder.id);

  const jsonFiles = fs
    .readdirSync(EXPORT_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const uploadedFiles = [];
  for (const fileName of jsonFiles) {
    const filePath = path.join(EXPORT_DIR, fileName);
    const uploaded = await uploadFile(drive, folder.id, filePath, fileName);
    const kb = Math.round((uploaded.size || 0) / 1024);
    console.log(`  ✅  ${fileName.padEnd(32)} ${String(kb).padStart(5)} KB`);
    uploadedFiles.push({ ...uploaded, fileName });
  }

  const folderLink = await getFolderLink(drive, folder.id);
  console.log(`\n  🔗  Shareable link: ${folderLink}\n`);

  return {
    folderId: folder.id,
    folderName,
    folderLink,
    totalFiles: uploadedFiles.length,
    files: uploadedFiles,
  };
}

// ─── Email HTML builder ───────────────────────────────────────────────────────

function buildEmailHtml({ driveResult, manifest }) {
  const exported = manifest.collections.filter((c) => c.exported);
  const skipped = manifest.collections.filter((c) => !c.exported);
  const totalDocs = manifest.totalDocuments || exported.reduce((s, c) => s + c.count, 0);

  const exportedRows = exported
    .map(
      (c) => `
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;font-size:13.5px;color:#1f2937;font-family:monospace;">${c.collection}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;font-size:13.5px;color:#1f2937;text-align:right;font-weight:600;">${c.count.toLocaleString()}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;text-align:center;">
          <span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:11.5px;font-weight:700;">✓ EXPORTED</span>
        </td>
      </tr>`
    )
    .join('');

  const skippedRows = skipped
    .map(
      (c) => `
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;font-size:13.5px;color:#9ca3af;font-family:monospace;">${c.collection}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;font-size:13.5px;color:#9ca3af;text-align:right;">0</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;text-align:center;">
          <span style="background:#f3f4f6;color:#9ca3af;padding:3px 10px;border-radius:12px;font-size:11.5px;font-weight:700;">EMPTY</span>
        </td>
      </tr>`
    )
    .join('');

  const now = new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>AutoSphere — Database Export Report</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:48px 16px;">
  <tr><td align="center">
  <table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 30px rgba(0,0,0,0.10);">

    <!-- ── HEADER ── -->
    <tr>
      <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 55%,#1d4ed8 100%);padding:44px 48px;text-align:center;">
        <p style="margin:0 0 10px;font-size:38px;line-height:1;">🗄️</p>
        <h1 style="margin:0 0 4px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">AutoSphere</h1>
        <p style="margin:0 0 18px;color:#93c5fd;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Database Export Report</p>
        <p style="margin:0;display:inline-block;background:rgba(255,255,255,0.12);color:#dbeafe;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:500;">${DATE_STAMP}</p>
      </td>
    </tr>

    <!-- ── SUCCESS BANNER ── -->
    <tr>
      <td style="background:#f0fdf4;padding:14px 48px;border-bottom:1px solid #bbf7d0;">
        <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">
          ✅ &nbsp;Export pipeline completed successfully
        </p>
        <p style="margin:4px 0 0;color:#166534;font-size:12.5px;">
          ${totalDocs.toLocaleString()} documents across ${exported.length} collections — stored securely on Google Drive
        </p>
      </td>
    </tr>

    <!-- ── DRIVE CTA ── -->
    <tr>
      <td style="padding:40px 48px 32px;text-align:center;">
        <p style="margin:0 0 8px;color:#374151;font-size:15px;font-weight:600;">Your export is ready</p>
        <p style="margin:0 0 28px;color:#6b7280;font-size:13.5px;line-height:1.6;">
          All JSON files have been uploaded to Google Drive.<br>
          Click the button below to access or download the export.
        </p>
        <a href="${driveResult.folderLink}"
           style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#ffffff;text-decoration:none;
                  padding:15px 40px;border-radius:9px;font-size:15px;font-weight:700;letter-spacing:0.4px;
                  box-shadow:0 4px 16px rgba(37,99,235,0.35);">
          📂 &nbsp; Open Google Drive Folder
        </a>
        <p style="margin:14px 0 0;color:#9ca3af;font-size:11.5px;">
          Folder: <span style="font-family:monospace;color:#6b7280;">${driveResult.folderName}</span>
        </p>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">Accessible to anyone with the link</p>
      </td>
    </tr>

    <!-- ── DIVIDER ── -->
    <tr><td style="padding:0 48px;"><div style="border-top:1px solid #f0f0f0;"></div></td></tr>

    <!-- ── COLLECTION TABLE ── -->
    <tr>
      <td style="padding:32px 48px 8px;">
        <h2 style="margin:0 0 16px;color:#111827;font-size:15px;font-weight:700;">📊 &nbsp;Collection Summary</h2>
        <table width="100%" cellpadding="0" cellspacing="0"
               style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:separate;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;">Collection</th>
              <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;">Documents</th>
              <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${exportedRows}
            ${skippedRows}
          </tbody>
        </table>
      </td>
    </tr>

    <!-- ── META CARD ── -->
    <tr>
      <td style="padding:24px 48px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <tr><td colspan="2" style="padding:12px 20px 8px;border-bottom:1px solid #e2e8f0;">
            <span style="font-size:12px;font-weight:700;color:#475569;letter-spacing:0.5px;text-transform:uppercase;">Export Details</span>
          </td></tr>
          <tr>
            <td style="padding:9px 20px;font-size:12.5px;color:#64748b;">🕐 Generated at</td>
            <td style="padding:9px 20px;font-size:12.5px;color:#1e293b;font-weight:600;text-align:right;">${now}</td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:9px 20px;font-size:12.5px;color:#64748b;">🗃️ Database</td>
            <td style="padding:9px 20px;font-size:12.5px;color:#1e293b;font-weight:600;text-align:right;font-family:monospace;">${manifest.database}</td>
          </tr>
          <tr>
            <td style="padding:9px 20px;font-size:12.5px;color:#64748b;">📦 Total documents</td>
            <td style="padding:9px 20px;font-size:12.5px;color:#1e293b;font-weight:600;text-align:right;">${totalDocs.toLocaleString()}</td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:9px 20px;font-size:12.5px;color:#64748b;">📄 Files uploaded</td>
            <td style="padding:9px 20px;font-size:12.5px;color:#1e293b;font-weight:600;text-align:right;">${driveResult.totalFiles} JSON files</td>
          </tr>
          <tr>
            <td style="padding:9px 20px;font-size:12.5px;color:#64748b;">☁️ Drive folder</td>
            <td style="padding:9px 20px;font-size:12.5px;text-align:right;">
              <a href="${driveResult.folderLink}" style="color:#2563eb;text-decoration:none;font-weight:600;">${driveResult.folderName}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── SECURITY NOTE ── -->
    <tr>
      <td style="padding:0 48px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
          <tr>
            <td style="font-size:12.5px;color:#92400e;line-height:1.6;">
              🔒 &nbsp;<strong>Security notice:</strong> Sensitive fields (passwords, tokens, 2FA secrets, OTPs,
              CNIC documents) have been excluded from this export. All files are read-only and
              accessible via shareable link only.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── FOOTER ── -->
    <tr>
      <td style="background:#f8fafc;padding:22px 48px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:11.5px;">
          This is an automated report generated by the AutoSphere data export pipeline.
        </p>
        <p style="margin:0;color:#cbd5e1;font-size:11px;">
          AutoSphere · FYP Project · Do not reply to this email
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── Email sender ─────────────────────────────────────────────────────────────

async function sendEmail(driveResult, manifest) {
  console.log('📧  Sending notification email...\n');

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const totalDocs =
    manifest.totalDocuments ||
    manifest.collections.reduce((s, c) => s + c.count, 0);

  const plainText =
    `AutoSphere — Database Export Report\n` +
    `${'─'.repeat(44)}\n\n` +
    `Date        : ${DATE_STAMP}\n` +
    `Database    : ${manifest.database}\n` +
    `Documents   : ${totalDocs.toLocaleString()}\n` +
    `Collections : ${manifest.totalCollections}\n` +
    `Files       : ${driveResult.totalFiles} JSON files\n\n` +
    `Google Drive Folder:\n${driveResult.folderLink}\n\n` +
    `${'─'.repeat(44)}\n` +
    `Sensitive fields (passwords, tokens, OTPs) have been excluded.\n` +
    `This is an automated report — do not reply.\n`;

  const info = await transporter.sendMail({
    from: `"AutoSphere System" <${process.env.EMAIL_USER}>`,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `[AutoSphere] Database Export Ready — ${DATE_STAMP}`,
    text: plainText,
    html: buildEmailHtml({ driveResult, manifest }),
  });

  console.log(`  ✅  Email sent  →  ${process.env.NOTIFICATION_EMAIL}`);
  console.log(`  📬  Message ID: ${info.messageId}\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const manifestPath = path.join(EXPORT_DIR, '_manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(
      `\n❌  _manifest.json not found at: ${manifestPath}\n` +
        `    Run exportMongoData.js first.\n`
    );
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const driveResult = await uploadToDrive(manifest);
  await sendEmail(driveResult, manifest);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🎉  Pipeline complete');
  console.log(`  📂  Drive : ${driveResult.folderLink}`);
  console.log(`  📧  Email : ${process.env.NOTIFICATION_EMAIL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch((err) => {
  console.error('\n❌  uploadAndNotify failed:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  process.exit(1);
});
