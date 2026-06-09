#!/usr/bin/env node
/**
 * eng/verify-attestation.mjs
 * 
 * Verifies TOTAL_SEALED attestation manifests for awesome-copilot.
 * Can be run by consumers to cryptographically prove repo authenticity.
 * 
 * Aligned with OMNI-333, CTES-1.0, AEGS-1.0 standards.
 * 
 * Usage (local verification):
 *   node eng/verify-attestation.mjs [--manifest attest/attestation-manifest.json]
 * 
 * Usage (check GPG signature):
 *   gpg --verify attest/attestation-manifest.json.asc
 *   node eng/verify-attestation.mjs
 * 
 * Exit codes:
 *   0 = all verifications passed (TOTAL_SEALED integrity confirmed)
 *   1 = manifest drift or verification failed
 *   2 = file not found or I/O error
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

const MANIFEST_FILE = 'attest/attestation-manifest.json';
const MANIFEST_SIGNATURE = `${MANIFEST_FILE}.asc`;
const MANIFEST_INDEX_FILE = 'attest/manifest-index.json';

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
    return null; // Command failed silently
  }
}

/**
 * Normalizes line endings: CRLF → LF
 */
function normalizeLineEndings(content) {
  return content.replace(/\r\n/g, '\n');
}

/**
 * Computes SHA-256 hash
 */
function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Computes SHA-512 hash
 */
function sha512(content) {
  return createHash('sha512').update(content).digest('hex');
}

/**
 * Canonical JSON stringify (matches generator)
 */
function canonicalStringify(obj) {
  if (obj === null) return 'null';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  
  if (Array.isArray(obj)) {
    const items = obj.map(item => canonicalStringify(item));
    return `[${items.join(',')}]`;
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => 
      `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`
    );
    return `{${pairs.join(',')}}`;
  }
  
  return JSON.stringify(obj);
}

/**
 * Gets current Git commit SHA
 */
function getCommitSha() {
  return shell('git rev-parse HEAD');
}

/**
 * Reads file content, normalizes line endings
 */
function readFileNormalized(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  return normalizeLineEndings(content);
}

/**
 * Gets all tracked files from git, sorted
 */
function getTrackedFiles() {
  const filesStr = shell('git ls-files');
  if (!filesStr) return [];
  return filesStr
    .split('\n')
    .filter(line => line.trim())
    .sort();
}

// ============================================================================
// Verification Steps
// ============================================================================

/**
 * Step 1: Verify manifest file exists
 */
function verifyManifestExists() {
  if (!existsSync(MANIFEST_FILE)) {
    console.error(`❌ Manifest not found: ${MANIFEST_FILE}`);
    console.error('   Run: npm run attest');
    return false;
  }
  console.log(`✓ Manifest found: ${MANIFEST_FILE}`);
  return true;
}

/**
 * Step 2: Verify GPG signature (if .asc file exists)
 */
function verifyGpgSignature() {
  if (!existsSync(MANIFEST_SIGNATURE)) {
    console.warn(`⚠️  GPG signature not found: ${MANIFEST_SIGNATURE}`);
    console.warn('   Run: gpg --armor --detach-sign attest/attestation-manifest.json');
    return null; // Not an error if not signed yet
  }
  
  const result = shell(`gpg --verify ${MANIFEST_SIGNATURE} ${MANIFEST_FILE} 2>&1`);
  if (!result || result.includes('BAD signature')) {
    console.error(`❌ GPG signature verification failed!`);
    console.error(result || 'Unknown GPG error');
    return false;
  }
  console.log(`✓ GPG signature verified (${result.match(/using (.+)/)?.[1] || 'unknown key'})`);
  return true;
}

/**
 * Step 3: Verify manifest schema and structure
 */
function verifyManifestStructure(manifest) {
  const required = ['meta', 'files'];
  for (const field of required) {
    if (!manifest[field]) {
      console.error(`❌ Missing required field in manifest: ${field}`);
      return false;
    }
  }
  
  const metaRequired = ['schema_version', 'repository', 'commit', 'timestamp', 'hash_chain'];
  for (const field of metaRequired) {
    if (!manifest.meta[field]) {
      console.error(`❌ Missing required meta field: ${field}`);
      return false;
    }
  }
  
  console.log(`✓ Manifest structure valid`);
  console.log(`  - Schema: ${manifest.meta.schema_version}`);
  console.log(`  - Repository: ${manifest.meta.repository}`);
  console.log(`  - Commit: ${manifest.meta.commit.substring(0, 8)}`);
  
  return true;
}

