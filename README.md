# GitHub Guardian

An AI-powered static code analyzer that scans public GitHub repositories for security vulnerabilities. Paste a repo URL and Guardian fetches the codebase via the GitHub API, audits it with Google Gemini, and returns a prioritized, source-cited security report — including an executive summary you can export as a PDF.

**Stack:** TypeScript · React 19 · Vite · Google Gemini API (`@google/genai`) · GitHub REST API · jsPDF

## Features

- **One-input scanning** — paste any public GitHub repository URL; Guardian resolves the default branch, walks the repo tree, and pulls down analyzable files automatically.
- **Broad coverage** — scans application code (JS/TS, Python, Go, Java, C/C++, and more), Infrastructure as Code (Terraform, Dockerfiles, Kubernetes YAML), and config files for issues like IaC misconfigurations, OWASP Top 10 vulnerabilities, and hardcoded secrets.
- **Structured, enforceable output** — uses Gemini's JSON response schema so every finding includes a file path, line number, severity (`Critical` → `Informational`), remediation guidance with code examples, and an estimated time to fix.
- **Cited recommendations** — every finding and recommendation must cite authoritative sources (OWASP, CIS Benchmarks, official vendor docs).
- **Executive summary** — a leadership-ready overview with a risk-ranked action plan (Risk = Impact × Likelihood), exportable as a PDF report via jsPDF.
- **Smart fetching** — skips `node_modules`, build output, symlinks, and files over 5 MB; handles GitHub API rate limits gracefully; caches analysis results in memory for 1 hour to avoid redundant scans.

## How It Works

```
Repo URL ──> GitHub API (tree + file contents) ──> filter & batch files
         ──> Gemini 2.5 Flash (structured JSON audit) ──> interactive report + PDF export
```

1. The repo URL is parsed and validated, and the default branch is resolved via the GitHub API.
2. The full repo tree is fetched recursively and filtered to supported code/IaC/config file types, excluding vendored and oversized files.
3. File contents are fetched concurrently (individual failures are skipped, not fatal) and assembled into a security-audit prompt.
4. Gemini analyzes the codebase against a strict response schema, returning vulnerabilities, holistic recommendations, and an executive summary.
5. Results render in an interactive dashboard with severity badges, and the executive report can be downloaded as a PDF.

## Run Locally

**Prerequisites:** Node.js

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key to .env.local
echo "GEMINI_API_KEY=your_key_here" > .env.local

# 3. Start the dev server
npm run dev
```

## Limitations & Future Work

- The Gemini API key is used client-side, so this is intended for local/demo use — a production deployment would proxy Gemini calls through a backend.
- Only public repositories are supported (unauthenticated GitHub API); very large repos may be truncated by the GitHub tree API.
- Planned: GitHub token support for private repos and higher rate limits, diff-aware rescans, and CI integration.
