import fs from 'node:fs';
import path from 'node:path';

const ignoredDirectories = new Set(['.git', 'node_modules']);
const allowedPlaceholders = [
  'your_volcengine_ark_api_key',
  'your_rapidapi_key',
];
const secretPatterns = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /AIza[0-9A-Za-z_-]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
];
const assignmentPattern =
  /(?:API[_-]?KEY|SECRET[_-]?KEY|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|PASSWORD)\s*[:=]\s*["']?([^\s"',;]+)/gi;

const findings = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath);
  if (content.includes(0)) return;

  const text = content.toString('utf8');
  for (const pattern of secretPatterns) {
    for (const match of text.matchAll(pattern)) {
      findings.push(`${filePath}: matches a known secret format`);
    }
  }

  for (const match of text.matchAll(assignmentPattern)) {
    const value = match[1];
    if (
      value.length >= 12 &&
      !allowedPlaceholders.includes(value) &&
      !value.startsWith('process.env.') &&
      value !== '${ARK_API_KEY}'
    ) {
      findings.push(`${filePath}: contains a non-placeholder secret assignment`);
    }
  }
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath);
    } else {
      scanFile(entryPath);
    }
  }
}

walk('.');

if (findings.length > 0) {
  console.error([...new Set(findings)].join('\n'));
  process.exit(1);
}

console.log('Secret scan passed.');
