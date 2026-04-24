/**
 * uploadAndNotify.js
 *
 * Runs AFTER exportMongoData.js has written JSON files.
 * 1. Reads the _manifest.json produced by the export step.
 * 2. Uploads every JSON file to a Supabase Storage bucket under exports/YYYY-MM-DD/
 * 3. Sends a professional HTML email with file links + export summary.
 *
 * Required env vars (GitHub Secrets):
 *   SUPABASE_URL              — https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service_role key (Settings → API → secret key)
 *   SUPABASE_BUCKET           — storage bucket name (e.g. "db-exports")
 *   EMAIL_USER                — Gmail address (sender)
 *   EMAIL_PASSWORD            — Gmail App Password
 *   NOTIFICATION_EMAIL        — recipient address for the report
 *   EXPORT_OUTPUT_DIR         — path where exportMongoData.js wrote files
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── Config ───────────────────────────────────────────────────────────────────

const DATE_STAMP = new Date().toISOString().split('T')[0];
const EXPORT_BASE =
  process.env.EXPORT_OUTPUT_DIR || path.join(__dirname, '../../exports');
const EXPORT_DIR = path.join(EXPORT_BASE, DATE_STAMP);

// ─── Env validation ───────────────────────────────────────────────────────────

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_BUCKET',
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

// ─── Supabase upload ──────────────────────────────────────────────────────────

async function uploadToSupabase(manifest) {
  console.log('\n☁️   Uploading to Supabase Storage...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const bucket = process.env.SUPABASE_BUCKET;
  const jsonFiles = fs
    .readdirSync(EXPORT_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const uploadedFiles = [];

  for (const fileName of jsonFiles) {
    const filePath = path.join(EXPORT_DIR, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `exports/${DATE_STAMP}/${fileName}`;
    const fileSizeKb = Math.round(fileBuffer.length / 1024);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/json',
        upsert: true, // safe re-run: overwrites same-day export
      });

    if (error) throw new Error(`Upload failed for ${fileName}: ${error.message}`);

    // Get public URL (bucket must have public access enabled)
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    console.log(`  ✅  ${fileName.padEnd(32)} ${String(fileSizeKb).padStart(5)} KB`);
    uploadedFiles.push({ fileName, storagePath, publicUrl: urlData.publicUrl, sizeKb: fileSizeKb });
  }

  // Extract project ref from URL for dashboard link
  const projectRef = process.env.SUPABASE_URL.replace('https://', '').split('.')[0];
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectRef}/storage/buckets/${bucket}`;
  const folderPrefix = `exports/${DATE_STAMP}`;

  console.log(`\n  🔗  Dashboard: ${dashboardUrl}`);
  console.log(`  📁  Folder   : ${folderPrefix}\n`);

  return {
    dashboardUrl,
    folderPrefix,
    bucket,
    projectRef,
    totalFiles: uploadedFiles.length,
    files: uploadedFiles,
  };
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildEmailHtml({ result, manifest }) {
  const exported = manifest.collections.filter((c) => c.exported);
  const skipped  = manifest.collections.filter((c) => !c.exported);
  const totalDocs =
    manifest.totalDocuments ||
    exported.reduce((s, c) => s + c.count, 0);

  const collectionRows = exported
    .map((c) => `
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1f2937;font-family:monospace;">${c.collection}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1f2937;text-align:right;font-weight:600;">${c.count.toLocaleString()}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;text-align:center;">
          <span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">EXPORTED</span>
        </td>
      </tr>`)
    .join('');

  const skippedRows = skipped
    .map((c) => `
      <tr>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#9ca3af;font-family:monospace;">${c.collection}</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#9ca3af;text-align:right;">0</td>
        <td style="padding:11px 16px;border-bottom:1px solid #f0f0f0;text-align:center;">
          <span style="background:#f3f4f6;color:#9ca3af;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">EMPTY</span>
        </td>
      </tr>`)
    .join('');

  const fileLinks = result.files
    .filter((f) => f.fileName !== '_manifest.json')
    .map((f) => `
      <tr>
        <td style="padding:9px 16px;border-bottom:1px solid #f8f8f8;">
          <a href="${f.publicUrl}" style="color:#2563eb;text-decoration:none;font-size:13px;font-family:monospace;">${f.fileName}</a>
        </td>
        <td style="padding:9px 16px;border-bottom:1px solid #f8f8f8;text-align:right;font-size:12px;color:#9ca3af;">${f.sizeKb} KB</td>
      </tr>`)
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

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 55%,#1d4ed8 100%);padding:44px 48px;text-align:center;">
      <p style="margin:0 0 10px;font-size:38px;line-height:1;">🗄️</p>
      <h1 style="margin:0 0 4px;color:#fff;font-size:24px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">AutoSphere</h1>
      <p style="margin:0 0 18px;color:#93c5fd;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Database Export Report</p>
      <p style="margin:0;display:inline-block;background:rgba(255,255,255,0.12);color:#dbeafe;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:500;">${DATE_STAMP}</p>
    </td>
  </tr>

  <!-- SUCCESS BANNER -->
  <tr>
    <td style="background:#f0fdf4;padding:14px 48px;border-bottom:1px solid #bbf7d0;">
      <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">✅ &nbsp;Export pipeline completed successfully</p>
      <p style="margin:4px 0 0;color:#166534;font-size:12.5px;">
        ${totalDocs.toLocaleString()} documents across ${exported.length} collections — stored in Supabase Storage
      </p>
    </td>
  </tr>

  <!-- SUPABASE CTA -->
  <tr>
    <td style="padding:40px 48px 32px;text-align:center;">
      <p style="margin:0 0 8px;color:#374151;font-size:15px;font-weight:600;">Your export is ready on Supabase</p>
      <p style="margin:0 0 28px;color:#6b7280;font-size:13.5px;line-height:1.6;">
        All JSON files have been uploaded to Supabase Storage.<br>
        Click below to open the storage dashboard.
      </p>
      <a href="${result.dashboardUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#3ecf8e,#1a9e6b);color:#ffffff;text-decoration:none;
                padding:15px 40px;border-radius:9px;font-size:15px;font-weight:700;letter-spacing:0.4px;
                box-shadow:0 4px 16px rgba(62,207,142,0.35);">
        🟢 &nbsp; Open Supabase Storage
      </a>
      <p style="margin:14px 0 0;color:#9ca3af;font-size:11.5px;">
        Bucket: <span style="font-family:monospace;color:#6b7280;">${result.bucket}</span>
        &nbsp;/&nbsp;
        Path: <span style="font-family:monospace;color:#6b7280;">${result.folderPrefix}/</span>
      </p>
    </td>
  </tr>

  <!-- DIVIDER -->
  <tr><td style="padding:0 48px;"><div style="border-top:1px solid #f0f0f0;"></div></td></tr>

  <!-- COLLECTION SUMMARY TABLE -->
  <tr>
    <td style="padding:32px 48px 8px;">
      <h2 style="margin:0 0 16px;color:#111827;font-size:15px;font-weight:700;">📊 &nbsp;Collection Summary</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:separate;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;">Collection</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;">Documents</th>
            <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${collectionRows}
          ${skippedRows}
        </tbody>
      </table>
    </td>
  </tr>

  <!-- FILE DOWNLOAD LINKS -->
  <tr>
    <td style="padding:24px 48px 8px;">
      <h2 style="margin:0 0 16px;color:#111827;font-size:15px;font-weight:700;">📥 &nbsp;Download Files</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:separate;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:9px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;">File</th>
            <th style="padding:9px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;">Size</th>
          </tr>
        </thead>
        <tbody>${fileLinks}</tbody>
      </table>
    </td>
  </tr>

  <!-- META CARD -->
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
          <td style="padding:9px 20px;font-size:12.5px;color:#64748b;">☁️ Storage bucket</td>
          <td style="padding:9px 20px;font-size:12.5px;color:#1e293b;font-weight:600;text-align:right;font-family:monospace;">${result.bucket}/${result.folderPrefix}/</td>
        </tr>
        <tr>
          <td style="padding:9px 20px;font-size:12.5px;color:#64748b;">📄 Files uploaded</td>
          <td style="padding:9px 20px;font-size:12.5px;color:#1e293b;font-weight:600;text-align:right;">${result.totalFiles} JSON files</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- SECURITY NOTE -->
  <tr>
    <td style="padding:0 48px 32px;">
      <table width="100%" cellpadding="14" cellspacing="0"
             style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
        <tr>
          <td style="font-size:12.5px;color:#92400e;line-height:1.6;">
            🔒 &nbsp;<strong>Security notice:</strong> Sensitive fields (passwords, tokens,
            2FA secrets, OTPs, CNIC documents) have been excluded from this export.
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f8fafc;padding:22px 48px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;color:#94a3b8;font-size:11.5px;">Automated report — AutoSphere data export pipeline</p>
      <p style="margin:0;color:#cbd5e1;font-size:11px;">Do not reply to this email</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Email sender ─────────────────────────────────────────────────────────────

async function sendEmail(result, manifest) {
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
    `Files       : ${result.totalFiles} JSON files\n` +
    `Storage     : ${result.bucket}/${result.folderPrefix}/\n\n` +
    `Supabase Dashboard:\n${result.dashboardUrl}\n\n` +
    `File Links:\n` +
    result.files.map((f) => `  • ${f.fileName}: ${f.publicUrl}`).join('\n') +
    `\n\n${'─'.repeat(44)}\n` +
    `Sensitive fields have been excluded. Automated report — do not reply.\n`;

  const info = await transporter.sendMail({
    from: `"AutoSphere System" <${process.env.EMAIL_USER}>`,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `[AutoSphere] Database Export Ready — ${DATE_STAMP}`,
    text: plainText,
    html: buildEmailHtml({ result, manifest }),
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

  const result = await uploadToSupabase(manifest);
  await sendEmail(result, manifest);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🎉  Pipeline complete');
  console.log(`  🟢  Supabase : ${result.dashboardUrl}`);
  console.log(`  📧  Email    : ${process.env.NOTIFICATION_EMAIL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch((err) => {
  console.error('\n❌  uploadAndNotify failed:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  process.exit(1);
});
