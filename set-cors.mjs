// set-cors.mjs — sets CORS on Firebase Storage bucket
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const BUCKET = 'dedobol3d.firebasestorage.app';

const CORS_CONFIG = [
  {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://tableball.web.app',
      'https://tableball.firebaseapp.com',
    ],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    responseHeader: [
      'Content-Type',
      'Authorization',
      'Content-Length',
      'User-Agent',
      'x-goog-resumable',
      'x-goog-meta-firebaseStorageDownloadTokens',
    ],
    maxAgeSeconds: 3600,
  },
];

async function run() {
  // Get access token from firebase-tools
  const api = require('firebase-tools/lib/api');
  const token = await new Promise((resolve, reject) => {
    try {
      const { getAccessToken } = require('firebase-tools/lib/auth');
      getAccessToken().then(resolve).catch(reject);
    } catch {
      reject(new Error('Could not load firebase-tools auth module'));
    }
  });

  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}?fields=cors`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cors: CORS_CONFIG }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  console.log('✅ CORS set successfully:', JSON.stringify(data, null, 2));
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