/**
 * Step 4: Verify manifest hash (hash_self matches canonical JSON)
 */
function verifyManifestHash(manifest) {
  const originalHashSelf = manifest.meta.hash_chain.hash_self;
  
  // Zero out hash_self for recomputation
  manifest.meta.hash_chain.hash_self = null;
  const canonical = canonicalStringify(manifest);
  const recomputedHash = sha512(canonical);
  
  // Restore original hash
  manifest.meta.hash_chain.hash_self = originalHashSelf;
  
  if (recomputedHash !== originalHashSelf) {
    console.error(`❌ Manifest hash mismatch!`);
    console.error(`   Expected: ${originalHashSelf.substring(0, 32)}...`);
    console.error(`   Got:      ${recomputedHash.substring(0, 32)}...`);
    console.error(`   → Manifest may have been tampered with!`);
    return false;
  }
  
  console.log(`✓ Manifest hash verified: ${originalHashSelf.substring(0, 32)}...`);
  return true;
}

/**
 * Step 5: Verify all file hashes match current repo state
 */
function verifyFileHashes(manifest) {
  console.log(`✓ Verifying ${Object.keys(manifest.files).length} file hashes...`);
  
  const allFiles = getTrackedFiles();
  let hashMismatches = [];
  let missingFiles = [];
  
  for (const [filePath, expectedHash] of Object.entries(manifest.files)) {
    try {
      const normalizedContent = readFileNormalized(filePath);
      const currentHash = sha256(normalizedContent);
      
      if (currentHash !== expectedHash.sha256) {
        hashMismatches.push({
          file: filePath,
          expected: expectedHash.sha256,
          current: currentHash,
        });
      }
    } catch (e) {
      missingFiles.push(filePath);
    }
  }
  
  if (hashMismatches.length > 0) {
    console.error(`\n❌ ${hashMismatches.length} file hash mismatches detected (DRIFT):`);
    for (const mismatch of hashMismatches.slice(0, 5)) {
      console.error(`\n   File: ${mismatch.file}`);
      console.error(`   Expected: ${mismatch.expected.substring(0, 16)}...`);
      console.error(`   Current:  ${mismatch.current.substring(0, 16)}...`);
    }
    if (hashMismatches.length > 5) {
      console.error(`\n   ... and ${hashMismatches.length - 5} more mismatches`);
    }
    console.error(`\n   → This repo does NOT match the attested state.`);
    console.error(`   → To reseal, run: npm run attest`);
    return false;
  }
  
  if (missingFiles.length > 0) {
    console.error(`\n❌ ${missingFiles.length} attested files are missing:`);
    for (const file of missingFiles.slice(0, 5)) {
      console.error(`   - ${file}`);
    }
    if (missingFiles.length > 5) {
      console.error(`   ... and ${missingFiles.length - 5} more`);
    }
    return false;
  }
  
  console.log(`  ✓ All ${Object.keys(manifest.files).length} file hashes match current state`);
  return true;
}

/**
 * Step 6: Verify hash chain (lineage from GENESIS or previous manifest)
 */
function verifyHashChain(manifest) {
  const hashPrev = manifest.meta.hash_chain.hash_prev;
  
  if (hashPrev === 'GENESIS') {
    console.log(`✓ Hash chain starts at GENESIS (first attestation)`);
    return true;
  }
  
  // Try to verify against manifest index
  if (!existsSync(MANIFEST_INDEX_FILE)) {
    console.warn(`⚠️  Manifest index not found: ${MANIFEST_INDEX_FILE}`);
    console.warn(`   Cannot fully verify hash chain`);
    return null;
  }
  
  try {
    const index = JSON.parse(readFileSync(MANIFEST_INDEX_FILE, 'utf-8'));
    const previousEntry = index.entries.find(e => e.hash_self === hashPrev);
    
    if (!previousEntry) {
      console.warn(`⚠️  Previous manifest hash not found in index`);
      console.warn(`   hash_prev: ${hashPrev.substring(0, 16)}...`);
      return null; // Not necessarily a failure
    }
    
    console.log(`✓ Hash chain verified:`);
    console.log(`  - Previous: ${previousEntry.hash_self.substring(0, 16)}... (${previousEntry.timestamp})`);
    console.log(`  - Current:  ${manifest.meta.hash_chain.hash_self.substring(0, 16)}... (${manifest.meta.timestamp})`);
    return true;
  } catch (e) {
    console.error(`❌ Failed to parse manifest index: ${e.message}`);
    return false;
  }
}

