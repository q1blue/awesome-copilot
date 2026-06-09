#!/usr/bin/env node
/**
 * eng/generate-attestation.mjs
 * 
 * Generates a deterministic, cryptographically attestable manifest for awesome-copilot.
 * Aligned with OMNI-333, CTES-1.0, AEGS-1.0, and CER-1.0 standards.
 * 
 * Usage:
 *   node eng/generate-attestation.mjs
 * 
 * Output:
 *   attest/attestation-manifest.json
 *   (To be signed: gpg --armor --detach-sign attest/attestation-manifest.json)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { dirname } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const CRITICAL_FILES = [
  'README.md',
  'package.json',
  'package-lock.json',
  '.github/plugin/marketplace.json',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
];

const GLOB_PATTERNS = [
  'eng/*.mjs',
  'agents/**/*.agent.md',
  'skills/**/SKILL.md',
  'plugins/**/.github/plugin/plugin.json',
];

const ATTESTATION_DIR = 'attest';
const MANIFEST_FILE = `${ATTESTATION_DIR}/attestation-manifest.json`;
const MANIFEST_INDEX_FILE = `${ATTESTATION_DIR}/manifest-index.json`;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Executes a shell command and returns stdout
 */
function shell(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (e) {
    console.error(`Command failed: ${cmd}`);
    throw e;
  }
}

/**
 * Normalizes line endings: CRLF → LF
 * Ensures deterministic hashing across platforms
 */
function normalizeLineEndings(content) {
  return content.replace(/\r\n/g, '\n');
}

/**
 * Computes SHA-256 hash of content
 */
function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Computes SHA-512 hash of content
 */
function sha512(content) {
  return createHash('sha512').update(content).digest('hex');
}

/**
 * Canonical JSON stringify: sorts all keys at all levels
 */
function canonicalStringify(obj, indent = 0) {
  if (obj === null) return 'null';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  
  if (Array.isArray(obj)) {
    const items = obj.map(item => canonicalStringify(item, indent));
    return `[${items.join(',')}]`;
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => 
      `${JSON.stringify(key)}:${canonicalStringify(obj[key], indent)}`
    );
    return `{${pairs.join(',')}}`;
  }
  
  return JSON.stringify(obj);
}

/**
 * Gets all tracked files from git ls-files, sorted lexicographically
 */
function getTrackedFiles() {
  const filesStr = shell('git ls-files');
  return filesStr
    .split('\n')
    .filter(line => line.trim())
    .sort();
}

/**
 * Reads file content, normalizes line endings
 */
function readFileNormalized(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  return normalizeLineEndings(content);
}

/**
 * Gets current Git commit SHA
 */
function getCommitSha() {
  return shell('git rev-parse HEAD');
}

/**
 * Gets current timestamp in ISO-8601 format
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Reads previous manifest's hash_self (if exists), for hash-chain linking
 */
function getPreviousManifestHash() {
  try {
    const indexContent = readFileSync(MANIFEST_INDEX_FILE, 'utf-8');
    const index = JSON.parse(indexContent);
    const lastEntry = index.entries[index.entries.length - 1];
    return lastEntry?.hash_self || 'GENESIS';
  } catch {
    return 'GENESIS';
  }
}

// ============================================================================
// Main: Generate Attestation Manifest
// ============================================================================

