import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

function getGitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'local-build';
  }
}

function getSourceTreeCommit(): string {
  try {
    const out = execSync('git log -1 --format=%H -- src/ package.json manifest.json', { encoding: 'utf-8' }).trim();
    return out || getGitCommit();
  } catch {
    return getGitCommit();
  }
}

function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'feature/portal-next-level';
  }
}

function isGitDirty(): boolean {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

function computeFileSha256(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function main() {
  const rootDir = process.cwd();
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  // Target directory can be specified as command argument (e.g., dist.staging) or default to dist
  const targetDirName = process.argv[2] || 'dist';
  const targetDir = path.join(rootDir, targetDirName);
  const status = process.argv[3] || 'built';

  const checksums: Record<string, string> = {};
  const coreFiles = ['manifest.json', 'index.html', 'overlay.js', 'service-worker.js'];
  for (const file of coreFiles) {
    const fullPath = path.join(targetDir, file);
    const hash = computeFileSha256(fullPath);
    if (hash) {
      checksums[file] = hash; // Full 64-char SHA-256 hash
    }
  }

  const metadata = {
    version: pkg.version || '1.6.0',
    commit: getGitCommit(),
    headCommit: getGitCommit(),
    sourceTreeCommit: getSourceTreeCommit(),
    isDirty: isGitDirty(),
    branch: getGitBranch(),
    buildTime: new Date().toISOString(),
    buildHost: 'ideapad',
    targetWorkstation: 'thinkbook',
    status,
    targetDir: targetDirName,
    checksums,
  };

  const jsonStr = JSON.stringify(metadata, null, 2);

  // Write to public/ so vite copies it during build
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'build-metadata.json'), jsonStr, 'utf-8');

  // Also write directly to target directory if it exists
  if (fs.existsSync(targetDir)) {
    fs.writeFileSync(path.join(targetDir, 'build-metadata.json'), jsonStr, 'utf-8');
  }

  console.log(`[build-metadata] Generated build-metadata.json for Portal v${metadata.version} (${metadata.headCommit.slice(0, 7)}) with ${Object.keys(checksums).length} file checksums`);
}

main();
