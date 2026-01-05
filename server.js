require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const { Pool } = require('pg');

// Use memory storage for multer since we'll upload directly to S3
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// AWS S3 configuration (require these env vars for S3 mode)
const AWS_REGION = process.env.AWS_REGION;
const S3_BUCKET = process.env.S3_BUCKET;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

let s3Client = null;
let getSignedUrl = null;
try {
  // require inside try so app still runs if AWS SDK isn't installed
  const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl: _getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  getSignedUrl = _getSignedUrl;
  if (AWS_REGION && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({ region: AWS_REGION, credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY } });
    // attach to app locals for use later
    app.locals.S3 = { s3Client, PutObjectCommand, GetObjectCommand };
  } else {
    console.warn('S3 not configured (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY required) — uploads will be disabled.');
  }
} catch (err) {
  console.warn('AWS SDK not installed; S3 upload disabled. To enable, run npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
}

const app = express();
app.use(helmet());
app.use(morgan('tiny'));
app.use(cors({ origin: true }));
app.use(express.json());

// Serve static site files from project root (index.html, style.css, rush.html, etc.)
app.use(express.static(path.join(__dirname)));

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

    if (req.file && s3Client && S3_BUCKET) {
      const timestamp = Date.now();
      const safeName = (name || 'applicant').replace(/[^a-z0-9_-]/gi, '_');
      const filename = `${timestamp}_${safeName}_${req.file.originalname}`;
      const { PutObjectCommand } = app.locals.S3;
      const put = new PutObjectCommand({ Bucket: S3_BUCKET, Key: filename, Body: req.file.buffer, ContentType: req.file.mimetype });
      await s3Client.send(put);
      s3_key = filename;
      // If bucket is public, you can construct a public URL; otherwise keep key and generate signed URLs for admin access
      s3_url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(filename)}`;
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
    if (!s3Client || !getSignedUrl) return res.status(503).json({ error: 'S3 not configured' });
    const { GetObjectCommand } = app.locals.S3;
    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3Client, cmd, { expiresIn: 60 * 60 });
    res.json({ url });
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
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
