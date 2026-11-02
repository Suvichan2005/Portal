import { execSync } from 'child_process';
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

function main() {
  const rootDir = process.cwd();
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const metadata = {
    version: pkg.version || '1.4.0',
    commit: getGitCommit(),
    branch: getGitBranch(),
    buildTime: new Date().toISOString(),
    buildHost: 'ideapad',
    targetWorkstation: 'thinkbook',
    status: 'verified',
  };

  const jsonStr = JSON.stringify(metadata, null, 2);

  // Write to public/ so vite copies it during build
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'build-metadata.json'), jsonStr, 'utf-8');

  // Also write directly to dist/ if it exists
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'build-metadata.json'), jsonStr, 'utf-8');
  }

  console.log(`[build-metadata] Generated build-metadata.json for Portal v${metadata.version} (${metadata.commit.slice(0, 7)})`);
}

main();