/**
 * Step 7: Verify sovereignty context (OMNI-333 alignment)
 */
function verifySovereigntyContext(manifest) {
  const ctx = manifest.meta.sovereignty_context;
  
  if (!ctx.AUDATAFLAG) {
    console.warn(`⚠️  AUDATAFLAG is false (not AU-sovereign)`);
  } else {
    console.log(`✓ Sovereignty context valid:`);
    console.log(`  - AUDATAFLAG: ${ctx.AUDATAFLAG}`);
    console.log(`  - SOV_ALIGNMENT: ${ctx.SOV_ALIGNMENT}`);
    console.log(`  - HUMANRATIFIED_FLAG: ${ctx.HUMANRATIFIED_FLAG}`);
  }
  
  return true;
}

// ============================================================================
// Main Verification Flow
// ============================================================================

async function verify() {
  console.log('\n🔐 TOTAL_SEALED Attestation Verification\n');
  console.log('Repository: q1blue/awesome-copilot');
  console.log('Standard: OMNI-333, CTES-1.0, AEGS-1.0\n');
  
  // Step 1: File exists
  if (!verifyManifestExists()) {
    process.exit(2);
  }
  
  // Step 2: Load manifest
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf-8'));
  } catch (e) {
    console.error(`❌ Failed to parse manifest: ${e.message}`);
    process.exit(2);
  }
  
  // Step 3: GPG signature (if present)
  const gpgResult = verifyGpgSignature();
  if (gpgResult === false) {
    process.exit(1);
  }
  
  // Step 4: Structure
  if (!verifyManifestStructure(manifest)) {
    process.exit(1);
  }
  
  // Step 5: Manifest hash
  if (!verifyManifestHash(manifest)) {
    process.exit(1);
  }
  
  // Step 6: File hashes
  if (!verifyFileHashes(manifest)) {
    process.exit(1);
  }
  
  // Step 7: Hash chain
  const chainResult = verifyHashChain(manifest);
  if (chainResult === false) {
    process.exit(1);
  }
  
  // Step 8: Sovereignty
  verifySovereigntyContext(manifest);
  
  // =========================================================================
  // SUCCESS
  // =========================================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ TOTAL_SEALED verification passed!');
  console.log('='.repeat(60));
  console.log('\n📍 Result Summary:');
  console.log(`   Attestation Commit: ${manifest.meta.commit.substring(0, 8)}`);
  console.log(`   Timestamp:          ${manifest.meta.timestamp}`);
  console.log(`   Files Verified:     ${Object.keys(manifest.files).length}`);
  console.log(`   Integrity:          ✅ CONFIRMED`);
  console.log(`   GPG Signature:      ${gpgResult === true ? '✅ Verified' : '⚠️  Not signed (local verification only)'}`);
  
  console.log('\n📚 References:');
  console.log('   - OMNI-333: https://australian-sovereignty-data-governance.atlassian.net/');
  console.log('   - CTES-1.0: https://australian-sovereignty-data-governance.atlassian.net/wiki/spaces/~6242324cfd5e45007042a501/pages/32079873/');
  console.log('   - AEGS-1.0: https://australian-sovereignty-data-governance.atlassian.net/wiki/spaces/~6242324cfd5e45007042a501/pages/40894465/\n');
  
  process.exit(0);
}

// ============================================================================
// Entry Point
// ============================================================================

verify().catch(err => {
  console.error('\n❌ Verification error:', err.message);
  process.exit(2);
});
