#!/usr/bin/env node
// Generates the Ed25519 keypair for license response signing.
// Usage: npm run license:keygen
import { generateLicenseSigningKeyPair } from "../lib/license-signing.mjs";

const { privateKeyBase64, publicKeyBase64 } = generateLicenseSigningKeyPair();

console.log("Add to .env (keep secret, server-side only):");
console.log(`LICENSE_SIGNING_PRIVATE_KEY="${privateKeyBase64}"`);
console.log("");
console.log("Embed in sold products to verify /api/license/validate responses:");
console.log(`LICENSE_PUBLIC_KEY="${publicKeyBase64}"`);
