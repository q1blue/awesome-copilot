# 🚀 Agent Quickstart Guide

Welcome to **awesome-copilot**! This guide will help you set up your development environment, install all dependencies, and verify the repository's cryptographic authenticity using our **TOTAL_SEALED** attestation system.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18.x or higher | Runtime for JavaScript/TypeScript |
| **npm** | 9.x or higher | Package manager |
| **git** | 2.30+ | Version control |
| **GPG** | 2.2+ | Cryptographic verification (optional but recommended) |

### Check Your Installation

```bash
node --version     # Should be v18.0.0 or higher
npm --version      # Should be 9.0.0 or higher
git --version      # Should be 2.30 or higher
gpg --version      # Optional: Should be 2.2 or higher
```

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Clone the Repository

```bash
git clone https://github.com/q1blue/awesome-copilot.git
cd awesome-copilot
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages defined in `package.json`.

### Step 3: Verify Repository Authenticity (TOTAL_SEALED)

```bash
npm run attest:verify
```

**Expected output:**
```
🔐 TOTAL_SEALED Attestation Verification

✅ TOTAL_SEALED verification passed!

📍 Result Summary:
   Attestation Commit: c3b504a8
   Timestamp:          2026-06-09T18:35:43Z
   Files Verified:     147
   Integrity:          ✅ CONFIRMED
   GPG Signature:      ✅ Verified
```

**Exit code `0` = Repository is authentic and has not been tampered with.**

---

## 📦 Detailed Setup Instructions

### 1. Clone with SSH (Recommended)

If you have SSH keys configured with GitHub:

```bash
git clone git@github.com:q1blue/awesome-copilot.git
cd awesome-copilot
```

### 2. Install All Dependencies

```bash
# Install npm packages (installs from package.json)
npm install

# If you need a fresh install (clears node_modules)
npm ci
```

**What gets installed:**
- Core dependencies (runtime libraries)
- Development dependencies (testing, linting, build tools)
- Optional dependencies (platform-specific tools)

### 3. Verify the Installation

```bash
# Check that all dependencies are installed
npm list

# Verify Node modules integrity
npm audit
```

---

## 🔐 TOTAL_SEALED Attestation Verification

The repository uses a cryptographic attestation system to prove authenticity. Here's how it works:

### The Sovereign One-Liner

```bash
npm run attest:verify
```

### What Gets Verified

| Check | Purpose | Status |
|-------|---------|--------|
| Manifest exists | Confirms `attest/attestation-manifest.json` is present | ✅ |
| GPG signature valid | Validates the `.asc` cryptographic signature | ✅ |
| JSON structure | Ensures manifest follows OMNI-333 schema | ✅ |
| Manifest integrity | Recomputes SHA-512 hash (detects edits) | ✅ |
| File hashing | Re-hashes all tracked files (detects drift) | ✅ |
| Hash chain lineage | Verifies link to previous attestation | ✅ |
| Sovereignty context | Confirms OMNI-333 alignment | ✅ |

### Manual GPG Verification

If you want to verify the signature using standard tools:

```bash
gpg --verify attest/attestation-manifest.json.asc attest/attestation-manifest.json
```

**Success:**
```
gpg: Good signature from "Sovereign Operator <operator@awesome-copilot.dev>"
gpg: Signed on 2026-06-09 at 18:35:43 UTC
```

### Verify Git Tag

To confirm the release point is authorized:

```bash
# List all sealed tags
git tag -l "total-sealed-*"

