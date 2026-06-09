# 🔐 TOTAL_SEALED Attestation Guide

## Overview

This document explains how to generate, sign, and verify **cryptographic attestations** for `awesome-copilot` using the **OMNI-333 sovereign governance** framework.

A **TOTAL_SEALED** attestation proves that:
- ✅ Every file in the repo has a deterministic hash
- ✅ The manifest itself is cryptographically signed (human-controlled key only)
- ✅ The attestation is bound to a specific Git commit
- ✅ Anyone can independently verify the repo's authenticity at any point in time

---

## Quick Start (5 minutes)

### 1. **Generate Attestation** (Developer)
```bash
npm run attest
```

Output: `attest/attestation-manifest.json`

### 2. **Sign with GPG** (Human, Non-Delegable)
```bash
gpg --armor --detach-sign attest/attestation-manifest.json
```

Output: `attest/attestation-manifest.json.asc`

### 3. **Create Signed Git Tag**
```bash
git tag -s total-sealed-$(date +%Y%m%d) \
    -m "TOTAL_SEALED attestation for awesome-copilot @ $(git rev-parse HEAD)"
git push origin main --tags
```

### 4. **Verify** (Consumer/Auditor - Anytime, Anywhere)
```bash
git checkout total-sealed-20260609
npm run attest:verify
```

Result: ✅ **TOTAL_SEALED verification passed!**

---

## Detailed Workflow

### **Phase 1: Attestation Generation** 🔍

#### Command
```bash
npm run attest
```

#### What It Does
1. Collects all Git-tracked files
2. Reads each file and normalizes line endings (CRLF → LF)
3. Computes SHA-256 hash for each file
4. Sorts all paths lexicographically (deterministic ordering)
5. Constructs manifest JSON with canonical serialization
6. Computes SHA-512 hash of manifest (hash_self)
7. Links to previous manifest via hash_prev (hash chain)
8. Writes `attest/attestation-manifest.json`
9. Updates `attest/manifest-index.json` (hash history)

#### Output
```
📋 Generating TOTAL_SEALED attestation manifest...

  [1/5] Collecting tracked files...
        Found 147 tracked files
  [2/5] Computing SHA-256 hashes for critical files...
        Hashed 147 files
  [3/5] Preparing manifest metadata...
        Hash chain: GENESIS → ?
  [4/5] Computing manifest hash (SHA-512)...
        Manifest SHA-512: a1b2c3d4e5f6g7h8...
  [5/5] Writing attestation artifacts...
        ✓ Created: attest/attestation-manifest.json
        ✓ Updated: attest/manifest-index.json

✅ TOTAL_SEALED attestation manifest generated!

📊 Manifest Summary:
   Repository:        q1blue/awesome-copilot
   Commit:            c3b504a8
   Timestamp:         2026-06-09T18:35:43.123Z
   Files attested:    147
   Manifest hash:     a1b2c3d4e5f6g7h8...
   Hash chain prev:   GENESIS

📝 Next Steps:
   1. Review: cat attest/attestation-manifest.json
   2. Sign:   gpg --armor --detach-sign attest/attestation-manifest.json
   3. Tag:    git tag -s total-sealed-$(date +%Y%m%d) -m "TOTAL_SEALED attestation"
   4. Commit: git add attest/ && git commit -m "TOTAL_SEALED attestation"
   5. Verify: gpg --verify attest/attestation-manifest.json.asc attest/attestation-manifest.json
```

#### Manifest Structure
```json
{
  "meta": {
    "schema_version": "omni333.attest.v1",
    "repository": "q1blue/awesome-copilot",
    "commit": "c3b504a8ba9cb4c601d861074a7607a62129d72e",
    "timestamp": "2026-06-09T18:35:43.123Z",
    "generator": "eng/generate-attestation.mjs@1.0.0",
    "signer": {
      "gpg_key_id": null,
      "gpg_fingerprint": null,
      "identity": "To be signed"
    },
    "sovereignty_context": {
      "AUDATAFLAG": true,
      "SOV_ALIGNMENT": "FULL",
      "HUMANRATIFIED_FLAG": false
    },
    "hash_chain": {
      "hash_prev": "GENESIS",
      "hash_self": "abc123def456..."
    },
    "pqc": {
      "sig_sphincs_plus": null,
      "sig_dilithium": null,
      "pqc_state": "LEGACY"
    }
  },
  "files": {
    "README.md": {
      "sha256": "abc123...",
      "size": 12345
    },
    ".github/plugin/marketplace.json": {
      "sha256": "def456...",
      "size": 6789
    }
  }
}
```

---

### **Phase 2: GPG Signing** 🔐

**IMPORTANT:** Only humans (or enterprise digital identities) can sign. Signing by CI is **NOT ALLOWED** under OMNI-333 authority boundary.

#### Setup: Generate or List GPG Key

