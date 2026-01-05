Deploying the Theta Tau backend and frontend to Render

This repository contains a small Express backend (server.js) and a static frontend (index.html, rush.html, etc.). The server handles form submissions and uploads resumes to S3 (optional) and stores application records in Postgres.

Quick steps to deploy on Render (recommended):

1) Push your repo to GitHub (or connect an existing repo to Render).

2) Create a new Web Service on Render and connect your repository (or use the included `render.yaml`).
   - Build Command: `npm install`
   - Start Command: `npm start`

3) Add the required Environment Variables in Render's Dashboard -> Environment:
   - `DATABASE_URL` = your Postgres connection string (postgres://USER:PASSWORD@HOST:PORT/DBNAME)
   - `ADMIN_USER` and `ADMIN_PASS` = basic auth credentials for the admin UI
   - (Optional, for S3 uploads) `AWS_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - `PORT` is optional (Render provides one automatically).

4) Make sure you run the DB migration to create the `applications` table:
   - Run the SQL from `create_applications.sql` against your Postgres DB (psql or GUI).

5) Deploy and test:
   - After the service is live, visit `https://<your-render-url>/` for the site.
   - The rush form will POST to `/api/applications`.
   - Admin UI: visit `https://<your-render-url>/admin` and log in with `ADMIN_USER`/`ADMIN_PASS`.

Notes & troubleshooting
- If you plan to use S3, install the AWS SDK packages (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) before deploy or add them to `package.json`.
- For production, consider using a managed object store (S3, DigitalOcean Spaces), and secure admin access beyond Basic Auth.
- Monitor logs in Render's dashboard for errors.

If you want, I can prepare a minimal GitHub Actions workflow to run migrations automatically on deploy, or help you connect and deploy the site on Render—tell me which step you'd like me to take next.