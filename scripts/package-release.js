#!/usr/bin/env node
'use strict';

// Package a committed tree and its corresponding source on Linux (Node 24,
// Git, GNU tar and unzip). Nothing is published by this command.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const run = (file, args, options = {}) => execFileSync(file, args, { cwd: root, ...options });
const output = (file, args) => run(file, args, { encoding: 'utf8' }).trim();
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function main() {
  assert.equal(output('git', ['status', '--porcelain']), '', 'Commit changes before packaging a release');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const dependency = require('./dependency-sources.json')['node-pty'];
  const installed = require('../node_modules/node-pty/package.json');
  assert.equal(installed.version, dependency.version, 'Update the pinned dependency source before releasing');
  const commit = output('git', ['rev-parse', 'HEAD']);
  const timestamp = output('git', ['show', '-s', '--format=%ct', 'HEAD']);
  const basename = `${manifest.name}-${manifest.version}`;
  const dist = path.join(root, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  const installer = path.join(dist, `${basename}.vsix`);
  const vsce = require.resolve('@vscode/vsce/vsce');
  const flags = Number(manifest.version.split('.')[1]) % 2 ? ['--pre-release'] : [];
  run(process.execPath, [vsce, 'package', ...flags, '-o', installer], { stdio: 'inherit' });

  const entries = output('unzip', ['-Z1', installer]).split('\n');
  for (const required of ['LICENSE.txt', 'FORK_CHANGES.md', 'THIRD_PARTY_NOTICES.md', 'node_modules/node-pty/LICENSE']) {
    assert.ok(entries.includes(`extension/${required}`), `Missing package notice: ${required}`);
  }
  assert.ok(!entries.some((name) => /\.(node|dll|exe|pdb|map)$/.test(name)), 'Unexpected native binary or source map');
  assert.ok(!entries.some((name) => /\/(\.git|dist|test)\//.test(name)), 'Unexpected development artifacts');
  const packaged = JSON.parse(output('unzip', ['-p', installer, 'extension/package.json']));
  assert.equal(packaged.name, manifest.name);
  assert.equal(packaged.publisher, 'Roland013');
  assert.equal(packaged.version, manifest.version);
  assert.equal(packaged.license, 'GPL-3.0-only');
  assert.equal(output('unzip', ['-p', installer, 'extension/LICENSE.txt']), fs.readFileSync('LICENSE', 'utf8').trim());
  assert.equal(output('unzip', ['-p', installer, 'extension/node_modules/node-pty/LICENSE']),
    fs.readFileSync('node_modules/node-pty/LICENSE', 'utf8').trim());

  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tmux-release-source-'));
  try {
    const treeName = `${basename}-source`;
    const tree = path.join(temporary, treeName);
    fs.mkdirSync(tree);
    const archive = path.join(temporary, 'git-source.tar');
    run('git', ['archive', '--format=tar', '-o', archive, 'HEAD']);
    run('tar', ['-xf', archive, '-C', tree]);
    const response = await fetch(dependency.url);
    assert.ok(response.ok, `Dependency source download failed: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(sha256(bytes), dependency.sha256, 'Dependency source checksum mismatch');
    const vendor = path.join(tree, 'third_party');
    fs.mkdirSync(vendor);
    const dependencyArchive = path.join(vendor, `node-pty-${dependency.version}-source.tar.gz`);
    fs.writeFileSync(dependencyArchive, bytes);
    const dependencyEntries = output('tar', ['-tzf', dependencyArchive]).split('\n');
    assert.ok(dependencyEntries.some((name) => name.endsWith('/src/index.ts')), 'Missing node-pty TypeScript source');
    assert.ok(dependencyEntries.some((name) => name.endsWith('/LICENSE')), 'Missing node-pty source license');
    fs.writeFileSync(path.join(tree, 'SOURCE.md'), `# Source for ${manifest.name} ${manifest.version}\n\n` +
      `Extension commit: ${commit}\n\nRepository: ${manifest.repository.url}\n\n` +
      `The third_party directory contains the original source for node-pty ${dependency.version},\n` +
      `commit ${dependency.commit}. SHA-256: ${dependency.sha256}.\n\n` +
      'Build the extension with Node 24: npm ci, npm test, npm run lint, then\n' +
      `npx vsce package ${flags.join(' ')} -o ${basename}.vsix\n\n` +
      'Install the result with Extensions: Install from VSIX. The dependency source\n' +
      'archive includes its TypeScript, build configuration, and license. See\n' +
      'doc/RELEASE.md for release packaging and verification instructions.\n');
    const source = path.join(dist, `${basename}-source.tar.gz`);
    run('tar', ['--sort=name', `--mtime=@${timestamp}`, '--owner=0', '--group=0', '--numeric-owner',
      '-czf', source, '-C', temporary, treeName]);
    const checksumFiles = [installer, source];
    fs.writeFileSync(path.join(dist, 'SHA256SUMS'), checksumFiles.map((file) =>
      `${sha256(fs.readFileSync(file))}  ${path.basename(file)}\n`).join(''));
    console.log(`Verified installer, notices and source archive for ${manifest.publisher}.${manifest.name} ${manifest.version}`);
    console.log(`Source commit: ${commit}`);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