```bash
# Generate new key (optional)
gpg --full-generate-key
# Choose: RSA and RSA, 4096 bits, no expiry

# List existing keys
gpg --list-secret-keys --keyid-format=long
# Output: sec   rsa4096/ABCD1234EF567890 2026-06-09 Your Name <you@example.com>

# Use KEY_ID: ABCD1234EF567890
```

#### Sign the Manifest

```bash
gpg --armor --detach-sign \
    --local-user ABCD1234EF567890 \
    attest/attestation-manifest.json
```

Creates: `attest/attestation-manifest.json.asc`

#### Verify Signature (Local)

```bash
gpg --verify attest/attestation-manifest.json.asc attest/attestation-manifest.json

# Output on success:
# gpg: Signature made Thu Jun  9 18:36:35 2026 UTC
# gpg:                using RSA key ABCD1234EF567890
# gpg: Good signature from "Your Name <you@example.com>" [ultimate]
```

---

### **Phase 3: Git Tagging** 🏷️

#### Create Signed Tag

```bash
# Get current commit SHA (for reference)
COMMIT_SHA=$(git rev-parse HEAD)

# Create signed tag
git tag -s total-sealed-$(date +%Y%m%d) \
    -m "TOTAL_SEALED attestation for awesome-copilot @ $COMMIT_SHA"

# Verify tag
git tag -v total-sealed-$(date +%Y%m%d)

# Push
git push origin main --tags
```

#### Verify Tag (Consumer)

```bash
git tag -v total-sealed-20260609

# Output:
# object c3b504a8ba9cb4c601d861074a7607a62129d72e
# type commit
# tag total-sealed-20260609
# tagger Your Name <you@example.com> 1717953395 +0000
#
# TOTAL_SEALED attestation for awesome-copilot @ c3b504a8ba9cb4c601d861074a7607a62129d72e
#
# gpg: Signature made Thu Jun  9 18:36:35 2026 UTC
# gpg:                using RSA key ABCD1234EF567890
# gpg: Good signature from "Your Name <you@example.com>" [ultimate]
```

---

### **Phase 4: Commit Everything**

```bash
# Add attestation files
git add attest/attestation-manifest.json attest/attestation-manifest.json.asc attest/manifest-index.json

# Commit with descriptive message
git commit -m "TOTAL_SEALED: Cryptographic proof of repo state

- Attestation manifest: SHA-512 hash of all tracked files
- Signer: $(git config user.name) <$(git config user.email)>
- Commit: $(git rev-parse HEAD)
- Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Tag: total-sealed-$(date +%Y%m%d)

Aligned with OMNI-333, CTES-1.0, AEGS-1.0, CER-1.0

References:
- OMNI-333: https://australian-sovereignty-data-governance.atlassian.net/
- CTES-1.0: https://australian-sovereignty-data-governance.atlassian.net/wiki/spaces/~6242324cfd5e45007042a501/pages/32079873/
- AEGS-1.0: https://australian-sovereignty-data-governance.atlassian.net/wiki/spaces/~6242324cfd5e45007042a501/pages/40894465/"

# Push
git push origin main
git push origin --tags
```

---

### **Phase 5: Verification** ✅

#### Verify from Any Clone (Consumer/Auditor)

```bash
# Checkout attested commit or tag
git checkout total-sealed-20260609

# Run verification
npm run attest:verify
```

#### Verification Steps Performed

1. ✅ **Manifest exists** — `attest/attestation-manifest.json` found
2. ✅ **GPG signature valid** — `.asc` file verified with public key
3. ✅ **Manifest structure** — Schema version, required fields present
4. ✅ **Manifest hash** — Recomputed SHA-512 matches stored hash_self
5. ✅ **File hashes** — All tracked files match recorded SHA-256 hashes
6. ✅ **Hash chain** — hash_prev links correctly to previous attestation
7. ✅ **Sovereignty context** — OMNI-333 flags (AUDATAFLAG, SOV_ALIGNMENT) valid

#### Success Output

```
🔐 TOTAL_SEALED Attestation Verification

Repository: q1blue/awesome-copilot
Standard: OMNI-333, CTES-1.0, AEGS-1.0

✓ Manifest found: attest/attestation-manifest.json
✓ GPG signature verified (using RSA key ABCD1234EF567890)
✓ Manifest structure valid
  - Schema: omni333.attest.v1
  - Repository: q1blue/awesome-copilot
  - Commit: c3b504a8
✓ Manifest hash verified: a1b2c3d4e5f6g7h8...
✓ Verifying 147 file hashes...
  ✓ All 147 file hashes match current state
✓ Hash chain verified:
  - Previous: GENESIS (first attestation)
  - Current:  a1b2c3d4e5f6g7h8... (2026-06-09T18:35:43Z)
✓ Sovereignty context valid:
  - AUDATAFLAG: true
  - SOV_ALIGNMENT: FULL
  - HUMANRATIFIED_FLAG: false

============================================================
✅ TOTAL_SEALED verification passed!
============================================================

📍 Result Summary:
   Attestation Commit: c3b504a8
   Timestamp:          2026-06-09T18:35:43Z
   Files Verified:     147
   Integrity:          ✅ CONFIRMED
   GPG Signature:      ✅ Verified
```

