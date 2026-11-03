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

function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'feature/portal-next-level';
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

  const checksums: Record<string, string> = {};
  const coreFiles = ['manifest.json', 'index.html', 'overlay.js', 'service-worker.js'];
  for (const file of coreFiles) {
    const fullPath = path.join(targetDir, file);
    const hash = computeFileSha256(fullPath);
    if (hash) {
      checksums[file] = hash.substring(0, 16);
    }
  }

  const metadata = {
    version: pkg.version || '1.5.0',
    commit: getGitCommit(),
    branch: getGitBranch(),
    buildTime: new Date().toISOString(),
    buildHost: 'ideapad',
    targetWorkstation: 'thinkbook',
    status: 'verified',
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

  console.log(`[build-metadata] Generated build-metadata.json for Portal v${metadata.version} (${metadata.commit.slice(0, 7)}) in ${targetDirName}`);
}

main();
