/*
 Simple SMTP verification script for Brevo credentials.
 It loads notification-service/.env and attempts to authenticate via Nodemailer.
 No secrets are printed.
*/
const path = require('path');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load .env from notification-service directory
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
} = process.env;
  console.log(SMTP_PASS.length);

async function main() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('Missing SMTP env vars. Ensure SMTP_HOST, SMTP_USER, and SMTP_PASS are set in notification-service/.env');
    process.exit(1);
  }

  const port = Number(SMTP_PORT) || 587;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: false, // Brevo on 587 uses STARTTLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    logger: true,
    debug: true,
  });

  try {
    await transporter.verify();
    console.log('SUCCESS: SMTP credentials verified with Brevo.');
    process.exit(0);
  } catch (err) {
    console.error('FAILURE: SMTP verification failed.');
    console.error(err && err.message ? err.message : err);
    process.exit(2);
  }
}

main();

