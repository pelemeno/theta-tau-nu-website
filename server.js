require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const { Pool } = require('pg');

// Use memory storage for multer since we'll upload directly to S3 (or save to disk as fallback)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// AWS S3 configuration (require these env vars for S3 mode)
const AWS_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

let s3Client = null;
let getSignedUrl = null;

const app = express();
app.use(helmet());
// request logging: console + file
app.use(morgan('tiny'));
app.use(cors({ origin: true }));
app.use(express.json());

// Ensure uploads directory exists and is served for local fallback
const uploadsDir = path.join(__dirname, 'uploads');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { /* ignore */ }
app.use('/uploads', express.static(uploadsDir));

// Serve only images and uploads from project root; frontend is now the React app in client/dist
app.use('/images', express.static(path.join(__dirname, 'images')));

// If a built React app exists in dist, serve it as the primary frontend (SPA).
const clientDist = path.join(__dirname, 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

try {
  // require inside try so app still runs if AWS SDK isn't installed
  const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl: _getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  getSignedUrl = _getSignedUrl;
  if (AWS_REGION && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && S3_BUCKET) {
    s3Client = new S3Client({ region: AWS_REGION, credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY } });
    // attach to app locals for use later (include presigner)
    app.locals.S3 = { s3Client, PutObjectCommand, GetObjectCommand };
    // attach presigner helper so other code can use it consistently
    app.locals.getSignedUrl = getSignedUrl;
  } else {
    console.warn('S3 not configured (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET required) — uploads will be saved locally.');
  }
} catch (err) {
  console.warn('AWS SDK not installed; S3 upload disabled. To enable, run npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
}

// Log S3 status at startup (mask secrets)
const s3Configured = !!(AWS_REGION && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && S3_BUCKET && app.locals && app.locals.S3 && app.locals.S3.s3Client);
console.log(`S3 configured: ${s3Configured} (bucket=${S3_BUCKET || 'none'}, region=${AWS_REGION || 'none'})`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simple health
app.get('/health', (req, res) => res.json({ ok: true }));

// Serve uploaded resumes (public). Consider serving from S3 for production.
// Helper: basic auth middleware for admin routes
function basicAuth(req, res, next) {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  if (!adminUser || !adminPass) return res.status(401).send('Admin credentials not configured');
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).send('Authentication required');
  }
  const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [user, pass] = credentials.split(':');
  if (user === adminUser && pass === adminPass) return next();
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
  return res.status(403).send('Forbidden');
}

// POST /api/applications - accept multipart form, upload resume to S3 (if configured), insert row
app.post('/api/applications', upload.single('resume'), async (req, res) => {
  try {
    const { name, email, year, major, gpa, linkedin, why, referral } = req.body;

    let s3_key = null;
    let s3_url = null;

    // Validate uploaded file (must be PDF)
    if (req.file) {
      const ext = path.extname(req.file.originalname || '').toLowerCase();
      const isPdfMime = (req.file.mimetype === 'application/pdf');
      const isPdfExt = (ext === '.pdf');
      if (!isPdfMime || !isPdfExt) {
        return res.status(400).json({ ok: false, error: 'Resume must be a PDF file' });
      }

      // Create a safe, randomized filename to avoid collisions and injection
      const rand = crypto.randomBytes(8).toString('hex');
      const timestamp = Date.now();
      const base = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120);
      const filename = `${timestamp}_${rand}_${base}`;

      if (s3Client && S3_BUCKET && app.locals && app.locals.S3 && app.locals.S3.s3Client) {
        const { PutObjectCommand } = app.locals.S3;
        const put = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: filename,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ContentDisposition: `attachment; filename="${base}"`,
          ServerSideEncryption: 'AES256',
          ACL: 'private'
        });
        try {
          await s3Client.send(put);
          s3_key = filename;
          s3_url = null; // admin endpoint will generate signed URLs
          console.log(`Uploaded resume to S3 bucket=${S3_BUCKET} key=${filename}`);
        } catch (s3err) {
          console.error('S3 upload failed, falling back to local save', s3err && s3err.message);
          const filePath = path.join(uploadsDir, filename);
          fs.writeFileSync(filePath, req.file.buffer);
          s3_key = filename;
          s3_url = `/uploads/${encodeURIComponent(filename)}`;
        }
      } else {
        // Save to local uploads directory as a fallback
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);
        s3_key = filename;
        s3_url = `/uploads/${encodeURIComponent(filename)}`;
        console.log(`Saved resume locally to ${filePath}`);
      }
    }

    const result = await pool.query(
      `INSERT INTO public.applications (name, email, year, major, gpa, linkedin, why, referral, resume_path, resume_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, email, year, major, gpa || null, linkedin, why, referral, s3_key, s3_url]
    );

    res.status(201).json({ ok: true, application: result.rows[0] });
  } catch (err) {
    console.error('Error inserting application', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Admin API: list applications (protected)
app.get('/api/admin/applications', basicAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM public.applications ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Admin API: get signed URL for resume
app.get('/api/admin/application/:id/resume', basicAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await pool.query('SELECT resume_path FROM public.applications WHERE id = $1', [id]);
    if (!rows.length || !rows[0].resume_path) return res.status(404).json({ error: 'Resume not found' });
    const key = rows[0].resume_path;
    // If S3 is configured, return a signed URL; otherwise return the local uploads URL
    if ((app.locals.S3 && app.locals.S3.s3Client) && (app.locals.getSignedUrl || getSignedUrl) && S3_BUCKET) {
      const { GetObjectCommand } = app.locals.S3;
      const presigner = app.locals.getSignedUrl || getSignedUrl;
      const client = app.locals.S3.s3Client || s3Client;
      // Allow admin to request inline vs attachment via query param ?disposition=inline|attachment
      const disposition = (req.query.disposition || 'attachment').toLowerCase();
      const respDisposition = disposition === 'inline' ? `inline; filename="${key}"` : `attachment; filename="${key}"`;
      const cmdParams = { Bucket: S3_BUCKET, Key: key, ResponseContentDisposition: respDisposition };
      const cmd = new GetObjectCommand(cmdParams);
      const url = await presigner(client, cmd, { expiresIn: 60 * 60 });
      return res.json({ url });
    }
    const localUrl = `/uploads/${encodeURIComponent(key)}`;
    res.json({ url: localUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Serve admin UI (simple)
app.get('/admin', basicAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

const PORT = process.env.PORT || 3000;
// If a platform (like Render) provides PORT, bind to all interfaces so the service checker can detect the open port.
// Otherwise default to loopback for local development.
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const server = app.listen(PORT, HOST, () => {
  const addr = server.address();
  console.log(`Server listening on ${addr && addr.address ? addr.address : HOST}:${addr && addr.port ? addr.port : PORT}`);
});

// startup log
console.log(`${new Date().toISOString()} - Server started on ${HOST}:${PORT}`);

// Global handlers to capture uncaught errors and promise rejections
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);
});