# Verify a specific tag
git tag -v total-sealed-20260609
```

---

## 🛠️ Build & Development Commands

Once dependencies are installed, you can use these npm scripts:

### Generate a New Attestation (Developers Only)

```bash
npm run attest
```

**Output:** Creates/updates `attest/attestation-manifest.json`

**Next steps after generation:**
1. Review the manifest: `cat attest/attestation-manifest.json`
2. Sign it: `gpg --armor --detach-sign attest/attestation-manifest.json`
3. Create a git tag: `git tag -s total-sealed-$(date +%Y%m%d)`
4. Commit: `git add attest/ && git commit -m "TOTAL_SEALED attestation"`

### Verify Attestation (Everyone)

```bash
npm run attest:verify
```

---

## ✅ Verification Checklist for Auditors

To certify this repository as **TOTAL_SEALED**, verify these three items:

- [ ] **Git Tag:** `git tag -v total-sealed-*` returns ✅ **Good Signature**
- [ ] **GPG Signature:** `gpg --verify attest/attestation-manifest.json.asc` returns ✅ **Good Signature**
- [ ] **Attestation:** `npm run attest:verify` exits with code `0` (✅ **Verification Passed**)

If all three pass, the repository is **bit-for-bit identical to the state approved by the Sovereign Operator**.

---

## 🔧 Troubleshooting

### Installation Issues

| Problem | Solution |
|---------|----------|
| `npm: command not found` | Install Node.js from https://nodejs.org/ |
| `npm ERR! code ERESOLVE` | Run `npm install --legacy-peer-deps` |
| `node_modules` conflicts | Delete `node_modules` and `package-lock.json`, then run `npm ci` |

### Attestation Verification Failures

| Error | Meaning | Fix |
|-------|---------|-----|
| `Drift Detected: README.md` | File doesn't match signed proof | `git checkout README.md` |
| `Can't check signature: No public key` | Missing operator's GPG key | `gpg --import operator_public_key.asc` |
| `Hash Chain Break` | Manifest history rewritten | **Incident Alert** — Contact maintainer |
| `MANIFEST_NOT_FOUND` | No attestation manifest | Generate: `npm run attest` |

### GPG Key Issues

If you don't have the operator's public key:

```bash
# List your keys
gpg --list-keys

# Import a key (if you have it)
gpg --import /path/to/operator_public_key.asc

# Or download from a keyserver
gpg --recv-keys KEYID
```

---

## 📚 Directory Structure

```
awesome-copilot/
├── package.json                 # Project metadata & npm scripts
├── package-lock.json            # Dependency lock file
├── node_modules/                # Installed packages (generated)
├── eng/
│   ├── generate-attestation.mjs # Creates cryptographic proofs
│   └── verify-attestation.mjs   # Verifies repository authenticity
├── attest/
│   ├── attestation-manifest.json    # Signed cryptographic manifest
│   └── attestation-manifest.json.asc # GPG detached signature
├── .github/
│   └── workflows/               # GitHub Actions (CI/CD)
├── README.md                    # Main documentation
└── AGENT_QUICKSTART.md          # This file
```

---

## 🎯 Next Steps

1. ✅ **Completed:** Repository cloned and verified
2. 📦 **Completed:** Dependencies installed
3. 🔐 **Completed:** Attestation verified

Now you can:

- **Explore the codebase:** `find . -name "*.js" -o -name "*.ts"`
- **Run tests:** `npm test` (if configured)
- **Build the project:** `npm run build` (if configured)
- **Start development:** Refer to the main [README.md](./README.md)

---

## 🔏 Security Notes

- ✅ This repository is **TOTAL_SEALED**, meaning all files are cryptographically attested
- ✅ Any unauthorized modifications will be **detected** by `npm run attest:verify`
- ✅ The manifest is **signed with GPG**, proving authenticity
- ✅ The Git tag is **signed**, creating an immutable record in Git history

**Trust chain:** Developer → Deterministic Manifest → GPG Signature → Signed Git Tag → Verification

---

## 📞 Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the main [README.md](./README.md) for project-specific details
3. Open an issue on GitHub: https://github.com/q1blue/awesome-copilot/issues
4. Contact the maintainers

---

## 📄 License

This quickstart and the repository are part of the **awesome-copilot** project. See [LICENSE](./LICENSE) for details.

---

**Last Updated:** 2026-06-09  
**Status:** ✅ ACTIVE | ENFORCEMENT_MODE_A  
**Current Posture:** TOTAL_SEALED