async function generateAttestation() {
  console.log('📋 Generating TOTAL_SEALED attestation manifest...\n');
  
  // Ensure attest directory exists
  mkdirSync(ATTESTATION_DIR, { recursive: true });
  
  // Step 1: Get all tracked files
  console.log('  [1/5] Collecting tracked files...');
  const allFiles = getTrackedFiles();
  console.log(`        Found ${allFiles.length} tracked files`);
  
  // Step 2: Compute file hashes
  console.log('  [2/5] Computing SHA-256 hashes for critical files...');
  const fileHashes = {};
  for (const file of allFiles) {
    try {
      const normalizedContent = readFileNormalized(file);
      fileHashes[file] = {
        sha256: sha256(normalizedContent),
        size: Buffer.byteLength(normalizedContent, 'utf-8'),
      };
    } catch (e) {
      console.warn(`        ⚠️  Warning: Could not hash ${file}: ${e.message}`);
    }
  }
  console.log(`        Hashed ${Object.keys(fileHashes).length} files`);
  
  // Step 3: Prepare manifest metadata
  console.log('  [3/5] Preparing manifest metadata...');
  const commitSha = getCommitSha();
  const timestamp = getTimestamp();
  const hashPrev = getPreviousManifestHash();
  
  const manifest = {
    meta: {
      schema_version: 'omni333.attest.v1',
      repository: 'q1blue/awesome-copilot',
      commit: commitSha,
      timestamp,
      generator: 'eng/generate-attestation.mjs@1.0.0',
      signer: {
        gpg_key_id: null,
        gpg_fingerprint: null,
        identity: 'To be signed',
      },
      sovereignty_context: {
        AUDATAFLAG: true,
        SOV_ALIGNMENT: 'FULL',
        HUMANRATIFIED_FLAG: false,
      },
      hash_chain: {
        hash_prev: hashPrev,
        hash_self: null, // Computed below
      },
      pqc: {
        sig_sphincs_plus: null,
        sig_dilithium: null,
        pqc_state: 'LEGACY',
      },
    },
    files: fileHashes,
  };
  
  console.log(`        Hash chain: ${hashPrev} → ?`);
  
  // Step 4: Compute manifest hash (hash_self)
  console.log('  [4/5] Computing manifest hash (SHA-512)...');
  const canonicalJson = canonicalStringify(manifest);
  const manifestHash = sha512(canonicalJson);
  manifest.meta.hash_chain.hash_self = manifestHash;
  
  console.log(`        Manifest SHA-512: ${manifestHash.substring(0, 16)}...`);
  
  // Step 5: Write manifest and index
  console.log('  [5/5] Writing attestation artifacts...');
  
  // Write manifest
  const manifestJson = JSON.stringify(manifest, null, 2);
  writeFileSync(MANIFEST_FILE, manifestJson, 'utf-8');
  console.log(`        ✓ Created: ${MANIFEST_FILE}`);
  
  // Update manifest index (for hash-chain tracking)
  let manifestIndex = { entries: [] };
  try {
    const existing = readFileSync(MANIFEST_INDEX_FILE, 'utf-8');
    manifestIndex = JSON.parse(existing);
  } catch {
    // Index doesn't exist yet, use default
  }
  
  manifestIndex.entries.push({
    timestamp,
    commit: commitSha,
    hash_prev: hashPrev,
    hash_self: manifestHash,
    manifest_file: MANIFEST_FILE,
  });
  
  writeFileSync(MANIFEST_INDEX_FILE, JSON.stringify(manifestIndex, null, 2), 'utf-8');
  console.log(`        ✓ Updated: ${MANIFEST_INDEX_FILE}`);
  
  // =========================================================================
  // Success Output
  // =========================================================================
  
  console.log('\n✅ TOTAL_SEALED attestation manifest generated!\n');
  console.log('📊 Manifest Summary:');
  console.log(`   Repository:        ${manifest.meta.repository}`);
  console.log(`   Commit:            ${commitSha.substring(0, 8)}`);
  console.log(`   Timestamp:         ${timestamp}`);
  console.log(`   Files attested:    ${Object.keys(fileHashes).length}`);
  console.log(`   Manifest hash:     ${manifestHash.substring(0, 32)}...`);
  console.log(`   Hash chain prev:   ${hashPrev}`);
  
  console.log('\n📝 Next Steps:');
  console.log(`   1. Review: cat ${MANIFEST_FILE}`);
  console.log(`   2. Sign:   gpg --armor --detach-sign ${MANIFEST_FILE}`);
  console.log(`   3. Tag:    git tag -s total-sealed-$(date +%Y%m%d) -m "TOTAL_SEALED attestation"`);
  console.log(`   4. Commit: git add attest/ && git commit -m "TOTAL_SEALED attestation"`);
  console.log(`   5. Verify: gpg --verify ${MANIFEST_FILE}.asc ${MANIFEST_FILE}`);
  
  console.log('\n📚 References:');
  console.log('   - OMNI-333 Verification: https://australian-sovereignty-data-governance.atlassian.net/wiki/spaces/~6242324cfd5e45007042a501/pages/63668722/OMNI-333+Verification+Process+and+Sealing+Architecture+Overview');
  console.log('   - CTES-1.0 / CER-1.0: https://australian-sovereignty-data-governance.atlassian.net/wiki/spaces/~6242324cfd5e45007042a501/pages/32079873/OMNI-333+CTES+1.0');
  console.log('   - AEGS-1.0: https://australian-sovereignty-data-governance.atlassian.net/wiki/spaces/~6242324cfd5e45007042a501/pages/40894465/OMNI-333+XMCP-SPEC-1.0+AEGS-1.0\n');
}

// ============================================================================
// Entry Point
// ============================================================================

generateAttestation().catch(err => {
  console.error('\n❌ Attestation generation failed:', err.message);
  process.exit(1);
});