#### Drift Detection (File Modified After Attestation)

If a file has been changed:

```
❌ 1 file hash mismatch detected (DRIFT):

   File: README.md
   Expected: abc123def456...
   Current:  xyz789uvw012...

   → This repo does NOT match the attested state.
   → To reseal, run: npm run attest
```

---

## Key Management & Security

### **Signing Key Options**

#### 1. **Local Personal Key** (Recommended for Developers)
```bash
# Generate
gpg --full-generate-key
# Store in OS keychain (automatic with most GPG implementations)

# Use
gpg --armor --detach-sign attest/attestation-manifest.json
```

**Pros:**
- Clear personhood
- Easy Git integration
- No CI key management needed

**Cons:**
- Requires local GPG setup
- Key rotation more manual

---

#### 2. **Dedicated Repository Key** (Recommended for CI)
```bash
# Create a repository-specific key
gpg --full-generate-key
# Name: "awesome-copilot Attestation" <releases@awesome-copilot.dev>

# Store in GitHub secrets (encrypted)
# Use via GitHub Actions with temporary import
```

**Pros:**
- Tied to specific repo
- Easier rotation
- Clear audit trail

**Cons:**
- Requires secure key storage (KMS/HSM)
- CI access management needed

---

### **Key Rotation**

```bash
# 1. Generate new key
gpg --full-generate-key

# 2. Sign next attestation with new key

# 3. Create key rotation event in attest/manifest-index.json
# or log to evidence ledger

# 4. Archive old key fingerprint
gpg --export OLDKEYID > oldkey-archived.asc
```

---

### **Revocation**

```bash
# If key is compromised:
gpg --gen-revoke KEYID > key-revocation.asc
gpg --import key-revocation.asc

# Publish revocation certificate
gpg --keyserver keys.openpgp.org --send-key KEYID

# All attestations signed after revocation time become suspect
```

---

## CI/CD Integration

### **GitHub Actions Workflow** (Optional)

```yaml
name: TOTAL_SEALED Attestation

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  attest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm run build
      - run: npm run plugin:validate
      - run: npm run skill:validate
      
      - run: npm run attest
      
      - name: Verify attestation
        run: npm run attest:verify
      
      - name: Upload attestation
        uses: actions/upload-artifact@v4
        with:
          name: attestation-manifest
          path: attest/
```

**Note:** CI can **generate and verify** manifests, but **cannot sign** them. Signing must be done by a human or approved workflow using a human-controlled key.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm run attest` fails | Check `git ls-files` output; ensure repo is clean |
| `gpg: no default secret key` | Set default key: `gpg --list-secret-keys` then edit `~/.gnupg/gpg.conf` |
| `Signature verification failed` | Import public key: `gpg --recv-key KEYID` |
| File hash mismatch detected | Run `npm run build` to regenerate artifacts |
| `TOTAL_SEALED verification passed!` but files changed | Hash chain is immutable; create new attestation with `npm run attest` |

---

## References

- **OMNI-333 Framework**: https://australian-sovereignty-data-governance.atlassian.net/
- **CTES-1.0 / CER-1.0**: https://australian-sovereignty-data-governance.atlassian.net/wiki/spaces/~6242324cfd5e45007042a501/pages/32079873/
- **AEGS-1.0**: https://australian-sovereignty-data-governance.atlassian.net/wiki/spaces/~6242324cfd5e45007042a501/pages/40894465/
- **GPG Manual**: https://www.gnupg.org/documentation/
- **SLSA Provenance**: https://slsa.dev/provenance/
- **Sigstore**: https://www.sigstore.dev/

---

## FAQ

**Q: Can CI create attestations?**  
A: Yes, CI can generate manifests. But only humans can sign them (OMNI-333 authority boundary).

**Q: What if the manifest is wrong?**  
A: Delete `attest/attestation-manifest.json`, run `npm run build` to regenerate, then `npm run attest` again.

**Q: Can I use this without GPG?**  
A: Yes. `npm run attest` works without GPG. But for cryptographic proof, you need `gpg --detach-sign`.

**Q: How long does verification take?**  
A: Typically 2-5 seconds (depends on number of files and disk speed).

**Q: What if I lose my GPG key?**  
A: Create a new key and sign a new attestation. Old attestations remain valid (signed with old key).

**Q: Can attestations be deleted?**  
A: From Git, yes. But the signed tag is immutable. Regulator can verify via Git history.

---

## Support

For issues or questions:
1. Check this guide (ATTESTATION.md)
2. Review OMNI-333 evidence governance: https://australian-sovereignty-data-governance.atlassian.net/
3. Open issue: https://github.com/q1blue/awesome-copilot/issues

---

**Last Updated:** 2026-06-09  
**Status:** ✅ Production Ready  
**Compliance:** OMNI-333, CTES-1.0, AEGS-1.0, CER-1.0
