/**
 * Backfill user documents with handle/searchableKeywords/displayNameLower.
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json pnpm backfill:users
 * or set FIREBASE_SERVICE_ACCOUNT (JSON string).
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const admin = require("firebase-admin");

function initApp() {
  if (admin.apps.length > 0) return admin.app();

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  } else {
    credential = admin.credential.applicationDefault();
  }
  return admin.initializeApp({ credential });
}

function generateKeywords(text) {
  if (!text) return [];
  const clean = text.toLowerCase().trim();
  const parts = clean.split(/\s+/);
  const keywords = new Set();
  const addPrefixes = (token) => {
    for (let i = 1; i <= token.length; i++) keywords.add(token.slice(0, i));
  };
  parts.forEach(addPrefixes);
  addPrefixes(clean.replace(/\s+/g, ""));
  return Array.from(keywords);
}

async function run() {
  initApp();
  const db = admin.firestore();
  const snap = await db.collection("users").get();

  console.log(`Scanning ${snap.size} user docs...`);
  let updated = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};
    const displayName = data.displayName || `User-${docSnap.id.slice(0, 4)}`;
    const handle = data.handle || displayName.toLowerCase().replace(/\s+/g, "");
    const displayNameLower = data.displayNameLower || displayName.toLowerCase();
    const keywords = Array.isArray(data.searchableKeywords) && data.searchableKeywords.length > 0
      ? data.searchableKeywords
      : generateKeywords(displayName);

    const needsUpdate =
      data.handle !== handle ||
      data.displayNameLower !== displayNameLower ||
      !data.searchableKeywords ||
      data.searchableKeywords.length === 0;

    if (needsUpdate) {
      await docSnap.ref.set(
        {
          handle,
          displayNameLower,
          searchableKeywords: keywords,
        },
        { merge: true }
      );
      updated++;
    }
  }

  console.log(`Backfill complete. Updated ${updated} users.`);
}

run().catch((err) => {
  console.error("Backfill failed", err);
  process.exit(1);
});
